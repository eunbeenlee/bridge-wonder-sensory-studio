'use strict';
// Offline regressions. All identities, contracts and ledgers here are synthetic.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../server/apps-script/Code.gs','utf8');
const script=new vm.Script(source,{filename:'Code.gs'});
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const plain=x=>JSON.parse(JSON.stringify(x));
const user={email:'staff@example.invalid',name:'테스트 담당자',role:'director',status:'사용',classes:['CLASS_A'],canContact:true};
function context(){
  const properties=new Map(),cacheData=new Map(),logs=[];let held=false,acquireHook=null;
  const lock={waitLock(){assert.equal(held,false,'nested ScriptLock');held=true;if(acquireHook){const f=acquireHook;acquireHook=null;f();}},releaseLock(){assert.equal(held,true);held=false;}};
  const props={getProperty:k=>properties.has(k)?properties.get(k):null,setProperty(k,v){properties.set(k,v);return this;},getProperties:()=>Object.fromEntries(properties),deleteProperty:k=>properties.delete(k)};
  const cache={get:k=>cacheData.get(k)||null,put:(k,v)=>cacheData.set(k,v),remove:k=>cacheData.delete(k)};
  const ctx=vm.createContext({Logger:{log:x=>logs.push(x)},PropertiesService:{getScriptProperties:()=>props},CacheService:{getScriptCache:()=>cache},LockService:{getScriptLock:()=>lock},Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:()=> '20261119'}});
  script.runInContext(ctx);ctx.bw17Hash_=hash;ctx.bw17User_=()=>({...user});ctx.bw17Audit_=()=>{};
  return {ctx,properties,props,cache,cacheData,logs,isLocked:()=>held,onAcquire:f=>{acquireHook=f;}};
}
class Sheet{
  constructor(rows,onWrite=()=>{}){this.rows=rows.map(r=>r.slice());this.maxColumns=this.getLastColumn();this.onWrite=onWrite;}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return Math.max(0,...this.rows.map(r=>r.length));}
  getMaxColumns(){return this.maxColumns;}
  insertColumnsAfter(position,count){this.onWrite();assert.equal(position,this.maxColumns);this.maxColumns+=count;}
  appendRow(values){this.onWrite();this.rows.push(Array.from(values));return this;}
  getRange(row,col,nr=1,nc=1){
    const sheet=this;
    return {getValues(){return Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>sheet.rows[row-1+i]?.[col-1+j]??''));},getDisplayValues(){return this.getValues().map(r=>r.map(String));},
      setValue(v){return this.setValues([[v]]);},setValues(values){sheet.onWrite();values.forEach((r,i)=>{sheet.rows[row-1+i]??=[];r.forEach((v,j)=>sheet.rows[row-1+i][col-1+j]=v);});return this;},setBackground(){return this;},setFontColor(){return this;},setFontWeight(){return this;}};
  }
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
function otpFixture(){
  const f=context(),secret='synthetic-test-secret',nonce='synthetic-nonce',code='123456';
  f.ctx.bw17Secret_=()=>{assert.equal(f.isLocked(),false,'secret must initialize before ScriptLock');return secret;};
  const base=hash(user.email+'|'+secret).slice(0,42),key='otp_'+base;
  f.cacheData.set(key,JSON.stringify({hash:hash(code+'|'+user.email+'|'+nonce+'|'+secret),nonce,attempts:0,expiresAt:Date.now()+600000}));
  for(const method of ['get','put','remove']){const original=f.cache[method];f.cache[method]=(k,...args)=>{if(/^(otp|bad|lock)_/.test(k))assert.equal(f.isLocked(),true,method+' '+k+' must be atomic');return original(k,...args);};}
  return {...f,base,key,code,verify:c=>f.ctx.staffLoginVerify({email:user.email,code:c})};
}
function tuitionFixture(extraColumns=[]){
  const f=context(),headers=plain(vm.runInContext('BW18.PAYMENT_HEADERS.slice(0,7)',f.ctx));
  const initial=[headers.concat(extraColumns),['old-date','BWTEST001','납부확인',100000,'old-reference','old-note','operator@example.invalid',...extraColumns.map(()=> 'custom-data')]];
  const sheet=new Sheet(initial,()=>assert.equal(f.isLocked(),true,'ledger writes require lock'));
  f.ctx.bw24Authorized_=()=>({...user});f.ctx.bw17Tab_=()=>sheet;f.ctx.bw18Reg_=()=>({});
  const payload={receipt:'BWTEST001',kind:'납부확인',amount:20000,reference:'test-reference',note:'test-note',operationId:'a'.repeat(32)};
  return {...f,sheet,payload,append:p=>f.ctx.staffAppendTuition('test-token',p)};
}
const tick=()=>new Promise(r=>setTimeout(r,0));
function contract(overrides={}){return {version:'test-v1',operator:'테스트 기관',registrationNo:'TEST-ONLY',course:'테스트 과정',starts:'2027-01-05',period:'4회',schedule:'화요일 · 10:00',fee:100000,extras:0,venue:'테스트 장소',absence:'테스트 보강 기준',accompany:'보호자 동반',materials:'테스트 재료',safety:'테스트 안전 기준',retention:'테스트 보유기간',refund:'원래 반환 기준',clausesVersion:'BW-ENROLLMENT-TERMS-2026-11-18-V12',clauses:Array.from({length:10},(_,i)=>['제'+(i+1)+'조','테스트 조항']),consentVersion:'BW-CONSENT-2026-11-18-V13',...overrides};}
async function enrollmentFixture({legacy=false,offer=contract()}={}){
  const html=fs.readFileSync(__dirname+'/../sensory-studio/enroll/index.html','utf8');
  const dom=new JSDOM(html,{url:'https://example.invalid/enroll/'+(legacy?'?code=ABCDEFGHJK':''),runScripts:'outside-only'}),w=dom.window,d=w.document;
  const api='https://script.google.com/macros/s/TEST_ONLY/exec',posts=[],queries=[],prints=[];
  w.BRIDGE_WONDER_CONTACT_CONFIG={webAppUrl:api};w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}});
  w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,dGVzdA==';
  const append=d.head.appendChild.bind(d.head);
  d.head.appendChild=node=>{append(node);if(node.tagName==='SCRIPT'&&node.src.startsWith(api)){
    const q=new URL(node.src).searchParams;queries.push(q.get('action'));
    queueMicrotask(()=>{if(q.get('action')==='catalogV16')w.__BW_PUBLIC_CATALOG({version:'BW-PUBLIC-ENROLL-V16',options:[{id:'CLASS_A',course:offer.course,starts:offer.starts,schedule:offer.schedule,terms:offer}]});
      if(q.get('action')==='enrollmentPreview')w.__BW_ENROLLMENT_OFFER({state:'available',terms:offer});node.onload?.();});
  }return node;};
  w.fetch=async(url,options)=>{posts.push({url,body:new URLSearchParams(String(options.body))});return {};};
  w.open=()=>{const out={document:{open(){},write:x=>prints.push(x),close(){}},focus(){}};return out;};
  w.eval(fs.readFileSync(__dirname+'/../assets/js/enrollment-client.js','utf8'));
  await tick();await tick();
  const form=d.querySelector('#bw11-enrollment-form');form.reportValidity=()=>true;
  function change(id,value){const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
  function fill(){
    if(!legacy){change('bw16-day','화요일');change('bw16-time','CLASS_A');}
    const now=new Date(),birth=String(now.getUTCFullYear()-2)+'-'+String(now.getUTCMonth()+1).padStart(2,'0');
    const values={guardian:'테스트 보호자',phone:'01000000000',email:'guardian@example.invalid',childName:'테스트 아이',birthMonth:birth,postcode:'00000',childAddress:'테스트 전용 주소',relation:'모',contactMethod:'문자',typedSigner:'테스트 보호자'};
    Object.entries(values).forEach(([k,v])=>{form.elements.namedItem(k).value=v;});
    for(const name of ['processingConsent','guardianConsent','contractConsent','refundConsent','signatureConsent'])form.elements.namedItem(name).checked=true;
    const typed=form.querySelector('[name="signatureMode"][value="typed"]');typed.checked=true;typed.dispatchEvent(new w.Event('change'));
  }
  function submit(){form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));}
  return {dom,w,d,posts,queries,prints,offer,change,fill,submit};
}
(async()=>{
  await test('absent policy preserves role defaults; owner alone can read and write payroll',()=>{
    const {ctx}=context();assert.equal(ctx.bw24Permissions_(user).read.inquiries,true);
    for(const role of ['director','teacher','frontdesk']){const p=ctx.bw24Permissions_({...user,role});assert.equal(p.read.payroll,false);assert.equal(p.write.payroll,false);}
    const owner=ctx.bw24Permissions_({...user,role:'owner'});assert.equal(owner.read.payroll,true);assert.equal(owner.write.payroll,true);
  });
  await test('invalid, malformed and unreadable policy never restores business grants',()=>{
    for(const raw of ['', 'bad-json','{}','null','[]','{"read":"inquiries","write":[]}','{"read":["unknown"],"write":[]}','{"read":[],"write":["inquiries"]}']){
      const {ctx,props}=context();props.getProperty=()=>raw;const p=ctx.bw24Permissions_(user);
      assert.equal(p.read.home,true);assert.equal(Object.keys(p.read).filter(k=>k!=='home').some(k=>p.read[k]),false);assert.equal(Object.values(p.write).some(Boolean),false);
    }
    const {ctx,props}=context();props.getProperty=()=>{throw Error('storage unavailable');};assert.equal(ctx.bw24Permissions_(user).read.inquiries,false);
  });
  await test('valid custom policy intersects role maximum rather than elevating it',()=>{
    const {ctx,props}=context();props.getProperty=()=>JSON.stringify({read:['home','inquiries','payroll'],write:['inquiries','payroll']});const p=ctx.bw24Permissions_(user);
    assert.equal(p.read.inquiries,true);assert.equal(p.write.inquiries,true);assert.equal(p.read.classes,false);assert.equal(p.read.payroll,false);
  });
  await test('legacy backup RPC rejects anonymous and non-owner identities before touching Drive',()=>{
    const {ctx}=context();let calls=0;ctx.bw17Config_=()=>({owner:'owner@example.invalid'});ctx.bw19DailyBackupCheck_=()=>{calls++;return 'done';};
    for(const email of ['',user.email]){ctx.Session={getActiveUser:()=>({getEmail:()=>email})};assert.throws(()=>ctx.bw19DailyBackupCheck(),/원장 계정/);}
    assert.equal(calls,0);ctx.Session={getActiveUser:()=>({getEmail:()=> 'owner@example.invalid'})};assert.equal(ctx.bw19DailyBackupCheck(),'done');assert.equal(calls,1);
  });
  await test('backup setup migrates only its old trigger and is repeatable',()=>{
    const {ctx}=context();const trigger=name=>({getHandlerFunction:()=>name}),triggers=[trigger('bw19DailyBackupCheck'),trigger('unrelatedDailyTask')];let created=0;
    ctx.bw24RequireEditorOwner_=()=>{};ctx.bw17Config_=()=>({owner:'owner@example.invalid'});ctx.bw19Tabs_=()=>({docs:{getName:()=> 'docs'},mails:{getName:()=> 'mails'}});ctx.bw19Folder_=()=>({getId:()=> 'synthetic-folder'});
    ctx.ScriptApp={getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),newTrigger:name=>{const builder={timeBased:()=>builder,everyDays:()=>builder,atHour:()=>builder,create(){created++;triggers.push(trigger(name));}};return builder;}};
    ctx.setupStaffDocumentsV19();ctx.setupStaffDocumentsV19();assert.equal(created,1);assert.deepEqual(triggers.map(t=>t.getHandlerFunction()).sort(),['bw19DailyBackupCheck_','unrelatedDailyTask']);
  });
  await test('OTP is consumed under lock and a successful code cannot be redeemed twice',()=>{
    const f=otpFixture(),result=f.verify(f.code);assert.equal(result.ok,true);assert.equal(f.isLocked(),false);assert.throws(()=>f.verify(f.code),/만료/);assert.equal([...f.cacheData.keys()].filter(k=>k.startsWith('session_')).length,1);
  });
  await test('five OTP failures lock verification even if the separate bad counter is evicted',()=>{
    const f=otpFixture();for(let i=0;i<5;i++){assert.throws(()=>f.verify('000000'),/일치하지/);f.cacheData.delete('bad_'+f.base);}
    assert.equal(f.cacheData.has(f.key),false);assert.equal(f.cacheData.has('lock_'+f.base),true);assert.throws(()=>f.verify(f.code),/입력 횟수/);assert.equal(f.isLocked(),false);
  });
  await test('OTP expiry and legacy records without an expiry never issue a session',()=>{
    for(const expiry of [Date.now()-1,undefined]){const f=otpFixture(),record=JSON.parse(f.cacheData.get(f.key));record.expiresAt=expiry;f.cacheData.set(f.key,JSON.stringify(record));assert.throws(()=>f.verify(f.code),/만료/);assert.equal([...f.cacheData.keys()].some(k=>k.startsWith('session_')),false);}
  });
  await test('OTP verification rereads the record after waiting for another request',()=>{
    const f=otpFixture();f.onAcquire(()=>f.cacheData.delete(f.key));assert.throws(()=>f.verify(f.code),/만료/);assert.equal(f.isLocked(),false);
  });
  await test('OTP issuance rechecks cooldown inside the lock and does not mail twice',()=>{
    const f=context(),secret='test-secret';f.ctx.bw17Secret_=()=>{assert.equal(f.isLocked(),false);return secret;};
    const key='cool_'+hash(user.email+'|'+secret).slice(0,42);let mailed=0;f.ctx.MailApp={sendEmail:()=>mailed++};f.onAcquire(()=>f.cacheData.set(key,'1'));
    assert.equal(f.ctx.staffLoginStart(user.email).ok,true);assert.equal(mailed,0);assert.equal(f.isLocked(),false);
  });
  await test('document types and history hide sources revoked by a custom permission policy',()=>{
    const {ctx,props}=context();ctx.bw24Authorized_=()=>({...user});props.getProperty=()=>JSON.stringify({read:['home','documents','registrations'],write:['documents']});
    assert.deepEqual(Array.from(ctx.staffDocTypes('test'),x=>x.id),['registration','contract','notice']);
    const rows=['inquiry','payment','class','registration','contract','notice'].map((type,i)=>{const r=Array(17).fill('');r[0]='DOC'+i;r[2]=type;r[4]='SOURCE';return r;});ctx.bw17Tab_=()=>({});ctx.bw17Read_=()=>({rows});
    assert.deepEqual(Array.from(ctx.staffDocHistory('test'),x=>x.type),['notice','contract','registration']);
    assert.throws(()=>ctx.staffDocSources('test','inquiry'),/원본 자료/);assert.throws(()=>ctx.staffDocPreview('test',{type:'payment',sourceId:'BWTEST001'}),/원본 자료/);
  });
  await test('existing document downloads and sends enforce the current source permission',()=>{
    const {ctx,props}=context();ctx.bw24Authorized_=()=>({...user});props.getProperty=()=>JSON.stringify({read:['home','documents'],write:['documents']});
    const vals=Array(17).fill('');vals[2]='registration';vals[4]='BWTEST001';ctx.bw19FindDoc_=()=>({vals});ctx.DriveApp={getFileById(){throw Error('unexpected Drive read');}};
    assert.throws(()=>ctx.staffDocDownload('test','DOC'),/원본 자료/);assert.throws(()=>ctx.staffDocSend('test',{docId:'DOC'}),/원본 자료/);
  });
  await test('teacher document history remains scoped to assigned classes',()=>{
    const {ctx}=context();ctx.bw24Authorized_=()=>({...user,role:'teacher'});const rows=['CLASS_A','CLASS_B'].map(id=>{const r=Array(17).fill('');r[2]='class';r[4]=id;return r;});ctx.bw17Tab_=()=>({});ctx.bw17Read_=()=>({rows});
    assert.deepEqual(Array.from(ctx.staffDocHistory('test'),x=>x.source),['CLASS_A']);
  });
  await test('tuition migration appends operation ID after custom columns without changing old data',()=>{
    const f=tuitionFixture(['사용자 추가 열']),oldRow=f.sheet.rows[1].slice();assert.equal(f.append(f.payload).ok,true);
    assert.equal(f.sheet.rows[0][7],'사용자 추가 열');assert.equal(f.sheet.rows[0][8],'작업 ID');assert.deepEqual(f.sheet.rows[1],oldRow);assert.equal(f.sheet.rows[2][8],f.payload.operationId);assert.equal(f.sheet.rows[2][7],'');assert.equal(f.isLocked(),false);
  });
  await test('tuition exact retries do not append, and reused IDs with changed contents are rejected',()=>{
    const f=tuitionFixture();f.append(f.payload);const size=f.sheet.rows.length;assert.equal(f.append({...f.payload}).replayed,true);assert.equal(f.sheet.rows.length,size);
    assert.throws(()=>f.append({...f.payload,amount:21000}),/다른 내용/);assert.equal(f.sheet.rows.length,size);assert.throws(()=>f.append({...f.payload,operationId:''}),/저장 요청/);assert.equal(f.isLocked(),false);
  });
  await test('tuition audit failure after append returns committed success and cannot duplicate on retry',()=>{
    const f=tuitionFixture();f.ctx.bw17Audit_=()=>{throw Error('synthetic audit failure');};const result=f.append(f.payload);assert.equal(result.ok,true);assert.equal(result.auditWarning,true);assert.equal(f.sheet.rows.length,3);assert.equal(f.append(f.payload).replayed,true);assert.equal(f.sheet.rows.length,3);
  });
  await test('refund validation includes the full ledger and deduplicates a completed refund',()=>{
    const f=tuitionFixture();for(let i=0;i<5001;i++)f.sheet.rows.push(['old-date','BWOTHER001','납부확인',1,'','','']);
    const refund={...f.payload,kind:'환불완료',amount:100000};assert.equal(f.append(refund).ok,true);assert.equal(f.append(refund).replayed,true);assert.throws(()=>f.append({...refund,operationId:'b'.repeat(32),amount:1}),/확인된 납부금/);
  });
  await test('tuition rejects an incompatible schema without overwriting cells',()=>{
    const f=tuitionFixture();f.sheet.rows[0][0]='unexpected-column';const before=plain(f.sheet.rows);assert.throws(()=>f.append(f.payload),/열 구성/);assert.deepEqual(f.sheet.rows,before);
  });
  await test('submitted enrollment keeps immutable terms in its printable confirmation',async()=>{
    const f=await enrollmentFixture();try{
      f.fill();f.submit();assert.equal(f.posts.length,1);const rid=f.posts[0].body.get('rid');
      f.w.__BW_STORE_ACK({requestId:rid,state:'saved',receipt:'BWR-ABCDEFGHIJKL',documentState:'ready'});
      Object.assign(f.offer,{fee:999999,schedule:'수요일 · 15:00',refund:'변경된 반환 기준'});
      f.d.querySelector('#bw11-print').click();assert.equal(f.prints.length,1);assert.match(f.prints[0],/100,000원/);assert.match(f.prints[0],/화요일 · 10:00/);assert.match(f.prints[0],/원래 반환 기준/);assert.doesNotMatch(f.prints[0],/999,999|수요일 · 15:00|변경된 반환/);
    }finally{f.dom.window.close();}
  });
  await test('pending enrollment locks class changes and rejects a second submission with a new request',async()=>{
    const f=await enrollmentFixture();try{
      f.fill();f.submit();assert.equal(f.posts.length,1);const rid=f.posts[0].body.get('rid');
      f.w.__BW_STORE_ACK({requestId:rid,state:'saved',receipt:'BWR-ABCDEFGHIJKL',documentState:'pending'});
      for(const id of ['bw16-day','bw16-time','bw11-invite','bw11-load','bw11-submit'])assert.equal(f.d.getElementById(id).disabled,true,id);
      f.change('bw16-time','');assert.equal(f.d.querySelector('#bw11-terms-panel').hidden,false);f.submit();assert.equal(f.posts.length,1);assert.equal(f.d.querySelector('#bw11-check').hidden,false);
    }finally{f.dom.window.close();}
  });
  await test('invalid legacy contract consent version hides the form and blocks posting',async()=>{
    const f=await enrollmentFixture({legacy:true,offer:contract({consentVersion:'outdated'})});try{
      assert.equal(f.d.querySelector('#bw11-form-panel').hidden,true);f.fill();f.submit();assert.equal(f.posts.length,0);
    }finally{f.dom.window.close();}
  });
  console.log(JSON.stringify({suite:'security and contract regression — offline',passed,total:21}));
})().catch(error=>{console.error(error);process.exitCode=1;});
