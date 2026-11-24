'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const model=read('assets/js/staff-planning-model-v56.js'),ui=read('assets/js/staff-planning-v56.js');
const root={};new vm.Script(model).runInNewContext({window:root});const M=root.BW56Planning;
const clone=x=>JSON.parse(JSON.stringify(x)),base=()=>clone(M.DEFAULTS);
const near=(a,b)=>assert.ok(Math.abs(a-b)<0.001,a+' != '+b);
const a=M.compute(base());
assert.equal(a.allChildren,24);assert.equal(a.allGroups,8);assert.equal(a.allGross,7680000);
assert.deepEqual(Array.from(a.rows,r=>r.month),['2027-01','2027-02','2027-03']);
assert.deepEqual(Array.from(a.rows,r=>r.visits),[96,96,48]);
assert.deepEqual(Array.from(a.rows,r=>r.receipts),[7680000,0,0]);
assert.deepEqual(Array.from(a.rows,r=>r.earned),[3072000,3072000,1536000]);
assert.equal(a.totals.earned,a.allExpected);
assert.equal(a.totals.receipts,a.allExpected);
assert.equal(a.unearnedOutside,0);
near(a.rows[0].cashOut,1000000+288000+153600);
near(a.rows[1].cashOut,1000000+288000);
near(a.rows[0].operatingProfit,3072000/1.1-1000000-288000-3072000*.02);
assert.equal(a.sensitivity[0].contribution,0);
assert.equal(a.sensitivity[4].gross,1280000);
const mixed={...base(),cohorts:[
 {start:'2027-01-04',capacity:4,seats:1,groups:1},
 {start:'2027-01-12',capacity:3,seats:2,groups:2},
 {start:'2027-02-02',capacity:4,seats:4,groups:1},
 {start:'2027-01-06',capacity:2,seats:0,groups:1}
],materials:[{label:'종이',unit:'팩',price:2000,qty:.25}],materialExtra:1000,consumable:200,prepPerClass:500};
const m=M.compute(mixed);
assert.equal(m.allChildren,9);assert.equal(m.allGroups,5);assert.equal(m.allCapacity,16);
assert.equal(m.perChildCost,1700);assert.equal(m.allExpected,2880000);
assert.equal(m.rows[0].receipts,1600000);assert.equal(m.rows[1].receipts,1280000);
assert.equal(m.rows[2].receipts,0);
assert.equal(m.rows.reduce((n,r)=>n+r.classes,0),39);
assert.ok(m.unearnedOutside>0);
assert.equal(m.totals.earned+m.unearnedOutside,m.allExpected);
const weekly=M.compute({...mixed,payment:'weekly'});
assert.equal(weekly.totals.receipts,weekly.totals.earned);
assert.equal(weekly.uncollectedOutside,weekly.unearnedOutside);
const exact=M.compute({...base(),weeks:3,termTotal:100001,payment:'weekly',cohorts:[{start:'2027-01-25',capacity:4,seats:2,groups:1}]});
assert.equal(exact.totals.receipts,200002);
assert.equal(exact.totals.earned,200002);
const empty=M.compute({...base(),cohorts:[],openingCash:0});
assert.equal(empty.totals.earned,0);assert.equal(empty.totals.classes,0);assert.equal(empty.balance,-3000000);assert.equal(empty.peakShortfall,3000000);
assert.equal(M.compute({...base(),vatIncluded:'no'}).grossTerm,352000);
assert.equal(M.compute({...base(),refundPct:10}).paidTerm,288000);
for(const bad of [
 {...base(),weeks:0},
 {...base(),termTotal:-1},
 {...base(),fixedVatCredit:1000001},
 {...base(),cohorts:[{start:'2027-02-30',capacity:4,seats:3,groups:1}]},
 {...base(),cohorts:[{start:'2026-12-25',capacity:4,seats:3,groups:1}]},
 {...base(),cohorts:[{start:'2027-01-04',capacity:2,seats:3,groups:1}]},
 {...base(),cohorts:[{start:'2027-01-04',capacity:5,seats:4,groups:1}]},
 {...base(),cohorts:[{start:'2027-01-04',capacity:4,seats:3,groups:201}]}
])assert.throws(()=>M.compute(bad),/확인/);
console.log('PASS V56 calendar forecast, mixed capacity, exact whole-won allocation, zero enrollment, VAT and out-of-period amounts');
class Sheet{
 constructor(h){this.rows=[h.slice()];}
 getLastRow(){return this.rows.length;}
 appendRow(r){this.rows.push(Array.from(r));return this;}
 getRange(r,c,n=1,k=1){const self=this;return {
   getValues(){return Array.from({length:n},(_,i)=>Array.from({length:k},(_,j)=>self.rows[r+i-1]?.[c+j-1]??''));},
   getDisplayValues(){return this.getValues().map(row=>row.map(v=>String(v)));},
   setValues(rows){for(let i=0;i<n;i++){const dst=self.rows[r+i-1]||(self.rows[r+i-1]=[]);for(let j=0;j<k;j++)dst[c+j-1]=rows[i][j];}return this;}
 };}
}
const tabs=new Map(),audit=[],locks=[];let calls=0,allowSources=true,failAudit=false;
const book={getSheetByName:name=>tabs.get(name)||null};
const finance=new Sheet(['revision']);finance.appendRow([1]);tabs.set('finance',finance);
const context=vm.createContext({
 bw24Authorized_:(token,mod,mode,roles)=>{if(token!=='owner'||mod!=='finance'||!roles.includes('owner'))throw Error('권한 없음');return {role:'owner',email:'fixture@example.invalid'};},
 bw24Can_:()=>allowSources,bw17Book_:()=>{calls++;return book;},
 bw55TabState_:(b,spec)=>{const t=b.getSheetByName(spec.name);if(!t)return 'missing';return spec.headers.every((x,i)=>t.rows[0][i]===x)?'ready':'mismatch';},
 bw55CreateTab_:(b,spec)=>{assert.ok(!tabs.has(spec.name));const t=new Sheet(spec.headers);tabs.set(spec.name,t);return t;},
 bw55Published_:()=>({weeks:12,total:480000}),bw55PriceValues_:p=>p,
 BW49:{SETTINGS:'finance',SETTINGS_HEADERS:['revision']},bw49Settings_:()=>({values:{rent:700000,management:300000,staffGross:2000000}}),bw49SettingsInput_:p=>p.values,
 bw51Sheet_:()=>({}),bw51Rows_:()=>[[1,2,3,4,5,6,7,'사용'],[1,2,3,4,5,6,7,'보관']],
 bw51Item_:()=>({id:'fixture-id',title:'밀가루',unit:'kg',amount:2500,content:'private note',updatedBy:'secret@example.invalid'}),
 bw17Hash_:s=>crypto.createHash('sha256').update(s).digest('hex'),bw17Now_:()=> '2026-11-25 00:00:00',
 bw17Audit_:(...r)=>{if(failAudit)throw Error('audit unavailable');audit.push(r);},
 LockService:{getScriptLock:()=>({waitLock(){locks.push('lock')},releaseLock(){locks.push('release')}})}
});
vm.runInContext(read('server/apps-script/StudioPlanningV56.gs'),context);
assert.throws(()=>context.staff56PlanningRead('teacher'),/권한/);assert.throws(()=>context.staff56PlanningSave('teacher',{}),/권한/);assert.equal(calls,0);
const init=context.staff56PlanningRead('owner');
assert.equal(init.plan.values,null);assert.equal(init.sources.pricing.total,480000);assert.equal(init.sources.materials.length,1);
assert.doesNotMatch(JSON.stringify(init.sources.materials),/private note|secret@/);assert.equal(tabs.size,1);
allowSources=false;const restricted=context.staff56PlanningRead('owner');assert.equal(restricted.sources.pricing,null);assert.equal(restricted.sources.materials.length,0);allowSources=true;
const requestId=crypto.randomUUID(),values=base();
const saved=context.staff56PlanningSave('owner',{values,etag:'new',requestId});
assert.equal(saved.plan.revision,1);assert.equal(saved.ok,true);assert.equal(tabs.size,2);
assert.equal(context.staff56PlanningSave('owner',{values,etag:'new',requestId}).duplicate,true);
assert.throws(()=>context.staff56PlanningSave('owner',{values:{...base(),termTotal:360000},etag:'new',requestId}),/같은 저장/);
assert.throws(()=>context.staff56PlanningSave('owner',{values,etag:'new',requestId:crypto.randomUUID()}),/다른 화면/);
assert.throws(()=>context.staff56PlanningSave('owner',{values:{...base(),weeks:0},etag:saved.plan.etag,requestId:crypto.randomUUID()}),/확인/);
failAudit=true;const second=context.staff56PlanningSave('owner',{values:{...base(),termTotal:360000},etag:saved.plan.etag,requestId:crypto.randomUUID()});
assert.equal(second.plan.revision,2);assert.equal(second.auditWarning,true);assert.equal(context.staff56PlanningRead('owner').plan.values.termTotal,360000);
assert.equal(finance.rows.length,2,'existing finance data untouched');
const planSheet=tabs.get('BW56_운영손익계획');assert.equal(planSheet.rows.length,3);
planSheet.rows[0][0]='wrong header';assert.throws(()=>context.staff56PlanningRead('owner'),/열 구성/);assert.equal(planSheet.rows[0][0],'wrong header');
assert.equal(locks.filter(x=>x==='lock').length,locks.filter(x=>x==='release').length);
assert.match(read('server/apps-script/StaffBridge.gs'),/staff56PlanningRead:/);
assert.match(read('server/apps-script/StaffBridge.gs'),/staff56PlanningSave:/);
assert.match(read('server/apps-script/StudioIntegrationV55.gs'),/typeof bw56Spec_/);
console.log('PASS V56 server permissions, read-only source imports, append-only saves, stale version rejection and audit failure warning');
(async()=>{
 const dom=new JSDOM(read('staff/planning/index.html'),{url:'https://bridgewonder.bridgeacademy.co.kr/staff/planning/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 let calls=[],savedPlan=null;
 w.confirm=()=>true;w.sessionStorage.setItem('bw17_staff_session','fixture');
 w.BW27Bridge={request:async(name,args)=>{
   calls.push(name);
   if(name==='staffCurrentUser')return {role:'owner'};
   if(name==='staff56PlanningRead')return {version:'56.0.0',plan:{revision:0,etag:'new',values:null},sources:init.sources,status:init.status};
   if(name==='staff56PlanningSave'){savedPlan=args[1].values;return {ok:true,version:'56.0.0',plan:{revision:1,etag:'a'.repeat(32),values:savedPlan}};}
   throw Error('unexpected RPC');
 }};
 w.eval(read('assets/js/staff-finance-model-v49.js'));w.eval(model);w.eval(ui);
 const tick=()=>new Promise(r=>setTimeout(r,10));await tick();
 const el=id=>d.getElementById(id);
 assert.equal(el('bw56Workspace').hidden,false);assert.equal(el('bw56Save').disabled,false);
 assert.equal(el('bw56Children').textContent,'24명');assert.match(el('bw56TermReceipts').textContent,/7,680,000/);
 assert.equal(el('bw56Months').children.length,3);
 el('bw56ApplyPrice').click();assert.equal(el('bw56-weeks').value,'12');assert.equal(el('bw56-termTotal').value,'480000');
 el('bw56ApplyFinance').click();assert.ok(Number(el('bw56-fixedCash').value)>3000000);
 el('bw56MaterialSource').value='0';el('bw56MaterialSource').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(el('bw56ImportMaterial').disabled,false);el('bw56ImportMaterial').click();
 assert.equal(el('bw56Materials').children.length,1);
 const qty=el('bw56Materials').querySelector('[data-key="qty"]');qty.value='.2';qty.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(el('bw56MaterialSubtotal').textContent,/500원/);
 const seats=el('bw56Cohorts').querySelector('[data-key="seats"]');seats.value='5';seats.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(el('bw56Save').disabled,true);assert.equal(el('bw56Months').children.length,0);
 seats.value='2';seats.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(el('bw56Children').textContent,'16명');
 el('bw56Form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(savedPlan.cohorts[0].seats,2);assert.match(el('bw56SaveStatus').textContent,/저장 완료/);
 assert.equal(calls.filter(x=>x==='staff56PlanningRead').length,1);
 assert.equal(calls.filter(x=>x==='staff56PlanningSave').length,1);
 dom.window.close();
 const offline=new JSDOM(read('staff/planning/index.html'),{url:'https://bridgewonder.bridgeacademy.co.kr/staff/planning/',runScripts:'outside-only'});
 const o=offline.window;o.sessionStorage.setItem('bw17_staff_session','fixture');o.BW27Bridge={request:async name=>{if(name==='staffCurrentUser')return {role:'owner'};throw Error('server module unavailable');}};
 o.eval(read('assets/js/staff-finance-model-v49.js'));o.eval(model);o.eval(ui);await tick();
 assert.equal(o.document.getElementById('bw56Workspace').hidden,false);assert.equal(o.document.getElementById('bw56Save').disabled,true);assert.equal(o.document.getElementById('bw56CSV').disabled,false);
 offline.window.close();
 console.log('PASS V56 owner planning UI, data imports, editable controls and calculation-only fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
