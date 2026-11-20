'use strict';
/* Bridge Wonder V32: Korean academy compliance, refund and PDF safety tests.
 * In-memory synthetic records only. No live Google or children information.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../server/apps-script/Compliance.gs','utf8');
const pdfSource=fs.readFileSync(__dirname+'/../server/apps-script/InspectionPDF.gs','utf8');
const ui=fs.readFileSync(__dirname+'/../assets/js/staff-compliance-v32.js','utf8');
const staffCode=fs.readFileSync(__dirname+'/../server/apps-script/Code.gs','utf8');
const bridge=fs.readFileSync(__dirname+'/../server/apps-script/StaffBridge.gs','utf8');
const staffUI=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
class Sheet{
  constructor(headers){this.rows=[headers.slice()];}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return this.rows[0].length;}
  getRange(row,col,nrows=1,ncols=1){
    const sheet=this;
    return {
      getDisplayValues(){return Array.from({length:nrows},(_,i)=>Array.from({length:ncols},(_,j)=>String(sheet.rows[row-1+i]?.[col-1+j]??'')));},
      getValues(){return this.getDisplayValues();},
      setValues(vals){vals.forEach((a,i)=>{const idx=row-1+i;sheet.rows[idx]??=Array(sheet.rows[0].length).fill('');
        a.forEach((v,j)=>sheet.rows[idx][col-1+j]=v);});return this;}
    };
  }
}
function fixture(){
  const sheets=new Map(),audits=[],files=[];let inLock=false;
  const lock={waitLock(){assert.equal(inLock,false,'nested script lock');inLock=true;},releaseLock(){assert.equal(inLock,true);inLock=false;}};
  const utils={
    getUuid:()=>crypto.randomUUID(),
    formatDate:(date,_tz,pattern)=>{
      const yyyy=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(date);
      if(pattern==='yyyyMMdd')return yyyy.replace(/-/g,'');
      if(pattern==='yyyy-MM-dd')return yyyy;
      if(pattern==='yyyyMMdd_HHmm')return yyyy.replace(/-/g,'')+'_1200';
      return yyyy+' 12:00';
    },
    base64Encode:bytes=>Buffer.from(bytes.map(x=>(x+256)%256)).toString('base64')
  };
  let docCount=0,bodyTexts=[];
  function chain(){return {setHeading:()=>chain(),editAsText:()=>chain(),setBold:()=>chain(),setFontSize:()=>chain(),setForegroundColor:()=>chain(),setBackgroundColor:()=>chain()};}
  const body={
    appendParagraph:x=>{bodyTexts.push(String(x));return chain();},
    appendTable:rows=>{bodyTexts.push(...rows.flat().map(String));return {
      setBorderColor:()=>({setBorderWidth:()=>{}}),
      setBorderWidth:()=>{},
      getCell:()=>({setBackgroundColor:()=>{},editAsText:()=>chain()})
    };}
  };
  const doc={
    getId:()=> 'testdoc',
    getBody:()=>body,
    saveAndClose:()=>{}
  };
  const pdfBytes=Array.from(Buffer.from('%PDF-1.7\nTEST-ONLY')),
   blob={getBytes:()=>pdfBytes,setName(){return this;}};
  const folders={createFile(b){const file={setSharing:()=>{}};files.push({file,b});return file;}};
  const drive={
    Access:{PRIVATE:'PRIVATE'},Permission:{NONE:'NONE'},
    getFileById:()=>({getAs:()=>blob,setTrashed:()=>{}})
  };
  const ctx=vm.createContext({Utilities:utils,
    LockService:{getScriptLock:()=>lock},DriveApp:drive,
    MimeType:{PDF:'application/pdf'},
    DocumentApp:{create:()=>{docCount++;return doc;},ParagraphHeading:{HEADING1:1,HEADING2:2}}
  });
  new vm.Script(source,{filename:'Compliance.gs'}).runInContext(ctx);
  new vm.Script(pdfSource,{filename:'InspectionPDF.gs'}).runInContext(ctx);
  ctx.bw17Safe_=(v,n)=>String(v??'').trim().slice(0,n||200);
  ctx.bw17Tab_=(name,headers)=>{if(!sheets.has(name))sheets.set(name,new Sheet(headers));return sheets.get(name);};
  ctx.bw17Audit_=(user,action,target,result,note)=>audits.push({user,action,target,result,note});
  ctx.bw18Date_=(value,allowBlank)=>{
    const t=String(value||'');
    if(!t&&allowBlank)return '';
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(t)||isNaN(Date.parse(t)))throw Error('날짜');
    return t;
  };
  ctx.bw17Email_=v=>String(v||'').trim().toLowerCase();
  ctx.bw24Authorized_=(token,module,mode,roles)=>{
    if(token!=='owner'&&token!=='director')throw Error('권한 없는 접근');
    if(!roles.includes(token))throw Error('권한 없는 접근');
    return {email:token+'@example.invalid',role:token,name:token};
  };
  ctx.bw24Can_=()=>true;
  ctx.bw18Reg_=(id)=>{if(id!=='REGISTER-TEST')throw Error('수강등록 기록을 찾을 수 없습니다.');return {name:'synthetic'};};
  ctx.bw18OpsTab_=()=>new Sheet(['test']);
  ctx.bw18Rows_=()=>[['REG01','분류','점검 준비','법정 확인','미확인','','','']];
  ctx.bw19Folder_=()=>folders;
  ctx.bw19Hex_=bytes=>crypto.createHash('sha256').update(Buffer.from(bytes.map(x=>(x+256)%256))).digest('hex');
  return {ctx,sheets,audits,files,get docCount(){return docCount;},get bodyTexts(){return bodyTexts;}};
}
test('existing staff operations remain unchanged and new APIs are allowlisted',()=>{
  assert.match(staffCode,/BW18\.TASKS_DEFAULT/);
  assert.match(staffCode,/"compliance":\{"label":"법정·행정 관리"/);
  assert.match(bridge,/staff32SaveCompliance:\s*staff32SaveCompliance/);
  assert.match(bridge,/staff32DownloadInspectionPdf:\s*staff32DownloadInspectionPdf/);
  assert.match(staffUI,/bw32LoadModule/);
  assert.match(staffUI,/if\(page==='compliance'\)await renderCompliance/);
});
test('Korean statutory categories and unverified state cannot masquerade as approved',()=>{
  const f=fixture(),c=f.ctx;
  assert.equal(c.staff32ListCompliance('owner').length,0);
  assert.throws(()=>c.staff32SaveCompliance('owner',{code:'REG01',status:'내부확인',applies:'적용',due:'',checkedAt:'',evidence:'',revision:0}),/확인일/);
  assert.throws(()=>c.staff32SaveCompliance('owner',{code:'REG01',status:'내부확인',applies:'해당없음',note:'not applicable',checkedAt:'2026-11-20',evidence:'private'},revision:0),/적용/);
  assert.throws(()=>c.staff32SaveCompliance('owner',{code:'UNKNOWN',status:'미확인',applies:'확인필요',revision:0}),/지원하지 않는/);
  const p={code:'REG01',status:'내부확인',applies:'적용',checkedAt:'2026-11-20',evidence:'비공개 목록',note:'본인 확인',revision:0};
  assert.equal(c.staff32SaveCompliance('owner',p).revision,1);
  assert.throws(()=>c.staff32SaveCompliance('owner',p),/다른 직원/);
  assert.equal(c.staff32ListCompliance('director')[0].status,'내부확인');
});
test('refund five-day due is computed from occurrence date and operation IDs are idempotent',()=>{
  const f=fixture(),c=f.ctx;
  const req={receipt:'REGISTER-TEST',reason:'학습자 수강 포기',eventDate:'2026-11-20',paid:100000,returnAmount:80000,status:'접수',completedAt:'',evidence:'',note:'확인 중',revision:0,operationId:'a'.repeat(32)};
  const first=c.staff32SaveRefund('owner',req);
  assert.equal(first.due,'2026-11-25');
  assert.match(first.id,/^RF-20\d{6}-[a-f0-9]{12}$/);
  const replay=c.staff32SaveRefund('owner',req);
  assert.equal(replay.replayed,true);
  assert.equal(c.staff32ListRefunds('owner').length,1);
  assert.throws(()=>c.staff32SaveRefund('owner',{...req,operationId:'b'.repeat(32),returnAmount:110000,revision:1}),/초과/);
  assert.throws(()=>c.staff32SaveRefund('owner',{...req,operationId:'c'.repeat(32),status:'반환완료',revision:1}),/실제 반환일/);
});
test('PDF generation retains audit, limits PII, and returns real download structure',()=>{
  const f=fixture(),c=f.ctx;
  const result=c.staff32DownloadInspectionPdf('owner');
  assert.equal(result.ok,true);
  assert.match(result.filename,/^BridgeWonder_Inspection_Readiness_\d{8}_\d{4}\.pdf$/);
  assert.equal(result.contentType,'application/pdf');
  assert.equal(Buffer.from(result.base64,'base64').toString('utf8'),'%PDF-1.7\nTEST-ONLY');
  assert.equal(f.docCount,1);assert.equal(f.files.length,1);
  assert.ok(f.audits.some(a=>a.action.includes('현장점검 PDF')));
  const pdfText=f.bodyTexts.join('\n');
  assert.ok(pdfText.includes('학원 현장점검 준비현황'));
  assert.ok(pdfText.includes('원본 서류 위치'));
  assert.ok(!pdfText.includes('REGISTER-TEST'),'student-linked receipt must be hidden');
  assert.ok(!pdfText.includes('guardian@example.invalid'));
  assert.throws(()=>c.staff32DownloadInspectionPdf('unauthorized'),/권한 없는 접근/);
});
test('new staff compliance JS is syntactically valid and contains real PDF download handler',()=>{
  new vm.Script(ui,{filename:'staff-compliance-v32.js'});
  assert.match(ui,/staff32DownloadInspectionPdf/);
  assert.match(ui,/URL\.createObjectURL/);
  assert.match(ui,/REG04/);
  assert.match(ui,/법정대리인/);
  assert.match(ui,/실제.*반환/);
  assert.doesNotMatch(ui,/localStorage\.|sessionStorage\.|SPREADSHEET_ID|OWNER_EMAIL/);
});
console.log(JSON.stringify({suite:'V32 legal readiness and PDF',passed}));
