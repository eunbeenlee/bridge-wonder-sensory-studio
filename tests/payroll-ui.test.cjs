/* DOM contract tests against the real Payroll.gs VM, without external resources.
 * These checks do not represent browser painting, a real PDF render, or a live Google deployment.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {createHarness,initialize,createEmployee}=require('./fixtures/payroll-gas-mock.cjs');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/administration-payroll.js'),'utf8');
const results=[];
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
function makeUI(h,options={}){
  const errors=[],consoleProxy=new VirtualConsole();consoleProxy.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM('<!doctype html><html><body><main id="payroll"></main></body></html>',{url:'https://fixture.example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:consoleProxy});
  const w=dom.window,root=w.document.getElementById('payroll'),calls=[],popups=[],blobs=[],downloads=[],prompts=[];
  let valid=true;
  w.confirm=()=>true;w.prompt=()=>prompts.shift()??null;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLAnchorElement.prototype.click=function(){downloads.push({filename:this.download,href:this.href});};
  w.Blob=Blob;w.URL.createObjectURL=b=>{blobs.push(b);return 'blob:fixture-'+blobs.length;};w.URL.revokeObjectURL=()=>{};
  w.open=()=>{const d=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://fixture.example.test/',runScripts:'outside-only'});const popup=d.window;popups.push(popup);return popup;};
  w.eval(source);
  const ctx={token:'owner-token',user:options.user||{role:'owner',permissions:{read:{payroll:true},write:{payroll:true}}},isCurrent:()=>valid,
    call:async(name,token,action,payload)=>{assert.equal(name,'payrollCommand');assert.equal(token,'owner-token');calls.push({action,payload});return options.call?options.call(action,payload):h.call(action,payload);}};
  const query=selector=>{const element=root.querySelector(selector);assert.ok(element,'Missing element '+selector);return element;};
  const fill=(name,value,container=root)=>{const el=container.querySelector('[name="'+name+'"]');assert.ok(el,'Missing field '+name);if(el.type==='checkbox')el.checked=value;else el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));return el;};
  const click=async(selector)=>{query(selector).click();await settle();};
  const submit=async(id)=>{query('#'+id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle();};
  const month=async(value)=>{const el=query('#payMonth');el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();};
  return{w,root,ctx,calls,popups,blobs,downloads,prompts,errors,query,fill,click,submit,month,mount:()=>w.BWPayroll.mount(root,ctx),invalidate:()=>valid=false,dispose:()=>{w.BWPayroll.dispose();for(const p of popups)p.close();dom.window.close();}};
}
async function test(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.message});console.error('FAIL',name,e);process.exitCode=1;}}
function fillPayroll(ui){
  for(const [key,value]of Object.entries({pensionBase:3001001,healthBase:3001001,employmentBase:3001001,incomeTax:50000,localTax:5000,taxReference:'2026년 3월 시행 간이세액표 확인',payDate:'2026-12-05'}))ui.fill(key,value);
  for(const key of ['tax','insurance','taxFree','hours'])ui.fill('review_'+key,true);
}
(async()=>{
  await test('non-owner mount is rejected before any server call',async()=>{const h=createHarness(),ui=makeUI(h,{user:{role:'teacher'}});try{await assert.rejects(ui.mount(),/원장/);assert.equal(ui.calls.length,0);}finally{ui.dispose();}});
  await test('unconfigured store has setup guidance and read-only refresh',async()=>{const h=createHarness(),ui=makeUI(h);try{await ui.mount();assert.match(ui.root.textContent,/초기 설정/);assert.equal(h.sheets.size,0);await ui.click('[data-pay-action="refresh"]');assert.equal(h.sheets.size,0);assert.deepEqual(ui.calls.map(c=>c.action),['bootstrap','bootstrap']);}finally{ui.dispose();}});
  await test('full owner workflow: employee, preview, draft, confirm, paid, slip and annual CSV',async()=>{
    const h=createHarness();initialize(h);const ui=makeUI(h);
    try{
      await ui.mount();await ui.month('2026-11');await ui.click('[data-pay-action="newEmployee"]');
      ui.fill('name','테스트 직원');ui.fill('email','ui-staff@example.test');ui.fill('employmentStart','2025-01-01');ui.fill('basePay',3001001);
      for(const n of ['pension','health','employment','coverageVerified'])ui.fill(n,true);
      await ui.submit('employeeForm');assert.equal(h.call('bootstrap',{month:'2026-11'}).employees.length,1);assert.match(ui.root.textContent,/저장했습니다/);
      await ui.click('[data-pay-tab="monthly"]');fillPayroll(ui);await ui.click('[data-pay-action="preview"]');
      assert.match(ui.query('#payPreview').textContent,/2,654,411원/);assert.match(ui.query('#payPreview').textContent,/142,540원/);
      await ui.submit('payForm');let r=h.call('bootstrap',{month:'2026-11'}).runs[0];assert.equal(r.status,'draft');assert.equal(r.snapshot.calculation.net,2654411);
      await ui.click('[data-pay-action="finalize"]');r=h.call('bootstrap',{month:'2026-11'}).runs[0];assert.equal(r.status,'confirmed');assert.equal(ui.root.querySelector('#payForm'),null);const frozen=JSON.stringify(r.snapshot);
      ui.prompts.push('2026-12-07');await ui.click('[data-pay-action="paid"]');r=h.call('bootstrap',{month:'2026-11'}).runs[0];assert.equal(r.status,'paid');assert.equal(JSON.stringify(r.snapshot),frozen);
      await ui.click('[data-pay-action="payslip"]');assert.equal(ui.popups.length,1);const doc=ui.popups[0].document;assert.match(doc.title,/급여명세서/);assert.match(doc.body.textContent,/2,654,411원/);assert.match(doc.body.textContent,/월 기본급 3001001원/);assert.equal(doc.querySelector('.print').textContent,'인쇄 / PDF로 저장');assert.match(doc.body.textContent,/지급 예정일 2026-12-05/);assert.match(doc.body.textContent,/실제 지급일 2026-12-07/);
      await ui.click('[data-pay-tab="reports"]');await ui.click('[data-pay-action="loadReport"]');assert.match(ui.root.textContent,/지급 기록 완료/);await ui.click('[data-pay-action="exportReport"]');assert.equal(ui.blobs.length,1);const csv=await ui.blobs[0].text();assert.match(csv,/귀속월/);assert.match(csv,/실제 지급일/);assert.match(csv,/2026-12-07/);assert.match(csv,/"2654411"/);assert.equal(ui.downloads[0].filename,'Bridge_Wonder_Payroll_2026.csv');assert.deepEqual(ui.errors,[]);
    } finally{ui.dispose();}
  });
  await test('required employee fields fail DOM validation without calling save',async()=>{const h=createHarness();initialize(h);const ui=makeUI(h);try{await ui.mount();await ui.click('[data-pay-action="newEmployee"]');const n=ui.calls.length;await ui.submit('employeeForm');assert.equal(ui.calls.length,n);assert.equal(ui.query('[name="email"]').required,true);assert.equal(ui.query('[name="employmentStart"]').required,true);}finally{ui.dispose();}});
  await test('number limits, decimal hours and checkboxes match the server contract',async()=>{const h=createHarness();initialize(h);createEmployee(h);const ui=makeUI(h);try{await ui.mount();await ui.month('2026-11');assert.equal(ui.query('[name="paidHours"]').step,'0.01');assert.equal(ui.query('[name="paidHours"]').max,'744');assert.equal(ui.query('[name="paidDays"]').max,'31');assert.equal(ui.query('[name="familyCount"]').min,'1');assert.equal(ui.query('[name="review_tax"]').type,'checkbox');assert.equal(ui.query('[name="taxReference"]').maxLength,200);await ui.click('[data-pay-action="addItem"]');assert.equal(ui.query('[name="multiplier"]').max,'5');assert.equal(ui.query('[name="calculation"]').maxLength,180);ui.fill('label','시간 수당');ui.fill('hours','1.01');ui.fill('rate','10001');ui.fill('multiplier','1.5');await ui.click('[data-pay-action="calculateItem"]');assert.equal(ui.query('[name="amount"]').value,'15151');}finally{ui.dispose();}});
  await test('government approval is explicit; future unregistered year remains unavailable',async()=>{const h=createHarness();h.ctx.setupBridgeWonderPayrollV26_();const ui=makeUI(h);try{await ui.mount();await ui.month('2027-01');await ui.click('[data-pay-tab="rates"]');assert.match(ui.root.textContent,/10,700원/);assert.match(ui.root.textContent,/공식 상·하한 미확인/);assert.ok(ui.root.querySelector('[data-pay-action="approveYear"]'));await ui.click('[data-pay-action="approveYear"]');assert.ok(h.call('bootstrap',{month:'2027-01'}).rate.approved);await ui.month('2028-01');assert.match(ui.root.textContent,/이전 연도 요율/);assert.equal(ui.root.querySelector('[data-pay-action="approveYear"]'),null);}finally{ui.dispose();}});
  await test('incomplete payroll amounts render as unknown, never a zero net',async()=>{const h=createHarness();initialize(h);const e=createEmployee(h);h.call('saveDraft',{month:'2026-11',employeeId:e.id,payDate:'2026-12-05',revision:0,inputs:{incomeTax:null,localTax:null,items:[],deductionItems:[]}});const ui=makeUI(h);try{await ui.mount();await ui.month('2026-11');assert.match(ui.root.textContent,/확인 필요/);const row=ui.query('.pay-table tbody tr');assert.match(row.textContent,/확인 필요/);assert.doesNotMatch(row.textContent,/실지급액 0원/);}finally{ui.dispose();}});
  await test('blank taxes permit preview and draft while finalization remains blocked',async()=>{const h=createHarness();initialize(h);createEmployee(h);const ui=makeUI(h);try{await ui.mount();await ui.month('2026-11');assert.equal(ui.query('[name="incomeTax"]').required,false);assert.equal(ui.query('[name="localTax"]').required,false);const source=ui.root.querySelector('a[href*="flSeq=163623339"]');assert.ok(source);assert.match(source.textContent,/2026년 3월/);await ui.click('[data-pay-action="preview"]');assert.ok(ui.calls.some(x=>x.action==='preview'));assert.match(ui.query('#payPreview').textContent,/확인 필요/);await ui.submit('payForm');const r=h.call('bootstrap',{month:'2026-11'}).runs[0];assert.equal(r.status,'draft');assert.equal(r.snapshot.inputs.incomeTax,null);assert.equal(r.snapshot.calculation.net,null);assert.throws(()=>h.call('finalize',{month:r.month,employeeId:r.employeeId,revision:r.revision}),/소득세|확인|확정/);}finally{ui.dispose();}});
  await test('HTML content is escaped in employee choices, ledger, and printable statements',async()=>{const h=createHarness();initialize(h);const attack='<img src=x onerror=alert(1)>';const e=createEmployee(h,{name:attack});let r=h.call('saveDraft',{month:'2026-11',employeeId:e.id,payDate:'2026-12-05',revision:0,inputs:require('./fixtures/payroll-gas-mock.cjs').inputs()}).run;h.call('finalize',{month:r.month,employeeId:e.id,revision:r.revision});const ui=makeUI(h);try{await ui.mount();await ui.month('2026-11');assert.equal(ui.root.querySelector('img[src="x"]'),null);assert.ok(ui.root.textContent.includes(attack));await ui.click('[data-pay-action="payslip"]');assert.equal(ui.popups[0].document.querySelector('img[src="x"]'),null);assert.ok(ui.popups[0].document.body.textContent.includes(attack));}finally{ui.dispose();}});
  await test('dirty navigation honors cancellation and dispose discards in-memory data',async()=>{const h=createHarness();initialize(h);createEmployee(h);const ui=makeUI(h);try{await ui.mount();ui.fill('taxReference','저장하지 않은 내용');ui.w.confirm=()=>false;assert.equal(ui.w.BWPayroll.beforeLeave(),false);await ui.click('[data-pay-tab="rates"]');assert.ok(ui.root.querySelector('#payForm'));ui.w.BWPayroll.dispose();assert.equal(ui.root.textContent,'');assert.equal(ui.w.BWPayroll.beforeLeave(),true);}finally{ui.dispose();}});
  await test('late server response cannot repopulate a disposed route',async()=>{const h=createHarness();initialize(h);let resolve;const ui=makeUI(h,{call:()=>new Promise(r=>resolve=r)});try{const mounting=ui.mount();await settle();ui.w.BWPayroll.dispose();resolve(h.call('bootstrap',{month:'2026-11'}));await mounting;assert.equal(ui.root.textContent,'');assert.deepEqual(ui.errors,[]);}finally{ui.dispose();}});
  await test('stale active page suppresses asynchronous response without showing payroll',async()=>{const h=createHarness();initialize(h);let resolve;const ui=makeUI(h,{call:()=>new Promise(r=>resolve=r)});try{const mounting=ui.mount();await settle();ui.invalidate();ui.root.textContent='다른 업무 화면';resolve(h.call('bootstrap',{month:'2026-11'}));await mounting;assert.equal(ui.root.textContent,'다른 업무 화면');}finally{ui.dispose();}});
  console.log(JSON.stringify({suite:'payroll DOM + real server contract',passed:results.filter(r=>r.passed).length,total:results.length},null,2));
})();
