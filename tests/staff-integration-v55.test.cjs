'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const code=read('server/apps-script/StudioIntegrationV55.gs');
const content=read('server/apps-script/StudioContentV51.gs');
class Sheet{
 constructor(name){this.name=name;this.rows=[];}
 getLastRow(){return this.rows.length;}
 setFrozenRows(){return this;}
 getRange(r,c,n=1,m=1){const self=this;return {
   getValues(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>self.rows[r+i-1]?.[c+j-1]??''));},
   getDisplayValues(){return this.getValues().map(row=>row.map(x=>String(x??'')));},
   setValues(values){for(let i=0;i<n;i++){const row=self.rows[r+i-1]||(self.rows[r+i-1]=[]);for(let j=0;j<m;j++)row[c+j-1]=values[i][j];}return this;},
   setBackground(){return this;},setFontColor(){return this;},setFontWeight(){return this;},setNumberFormat(){return this;}
 };}
}
const books=new Map(),props=new Map(),audit=[];
let isEditor=false,lock=false,opens=0,creates=0;
const book={getSheetByName:n=>books.get(n)||null,insertSheet:n=>{assert.ok(!books.has(n));const s=new Sheet(n);books.set(n,s);creates++;return s;}};
const mk=(name,h)=>{const sheet=book.insertSheet(name);sheet.getRange(1,1,1,h.length).setValues([h]);return sheet;};
const session=(token,mod,mode,roles)=>{if(token!=='owner'||!roles.includes('owner'))throw Error('권한 없음');return {role:'owner',email:'fixture@example.invalid'};};
const ctx=vm.createContext({
 BW17:{USERS:'accounts',USER_HEADERS:['account'],INQUIRIES:'inq',REGISTRATIONS:'reg',CLASSES:'classes',CLASS_HEADERS:['class'],TEMPLATES:'contracts'},
 BW37:{STUDENTS:'students',STUDENT_HEADERS:['id'],EXPERIENCES:'experiences',EXPERIENCE_HEADERS:['month']},
 BW45:{PLANS:'plans',PLAN_HEADERS:['id'],UPLOADS:'uploads',UPLOAD_HEADERS:['id']},
 BW49:{SETTINGS:'finance',SETTINGS_HEADERS:['rev'],ENTRIES:'ledger',ENTRY_HEADERS:['id']},
 BWP26_:{EMP:'pay1',RUN:'pay2',SETTINGS:'pay3',AUDIT:'pay4',HEADERS:['id'],AUDIT_HEADERS:['audit']},
 bw24Authorized_:session,bw24Can_:()=>true,bw24RequireEditorOwner_:()=>{if(!isEditor)throw Error('원장 편집기 필요');},
 bw17Book_:()=>{opens++;return book;},bw17Config_:()=>({}),bw17Tab_:(name,h,create)=>book.getSheetByName(name)||(create?mk(name,h):null),
 bw17Now_:()=> '2026-11-25 00:00:00',
 bw17Hash_:s=>crypto.createHash('sha256').update(s).digest('hex'),
 bw17Audit_:(...args)=>audit.push(args),
 Utilities:{getUuid:()=>crypto.randomUUID()},
 LockService:{getScriptLock:()=>({waitLock(){assert.equal(lock,false);lock=true;},releaseLock(){assert.equal(lock,true);lock=false;}})},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},
 ContentService:{MimeType:{JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})}
});
new vm.Script(content).runInContext(ctx);new vm.Script(code).runInContext(ctx);
const run=name=>vm.runInContext(name,ctx);
for(const [name,headers] of [['accounts',['account']],['inq',['id']],['reg',['id']],['classes',['class']],['contracts',['code']]])mk(name,headers);
const first=creates;
assert.throws(()=>ctx.staff55SystemStatus('teacher'),/권한/);
assert.throws(()=>ctx.staff55ReadPricing('teacher'),/권한/);
assert.throws(()=>ctx.staff55SavePricing('teacher',{}),/권한/);
assert.throws(()=>ctx.staff55PublishPricing('teacher',{}),/권한/);
assert.equal(opens,0);
assert.throws(()=>ctx.setupBridgeWonderV55(),/편집기/);
assert.equal(creates,first);
isEditor=true;
const broken=mk('finance',['bad']);
assert.throws(()=>ctx.setupBridgeWonderV55(),/기존 대장/);
assert.equal(creates,first+1,'preflight must block all additions');
books.delete('finance');
const installed=ctx.setupBridgeWonderV55();
assert.ok(installed.created.length>=12);
assert.equal(installed.payrollSetupNeeded,true);
assert.equal(ctx.setupBridgeWonderV55().created.length,0);
assert.equal(lock,false);
const report=ctx.staff55SystemStatus('owner');
assert.equal(report.version,'55.0.0');
assert.equal(report.ready,false);
assert.ok(report.tabs.some(t=>t.group==='payroll'&&t.state==='missing'));
assert.doesNotMatch(JSON.stringify(report),/fixture@|SPREADSHEET_ID|OWNER_EMAIL/);
const propKey='BW55_PUBLIC_PRICE_SNAPSHOT';
const initial=ctx.staff55ReadPricing('owner');
assert.equal(initial.draft.saved,false);
assert.equal(initial.draft.values.weeks,10);assert.equal(initial.draft.values.total,320000);
assert.equal(initial.published,null);
assert.throws(()=>ctx.staff55PublishPricing('owner',{etag:'new',confirm:true}),/공개 승인/);
let req=crypto.randomUUID();
let saved=ctx.staff55SavePricing('owner',{etag:'new',requestId:req,values:{weeks:10,total:320000}});
assert.equal(saved.ok,true);assert.equal(saved.draft.revision,1);assert.equal(saved.published,null);assert.equal(props.has(propKey),false);
assert.equal(ctx.staff55SavePricing('owner',{etag:'new',requestId:req,values:{weeks:10,total:320000}}).duplicate,true);
assert.throws(()=>ctx.staff55SavePricing('owner',{etag:'new',requestId:req,values:{weeks:9,total:320000}}),/동일 저장/);
assert.throws(()=>ctx.staff55SavePricing('owner',{etag:'new',requestId:crypto.randomUUID(),values:{weeks:9,total:320000}}),/다른 화면/);
assert.throws(()=>ctx.staff55SavePricing('owner',{etag:saved.draft.etag,requestId:crypto.randomUUID(),values:{weeks:0,total:320000}}),/범위/);
assert.throws(()=>ctx.staff55PublishPricing('owner',{etag:saved.draft.etag,confirm:false}),/공개 승인/);
const pricing=books.get('BW55_정규과정요금');
pricing.rows[1][2]=350000; // authorized direct sheet edit changes the content etag
assert.throws(()=>ctx.staff55PublishPricing('owner',{etag:saved.draft.etag,confirm:true}),/최신 저장/);
let fresh=ctx.staff55ReadPricing('owner');
assert.equal(fresh.draft.values.total,350000);
const published=ctx.staff55PublishPricing('owner',{etag:fresh.draft.etag,confirm:true});
assert.equal(published.published.total,350000);
pricing.rows[1][1]=12;pricing.rows[1][2]=400000;
const after=ctx.staff55ReadPricing('owner');
assert.equal(after.draft.values.total,400000);
assert.equal(after.published.total,350000);
assert.equal(after.pending,true);
let output;
vm.runInNewContext(run('bw55PublicPricingScript_()').text,{window:{BWPublicPricing:{receive:v=>output=v}}});
assert.equal(output.ok,true);assert.equal(output.price.weeks,10);assert.equal(output.price.total,350000);
assert.deepEqual(Object.keys(output.price).sort(),['total','weeks']);
assert.doesNotMatch(JSON.stringify(output),/fixture@|etag|revision|requestId/);
props.set(propKey,'{bad json');
vm.runInNewContext(run('bw55PublicPricingScript_()').text,{window:{BWPublicPricing:{receive:v=>output=v}}});
assert.equal(output.ok,false);
assert.equal(lock,false);
const material=books.get('BW51_재료목록');
material.rows[0][0]='wrong header';
assert.throws(()=>ctx.staff51ListContent('owner','materials',''),/열 구성/);
assert.equal(material.rows[0][0],'wrong header');
const bridge=read('server/apps-script/StaffBridge.gs');
for(const method of ['staff55SystemStatus','staff55ReadPricing','staff55SavePricing','staff55PublishPricing'])assert.match(bridge,new RegExp(method+':'));
assert.doesNotMatch(bridge,/setupBridgeWonderV55\s*:/);
assert.match(read('server/apps-script/Code.gs'),/view==='pricing-v55'/);
const web=read('assets/js/public-pricing-v55.js');
new vm.Script(web);
for(const p of ['sensory-studio/index.html','sensory-studio/programs/index.html','sensory-studio/experience/index.html','sensory-studio/visit/index.html']){
 const html=read(p);assert.match(html,/public-pricing-v55\.js/);assert.match(html,/data-bw55-price=/);assert.match(html,/320,000원/);
 const dom=new JSDOM(html,{url:'https://bridgewonder.bridgeacademy.co.kr/'+p,runScripts:'outside-only'});
 const w=dom.window;w.eval(web);
 w.BWPublicPricing.receive({ok:true,price:{weeks:12,total:480000}});
 const marked=Array.from(w.document.querySelectorAll('[data-bw55-price]')).map(el=>el.textContent).join(' ');
 assert.match(marked,/480,000원/);assert.doesNotMatch(marked,/320,000원|10주/);
 dom.window.close();
}
(async()=>{
 const html=read('staff/integration/index.html'),ui=read('assets/js/staff-integration-v55.js');
 const dom=new JSDOM(html,{url:'https://bridgewonder.bridgeacademy.co.kr/staff/integration/',runScripts:'outside-only'});
 const w=dom.window,doc=w.document;
 let methods=[];
 w.BW27Bridge={request:async(name,args)=>{
   methods.push(name);
   if(name==='staffCurrentUser')return {role:'owner'};
   if(name==='staff55SystemStatus')return {version:'55.0.0',ready:false,tabs:[{group:'pricing',name:'test pricing',state:'missing'}]};
   if(name==='staff55ReadPricing')return {version:'55.0.0',draft:{saved:false,revision:0,etag:'new',values:{weeks:10,total:320000}},published:null,pending:true};
   if(name==='staff55SavePricing')return {ok:true,version:'55.0.0',draft:{saved:true,revision:1,etag:'a'.repeat(32),values:args[1].values},published:null,pending:true};
   if(name==='staff55PublishPricing')return {ok:true,version:'55.0.0',draft:{saved:true,revision:1,etag:'a'.repeat(32),values:{weeks:10,total:320000}},published:{weeks:10,total:320000},pending:false};
   throw Error('unexpected');
 }};
 w.confirm=()=>true;w.sessionStorage.setItem('bw17_staff_session','fixture-token');
 w.eval(ui);await new Promise(r=>setTimeout(r,10));
 assert.equal(doc.getElementById('bw55Workspace').hidden,false);
 assert.equal(doc.getElementById('bw55Publish').disabled,true);
 assert.equal(doc.getElementById('bw55Save').disabled,false);
 doc.getElementById('bw55PriceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(r=>setTimeout(r,10));
 assert.ok(methods.includes('staff55SavePricing'));
 assert.equal(doc.getElementById('bw55Publish').disabled,false);
 doc.getElementById('bw55Publish').click();await new Promise(r=>setTimeout(r,10));
 assert.ok(methods.includes('staff55PublishPricing'));
 assert.match(doc.getElementById('bw55Published').textContent,/320,000원/);
 assert.equal(doc.getElementById('bw55Publish').disabled,true);
 dom.window.close();
 console.log('V55 integrated setup, access, schema, pricing approval, direct edits, public isolation and UI passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
