'use strict';
/* Staff shell integration in a DOM with the real acceleration and payroll modules.
 * Google RPC transport/authentication are controlled fixtures; no network or real accounts.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {createHarness,initialize,createEmployee}=require('./fixtures/payroll-gas-mock.cjs');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'staff/administration.html'),'utf8');
const app=fs.readFileSync(path.join(root,'assets/js/administration.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'assets/js/administration-accelerator.js'),'utf8');
const payroll=fs.readFileSync(path.join(root,'assets/js/administration-payroll.js'),'utf8');
const layout=fs.readFileSync(path.join(root,'assets/js/administration-layout.js'),'utf8');
const caps=JSON.parse(app.match(/const BW24_CAPS=(\{[^\n]+\});/)[1]);
const pause=async()=>{for(let i=0;i<30;i++)await Promise.resolve();await new Promise(r=>setImmediate(r));};
function user(role='owner',extra={}){
  return {email:role+'@example.test',name:role==='owner'?'검증용 원장':'검증용 선생님',role,status:'사용',classes:['FIXTURE_CLASS'],permissions:{read:Object.fromEntries(Object.entries(caps).map(([k,v])=>[k,v.read.includes(role)])),write:Object.fromEntries(Object.entries(caps).map(([k,v])=>[k,v.write.includes(role)]))},...extra};
}
function fixture(options={}){
  const h=createHarness();initialize(h);const e=createEmployee(h,{name:'검증용 급여 직원'});
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',err=>errors.push(err.message));
  const dom=new JSDOM(html,{url:'https://fixture.example.test/staff/administration.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,d=w.document,who=options.user||user(options.role),calls=[],assets=[];
  const token=who.role==='owner'?'owner-token':'teacher-token';
  w.confirm=()=>true;w.prompt=()=>null;w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};
  if(options.restore)w.sessionStorage.setItem('bw17_staff_session',token);
  let failScript=options.failScript||0,failCSS=options.failCSS||0;
  const appendTo=(host)=>{
    const native=host.append.bind(host);
    host.append=(...nodes)=>{native(...nodes);for(const n of nodes){
      if(n.tagName==='SCRIPT'&&n.src.includes('administration-payroll.js')){assets.push({kind:'script',url:n.src});queueMicrotask(()=>{if(failScript>0){failScript--;n.onerror?.(new w.Event('error'));}else{w.eval(payroll);n.onload?.(new w.Event('load'));}});}
      if(n.tagName==='LINK'&&n.href.includes('administration-payroll.css')){assets.push({kind:'css',url:n.href});queueMicrotask(()=>{if(failCSS>0){failCSS--;n.onerror?.(new w.Event('error'));}else n.onload?.(new w.Event('load'));});}
    }};
  };
  appendTo(d.head);appendTo(d.body);
  const defaultRPC=(name,args)=>{
    if(name==='staff23PasswordLogin')return {ok:true,token,user:who};
    if(name==='staffCurrentUser')return who;
    if(name==='staffLogout')return {ok:true};
    if(name==='staffDashboard')return {role:who.role,classCount:1,newInquiries:0,pendingEnrollments:0,updatedAt:'2026-11-20 09:00'};
    if(name==='staff20ActionCenter')return {items:[]};
    if(name==='payrollCommand')return h.ctx.payrollCommand(...args);
    if(name==='staff20Themes')return [];
    if(name==='staffListInquiries')return [];
    if(name==='staffListClasses')return {rows:[],templates:[]};
    if(name==='staffListTuition')return {students:[{receipt:'FIXTURE001',name:'검증용 등록자'}],records:[]};
    if(name==='staffAppendTuition')return {ok:true};
    if(name==='staffSaveClass')return {ok:true};
    throw Error('Unexpected mock RPC '+name);
  };
  const run=(success,failure)=>new Proxy({}, {get(_,name){
    if(name==='withSuccessHandler')return callback=>run(callback,failure);
    if(name==='withFailureHandler')return callback=>run(success,callback);
    return(...args)=>{calls.push({name,args});Promise.resolve().then(()=>options.rpc?options.rpc(String(name),args,defaultRPC):defaultRPC(String(name),args)).then(value=>success?.(JSON.parse(JSON.stringify(value))),error=>failure?.({message:error.message}));};
  }});
  w.google={script:{run:run()}};
  if(options.accelerator!==false)w.eval(engine);
  w.eval(app+'\n;window.__staffTest={state,call,showPage,bw24Can,logout,getAcceleration:()=>bw25Accel};');
  const query=s=>{const found=d.querySelector(s);assert.ok(found,'Missing DOM selector '+s);return found;};
  const click=async s=>{query(s).click();await pause();};
  const login=async()=>{query('#passwordEmail').value=who.email;query('#passwordInput').value='Synthetic-Password-123';query('#passwordLoginForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();};
  const navigate=async page=>{await w.__staffTest.showPage(page);await pause();};
  const close=()=>{w.BWPayroll?.dispose();w.__staffTest.getAcceleration()?.clear();dom.window.close();};
  return {h,e,w,d,calls,assets,errors,query,click,login,navigate,close,state:w.__staffTest.state,api:w.__staffTest};
}
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(err){failed++;console.error('FAIL '+name,err);process.exitCode=1;}}
(async()=>{
  await test('owner password login uses actual permission maps and loads payroll only on navigation',async()=>{
    const f=fixture();try{
      assert.equal(f.assets.length,0);await f.login();assert.equal(f.state.user.permissions.read.payroll,true);assert.equal(f.query('#workspace').hidden,false);assert.equal(f.query('#loginScreen').hidden,true);assert.equal(f.query('#passwordInput').value,'');assert.equal(f.w.sessionStorage.getItem('bw17_staff_session'),'owner-token');
      assert.ok(f.d.querySelector('#sideNav [data-page="payroll"]'));assert.ok(f.d.querySelector('#mobileNav [data-page="payroll"]'));assert.ok(f.d.querySelector('#bw20PageSelect option[value="payroll"]'));assert.equal(f.assets.length,0);
      await f.click('#sideNav [data-page="payroll"]');assert.equal(f.state.page,'payroll');assert.equal(f.assets.filter(a=>a.kind==='script').length,1);assert.equal(f.assets.filter(a=>a.kind==='css').length,1);assert.match(f.query('#pageBody').textContent,/검증용 급여 직원/);assert.equal(f.calls.filter(x=>x.name==='payrollCommand').length,1);
      await f.navigate('home');await f.navigate('payroll');assert.equal(f.assets.filter(a=>a.kind==='script').length,1);assert.equal(f.calls.filter(x=>x.name==='payrollCommand').length,2);assert.deepEqual(f.errors,[]);
    }finally{f.close();}
  });
  await test('restored session opens the shell with server permissions before showing owner menus',async()=>{const f=fixture({restore:true});try{await pause();assert.equal(f.calls[0].name,'staffCurrentUser');assert.equal(f.state.user.role,'owner');assert.ok(f.d.querySelector('#sideNav [data-page="payroll"]'));assert.equal(f.assets.length,0);assert.equal(f.query('#workspace').hidden,false);}finally{f.close();}});
  await test('logout disposes payroll, clears tokens and private collections, and rejects late results',async()=>{
    let release;const f=fixture({rpc:(name,args,next)=>name==='staffSaveClass'?new Promise(r=>release=r):next(name,args)});
    try{await f.login();await f.navigate('payroll');for(const key of ['classes','templates','inquiries','registrations','roster','staff','attendance'])f.state[key]=[{private:'private-fixture'}];
      const pending=f.api.call('staffSaveClass',f.state.token,{}),check=assert.rejects(pending,/BW24_STALE_VIEW/);await pause();await f.api.logout();assert.equal(f.state.token,'');assert.equal(f.state.user,null);assert.equal(f.w.sessionStorage.getItem('bw17_staff_session'),null);assert.equal(f.query('#pageBody').textContent,'');assert.equal(f.query('#workspace').hidden,true);assert.equal(f.query('#loginScreen').hidden,false);for(const key of ['classes','templates','inquiries','registrations','roster','staff','attendance'])assert.equal(f.state[key].length,0);
      release({ok:true});await check;await pause();assert.equal(f.query('#pageBody').textContent,'');assert.ok(f.calls.some(c=>c.name==='staffLogout'&&c.args[0]==='owner-token'));assert.equal(f.api.getAcceleration().metrics().cacheEntries,0);assert.equal(f.w.BWPayroll.beforeLeave(),true);
    }finally{f.close();}
  });
  await test('teacher role cannot gain payroll navigation by forging permission flags',async()=>{const who=user('teacher');who.permissions.read.payroll=true;who.permissions.write.payroll=true;const f=fixture({user:who});try{await f.login();assert.equal(f.api.bw24Can('payroll'),false);assert.equal(f.d.querySelector('[data-page="payroll"]'),null);assert.equal(f.d.querySelector('#bw20PageSelect option[value="payroll"]'),null);await f.navigate('payroll');assert.equal(f.state.page,'home');assert.equal(f.assets.length,0);assert.equal(f.calls.filter(c=>c.name==='payrollCommand').length,0);}finally{f.close();}});
  await test('owner menu respects an explicit server policy denying payroll',async()=>{const who=user();who.permissions.read.payroll=false;const f=fixture({user:who});try{await f.login();assert.equal(f.d.querySelector('[data-page="payroll"]'),null);await f.navigate('payroll');assert.equal(f.state.page,'home');assert.equal(f.assets.length,0);}finally{f.close();}});
  await test('missing acceleration module falls back to Google RPC including owner payroll',async()=>{const f=fixture({accelerator:false});try{await f.login();assert.equal(f.api.getAcceleration(),undefined);assert.equal(f.state.page,'home');await f.navigate('payroll');assert.match(f.query('#pageBody').textContent,/검증용 급여 직원/);assert.ok(f.calls.some(c=>c.name==='payrollCommand'));await f.api.logout();assert.equal(f.query('#pageBody').textContent,'');assert.deepEqual(f.errors,[]);}finally{f.close();}});
  for(const accelerator of [true,false])await test('late navigation response is suppressed '+(accelerator?'with acceleration':'with fallback'),async()=>{
    let release;const f=fixture({accelerator,rpc:(name,args,next)=>name==='staffListInquiries'?new Promise(r=>release=r):next(name,args)});
    try{await f.login();const old=f.api.showPage('inquiries');await pause();assert.equal(typeof release,'function');await f.navigate('themes');release([{receipt:'PRIVATE-OLD',child:'stale-private-fixture',displayName:'stale-private-fixture',phone:'01000000000',phoneValid:true,status:'신규'}]);await old;await pause();assert.equal(f.state.page,'themes');assert.match(f.query('#pageBody').textContent,/월간 공통 주제/);assert.doesNotMatch(f.query('#pageBody').textContent,/stale-private-fixture/);assert.equal(f.state.inquiries.length,0);assert.deepEqual(f.errors,[]);}finally{f.close();}
  });
  await test('payroll dirty confirmation keeps navigation and mobile selection in the current module',async()=>{const f=fixture();try{await f.login();await f.navigate('payroll');const input=f.query('#payForm [name="taxReference"]');input.value='unsaved fixture';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));f.w.confirm=()=>false;const nav=f.state.navigationSeq;await f.navigate('home');assert.equal(f.state.page,'payroll');assert.equal(f.state.navigationSeq,nav);assert.equal(f.query('#payForm [name="taxReference"]').value,'unsaved fixture');assert.equal(f.query('#topTitle').textContent,'직원 급여관리');f.w.confirm=()=>true;await f.navigate('home');assert.equal(f.state.page,'home');assert.equal(f.d.querySelector('#payForm'),null);}finally{f.close();}});
  await test('tuition retries reuse one operation ID and changed payload is held for reconciliation',async()=>{
    let attempts=0;const f=fixture({rpc:(name,args,next)=>{if(name==='staffAppendTuition'){attempts++;if(attempts===1)throw Error('저장 결과 확인 필요');return{ok:true,replayed:attempts===2};}return next(name,args);}});
    try{await f.login();await f.navigate('tuition');f.query('#payReceipt').value='FIXTURE001';f.query('#payAmount').value='20000';f.query('#payReference').value='test-evidence';const submit=async()=>{f.query('#tuitionForm').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));await pause();};
      await submit();let records=f.calls.filter(c=>c.name==='staffAppendTuition');assert.equal(records.length,1);assert.match(records[0].args[1].operationId,/^[a-f0-9]{32}$/);assert.match(f.query('#toast').textContent,/저장 결과 확인 필요/);
      f.query('#payAmount').value='21000';await submit();assert.equal(f.calls.filter(c=>c.name==='staffAppendTuition').length,1);assert.match(f.query('#toast').textContent,/이전 요청의 저장 결과/);
      f.query('#payAmount').value='20000';await submit();records=f.calls.filter(c=>c.name==='staffAppendTuition');assert.equal(records.length,2);assert.equal(records[0].args[1].operationId,records[1].args[1].operationId);assert.match(f.query('#toast').textContent,/이미 저장된 수납 기록/);
      f.query('#payReceipt').value='FIXTURE001';f.query('#payAmount').value='20000';await submit();records=f.calls.filter(c=>c.name==='staffAppendTuition');assert.equal(records.length,3);assert.notEqual(records[1].args[1].operationId,records[2].args[1].operationId);
    }finally{f.close();}
  });
  await test('failed payroll script load offers retry and mounts after the next successful load',async()=>{const f=fixture({failScript:1});try{await f.login();await f.navigate('payroll');assert.match(f.query('#pageBody').textContent,/급여 화면을 불러오지 못했습니다/);assert.ok(f.d.querySelector('#retryPage'));await f.click('#retryPage');assert.match(f.query('#pageBody').textContent,/검증용 급여 직원/);assert.equal(f.assets.filter(a=>a.kind==='script').length,2);assert.deepEqual(f.errors,[]);}finally{f.close();}});
  await test('failed payroll stylesheet is reloaded on retry even if the module script already loaded',async()=>{const f=fixture({failCSS:1});try{await f.login();await f.navigate('payroll');assert.match(f.query('#pageBody').textContent,/스타일을 불러오지 못했습니다/);assert.equal(f.d.querySelector('#bw26PayrollCSS'),null);await f.click('#retryPage');assert.match(f.query('#pageBody').textContent,/검증용 급여 직원/);assert.ok(f.d.querySelector('#bw26PayrollCSS'));assert.equal(f.assets.filter(a=>a.kind==='css').length,2);}finally{f.close();}});
  await test('generated layout falls back after engine failure or timeout and starts the app exactly once',async()=>{
    for(const mode of ['error','timeout']){
      const dom=new JSDOM('<!doctype html><html><body><main id="bw25-root">불러오는 중</main></body></html>',{url:'https://fixture.example.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
      try{
        w.google={script:{run:{}}};let fallback,engineNode,appLoads=0,cleared=false;
        const nativeTimer=w.setTimeout.bind(w),nativeClear=w.clearTimeout.bind(w);
        w.setTimeout=(fn,ms,...args)=>{if(ms===8000){fallback=fn;return 900001;}return nativeTimer(fn,ms,...args);};
        w.clearTimeout=id=>{if(id===900001)cleared=true;else nativeClear(id);};
        const append=d.body.appendChild.bind(d.body);
        d.body.appendChild=node=>{append(node);if(node.tagName==='SCRIPT'&&node.src.includes('administration-accelerator.js'))engineNode=node;if(node.tagName==='SCRIPT'&&(node.src.includes('staff-ux-v31.js')||node.src.includes('staff-account-management.js')))node.onload(new w.Event('load'));if(node.tagName==='SCRIPT'&&node.src.includes('/administration.js')){appLoads++;w.eval(app);}return node;};
        w.eval(layout);assert.ok(d.getElementById('passwordLoginForm'));assert.equal(appLoads,0);assert.equal(typeof fallback,'function');
        if(mode==='error')engineNode.onerror(new w.Event('error'));else fallback();
        assert.equal(appLoads,1);assert.equal(cleared,true);engineNode.onload(new w.Event('load'));fallback();assert.equal(appLoads,1);
        d.getElementById('bw23FirstTime').click();assert.equal(d.getElementById('loginStepEmail').hidden,false);assert.equal(d.querySelectorAll('#passwordLoginForm').length,1);
      }finally{dom.window.close();}
    }
  });
  console.log(JSON.stringify({suite:'staff shell integration DOM',passed,total:passed+failed},null,2));
})();
