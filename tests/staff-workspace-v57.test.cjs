'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shell=read('assets/js/staff-workspace-v57.js');
const content=read('assets/js/staff-content-v51.js');
const pages=['staff/index.html','staff/standalone.html',...['content','costs','curriculum','materials','settings','templates','integration','planning'].map(p=>'staff/'+p+'/index.html')];
for(const page of pages){
 const html=read(page);assert.match(html,/id="bw57WorkspaceNav"/);
 assert.match(html,/staff-workspace-v57\.js\?v=57\.0\.0/);
 assert.match(html,/staff-workspace-v57\.css\?v=57\.0\.0/);
 assert.doesNotMatch(html,/staff-v52-beaver/);
}
const user={role:'owner',name:'fixture',permissions:{read:{finance:true,themes:true,courseSettings:true,documents:true,classes:true},write:{finance:true,themes:true,courseSettings:true,documents:true}}};
{
 const dom=new JSDOM('<nav id="bw57WorkspaceNav" hidden></nav>',{url:'https://bridgewonder.bridgeacademy.co.kr/staff/materials/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.eval(shell);
 assert.equal(d.querySelector('nav').hidden,true);
 w.BW57Workspace.setUser(user);
 assert.ok(d.querySelector('a[href="/staff/planning/"]'));
 assert.ok(d.querySelector('a[href="/staff/materials/"][aria-current="page"]'));
 assert.equal(d.querySelector('a[href*="inquiries"]'),null);
 let confirms=0;w.confirm=()=>{confirms++;return false;};w.BW57Workspace.setGuard(()=> '저장되지 않은 입력');
 const link=d.querySelector('a[href="/staff/planning/"]');
 assert.equal(link.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0})),false);
 assert.equal(confirms,1);assert.equal(w.BW57Workspace.confirmLeave(),false);
 w.BW57Workspace.setUser({role:'teacher',permissions:{read:{themes:true,finance:true,courseSettings:true}}});
 assert.equal(d.querySelector('a[href="/staff/planning/"]'),null);
 assert.equal(d.querySelector('a[href="/staff/settings/"]'),null);
 assert.ok(d.querySelector('a[href="/staff/curriculum/"]'));
 w.BW57Workspace.clearUser();assert.equal(d.querySelector('nav').hidden,true);
 assert.equal(w.BW57Workspace.confirmLeave(),true);dom.window.close();
}
console.log('PASS permission-based shared navigation and dirty navigation protection');
class Sheet{
 constructor(headers){this.rows=[headers.slice()];}
 getLastRow(){return this.rows.length;}
 getRange(r,c,n=1,m=1){
  const self=this;return {getDisplayValues(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>String(self.rows[r+i-1]?.[c+j-1]??'')));},
   setValues(values){for(let i=0;i<n;i++){const row=self.rows[r+i-1]||(self.rows[r+i-1]=[]);for(let j=0;j<m;j++)row[c+j-1]=values[i][j];}return this;},
   setNumberFormat(){return this;},setValue(v){return this.setValues([[v]]);}
  };
 }
}
const tabs=new Map();let auditFails=false;
const ctx=vm.createContext({
 bw24Authorized_:(token,mod,mode,roles)=>{if(token!=='owner'||!roles.includes('owner'))throw Error('권한 없음');return {role:'owner',email:'test@example.invalid'};},
 bw24Can_:()=>true,bw17Book_:()=>({getSheetByName:n=>tabs.get(n)||null}),
 bw17Tab_:(name,h,create)=>{if(!tabs.has(name)&&create)tabs.set(name,new Sheet(h));return tabs.get(name)||null;},
 bw17Now_:()=> '2026-11-25 00:00:00',bw17Hash_:s=>crypto.createHash('sha256').update(s).digest('hex'),
 bw17Audit_:()=>{if(auditFails)throw Error('audit');},Utilities:{getUuid:()=>crypto.randomUUID()},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}
});
vm.runInContext(read('server/apps-script/StudioContentV51.gs'),ctx);
const id=crypto.randomUUID(),payload={section:'materials',id:'',etag:'',requestId:id,category:'종이',title:'도화지',content:'준비물',amount:1000,unit:'팩',effectiveDate:'2027-01-01',status:'사용',extra:{}};
auditFails=true;
const first=ctx.staff51SaveContent('owner',payload);
assert.equal(first.ok,true);assert.equal(first.auditWarning,true);assert.equal(first.item.id,'BW51-'+id);
assert.equal(ctx.staff51SaveContent('owner',payload).duplicate,true);
assert.throws(()=>ctx.staff51SaveContent('owner',{...payload,amount:2000}),/같은 요청/);
const revised=ctx.staff51SaveContent('owner',{...payload,id:first.item.id,etag:first.item.etag,requestId:crypto.randomUUID(),amount:2000});
assert.equal(revised.item.amount,2000);
assert.throws(()=>ctx.staff51SaveContent('owner',payload),/이미 생성/);
assert.equal(tabs.get('BW51_재료목록').rows.length,2);
const archived=ctx.staff51ArchiveContent('owner',{section:'materials',id:revised.item.id,etag:revised.item.etag});
assert.equal(archived.auditWarning,true);assert.equal(archived.item.status,'보관');
console.log('PASS stable content create IDs, changed-payload rejection, no duplicate on old retry and audit warnings');
(async()=>{
 const dom=new JSDOM(read('staff/content/index.html'),{url:'https://bridgewonder.bridgeacademy.co.kr/staff/content/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,el=id=>d.getElementById(id);
 const tick=()=>new Promise(r=>setTimeout(r,15));
 w.confirm=()=>true;w.sessionStorage.setItem('bw17_staff_session','owner-token');
 const items=Array.from({length:105},(_,i)=>({id:'item-'+i,etag:'etag-'+i,title:'항목 '+i,category:'분류',content:'테스트',unit:'',status:'사용',amount:null,extra:{},updatedAt:'오늘'}));
 let attempts=[],listCount=0,release=null,hold=false;
 const response=()=>({section:'copy',signature:'sig',canWrite:true,items,checkedAt:'now'});
 w.BW27Bridge={request:async(name,args)=>{
   if(name==='staffCurrentUser')return user;
   if(name==='staff51ListContent'){listCount++;if(hold)return new Promise(r=>release=()=>r(response()));return response();}
   if(name==='staff51SaveContent'){
     attempts.push(args[1]);if(attempts.length===1)throw Error('timeout');
     return {ok:true,item:{...args[1],id:'new-item',etag:'new-etag',updatedAt:'now'}};
   }
   if(name==='staffLogout')return {ok:true};throw Error('unexpected '+name);
 }};
 w.eval(shell);w.eval(content);await tick();
 assert.equal(el('app').hidden,false);assert.equal(el('items').querySelectorAll('.entry-card').length,50);
 assert.equal(el('bw57More').hidden,false);el('bw57More').click();assert.equal(el('items').querySelectorAll('.entry-card').length,100);
 el('title').value='새 안내';el('title').dispatchEvent(new w.Event('input',{bubbles:true}));
 el('content').value='새 내용';el('content').dispatchEvent(new w.Event('input',{bubbles:true}));
 const submit=()=>el('entryForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 submit();await tick();assert.equal(attempts.length,1);submit();await tick();
 assert.equal(attempts.length,2);assert.equal(attempts[0].requestId,attempts[1].requestId);
 assert.equal(el('entryId').value,'new-item');assert.equal(listCount,1,'save uses the acknowledged item instead of a full list fetch');
 hold=true;el('refreshBtn').click();await tick();assert.ok(release);el('logout').click();release();await tick();
 assert.equal(el('app').hidden,true);assert.equal(el('items').children.length,0);assert.equal(el('bw57WorkspaceNav').hidden,true);
 dom.window.close();
 console.log('PASS content page pagination, acknowledged local update, retry ID reuse, logout response isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
