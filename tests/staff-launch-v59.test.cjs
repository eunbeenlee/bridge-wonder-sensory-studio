'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const model=read('assets/js/staff-launch-model-v59.js'),server=read('server/apps-script/StudioLaunchV59.gs'),ui=read('assets/js/staff-launch-v59.js');
const w={};vm.runInNewContext(model,{window:w});const M=w.BW59;
const plan=M.defaults(),clean=M.validate(plan);
assert.equal(clean.lessons.length,48);
assert.equal(clean.lessons.filter(r=>r.kind==='식재료').length,24);
assert.equal(clean.lessons.filter(r=>r.kind==='자연소재').length,24);
assert.equal(clean.tasks.filter(t=>t.group==='홍보').length,23);
assert.equal(clean.tasks.filter(t=>t.group==='홍보'&&t.budget===null).length,23);
assert.equal(clean.tasks.filter(t=>t.group==='안전·보험·동의'&&/^0[1-6]/.test(t.title)).length,6);
const a=M.order(clean.lessons[0]);assert.equal(a.net,1420);assert.ok(Math.abs(a.need-1633)<0.000001);assert.equal(a.grams,2000);assert.equal(a.cost,null);assert.equal(a.minutes,210);assert.equal(a.people,19);
const b=M.order({...clean.lessons[0],counts:[0,1,2,3,4],ageGroups:[0,1,1,2,3],price:5000});
assert.equal(b.people,21);assert.equal(b.net,2390);assert.equal(b.grams,3000);assert.equal(b.cost,15000);
const no=M.order({...clean.lessons[0],counts:[0,0,0,0,0],ageGroups:[0,0,0,0,0]});assert.equal(no.grams,0);assert.equal(no.cost,0);assert.equal(no.minutes,0);
assert.equal(M.order(clean.lessons[1]).grams,0);
const summary=M.summarize(plan);assert.equal(summary.missingQuotes,24);assert.equal(summary.adUnknown,23);assert.equal(summary.first12Done,0);
const copy=x=>JSON.parse(JSON.stringify(x));
for(const change of [p=>p.lessons[0].counts[0]=5,p=>p.lessons[0].kind='자연소재',p=>p.lessons[1].week=1,p=>p.lessons[0].ageGroups[0]=21,p=>p.tasks[0].budget=-1,p=>p.tasks[0].due='2027-02-30',p=>p.tasks.push(p.tasks[0])]){
 const bad=copy(plan);change(bad);assert.throws(()=>M.validate(bad));
}
class Sheet{constructor(headers){this.rows=[headers.slice()];}getLastRow(){return this.rows.length;}appendRow(r){this.rows.push(Array.from(r));return this;}getRange(r,c,n=1,k=1){const self=this;return {getValues(){return Array.from({length:n},(_,i)=>Array.from({length:k},(_,j)=>self.rows[r+i-1]?.[c+j-1]??''));}};}}
const tabs=new Map(),lock={waitLock(){},releaseLock(){}},book={getSheetByName:name=>tabs.get(name)||null};let opens=0,failAudit=false;
const c=vm.createContext({
 bw24Authorized_:(token,module,mode,roles)=>{if(token!=='owner'||module!=='operations'||!roles.includes('owner'))throw Error('권한 없음');return {role:'owner',email:'test@example.invalid'};},
 bw17Book_:()=>{opens++;return book;},bw55TabState_:(b,spec)=>{const s=b.getSheetByName(spec.name);return !s?'missing':spec.headers.every((v,i)=>s.rows[0][i]===v)?'ready':'mismatch';},
 bw55CreateTab_:(b,spec)=>{const s=new Sheet(spec.headers);tabs.set(spec.name,s);return s;},
 bw17Hash_:v=>crypto.createHash('sha256').update(v).digest('hex'),bw17Now_:()=> '2026-11-25 23:49:00',bw17Audit_:()=>{if(failAudit)throw Error('audit unavailable');},LockService:{getScriptLock:()=>lock}
});
vm.runInContext(server,c);
assert.throws(()=>c.staff59LaunchRead('teacher'),/권한/);assert.equal(opens,0);
const init=c.staff59LaunchRead('owner');assert.equal(init.plan.values,null);assert.equal(tabs.size,0);
const req=crypto.randomUUID(),saved=c.staff59LaunchSave('owner',{values:plan,etag:'new',requestId:req});
assert.equal(saved.ok,true);assert.equal(saved.plan.revision,1);
assert.equal(c.staff59LaunchSave('owner',{values:plan,etag:'new',requestId:req}).duplicate,true);
const modified=copy(plan);modified.tasks[0].budget=50000;
assert.throws(()=>c.staff59LaunchSave('owner',{values:modified,etag:'new',requestId:req}),/같은 저장/);
assert.throws(()=>c.staff59LaunchSave('owner',{values:modified,etag:'new',requestId:crypto.randomUUID()}),/다른 화면/);
failAudit=true;
const next=c.staff59LaunchSave('owner',{values:modified,etag:saved.plan.etag,requestId:crypto.randomUUID()});
assert.equal(next.auditWarning,true);assert.equal(next.plan.revision,2);
assert.equal(c.staff59LaunchRead('owner').plan.values.tasks[0].budget,50000);
assert.equal(tabs.size,1);assert.equal(tabs.get('BW59_개원교육홍보계획').rows.length,3);
assert.match(read('server/apps-script/StaffBridge.gs'),/staff59LaunchSave:/);
assert.match(read('server/apps-script/StudioIntegrationV55.gs'),/typeof bw59Spec_/);
console.log('PASS V59 source template, age-specific order quantities, unknown pricing, scope and revision checks');
(async()=>{
 const dom=new JSDOM(read('staff/launch/index.html'),{url:'https://bridgewonder.bridgeacademy.co.kr/staff/launch/',runScripts:'outside-only'});
 const v=dom.window,d=v.document,$=id=>d.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,15));
 v.confirm=()=>true;v.sessionStorage.setItem('bw17_staff_session','owner-token');
 let outgoing=null;
 v.BW27Bridge={request:async(name,args)=>{
  if(name==='staffCurrentUser')return {role:'owner',permissions:{read:{home:true,operations:true}}};
  if(name==='staff59LaunchRead')return {version:'59.0.0',plan:{revision:0,values:null,etag:'new'}};
  if(name==='staff59LaunchSave'){outgoing=args[1].values;return {ok:true,version:'59.0.0',plan:{revision:1,etag:'a'.repeat(32),values:outgoing}};}
  if(name==='staffLogout')return {ok:true};throw Error('unexpected '+name);
 }};
 v.eval(read('assets/js/staff-workspace-v57.js'));v.eval(model);v.eval(ui);await tick();
 assert.equal($('bw59Workspace').hidden,false);assert.equal($('bw59LessonList').children.length,4);assert.equal($('bw59Save').disabled,false);
 $('bw59LessonList').querySelector('button').click();
 assert.match($('bw59LessonEditor').textContent,/발주 2000g/);
 const findInput=(root,label)=>Array.from(root.querySelectorAll('label')).find(e=>e.querySelector('span').textContent===label).querySelector('input');
 const price=findInput($('bw59LessonEditor'),'kg당 실제 단가(원, 미확정은 공란)');price.value='5000';price.dispatchEvent(new v.Event('input',{bubbles:true}));
 assert.match($('bw59FoodKpi').textContent,/10,000원/);
 $('bw59TasksTab').click();$('bw59Group').value='홍보';$('bw59Group').dispatchEvent(new v.Event('change'));
 assert.equal($('bw59TaskList').children.length,23);
 $('bw59Search').value='아파트리';$('bw59Search').dispatchEvent(new v.Event('input'));assert.equal($('bw59TaskList').children.length,1);
 $('bw59TaskList').querySelector('button').click();
 const budget=findInput($('bw59TaskEditor'),'예산(원, 미확정 공란)');budget.value='100000';budget.dispatchEvent(new v.Event('input',{bubbles:true}));
 $('bw59Save').click();await tick();
 assert.equal(outgoing.lessons[0].price,5000);assert.equal(outgoing.tasks.find(t=>t.title==='아파트리').budget,100000);
 assert.match($('bw59State').textContent,/저장 완료/);
 dom.window.close();console.log('PASS V59 UI, editable order values and launch marketing budgets');
})().catch(e=>{console.error(e);process.exitCode=1;});
