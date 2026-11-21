'use strict';
/* V45 — private lesson files; all users and file contents in this suite are synthetic. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const backend=read('server/apps-script/LessonPlans.gs');
const bridge=read('server/apps-script/StaffBridge.gs');
const client=read('assets/js/staff-lesson-library-v45.js');
const admin=read('assets/js/administration.js');
const style=read('assets/css/staff-lesson-library-v45.css');
const packageScript=read('tools/build-gas-install-package.py');
let passed=0;
const check=(label,fn)=>{fn();passed++;console.log('PASS '+label);};
function fixture() {
  let files=0,folders=0,writeOps=0,held=false;
  const folderMap=new Map(),fileMap=new Map(),props=new Map(),audits=[];
  let sheet=null;
  class Folder {
    constructor(name){this.name=name;this.id='folder-'+(++folders);this.entries=[];folderMap.set(this.id,this);this.trashed=false;}
    getId(){return this.id;}
    setSharing(){return this;}
    createFolder(name){return new Folder(name);}
    setTrashed(v){this.trashed=Boolean(v);}
    createFile(blob){
      const id='file-'+(++files);
      const value={id,name:blob.name,bytes:blob.bytes.slice(),mime:blob.mime,
        getId(){return this.id;},setSharing(){return this;},
        getBlob(){return {getBytes:()=>this.bytes.slice()};}};
      this.entries.push(value);fileMap.set(id,value);return value;
    }
    getFilesByName(name){
      const a=this.entries.filter(x=>x.name===name);let i=0;
      return {hasNext:()=>i<a.length,next:()=>a[i++]};
    }
  }
  class Sheet {
    constructor(headers){this.rows=[Array.from(headers)];}
    getLastRow(){return this.rows.length;}
    appendRow(row){this.rows.push(Array.from(row));writeOps++;return this;}
    getRange(row,column,nRows=1,nCols=1){
      const self=this;
      return {
        getDisplayValues:()=>Array.from({length:nRows},(_,i)=>Array.from({length:nCols},(_,j)=>
          String(self.rows[row-1+i]?.[column-1+j]??''))),
        setValues(values){writeOps++;values.forEach((line,i)=>{self.rows[row+i-1]??=[];line.forEach((v,j)=>{self.rows[row+i-1][column+j-1]=v;});});return this;}
      };
    }
  }
  const sha=bytes=>Array.from(crypto.createHash('sha256').update(Buffer.from(bytes.map(x=>(x+256)%256))).digest(),x=>x>127?x-256:x);
  const propsApi={getProperty:key=>props.get(key)||null,setProperty:(key,value)=>{props.set(key,value);}};
  const auth={
    owner:{role:'owner',email:'owner@example.invalid'},
    director:{role:'director',email:'director@example.invalid'},
    teacher:{role:'teacher',email:'teacher@example.invalid'},
    frontdesk:{role:'frontdesk',email:'frontdesk@example.invalid'}
  };
  const ctx=vm.createContext({
    DriveApp:{Access:{PRIVATE:'private'},Permission:{NONE:'none'},
      createFolder:name=>new Folder(name),
      getFolderById:id=>{const f=folderMap.get(id);if(!f)throw Error('Missing folder');return f;},
      getFileById:id=>{const f=fileMap.get(id);if(!f)throw Error('Missing file');return f;}},
    Utilities:{
      getUuid:()=>{const n=(files+folders+writeOps+1).toString(16).padStart(12,'0');return '10000000-2000-4000-8000-'+n;},
      newBlob:(bytes,mime,name)=>({bytes:Array.from(bytes),mime,name}),
      base64Decode:text=>Array.from(Buffer.from(text,'base64'),x=>x>127?x-256:x),
      base64Encode:bytes=>Buffer.from(bytes.map(x=>(x+256)%256)).toString('base64'),
      computeDigest:(_algorithm,bytes)=>sha(Array.from(bytes)),
      DigestAlgorithm:{SHA_256:'sha256'}
    },
    PropertiesService:{getScriptProperties:()=>propsApi},
    LockService:{getScriptLock:()=>({waitLock:()=>{assert.equal(held,false);held=true;},releaseLock:()=>{assert.equal(held,true);held=false;}})}
  });
  new vm.Script(backend,{filename:'LessonPlans.gs'}).runInContext(ctx);
  ctx.bw17Tab_=(name,headers,create)=>{
    assert.equal(name,'운영_수업안자료');
    if(!sheet&&create)sheet=new Sheet(headers);
    return sheet;
  };
  ctx.bw24Authorized_=(token,module,mode,roles)=>{
    const u=auth[token];
    if(!u||module!=='themes'||!roles.includes(u.role))throw Error('권한 없는 요청');
    if(mode==='write'&&!['owner','director'].includes(u.role))throw Error('권한 없는 요청');
    return u;
  };
  ctx.bw17Now_=()=> '2026-11-21 20:35:00';
  ctx.bw17Audit_=(u,action,target,result,note)=>audits.push({email:u.email,action,target,result,note});
  return {ctx,props,folderMap,fileMap,audits,getSheet:()=>sheet,getWrites:()=>writeOps,getFiles:()=>files};
}
check('new file module exports private authenticated functions without public read endpoints',()=>{
  new vm.Script(backend,{filename:'LessonPlans.gs'});
  for(const name of ['staff45ListLessons','staff45BeginLesson','staff45UploadPart','staff45FinishLesson',
    'staff45AbortLesson','staff45SaveLesson','staff45ArchiveLesson','staff45DownloadLesson'])
    assert.match(backend,new RegExp('function '+name+'\\('));
  assert.doesNotMatch(backend,/function doGet|function doPost|AnyoneWithLink|ANYONE|publicUrl|setSharing\(DriveApp\.Access\.ANYONE/);
  assert.match(bridge,/BW27_MAX_BODY_ = 350000/);
  assert.match(backend,/PART_BYTES:160\*1024/);
  assert.ok(Math.ceil((160*1024)/3)*4<350000);
});
const fx=fixture(),c=fx.ctx;
const byteArray=Array.from(Buffer.alloc(190000,65));[37,80,68,70,45].forEach((v,i)=>byteArray[i]=v);
const data=Buffer.from(byteArray);
const meta={fileName:'봄 색놀이.pdf',title:'봄 색놀이',month:'2027-03',age:'19~24개월',note:'그림책과 색 재료',size:data.length};
check('only authorized managers start uploads and malformed filenames/oversize are rejected',()=>{
  assert.throws(()=>c.staff45BeginLesson('teacher',meta),/권한/);
  assert.throws(()=>c.staff45BeginLesson('frontdesk',meta),/권한/);
  assert.throws(()=>c.staff45BeginLesson('owner',{...meta,fileName:'malicious.html'}),/지원하지 않는/);
  assert.throws(()=>c.staff45BeginLesson('owner',{...meta,size:9*1024*1024}),/8MB/);
  assert.throws(()=>c.staff45BeginLesson('owner',{...meta,title:''}),/제목/);
  assert.equal(fx.getFiles(),0);
});
const started=c.staff45BeginLesson('owner',meta);
check('upload session is private, metadata only; pending can be cleaned later',()=>{
  assert.ok(/^LP-/.test(started.id));
  assert.equal(started.parts,2);
  assert.equal(c.staff45ListLessons('owner').length,1);
  assert.equal(c.staff45ListLessons('teacher').length,0);
  assert.ok(!('fileId' in c.staff45ListLessons('owner')[0]));
  assert.equal(c.staff45ListLessons('owner')[0].visibility,'업로드중');
});
const split=started.partBytes;
const chunk0=data.subarray(0,split).toString('base64');
const chunk1=data.subarray(split).toString('base64');
check('chunk size, ordering, ownership and idempotency are verified on the server',()=>{
  assert.throws(()=>c.staff45UploadPart('teacher',started.id,0,chunk0),/권한/);
  assert.throws(()=>c.staff45UploadPart('director',started.id,0,chunk0),/업로드 중인/);
  assert.throws(()=>c.staff45UploadPart('owner',started.id,9,chunk0),/조각 번호/);
  assert.throws(()=>c.staff45UploadPart('owner',started.id,0,chunk1),/크기/);
  assert.equal(c.staff45UploadPart('owner',started.id,0,chunk0).ok,true);
  assert.equal(c.staff45UploadPart('owner',started.id,0,chunk0).alreadySaved,true);
  assert.throws(()=>c.staff45FinishLesson('owner',started.id),/끝나지 않았/);
  assert.equal(c.staff45UploadPart('owner',started.id,1,chunk1).ok,true);
});
const finish=c.staff45FinishLesson('owner',started.id);
check('private final file is byte-for-byte preserved with SHA-256 and hidden from teachers',()=>{
  assert.equal(finish.lesson.visibility,'비공개');
  assert.equal(finish.lesson.size,data.length);
  assert.equal(c.staff45ListLessons('teacher').length,0);
  assert.equal(c.staff45ListLessons('owner').length,1);
  assert.throws(()=>c.staff45DownloadLesson('teacher',started.id),/권한/);
  assert.deepEqual(Buffer.from(c.staff45DownloadLesson('owner',started.id).base64,'base64'),data);
  assert.ok(fx.audits.some(x=>x.action==='수업안 파일 등록'));
});
const share=c.staff45SaveLesson('owner',{id:started.id,revision:1,title:'봄 컬러 플레이',month:'2027-03',age:'전체',note:'활동 전 재료 확인',visibility:'공유'});
check('teachers can download shared files only, and revisions prevent overwrites',()=>{
  assert.equal(share.lesson.revision,2);
  assert.equal(c.staff45ListLessons('teacher').length,1);
  assert.deepEqual(Buffer.from(c.staff45DownloadLesson('teacher',started.id).base64,'base64'),data);
  assert.throws(()=>c.staff45SaveLesson('director',{id:started.id,revision:1,visibility:'비공개',title:'덮어쓰기'}),/먼저 수정/);
  assert.throws(()=>c.staff45SaveLesson('teacher',{id:started.id,revision:2,visibility:'비공개'}),/권한/);
});
check('archive preserves managers historical download and removes teacher access',()=>{
  assert.equal(c.staff45ArchiveLesson('director',{id:started.id,revision:2}).ok,true);
  assert.equal(c.staff45ListLessons('teacher').length,0);
  assert.equal(c.staff45ListLessons('owner')[0].visibility,'보관');
  assert.deepEqual(Buffer.from(c.staff45DownloadLesson('owner',started.id).base64,'base64'),data);
  assert.throws(()=>c.staff45DownloadLesson('teacher',started.id),/권한/);
});
check('unfinished uploads are cancelable without deleting registered files',()=>{
  const next=c.staff45BeginLesson('owner',{...meta,fileName:'작업.txt',size:11,title:'작업'});
  assert.ok(c.staff45ListLessons('owner').some(x=>x.visibility==='업로드중'));
  assert.equal(c.staff45AbortLesson('owner',next.id).ok,true);
  assert.ok(!c.staff45ListLessons('owner').some(x=>x.id===next.id));
  assert.equal(c.staff45ListLessons('owner').length,1);
});
check('file-signature mismatches are blocked before any final Drive blob is saved',()=>{
  const bad=c.staff45BeginLesson('owner',{...meta,fileName:'fake.pdf',size:6,title:'가짜 확장자'});
  c.staff45UploadPart('owner',bad.id,0,Buffer.from('NOTPDF').toString('base64'));
  assert.throws(()=>c.staff45FinishLesson('owner',bad.id),/파일 형식/);
  assert.equal(c.staff45ListLessons('teacher').length,0);
});
(async()=>{
  const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body><div id="p"></div></body></html>',
    {url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only'});
  const win=dom.window,root=win.document.getElementById('p');
  win.eval(client);
  await win.BW45LessonLibrary.mount(root,{
    token:'fake',email:'owner@example.invalid',canEdit:true,isCurrent:()=>true,
    call:async method=>method==='staff45ListLessons'?[]:null
  });
  check('staff library accepts flexible formats and optional metadata without forcing a plan template',()=>{
    const form=root.querySelector('#bw45UploadForm');
    assert.ok(form);
    assert.match(root.textContent,/수업안 양식은 자유롭게/);
    assert.match(root.querySelector('#bw45File').accept,/\.pdf/);
    assert.match(root.querySelector('#bw45File').accept,/\.hwpx/);
    assert.ok(root.querySelector('[name=month]').required===false);
    assert.ok(root.querySelector('[name=note]').required===false);
    assert.ok(!root.querySelector('#bw45UploadButton').disabled);
    assert.match(style,/@media\(max-width:780px\)/);
    assert.match(admin,/BW45LessonLibrary\.mount/);
    assert.match(packageScript,/LessonPlans\.gs/);
  });
  const teacherRoot=win.document.createElement('div');win.document.body.appendChild(teacherRoot);
  await win.BW45LessonLibrary.mount(teacherRoot,{
    token:'teacher',email:'teacher@example.invalid',canEdit:false,isCurrent:()=>true,
    call:async method=>method==='staff45ListLessons'?[]:null
  });
  check('teacher cannot see upload form and missing server denies upload gracefully',()=>{
    assert.equal(teacherRoot.querySelector('#bw45UploadForm'),null);
  });
  const failureRoot=win.document.createElement('div');win.document.body.appendChild(failureRoot);
  await win.BW45LessonLibrary.mount(failureRoot,{
    token:'owner',email:'owner@example.invalid',canEdit:true,isCurrent:()=>true,
    call:async()=>{throw Error('허용되지 않은 업무 요청입니다.');}
  });
  check('missing Google backend shows honest server-install notice with upload disabled',()=>{
    assert.match(failureRoot.textContent,/서버를 한 번 업데이트/);
    assert.equal(failureRoot.querySelector('#bw45UploadButton').disabled,true);
    assert.doesNotMatch(client,/localStorage|sessionStorage|SPREADSHEET_ID/);
  });
  dom.window.close();
  console.log(JSON.stringify({suite:'V45 lesson plan upload and private library',passed}));
})().catch(e=>{console.error(e);process.exitCode=1;});
