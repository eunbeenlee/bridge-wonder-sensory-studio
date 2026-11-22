'use strict';
/* V45: offline lesson-plan library with fake Drive/Sheets. No real accounts or uploads. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const root=__dirname+'/../';
const read=name=>fs.readFileSync(root+name,'utf8');
const server=read('server/apps-script/LessonPlans.gs');
const bridge=read('server/apps-script/StaffBridge.gs');
const ui=read('assets/js/staff-lesson-plans-v45.js');
const app=read('assets/js/administration.js');
const html=read('staff/index.html');
const alt=read('staff/standalone.html');
let count=0;
async function check(label,fn){await fn();count++;console.log('PASS '+label);}
class Sheet{
  constructor(headers){this.rows=[headers.slice()];}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return this.rows[0].length;}
  appendRow(row){this.rows.push(row.slice());return this;}
  getRange(row,col,count=1,width=1){
    const sheet=this;
    return{
      getDisplayValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>String(sheet.rows[row-1+i]?.[col-1+j]??'')));},
      getValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>sheet.rows[row-1+i]?.[col-1+j]??''));},
      setValues(v){v.forEach((r,i)=>{const idx=row-1+i;sheet.rows[idx]??=Array(sheet.rows[0].length).fill('');
        r.forEach((val,j)=>sheet.rows[idx][col-1+j]=val);});return this;},
      setValue(v){sheet.rows[row-1]??=Array(sheet.rows[0].length).fill('');sheet.rows[row-1][col-1]=v;return this;}
    };
  }
  deleteRow(n){this.rows.splice(n-1,1);}
}
function fixture(){
  const tabs=new Map(),files=new Map(),folders=new Map(),props=new Map(),audits=[];let held=false,sequence=0;
  const lock={waitLock(){assert.equal(held,false,'concurrent lock');held=true;},releaseLock(){assert.equal(held,true);held=false;}};
  class File{
    constructor(name,data,mime='text/plain'){
      this.id='FILE_'+(++sequence);this.name=name;this.mime=mime;this.bytes=typeof data==='string'?Buffer.from(data,'utf8'):Buffer.from(data||[]);
      this.trashed=false;this.private=false;files.set(this.id,this);
    }
    getId(){return this.id;}
    getBlob(){const file=this;return {
      getDataAsString:()=>file.bytes.toString('utf8'),
      getBytes:()=>Array.from(file.bytes,x=>x>127?x-256:x)
    };}
    setContent(str){assert.ok(str.length<=10*1024*1024);this.bytes=Buffer.from(str,'utf8');return this;}
    setSharing(){this.private=true;return this;}
    setTrashed(yes){this.trashed=!!yes;return this;}
  }
  class Folder{
    constructor(name){this.name=name;this.id='FOLDER_'+(++sequence);folders.set(this.id,this);}
    getId(){return this.id;}
    createFile(a,b,c){
      if(typeof a==='string')return new File(a,b,c);
      return new File(a.name,a.bytes,a.mime);
    }
  }
  const util={
    getUuid:()=>crypto.randomUUID(),
    DigestAlgorithm:{SHA_256:'sha256'},
    base64Decode:t=>Array.from(Buffer.from(t,'base64'),x=>x>127?x-256:x),
    base64Encode:t=>Buffer.from(t.map(x=>(x+256)%256)).toString('base64'),
    computeDigest:(_alg,data)=>Array.from(crypto.createHash('sha256').update(typeof data==='string'?data:Buffer.from(data.map(x=>(x+256)%256))).digest(),x=>x>127?x-256:x),
    newBlob:(bytes,mime,name)=>({bytes:Buffer.from(bytes.map(x=>(x+256)%256)),mime,name})
  };
  const context=vm.createContext({
    Utilities:util,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>{props.set(k,v);}})},
    DriveApp:{Access:{PRIVATE:'private'},Permission:{NONE:'none'},
      createFolder:name=>new Folder(name),
      getFolderById:id=>{if(!folders.has(id))throw Error('folder missing');return folders.get(id);},
      getFileById:id=>{if(!files.has(id)||files.get(id).trashed)throw Error('file missing');return files.get(id);}},
    LockService:{getScriptLock:()=>lock},
    bw17Tab_:(name,headers)=>{if(!tabs.has(name))tabs.set(name,new Sheet(headers));return tabs.get(name);},
    bw17Read_:(tab,max)=>{if(!tab||tab.rows.length<2)return {headers:[],rows:[]};
      const start=Math.max(2,tab.rows.length-(max||200)+1);
      return {headers:tab.rows[0],rows:tab.rows.slice(start-1),start};},
    bw17Safe_:(v,n)=>String(v??'').trim().slice(0,n),
    bw17Hash_:v=>crypto.createHash('sha256').update(String(v)).digest('hex'),
    bw17Audit_:(actor,action,target)=>audits.push({actor,action,target}),
    bw24Authorized_:(token,module,mode,roles)=>{
      if(!['owner','director','teacher'].includes(token)||!roles.includes(token)||module!=='themes'||(token==='teacher'&&mode==='write'))throw Error('접근 권한이 없습니다.');
      return {email:token+'@example.invalid',role:token};
    },
    bw24Can_:(u,module,mode)=>module==='themes'&& (u.role!=='teacher'||mode==='read')
  });
  new vm.Script(server,{filename:'LessonPlans.gs'}).runInContext(context);
  const uuid=()=>crypto.randomUUID();
  const meta=(filename,size,extra={})=>({filename,size,requestId:uuid(),...extra});
  const upload=(token,filename,bytes,extra={})=>{
    const payload=meta(filename,bytes.length,extra);
    const begin=context.staff45BeginLessonPlan(token,payload);
    const chunks=[];
    for(let n=0;n<bytes.length;n+=180*1024)chunks.push(bytes.slice(n,n+180*1024));
    for(let i=0;i<chunks.length;i++)context.staff45AppendLessonPlanChunk(token,{uploadId:begin.uploadId,index:i,base64:chunks[i].toString('base64')});
    return {begin,finished:context.staff45FinishLessonPlan(token,begin.uploadId)};
  };
  return {context,props,files,folders,tabs,audits,meta,upload,uuid};
}
(async()=>{
  await check('staff bridge allowlists seven new methods, without public routes or credentials',()=>{
    for(const method of ['staff45ListLessonPlans','staff45BeginLessonPlan','staff45AppendLessonPlanChunk',
      'staff45FinishLessonPlan','staff45DownloadLessonPlan','staff45UpdateLessonPlan','staff45ArchiveLessonPlan']){
      assert.match(bridge,new RegExp(method+':\\s*'+method));
    }
    assert.doesNotMatch(server,/doGet\s*\(|doPost\s*\(|MailApp|setSharing\(DriveApp.Access.ANYONE/);
    assert.doesNotMatch(ui,/fetch\s*\(|localStorage|sessionStorage|google\.script\.run|SPREADSHEET_ID|OWNER_EMAIL/);
  });
  const f=fixture(),c=f.context;
  const bytes=Buffer.from('%PDF-1.7\nA PRIVATE SYNTHETIC LESSON PLAN');
  await check('upload requires owner/director themes-write authorization and a supported file',()=>{
    assert.throws(()=>c.staff45BeginLessonPlan('teacher',f.meta('plan.pdf',bytes.length)),/접근 권한/);
    assert.throws(()=>c.staff45BeginLessonPlan('owner',f.meta('script.html',4)),/지원하지 않는/);
    assert.throws(()=>c.staff45BeginLessonPlan('owner',f.meta('large.pdf',5*1024*1024+1)),/5MB/);
  });
  let first;
  await check('owner creates and downloads an intact private PDF with no public Drive URL',()=>{
    first=f.upload('owner','plan.pdf',bytes,{title:'사계절 감각놀이',age:'7~12개월',month:'2027-01'});
    assert.equal(first.finished.ok,true);assert.equal(first.finished.plan.version,1);
    const rows=c.staff45ListLessonPlans('owner');
    assert.equal(rows.items.length,1);
    assert.equal(rows.items[0].title,'사계절 감각놀이');
    assert.equal(rows.items[0].age,'7~12개월');
    assert.ok(!JSON.stringify(rows).includes('FILE_'));
    const d=c.staff45DownloadLessonPlan('teacher',{planId:first.begin.planId,version:1});
    assert.deepEqual(Buffer.from(d.base64,'base64'),bytes);
    assert.ok([...f.files.values()].some(file=>file.name.endsWith('plan.pdf')&&file.private));
    assert.ok([...f.files.values()].some(file=>file.name.endsWith('.b64')&&file.trashed));
  });
  await check('request ID is idempotent and duplicate chunk replay cannot corrupt data',()=>{
    const p=f.meta('retry.pdf',bytes.length);
    const a=c.staff45BeginLessonPlan('director',p),repeat=c.staff45BeginLessonPlan('director',p);
    assert.equal(a.uploadId,repeat.uploadId);
    const chunk=bytes.toString('base64');
    let x=c.staff45AppendLessonPlanChunk('director',{uploadId:a.uploadId,index:0,base64:chunk});
    assert.equal(x.uploaded,bytes.length);
    x=c.staff45AppendLessonPlanChunk('director',{uploadId:a.uploadId,index:0,base64:chunk});
    assert.equal(x.replayed,true);
    assert.throws(()=>c.staff45AppendLessonPlanChunk('director',{uploadId:a.uploadId,index:0,base64:Buffer.from('%PDF-Other').toString('base64')}),/순서/);
    assert.throws(()=>c.staff45FinishLessonPlan('owner',a.uploadId),/본인이 시작/);
    assert.equal(c.staff45FinishLessonPlan('director',a.uploadId).plan.version,1);
    assert.equal(c.staff45FinishLessonPlan('director',a.uploadId).replayed,true);
  });
  await check('failed signature rejects deceptive PDF even with a matching extension',()=>{
    const bad=f.meta('fake.pdf',6);
    const started=c.staff45BeginLessonPlan('owner',bad);
    c.staff45AppendLessonPlanChunk('owner',{uploadId:started.uploadId,index:0,base64:Buffer.from('NOFILE').toString('base64')});
    assert.throws(()=>c.staff45FinishLessonPlan('owner',started.uploadId),/PDF 파일/);
    assert.equal(c.staff45ListLessonPlans('owner').items.length,2,'no visible malformed file');
  });
  await check('replacing a plan increments the version and preserves the older original',()=>{
    const second=Buffer.from('%PDF-1.7\nSECOND VERSION');
    const update=f.upload('owner','plan-revised.pdf',second,{planId:first.begin.planId,title:'수정한 감각놀이'});
    assert.equal(update.finished.plan.version,2);
    const list=c.staff45ListLessonPlans('owner');
    assert.equal(list.items.find(x=>x.id===first.begin.planId).version,2);
    assert.equal(list.versions.filter(x=>x.id===first.begin.planId).length,2);
    const original=c.staff45DownloadLessonPlan('owner',{planId:first.begin.planId,version:1});
    assert.deepEqual(Buffer.from(original.base64,'base64'),bytes);
    assert.deepEqual(Buffer.from(c.staff45DownloadLessonPlan('owner',{planId:first.begin.planId,version:2}).base64,'base64'),second);
  });
  await check('edit metadata, archive and restore without losing versions',()=>{
    const id=first.begin.planId;
    c.staff45UpdateLessonPlan('director',{planId:id,title:'새 제목',month:'2027-02',age:'36~48개월',note:'월령별 난이도'});
    assert.equal(c.staff45ListLessonPlans('owner').items.find(x=>x.id===id).title,'새 제목');
    c.staff45ArchiveLessonPlan('owner',{planId:id,archived:true});
    assert.ok(!c.staff45ListLessonPlans('teacher').items.some(x=>x.id===id));
    assert.throws(()=>c.staff45DownloadLessonPlan('teacher',{planId:id,version:1}),/보관된/);
    c.staff45ArchiveLessonPlan('owner',{planId:id,archived:false});
    assert.ok(c.staff45ListLessonPlans('teacher').items.some(x=>x.id===id));
    assert.throws(()=>c.staff45UpdateLessonPlan('teacher',{planId:id,title:'unauthorized'}),/접근 권한/);
  });
  await check('each staff entrypoint loads V45 before main app, public site has no import',()=>{
    for(const text of [html,alt]){
      assert.ok(text.indexOf('staff-lesson-plans-v45.js?v=45.0.0')>
        text.indexOf('staff-enterprise-v33.js?v=49.0.0'));
      assert.ok(text.indexOf('staff-lesson-plans-v45.js?v=45.0.0')<
        text.indexOf('administration.js?v=53.0.0'));
    }
    assert.match(app,/BW45LessonPlans\.mount/);
    assert.match(app,/수업안 파일 관리/);
    assert.doesNotMatch(read('sensory-studio/index.html'),/staff-lesson-plans-v45/);
    assert.doesNotMatch(read('sensory-studio/enroll/index.html'),/staff45/);
  });
  await check('client honors missing backend, avoids imaginary success, and keeps monthly plan',async()=>{
    const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body><div id="workspace"><div id="pageBody"><section class="panel">원래 월간 계획</section></div></div></body></html>',{
      url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true
    });
    dom.window.eval(ui);
    dom.window.BW45LessonPlans.mount({root:dom.window.document.getElementById('pageBody'),
      token:'fixture-token',canEdit:true,isCurrent:()=>true,call:()=>Promise.reject(Error('허용되지 않은 업무 요청')),toast:()=>{}});
    await new Promise(resolve=>setImmediate(resolve));
    const screen=dom.window.document.getElementById('pageBody');
    assert.ok(screen.textContent.includes('원래 월간 계획'));
    assert.match(screen.textContent,/직원용 관리 서버를 업데이트해야 합니다/);
    assert.ok(dom.window.document.querySelector('#bw45File'));
    dom.window.close();
  });
  await check('client format-neutral upload uses bounded chunks and keeps a versionable file',async()=>{
    const d=new JSDOM('<!doctype html><html lang="ko"><head></head><body><div id="workspace"><div id="pageBody"><section class="panel">월간 계획</section></div></div></body></html>',{
      url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true
    });
    const w=d.window;
    w.eval(ui);
    const calls=[],plan={id:'BW-LP-'+'1'.repeat(24),title:'가상 수업',status:'사용',version:1,filename:'demo.pdf',month:'',age:'전체(7~48개월)',size:bytes.length};
    const mock=async(name,_token,args)=>{
      calls.push(name);
      if(name==='staff45ListLessonPlans')return {items:[],versions:[],canEdit:true};
      if(name==='staff45BeginLessonPlan')return {uploadId:'BW-UP-'+('2'.repeat(24)),chunkBytes:180*1024,nextIndex:0};
      if(name==='staff45AppendLessonPlanChunk'){assert.deepEqual(Buffer.from(args.base64,'base64'),bytes);return {uploaded:bytes.length};}
      if(name==='staff45FinishLessonPlan')return {ok:true,plan};
      throw Error('Unexpected call '+name);
    };
    w.BW45LessonPlans.mount({root:w.document.getElementById('pageBody'),token:'owner',
      canEdit:true,isCurrent:()=>true,call:mock,toast:()=>{}});
    await new Promise(resolve=>setImmediate(resolve));
    const file={name:'demo.pdf',size:bytes.length,slice:(a,b)=>({arrayBuffer:async()=>Uint8Array.from(bytes.slice(a,b)).buffer})};
    Object.defineProperty(w.document.getElementById('bw45File'),'files',{configurable:true,value:[file]});
    const fform=w.document.getElementById('bw45Upload');
    fform.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    for(let j=0;j<6;j++)await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls.slice(1,4),['staff45BeginLessonPlan','staff45AppendLessonPlanChunk','staff45FinishLessonPlan']);
    assert.match(w.document.getElementById('bw45Message').textContent,/수업안을 저장했습니다/);
    assert.equal(w.document.querySelector('#bw45LessonPlans').isConnected,true);
    d.window.close();
  });
  await check('upload bundle includes only new staff GAS files',()=>{
    const builder=read('tools/build-lesson-plan-install-v45.py');
    assert.match(builder,/LessonPlans\.gs/);
    assert.match(builder,/StaffBridge\.gs/);
    assert.doesNotMatch(builder,/sensory-studio\/enroll\/|PublicRegistration\.gs/);
    assert.match(bridge,/const BW27_MAX_BODY_ = 350000/);
    assert.ok(f.audits.length>=4);
  });
  console.log(JSON.stringify({suite:'V45 lesson-plan library',passed:count}));
})().catch(err=>{console.error(err);process.exitCode=1;});
