/**
 * Bridge Wonder V26 Staff Portal · INDEPENDENT Apps Script project.
 * Do not paste into the public inquiry/registration script.
 * CONFIGURE Script Properties (never in GitHub): SPREADSHEET_ID, OWNER_EMAIL.
 * Deploy as Web App "Execute as: Me" "Access: Anyone".
 * Password login with email OTP enrollment/recovery and server-side role checks.
 * Payroll.gs provides the owner-only payroll endpoint; see docs/BRIDGE_V26_RELEASE.md.
 */
const BW17 = Object.freeze({
  USERS: '관리자_계정', AUDIT: '관리자_접속기록', ATTENDANCE: '수업_출결',
  INQUIRIES: '상담접수', REGISTRATIONS: '수강등록', CLASSES: '온라인등록 반편성',
  TEMPLATES: '수강조건 설정', BACKUPS: '백업이력', LEDGER: '수강생대장_내부관리',
  USER_HEADERS: ['이메일','표시 이름','역할','계정 상태','담당 반 코드','보호자 연락처 열람','등록시각','수정시각'],
  AUDIT_HEADERS: ['기록시각','계정','역할','작업','대상','처리 결과','비고'],
  ATT_HEADERS: ['수업일','등록반 코드','접수번호','아동 이름','출결','메모','변경자','수정시각'],
  ROLES: ['owner','director','teacher','frontdesk'],
  SESSION_SECONDS: 3600, OTP_SECONDS: 600, MAX_LOGIN_PER_DAY: 12, MAX_ATTEMPTS: 5,
  CLASS_HEADERS: ['등록반 코드','수강조건 코드','수업 시작일','수업 요일','수업 시간','교습 기간','공개 상태','운영자 검토']
});
function doGet(e) {
  // Read-only public themes — intentionally contains no child/guardian data.
  if(e&&e.parameter&&e.parameter.view==='experience')return bw37PublicExperienceScript_();
  return HtmlService.createHtmlOutputFromFile('Admin').setTitle('Bridge Wonder · 직원 관리').addMetaTag('viewport','width=device-width,initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
// --- Private server utilities. Keep trailing underscore: hidden from google.script.run ---
function bw17Config_() {
  const p = PropertiesService.getScriptProperties();
  const id=String(p.getProperty('SPREADSHEET_ID')||'').trim();
  const owner=String(p.getProperty('OWNER_EMAIL')||'').trim().toLowerCase();
  if(!/^[a-z0-9_\-]{20,100}$/i.test(id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner)) throw Error('설정이 완료되지 않았습니다. 관리자가 스크립트 속성을 확인해야 합니다.');
  return {id:id,owner:owner,props:p};
}
function bw17Book_() {return SpreadsheetApp.openById(bw17Config_().id);}
function bw17Tab_(name,headers,create) {
  const b=bw17Book_(); let s=b.getSheetByName(name);
  if(!s && create){s=b.insertSheet(name);s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1);s.getRange(1,1,1,headers.length).setBackground('#40543a').setFontColor('#fff').setFontWeight('bold');}
  return s || null;
}
function bw17Hash_(str) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(str),Utilities.Charset.UTF_8).map(v=>('0'+((v+256)%256).toString(16)).slice(-2)).join('');}
function bw17Secret_() {
  const p=PropertiesService.getScriptProperties(); let v=p.getProperty('BW17_AUTH_SECRET');
  if(!v){const lock=LockService.getScriptLock();lock.waitLock(10000);try{v=p.getProperty('BW17_AUTH_SECRET');if(!v){v=[Utilities.getUuid(),Utilities.getUuid(),Utilities.getUuid()].join('-');p.setProperty('BW17_AUTH_SECRET',v);}}finally{lock.releaseLock();}}
  return v;
}
function bw17Safe_(v,max) {const txt=String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max||200);return /^[=+\-@\t\r]/.test(txt)?"'"+txt:txt;}
function bw17Email_(v) {const email=String(v||'').trim().toLowerCase();return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)&&email.length<=180?email:'';}
function bw17Now_() {return Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm:ss');}
function bw17User_(email) {
  const cfg=bw17Config_();
  if(email===cfg.owner)return {email:email,name:'원장',role:'owner',status:'사용',classes:[],canContact:true};
  const cache=CacheService.getScriptCache(),key=bw24UserCacheKey_(email),hit=cache.get(key);
  if(hit){try{return JSON.parse(hit);}catch(_){cache.remove(key);}}
  const s=bw17Tab_(BW17.USERS,BW17.USER_HEADERS,false);if(!s||s.getLastRow()<2)return null;
  const vals=s.getRange(2,1,s.getLastRow()-1,BW17.USER_HEADERS.length).getDisplayValues();
  for(let i=vals.length-1;i>=0;i--){const r=vals[i];if(String(r[0]).toLowerCase()===email) {
    const u={email:email,name:r[1],role:r[2],status:r[3],classes:String(r[4]||'').split(',').map(x=>x.trim()).filter(Boolean),canContact:String(r[5])==='허용'};
    cache.put(key,JSON.stringify(u),20);return u;
  }}
  return null;
}

function bw17Audit_(who,action,target,result,note) {
  try{const s=bw17Tab_(BW17.AUDIT,BW17.AUDIT_HEADERS,true);
    s.appendRow([new Date(),who?.email||'system',who?.role||'',bw17Safe_(action,90),bw17Safe_(target,110),bw17Safe_(result,35),bw17Safe_(note||'',150)]);
  }catch(err){Logger.log('감사기록 작성 실패');throw Error('기록 저장을 완료하지 못했습니다.');}
}
function bw17Authorized_(token,roles) {
  if(typeof token!=='string'||!/^([a-f0-9-]{36}){3}$/.test(token))throw Error('로그인이 필요합니다.');
  const user=bw30SessionUser_(token,false);
  if(roles&&roles.indexOf(user.role)<0){bw17Audit_(user,'권한 없는 접근','관리 기능','차단','권한 불일치');throw Error('이 업무에 접근할 권한이 없습니다.');}
  return user;
}
function bw17RequireClass_(user,classId) {
  const code=String(classId||'').toUpperCase();
  if(!/^[A-Z0-9_-]{3,32}$/.test(code))throw Error('수강반을 선택해 주세요.');
  if(user.role==='teacher'&&!user.classes.includes(code))throw Error('배정되지 않은 수강반입니다.');
  return code;
}
function bw17Headers_(s) {return s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0];}
function bw17Read_(s,max=220) {if(!s||s.getLastRow()<2)return {headers:[],rows:[]};const first=Math.max(2,s.getLastRow()-max+1);return {headers:bw17Headers_(s),rows:s.getRange(first,1,s.getLastRow()-first+1,s.getLastColumn()).getDisplayValues(),start:first};}
function bw17Field_(headers,row,field) {const i=headers.indexOf(field);return i>=0?String(row[i]||''):'';}
function bw17FindRow_(s,number,col=2) {if(!s||s.getLastRow()<2)return 0;const list=s.getRange(2,col,s.getLastRow()-1,1).getDisplayValues();for(let i=0;i<list.length;i++)if(String(list[i][0])===number)return i+2;return 0;}
function bw17EscapedPhone_(phone) {return String(phone||'').replace(/\D/g,'').slice(0,12);}
function bw17Step_(rowHeaders,row,key){return bw17Field_(rowHeaders,row,key);}
// --- Passwordless email OTP. No public user enumeration. ---
function staffLoginStart(input) {
  const email=bw17Email_(input);const reply={ok:true,message:'등록된 계정이면 인증번호를 이메일로 보내드립니다. 10분 안에 입력해 주세요.'};
  if(!email)return reply;
  const user=bw17User_(email);if(!user||user.status!=='사용')return reply;
  const cache=CacheService.getScriptCache(),secret=bw17Secret_();const base=bw17Hash_(email+'|'+secret).slice(0,42);
  if(cache.get('lock_'+base)||cache.get('cool_'+base))return reply;
  const day=Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    // Recheck after acquiring the same lock used by OTP verification.
    if(cache.get('lock_'+base)||cache.get('cool_'+base))return reply;
    const props=PropertiesService.getScriptProperties();const ctrKey='BW17_OTP_COUNT_'+day+'_'+base.slice(0,15);
    // Clean obsolete daily counters to avoid indefinite Script Properties growth.
    for (const k of Object.keys(props.getProperties())) {
      if (k.startsWith('BW17_OTP_COUNT_') && k.slice('BW17_OTP_COUNT_'.length,'BW17_OTP_COUNT_'.length+8) < day) props.deleteProperty(k);
    }
    const ctr=Number(props.getProperty(ctrKey)||0);if(ctr>=BW17.MAX_LOGIN_PER_DAY)return reply;
    props.setProperty(ctrKey,String(ctr+1));
    const otp=String(parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,12),16)%1000000).padStart(6,'0'); // email possession + max 5 verification attempts
    const nonce=Utilities.getUuid();
    cache.put('otp_'+base,JSON.stringify({hash:bw17Hash_(otp+'|'+email+'|'+nonce+'|'+secret),nonce:nonce,attempts:0,expiresAt:Date.now()+BW17.OTP_SECONDS*1000}),BW17.OTP_SECONDS);
    cache.put('cool_'+base,'1',60);
    const otpBody='브릿지 원더 직원 관리 로그인 인증번호: '+otp+'\n\n10분 이내에 입력하세요. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.\n이 번호를 다른 사람에게 전달하지 마세요.';
    MailApp.sendEmail({to:email,subject:'[Bridge Wonder] 직원 로그인 인증번호',body:otpBody,htmlBody:bw21EmailBody_(otpBody),inlineImages:{bwWonderLogo:bw21LogoBlob_()},name:'Bridge Wonder Sensory Play Studio'});
  }catch(e){Logger.log('직원 인증 메일 발송 실패');}
  finally{lock.releaseLock();}
  return reply;
}
function staffLoginVerify(payload) {
  const email=bw17Email_(payload&&payload.email);const code=String(payload&&payload.code||'').trim();
  if(!email||!/^\d{6}$/.test(code))throw Error('이메일과 6자리 번호를 확인해 주세요.');
  const user=bw17User_(email);if(!user||user.status!=='사용')throw Error('인증번호가 일치하지 않거나 만료되었습니다.');
  // Resolve the secret before locking: its initializer acquires ScriptLock too.
  const cache=CacheService.getScriptCache(),secret=bw17Secret_();const base=bw17Hash_(email+'|'+secret).slice(0,42);
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    if(cache.get('lock_'+base))throw Error('입력 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    const stored=cache.get('otp_'+base);
    if(!stored)throw Error('인증번호가 만료되었습니다. 다시 요청해 주세요.');
    let record;
    try{record=JSON.parse(stored);}catch(_){cache.remove('otp_'+base);throw Error('인증번호가 만료되었습니다. 다시 요청해 주세요.');}
    if(!record||typeof record.hash!=='string'||typeof record.nonce!=='string'||!Number.isFinite(record.expiresAt)||record.expiresAt<=Date.now()){
      cache.remove('otp_'+base);throw Error('인증번호가 만료되었습니다. 다시 요청해 주세요.');
    }
    const attempts=Math.max(Number(cache.get('bad_'+base)||0),Number(record.attempts||0));
    if(!Number.isSafeInteger(attempts)||attempts<0||attempts>=BW17.MAX_ATTEMPTS){
      cache.remove('otp_'+base);cache.put('lock_'+base,'1',900);throw Error('입력 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    }
    const expected=bw17Hash_(code+'|'+email+'|'+record.nonce+'|'+secret);
    if(expected!==record.hash){
      if(attempts+1>=BW17.MAX_ATTEMPTS){cache.remove('otp_'+base);cache.put('lock_'+base,'1',900);}
      else{
        record.attempts=attempts+1;
        // Keep attempts with the OTP so eviction of the separate counter cannot reset the limit.
        cache.put('otp_'+base,JSON.stringify(record),Math.max(1,Math.min(BW17.OTP_SECONDS,Math.ceil((record.expiresAt-Date.now())/1000))));
        cache.put('bad_'+base,String(attempts+1),900);
      }
      throw Error('인증번호가 일치하지 않거나 만료되었습니다.');
    }
    // Consume before releasing the lock; a second request cannot redeem the same OTP.
    cache.remove('otp_'+base);cache.remove('bad_'+base);
  }finally{lock.releaseLock();}
  const token=Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid();
  cache.put('session_'+bw17Hash_(token),bw30PackSession_(email),BW17.SESSION_SECONDS);
  bw17Audit_(user,'로그인','직원 포털','성공','이메일 일회용 번호');
  return {ok:true,token:token,user:{email:user.email,name:user.name,role:user.role,canContact:user.canContact,permissions:bw24Permissions_(user)},expiresInMinutes:60};
}
function staffCurrentUser(token) {
  const user=bw30SessionUser_(token,true);return {email:user.email,name:user.name,role:user.role,classes:user.classes,canContact:user.canContact,mustChange:bw30AccountState_(user.email).mustChange,permissions:bw24Permissions_(user),expiresInMinutes:60};
}
function staffLogout(token){if(typeof token==='string'&&/^([a-f0-9-]{36}){3}$/.test(token))try{CacheService.getScriptCache().remove('session_'+bw17Hash_(token));}catch(_){ }return {ok:true};}
function staffDashboard(token) {
  const u=bw24Authorized_(token,'home','read');
  const cache=CacheService.getScriptCache(),stamp=JSON.stringify(bw24Permissions_(u));
  const key='bw24_dash_'+bw17Hash_(u.email+'|'+u.classes.join(',')+'|'+stamp).slice(0,40);
  const hit=cache.get(key);if(hit){try{return JSON.parse(hit);}catch(_){cache.remove(key);}}
  const s=bw17Book_(),classes=s.getSheetByName(BW17.CLASSES),contacts=s.getSheetByName(BW17.INQUIRIES),regs=s.getSheetByName(BW17.REGISTRATIONS);
  const mine=u.role==='teacher';
  let classCount=0;if(classes){const data=bw17Read_(classes,200).rows;classCount=mine?data.filter(r=>u.classes.includes(String(r[0]).toUpperCase())).length:data.filter(r=>r[6]==='공개').length;}
  let latest=0,pending=0;
  if(!mine){if(contacts){const d=bw17Read_(contacts,200);latest=d.rows.filter(r=>String(r[8])==='신규').length;}
   if(u.role!=='frontdesk'&&regs){const d=bw17Read_(regs,250);const ix=d.headers.indexOf('운영자 최종 등록 상태');pending=d.rows.filter(r=>ix>=0&&String(r[ix])!=='등록확정').length;}}
  bw17Audit_(u,'대시보드 조회','통계','성공','개별 개인정보 제외');
  const result={newInquiries:(mine||!bw24Can_(u,'inquiries','read'))?null:latest,pendingEnrollments:(mine||u.role==='frontdesk'||!bw24Can_(u,'registrations','read'))?null:pending,classCount:classCount,role:u.role, updatedAt:bw17Now_()};
  cache.put(key,JSON.stringify(result),12);return result;
}
function staffListInquiries(token) {
  const u=bw24Authorized_(token,'inquiries','read',['owner','director','frontdesk']);const s=bw17Book_().getSheetByName(BW17.INQUIRIES),d=bw17Read_(s,250);
  const childIndex=d.headers.indexOf('아이 이름');
  const rows=d.rows.slice().reverse().map(r=>{
    const child=childIndex>=0?String(r[childIndex]||''):'';
    const legacy=String(r[2]||'');
    const phone=String(r[3]||'');
    const digits=phone.replace(/[^0-9]/g,'');
    const phoneValid=/^01(?:0[0-9]{8}|[16789][0-9]{7,8})$/.test(digits);
    return {at:r[0],receipt:r[1],child:child,guardian:legacy,displayName:child||legacy||'이름 미기재',legacyName:!child&&!!legacy,
      phone:phone,phoneValid:phoneValid,months:r[4],type:r[5],preferredTime:r[6],note:String(r[7]).slice(0,300),status:r[8],contactMethod:r[11]||'전화'};
  });
  bw17Audit_(u,'상담 목록 조회','상담접수','성공',rows.length+'건');return rows;
}
function staffUpdateInquiry(token,p) {
  const u=bw24Authorized_(token,'inquiries','write',['owner','director','frontdesk']);
  const receipt=String(p?.receipt||'').trim(),status=String(p?.status||'').trim();
  if(!/^BW-[A-Z0-9]{10,18}$/.test(receipt)||!['신규','연락중','방문예약','상담완료','종결'].includes(status))throw Error('접수번호나 상태를 확인해 주세요.');
  const s=bw17Book_().getSheetByName(BW17.INQUIRIES),row=bw17FindRow_(s,receipt,2);if(!row)throw Error('접수 정보를 찾을 수 없습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);try{s.getRange(row,9).setValue(status);bw17Audit_(u,'상담 상태 변경',receipt,'성공',status);}finally{lock.releaseLock();}
  return {ok:true};
}
function staffListRegistrations(token) {
  const u=bw24Authorized_(token,'registrations','read',['owner','director']);const s=bw17Book_().getSheetByName(BW17.REGISTRATIONS),d=bw17Read_(s,250);
  const rows=d.rows.slice().reverse().map(r=>({at:bw17Field_(d.headers,r,'접수시각'),receipt:bw17Field_(d.headers,r,'접수번호'),child:bw17Field_(d.headers,r,'아동 이름'),guardian:bw17Field_(d.headers,r,'보호자 성함'),phone:bw17Field_(d.headers,r,'연락처'),course:bw17Field_(d.headers,r,'과정명'),classCode:bw17Field_(d.headers,r,'등록코드'),starts:bw17Field_(d.headers,r,'수업 시작일'),payment:bw17Field_(d.headers,r,'납부·영수증 확인 메모'),status:bw17Field_(d.headers,r,'운영자 최종 등록 상태'),pdf:bw17Field_(d.headers,r,'PDF 보관상태'),backup:bw17Field_(d.headers,r,'PDF 백업 상태')}));
  bw17Audit_(u,'수강등록 목록 조회','수강등록','성공',rows.length+'건');return rows;
}
function staffListClasses(token) {
  const u=bw24Authorized_(token,'classes','read');
  const cache=CacheService.getScriptCache();
  const key='bw24_cl_'+bw17Hash_(u.email+'|'+u.role+'|'+u.classes.join(',')+'|'+String(PropertiesService.getScriptProperties().getProperty('BW24_CLASS_VER')||'0')).slice(0,40);
  const prev=cache.get(key);if(prev){try{return JSON.parse(prev);}catch(_){cache.remove(key);}}
  const s=bw17Book_().getSheetByName(BW17.CLASSES),d=bw17Read_(s,250);
  const rows=d.rows.map(r=>({id:String(r[0]||''),template:String(r[1]||''),starts:String(r[2]||''),day:String(r[3]||''),time:String(r[4]||''),period:String(r[5]||''),publicStatus:String(r[6]||''),review:String(r[7]||'')})).filter(x=>u.role!=='teacher'||u.classes.includes(x.id));
  const t=bw17Book_().getSheetByName(BW17.TEMPLATES),tt=bw17Read_(t,220);const templates=(u.role==='owner'||u.role==='director')?tt.rows.filter(r=>String(r[13]||'')==='활성').map(r=>({id:String(r[0]||''),course:String(r[1]||'')})) : [];
  const result={rows:rows,templates:templates};
  const json=JSON.stringify(result);if(json.length<90000)cache.put(key,json,24);
  return result;
}
function staffSaveClass(token,p) {
  const u=bw24Authorized_(token,'classes','write',['owner','director']);const id=String(p?.id||'').toUpperCase().trim(),template=String(p?.template||'').toUpperCase().trim(),day=String(p?.day||''),time=bw17Safe_(p?.time,50),period=bw17Safe_(p?.period,160),status=String(p?.publicStatus||''),review=String(p?.review||'');
  if(!/^[A-Z0-9_-]{3,32}$/.test(id)||!/^[A-Z0-9_-]{2,40}$/.test(template))throw Error('반 코드와 과정 코드를 확인해 주세요.');
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(String(p?.starts||''))||!['월요일','화요일','수요일','목요일','금요일','토요일','일요일'].includes(day)||!time||!period||!['공개','비공개'].includes(status)||!['검토완료','확인전'].includes(review))throw Error('수업 일정과 상태를 확인해 주세요.');
  const date=new Date(String(p.starts)+'T12:00:00+09:00');if(isNaN(date.getTime())||Utilities.formatDate(date,'Asia/Seoul','yyyy-MM-dd')!==String(p.starts))throw Error('시작일을 확인해 주세요.');
  const b=bw17Book_(),t=b.getSheetByName(BW17.TEMPLATES),td=bw17Read_(t,250);
  const matched=td.rows.find(r=>String(r[0]).toUpperCase()===template&&String(r[13])==='활성');if(!matched)throw Error('승인된 교습조건을 먼저 등록해 주세요.');
  if(status==='공개'&&review!=='검토완료')throw Error('공개 전에 운영자의 검토가 필요합니다.');
  if(status==='공개' && [1,2,3,4,5,6,7,8,9,10,11,12].some(i=>String(matched[i]??'').trim()===''))throw Error('수강조건 설정에 필수 계약정보가 부족합니다.');
  const s=bw17Tab_(BW17.CLASSES,BW17.CLASS_HEADERS,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const list=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().flat():[];
    const idx=list.findIndex(x=>String(x).toUpperCase()===id);const row=idx>=0?idx+2:s.getLastRow()+1;
    s.getRange(row,1,1,8).setValues([[id,template,date,day,time,period,status,review]]);
    s.getRange(row,3).setNumberFormat('yyyy-mm-dd');
    bw17Audit_(u,'반편성 저장',id,'성공',status+' / '+review);
  }finally{lock.releaseLock();}
  PropertiesService.getScriptProperties().setProperty('BW24_CLASS_VER',String(Date.now()));return {ok:true};
}
function bw17Roster_(user) {
  const book=bw17Book_(),s=book.getSheetByName(BW17.REGISTRATIONS),d=bw17Read_(s,3500);
  const arr=[];
  for(const r of d.rows){
    const state=bw17Field_(d.headers,r,'운영자 최종 등록 상태'),ledger=bw17Field_(d.headers,r,'수강생 대장 반영');
    if(state!=='등록확정'||ledger!=='반영완료')continue;
    const raw=bw17Field_(d.headers,r,'등록코드'),classId=raw.startsWith('공통등록:')?raw.slice(5).toUpperCase():'';
    if(!classId || (user.role==='teacher'&&!user.classes.includes(classId)))continue;
    arr.push({receipt:bw17Field_(d.headers,r,'접수번호'),child:bw17Field_(d.headers,r,'아동 이름'),birth:bw17Field_(d.headers,r,'아동 생년월'),classId:classId,course:bw17Field_(d.headers,r,'과정명'),guardian:(user.role==='teacher'&&!user.canContact)?'':bw17Field_(d.headers,r,'보호자 성함'),phone:(user.role==='teacher'&&!user.canContact)?'':bw17Field_(d.headers,r,'연락처')});
  }
  // Merge explicitly verified manual enrollments without changing signed contracts.
  const signed=new Set(arr.map(r=>r.receipt));
  const manual=bw37ManualRoster_(user);
  for(const student of manual)if(!signed.has(student.receipt))arr.push(student);
  return arr;
}
function staffListRoster(token) {
  const u=bw24Authorized_(token,'roster','read',['owner','director','teacher']);const rows=bw17Roster_(u);bw17Audit_(u,'수강생 명단 조회','담당 반','성공',rows.length+'명');return rows;
}
function staffListAttendance(token,p) {
  const u=bw24Authorized_(token,'attendance','read',['owner','director','teacher']);const id=bw17RequireClass_(u,p?.classId),date=String(p?.date||'');if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))throw Error('날짜를 선택해 주세요.');
  const students=bw17Roster_(u).filter(r=>r.classId===id);
  const s=bw17Tab_(BW17.ATTENDANCE,BW17.ATT_HEADERS,true),d=bw17Read_(s,3000);const index=new Map();
  for(const r of d.rows){if(String(r[0])===date&&String(r[1])===id)index.set(String(r[2]),{status:r[4],note:r[5],updatedAt:r[7]});}
  bw17Audit_(u,'출결 목록 조회',id+'/'+date,'성공',students.length+'명');
  return students.map(x=>Object.assign({},x,index.get(x.receipt)||{status:'미확인',note:'',updatedAt:''}));
}
function staffSaveAttendance(token,p) {
  const u=bw24Authorized_(token,'attendance','write',['owner','director','teacher']),id=bw17RequireClass_(u,p?.classId),date=String(p?.date||''),receipt=String(p?.receipt||''),status=String(p?.status||'');
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!['출석','결석','보강','미확인'].includes(status))throw Error('날짜나 출결 상태를 확인해 주세요.');
  const note=bw17Safe_(p?.note,140);const target=bw17Roster_(u).find(x=>x.classId===id&&x.receipt===receipt);if(!target)throw Error('해당 반의 확정 수강생이 아닙니다.');
  const s=bw17Tab_(BW17.ATTENDANCE,BW17.ATT_HEADERS,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{const d=bw17Read_(s,5000);let row=0;for(let i=0;i<d.rows.length;i++){const r=d.rows[i];if(String(r[0])===date&&String(r[1])===id&&String(r[2])===receipt){row=d.start+i;break;}}
    if(!row)row=s.getLastRow()+1;
    s.getRange(row,1,1,8).setValues([[date,id,receipt,bw17Safe_(target.child,100),status,note,u.email,new Date()]]);
    bw17Audit_(u,'출결 수정',receipt,'성공',date+' '+id+' '+status);
  }finally{lock.releaseLock();}
  return {ok:true};
}
function staffListUsers(token) {
  const u=bw17Authorized_(token,['owner']);const s=bw17Tab_(BW17.USERS,BW17.USER_HEADERS,true),d=bw17Read_(s,350);
  const rows=d.rows.map(r=>({email:r[0],name:r[1],role:r[2],status:r[3],classes:String(r[4]||'').split(',').filter(Boolean),canContact:r[5]==='허용',permissions:bw24Permissions_({email:String(r[0]||'').toLowerCase(),role:String(r[2]||'')})}));
  return [{email:bw17Config_().owner,name:'원장',role:'owner',status:'사용',classes:[],canContact:true,locked:true},...rows];
}
function staffSaveUser(token,p) {
  const u=bw17Authorized_(token,['owner']),email=bw17Email_(p?.email),name=bw17Safe_(p?.name,40),role=String(p?.role||''),status=String(p?.status||''),contact=p?.canContact===true?'허용':'차단';
  if(!email||email===bw17Config_().owner||!name||!['director','teacher','frontdesk'].includes(role)||!['사용','중지'].includes(status))throw Error('계정 정보를 확인해 주세요.');
  const classes=Array.isArray(p?.classes)?p.classes.map(v=>String(v).toUpperCase().trim()).filter(Boolean):[];
  if(classes.length>30||classes.some(x=>!/^[A-Z0-9_-]{3,32}$/.test(x)))throw Error('담당 반 코드를 확인해 주세요.');
  const known=bw17Book_().getSheetByName(BW17.CLASSES),d=bw17Read_(known,500),ids=new Set(d.rows.map(r=>String(r[0]).toUpperCase()));
  if(classes.some(c=>!ids.has(c)))throw Error('존재하지 않는 담당 반이 포함되었습니다.');
  const s=bw17Tab_(BW17.USERS,BW17.USER_HEADERS,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{const arr=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().flat():[];const i=arr.findIndex(x=>String(x).toLowerCase()===email),row=i>=0?i+2:s.getLastRow()+1;
    const created=i>=0?s.getRange(row,7).getValue():new Date();
    s.getRange(row,1,1,8).setValues([[email,name,role,status,classes.join(','),contact,created,new Date()]]);
    bw17Audit_(u,'직원 권한 변경',email,'성공',role+' / '+status+' / 담당반 '+classes.length);
  }finally{lock.releaseLock();}
  CacheService.getScriptCache().remove(bw24UserCacheKey_(email));
  return {ok:true};
}
function staffListAudit(token) {
  bw17Authorized_(token,['owner']);const s=bw17Book_().getSheetByName(BW17.AUDIT),d=bw17Read_(s,90);
  return d.rows.slice().reverse().map(r=>({at:r[0],user:r[1],role:r[2],action:r[3],target:r[4],result:r[5],note:r[6]}));
}
function staffBackupNow(token) {
  const u=bw17Authorized_(token,['owner']);const b=bw17Book_(),props=PropertiesService.getScriptProperties();
  let id=props.getProperty('BW17_ADMIN_BACKUP_FOLDER');let folder=id?DriveApp.getFolderById(id):null;
  if(!folder){folder=DriveApp.createFolder('Bridge Wonder - Admin Independent Backups (private)');folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);props.setProperty('BW17_ADMIN_BACKUP_FOLDER',folder.getId());}
  const name='BridgeWonder_Sheet_Backup_'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
  const copy=DriveApp.getFileById(b.getId()).makeCopy(name,folder);
  copy.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  bw17Audit_(u,'수동 백업',name,'성공','스프레드시트 사본 / PDF 별도');
  return {ok:true,createdAt:bw17Now_(),filename:name};
}

/* ==============================================================
 * Bridge Wonder V18 : Institute operations (STAFF ADMIN ONLY)
 * This section extends, but does not replace, the V17 authentication
 * system. It never publishes data and every entry point checks roles.
 * New sheets are created only after an authenticated staff request.
 * ============================================================== */
const BW18 = Object.freeze({
  TASKS: '운영_준법점검', PAYMENTS: '수납_영수증_환불이력', STAFF_DOCS: '교직원_준수기록',
  SAFETY: '수업_재료안전점검', HANDOFF: '수업_보호자동반확인',
  TASK_HEADERS: ['점검코드','분야','확인할 일','구분','처리상태','확인 예정일','담당자','증빙 참조(비공개)','최종 수정자','수정시각'],
  PAYMENT_HEADERS: ['기록시각','수강등록 접수번호','처리 구분','금액(원)','증빙/거래 참조','운영 메모','기록자','작업 ID'],
  STAFF_HEADERS: ['직원 이메일','성명','성범죄 조회 확인','아동학대 전력 조회 확인','채용/해임 신고 확인','아동학대 의무교육 확인','긴급복지 의무교육 확인','장애인학대 의무교육 확인','증빙 위치(비공개)','수정자','수정시각'],
  SAFETY_HEADERS: ['수업일','반 코드','공통 주제','재료 유형','재료 상태','실내 안전','소형 교구','위생·정리','보호자 사전안내','조치사항(민감정보 제외)','기록자','수정시각'],
  HANDOFF_HEADERS: ['수업일','반 코드','접수번호','동반 확인','종료 인계 확인','기록자','수정시각'],
  TASK_STATUSES: ['미확인','진행중','완료','보완필요'],
  SAFETY_STATUSES: ['확인완료','조치필요','해당없음'],
  TASKS_DEFAULT: [
    ['REG01','설립·운영','교육지원청 학원 등록·교습과정·시설·명칭 확인','법정 확인'],
    ['REG02','설립·운영','원칙·등록증·변경 신고사항 및 원본 서류 확인','법정 확인'],
    ['REG03','설립·운영','광고·홈페이지의 교습비 및 등록정보 표시 검토','법정 확인'],
    ['REG04','설립·운영','유아 모집·반배정을 위한 시험·평가 미실시 확인','법정 확인'],
    ['PAY01','수납·장부','교습비 게시표 및 신고 금액 일치 확인','법정 확인'],
    ['PAY02','수납·장부','영수증 발급·영수증 원부·현금출납부 대조','법정 확인'],
    ['PAY03','수납·장부','교습비 반환 기준 고지·요청별 기록 확인','법정 확인'],
    ['PAY04','수납·장부','수강생대장 및 해당 시 출석부 보존 점검','법정 확인'],
    ['SAFE01','시설·안전','배상책임보험 가입 범위·기간·갱신 점검','법정 확인'],
    ['SAFE02','시설·안전','소방·비상대피·출입문·위험물 점검','관할 확인'],
    ['SAFE03','시설·안전','영유아 동반·인계 및 비상 연락 절차 점검','권장 관리'],
    ['SAFE04','시설·안전','자연재료·식재료 위생·연령별 삼킴 위험 점검','권장 관리'],
    ['STAFF01','교직원','강사 채용·해임 통보 및 자격 서류 확인','법정 확인'],
    ['STAFF02','교직원','직원 성범죄·아동학대 관련 법정 조회 여부 확인','법정 확인'],
    ['STAFF03','교직원','해당 종사자 의무교육 이수·증빙 관리','법정 확인'],
    ['INFO01','개인정보','아동 법정대리인 동의·확인 절차 점검','법정 확인'],
    ['INFO02','개인정보','사진·영상 선택 동의 및 철회 관리 확인','법정 확인'],
    ['INFO03','개인정보','직원 권한 회수·접속기록·비공개 백업 점검','법정 확인'],
    ['OPS01','운영','반별 월간 공통 주제·월령별 안내 방법 점검','권장 관리'],
    ['OPS02','운영','교실 준비·수업 후 정리·기록 인계 점검','권장 관리']
  ]
});
function bw18OpsTab_() {
  const s=bw17Tab_(BW18.TASKS,BW18.TASK_HEADERS,true);
  if(s.getLastRow()===1){
    const lock=LockService.getScriptLock();lock.waitLock(15000);
    try{
      if(s.getLastRow()===1) {
        const data=BW18.TASKS_DEFAULT.map(r=>r.concat(['미확인','','','','','']));
        s.getRange(2,1,data.length,BW18.TASK_HEADERS.length).setValues(data);
      }
    }finally{lock.releaseLock();}
  }
  return s;
}
function bw18Rows_(s,max) {const d=bw17Read_(s,max||500);return d.rows||[];}
function bw18Date_(value,allowBlank) {
  const s=String(value||'').trim();if(!s&&allowBlank)return '';
  if(!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s))throw Error('날짜를 올바르게 선택해 주세요.');
  const d=new Date(s+'T12:00:00+09:00');
  if(isNaN(d.getTime())||Utilities.formatDate(d,'Asia/Seoul','yyyy-MM-dd')!==s)throw Error('올바르지 않은 날짜입니다.');
  return s;
}
function bw18Reg_(receipt) {
  // Accounting can refer to a manually verified student without fabricating
  // a guardian-signed online contract or altering the original registration sheet.
  if(/^BW-S-[A-F0-9]{12}$/.test(String(receipt||''))){
    const s=bw37ManualStudent_(receipt);
    return {name:s.child,classId:'공통등록:'+s.classId,status:'등록확정'};
  }
  const s=bw17Book_().getSheetByName(BW17.REGISTRATIONS);
  if(!s||s.getLastRow()<2)throw Error('먼저 수강등록 기록을 확인해 주세요.');
  const headers=bw17Headers_(s),idx=headers.indexOf('접수번호');
  if(idx<0)throw Error('수강등록 대장의 접수번호 열을 찾지 못했습니다.');
  const ids=s.getRange(2,idx+1,s.getLastRow()-1,1).getDisplayValues();
  let found=0;for(let i=ids.length-1;i>=0;i--)if(String(ids[i][0])===receipt){found=i+2;break;}
  if(!found)throw Error('수강등록 접수번호를 찾을 수 없습니다.');
  const row=s.getRange(found,1,1,headers.length).getDisplayValues()[0];
  return {name:bw17Field_(headers,row,'아동 이름'),classId:bw17Field_(headers,row,'등록코드'),status:bw17Field_(headers,row,'운영자 최종 등록 상태')};
}

// 1. Legal + operational checklist. Only owner/director can view details.
function staffListOperations(token) {
  const u=bw24Authorized_(token,'operations','read',['owner','director']);
  const rows=bw18Rows_(bw18OpsTab_(),250).map(r=>({code:r[0],category:r[1],title:r[2],kind:r[3],status:r[4],due:r[5],person:r[6],evidence:r[7],editor:r[8],updated:r[9]}));
  bw17Audit_(u,'운영 점검표 조회',BW18.TASKS,'성공',rows.length+'항목');return rows;
}
function staffSaveOperation(token,p) {
  const u=bw24Authorized_(token,'operations','write',['owner','director']);
  const code=String(p&&p.code||'').trim(),status=String(p&&p.status||'').trim();
  const due=bw18Date_(p&&p.due,true),person=bw17Safe_(p&&p.person,60),evidence=bw17Safe_(p&&p.evidence,180);
  if(!/^[A-Z]{2,7}\d{2}$/.test(code)||!BW18.TASK_STATUSES.includes(status))throw Error('점검 항목이나 상태를 확인해 주세요.');
  const s=bw18OpsTab_(),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const d=bw17Read_(s,250),i=d.rows.findIndex(x=>String(x[0])===code);
    if(i<0)throw Error('등록된 점검 항목이 아닙니다.');
    const r=d.start+i;
    s.getRange(r,5,1,6).setValues([[status,due,person,evidence,u.email,new Date()]]);
    bw17Audit_(u,'운영 점검 변경',code,'성공',status);
  }finally{lock.releaseLock();}
  return {ok:true};
}
// 2. Tuition ledger: manual evidence trail only; does NOT issue a legal receipt.
function staffListTuition(token) {
  const u=bw24Authorized_(token,'tuition','read',['owner','director']);
  const s=bw17Tab_(BW18.PAYMENTS,BW18.PAYMENT_HEADERS,true),d=bw17Read_(s,450);
  const records=d.rows.slice().reverse().map(r=>({at:r[0],receipt:r[1],kind:r[2],amount:r[3],reference:r[4],note:r[5],operator:r[6]}));
  const regs=bw17Read_(bw17Book_().getSheetByName(BW17.REGISTRATIONS),250);
  const students=regs.rows.slice().reverse().map(r=>({receipt:bw17Field_(regs.headers,r,'접수번호'),name:bw17Field_(regs.headers,r,'아동 이름'),classId:bw17Field_(regs.headers,r,'등록코드')})).filter(x=>x.receipt);
  // Manually verified students also appear in the accounting selection list.
  const registered=new Set(students.map(x=>x.receipt));
  for(const student of bw37ManualActive_({role:'owner',classes:[],canContact:true})){
    if(!registered.has(student.id))students.push({receipt:student.id,name:student.child,classId:student.classIds.join(',')});
  }
  bw17Audit_(u,'수납 기록 조회',BW18.PAYMENTS,'성공',records.length+'건');
  return {records:records,students:students};
}
function bw18PaymentOperationColumn_(sheet) {
  const headers=bw17Headers_(sheet),expected=BW18.PAYMENT_HEADERS.slice(0,7);
  if(expected.some((name,i)=>headers[i]!==name))throw Error('수납 대장의 열 구성을 확인해 주세요. 기존 자료는 변경하지 않았습니다.');
  const matches=headers.map((name,i)=>name==='작업 ID'?i+1:0).filter(Boolean);
  if(matches.length>1)throw Error('수납 대장에 작업 ID 열이 중복되어 있습니다. 원장에게 문의해 주세요.');
  if(matches.length)return matches[0];
  // Existing custom columns are preserved; append the operation key at the end.
  const column=sheet.getLastColumn()+1;
  if(column>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),column-sheet.getMaxColumns());
  sheet.getRange(1,column).setValue('작업 ID').setBackground('#40543a').setFontColor('#fff').setFontWeight('bold');
  return column;
}
function staffAppendTuition(token,p) {
  const u=bw24Authorized_(token,'tuition','write',['owner','director']);
  const receipt=String(p&&p.receipt||'').trim(),kind=String(p&&p.kind||'').trim(),amount=Number(p&&p.amount||0);
  const ref=bw17Safe_(p&&p.reference,85),note=bw17Safe_(p&&p.note,120);
  const operationId=String(p&&p.operationId||'').toLowerCase();
  if(!/^[a-f0-9]{32}$/.test(operationId))throw Error('저장 요청 정보를 확인할 수 없습니다. 기록을 확인한 뒤 화면을 새로고침해 주세요.');
  if(!/^BW[A-Z0-9-]{6,45}$/.test(receipt)||!['납부확인','영수증발급확인','환불요청','환불완료'].includes(kind))throw Error('수강등록 번호나 처리 종류를 확인해 주세요.');
  if(!Number.isSafeInteger(amount)||amount<0||amount>100000000)throw Error('금액을 확인해 주세요.');
  if(['납부확인','환불완료'].includes(kind)&&amount===0)throw Error('납부·환불 금액을 입력해 주세요.');
  if(['영수증발급확인','환불완료'].includes(kind)&&!ref)throw Error('영수증 또는 환불 증빙 참조를 적어 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const s=bw17Tab_(BW18.PAYMENTS,BW18.PAYMENT_HEADERS,true);
    const operationColumn=bw18PaymentOperationColumn_(s);
    const rows=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).getValues():[];
    const previous=rows.filter(r=>String(r[operationColumn-1]||'').toLowerCase()===operationId);
    if(previous.length>1)throw Error('같은 작업 ID의 수납 기록이 여러 건 있습니다. 추가 저장을 중단하고 기존 기록을 확인해 주세요.');
    if(previous.length){
      const r=previous[0];
      const same=String(r[1])===receipt&&String(r[2])===kind&&Number(r[3])===amount&&bw17Safe_(r[4],85)===ref&&bw17Safe_(r[5],120)===note;
      if(!same)throw Error('이미 사용된 저장 요청에 다른 내용이 포함되어 있습니다. 기존 수납 기록을 확인해 주세요.');
      return {ok:true,replayed:true,operationId:operationId};
    }
    bw18Reg_(receipt);
    if(kind==='환불완료'){
      const prior=rows.filter(r=>String(r[1])===receipt);
      const paid=prior.filter(r=>r[2]==='납부확인').reduce((n,r)=>n+Number(String(r[3]||0).replace(/[^0-9.-]/g,'')),0);
      const refunded=prior.filter(r=>r[2]==='환불완료').reduce((n,r)=>n+Number(String(r[3]||0).replace(/[^0-9.-]/g,'')),0);
      if(amount>paid-refunded)throw Error('확인된 납부금보다 환불 기록액이 큽니다. 납부기록부터 확인해 주세요.');
    }
    const values=Array(s.getLastColumn()).fill('');
    [new Date(),receipt,kind,amount,ref,note,u.email].forEach((value,i)=>{values[i]=value;});
    values[operationColumn-1]=operationId;
    // A single append stores both data and its deduplication key.
    s.appendRow(values);
    try{bw17Audit_(u,'수납·영수증 이력 추가',receipt,'성공',kind+' '+amount+'원');}
    catch(_){Logger.log('수납 기록 저장 후 감사기록 작성 실패');return {ok:true,operationId:operationId,auditWarning:true,message:'수납 기록은 저장되었습니다. 이용 기록 저장에 문제가 있어 원장 확인이 필요합니다. 같은 내용을 다시 저장하지 마세요.'};}
    return {ok:true,operationId:operationId,replayed:false};
  }finally{lock.releaseLock();}
}
// 3. Per-class checks: only assigned teacher classes or manager.
function staffListDailyChecks(token,p) {
  const u=bw24Authorized_(token,'safety','read',['owner','director','teacher']);
  const selected=String(p&&p.classId||'').trim().toUpperCase();
  if(selected)bw17RequireClass_(u,selected);
  const s=bw17Tab_(BW18.SAFETY,BW18.SAFETY_HEADERS,true),rows=bw18Rows_(s,1000).slice().reverse()
    .filter(r=>(!selected||String(r[1])===selected)&&(u.role!=='teacher'||u.classes.includes(String(r[1]))))
    .slice(0,100).map(r=>({date:r[0],classId:r[1],theme:r[2],material:r[3],fresh:r[4],room:r[5],smallParts:r[6],hygiene:r[7],notice:r[8],action:r[9],operator:r[10],at:r[11]}));
  bw17Audit_(u,'수업 준비 점검 조회',selected||'담당 반','성공',rows.length+'건');return rows;
}
function staffSaveDailyCheck(token,p) {
  const u=bw24Authorized_(token,'safety','write',['owner','director','teacher']);
  const classId=bw17RequireClass_(u,p&&p.classId),date=bw18Date_(p&&p.date,false),theme=bw17Safe_(p&&p.theme,70),action=bw17Safe_(p&&p.action,120);
  const material=String(p&&p.material||'');
  if(!['식재료','자연소재','교구','복합','재료 없음'].includes(material)||!theme)throw Error('주제와 재료 유형을 선택해 주세요.');
  const vals=['fresh','room','smallParts','hygiene','notice'].map(k=>String(p&&p[k]||''));
  if(vals.some(x=>!BW18.SAFETY_STATUSES.includes(x)))throw Error('안전 점검 항목을 모두 확인해 주세요.');
  if(vals.includes('조치필요')&&!action)throw Error('조치가 필요한 사항을 간단히 적어 주세요. 개인·건강정보는 적지 마세요.');
  const s=bw17Tab_(BW18.SAFETY,BW18.SAFETY_HEADERS,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const d=bw17Read_(s,4000),i=d.rows.findIndex(r=>String(r[0])===date&&String(r[1])===classId);const row=i<0?s.getLastRow()+1:d.start+i;
    s.getRange(row,1,1,BW18.SAFETY_HEADERS.length).setValues([[date,classId,theme,material,...vals,action,u.email,new Date()]]);
    bw17Audit_(u,'수업 재료·안전 점검',classId+' '+date,'성공',vals.includes('조치필요')?'조치 필요':'점검 기록');
  }finally{lock.releaseLock();}
  return {ok:true};
}
// 4. Child handoff records. No health notes, parent names, or contact details.
function staffListHandoffs(token,p) {
  const u=bw24Authorized_(token,'handoff','read',['owner','director','teacher']);const classId=bw17RequireClass_(u,p&&p.classId),date=bw18Date_(p&&p.date,false);
  const students=bw17Roster_(u).filter(x=>x.classId===classId);
  const s=bw17Tab_(BW18.HANDOFF,BW18.HANDOFF_HEADERS,true),records=bw18Rows_(s,3500).filter(r=>String(r[0])===date&&String(r[1])===classId);
  const prior=new Map(records.map(r=>[String(r[2]),r]));
  bw17Audit_(u,'보호자 동반 기록 조회',classId+' '+date,'성공',students.length+'명');
  return students.map(c=>({receipt:c.receipt,child:c.child,classId:classId,arrival:prior.get(c.receipt)?.[3]||'미확인',departure:prior.get(c.receipt)?.[4]||'미확인'}));
}
function staffSaveHandoff(token,p) {
  const u=bw24Authorized_(token,'handoff','write',['owner','director','teacher']),classId=bw17RequireClass_(u,p&&p.classId),date=bw18Date_(p&&p.date,false);
  const receipt=String(p&&p.receipt||''),arrival=String(p&&p.arrival||''),departure=String(p&&p.departure||'');
  if(!['미확인','동반 확인','확인 필요'].includes(arrival)||!['미확인','인계 확인','확인 필요'].includes(departure))throw Error('동반·인계 상태를 선택해 주세요.');
  const student=bw17Roster_(u).find(r=>r.classId===classId&&r.receipt===receipt);
  if(!student)throw Error('담당 반의 확정 수강생만 기록할 수 있습니다.');
  const s=bw17Tab_(BW18.HANDOFF,BW18.HANDOFF_HEADERS,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const d=bw17Read_(s,5000),i=d.rows.findIndex(r=>String(r[0])===date&&String(r[1])===classId&&String(r[2])===receipt);const row=i<0?s.getLastRow()+1:d.start+i;
    s.getRange(row,1,1,7).setValues([[date,classId,receipt,arrival,departure,u.email,new Date()]]);
    bw17Audit_(u,'보호자 동반·인계 확인',receipt,'성공',date+' '+arrival+' / '+departure);
  }finally{lock.releaseLock();}
  return {ok:true};
}

// 5. Per-staff checks. No actual criminal history, medical results or certificates
// are collected; store status and *private reference* only. Owner-only.
function staffListStaffCompliance(token) {
  const u=bw24Authorized_(token,'staffCompliance','read',['owner']);
  const users=bw17Tab_(BW17.USERS,BW17.USER_HEADERS,true),ur=bw18Rows_(users,500);
  const c=bw17Config_(),roster=[{email:c.owner,name:'원장',role:'owner'},...ur.map(r=>({email:String(r[0]).toLowerCase(),name:String(r[1]),role:String(r[2])}))].filter(x=>x.email);
  const d=bw17Tab_(BW18.STAFF_DOCS,BW18.STAFF_HEADERS,true);
  const map=new Map(bw18Rows_(d,500).map(r=>[String(r[0]).toLowerCase(),r]));
  const result=roster.map(x=>{
    const r=map.get(x.email)||[];
    return {email:x.email,name:x.name,role:x.role,criminal:r[2]||'미확인',child:r[3]||'미확인',report:r[4]||'미확인',abuse:r[5]||'미확인',welfare:r[6]||'미확인',disability:r[7]||'미확인',evidence:r[8]||'',updated:r[10]||''};
  });
  bw17Audit_(u,'교직원 준수 현황 조회',BW18.STAFF_DOCS,'성공',result.length+'명');
  return result;
}
function staffSaveStaffCompliance(token,p) {
  const u=bw24Authorized_(token,'staffCompliance','write',['owner']),email=bw17Email_(p&&p.email);
  const target=email?bw17User_(email):null;
  if(!target)throw Error('등록된 직원 계정만 선택할 수 있습니다.');
  const statuses=['미확인','확인완료','해당없음','재점검필요'];
  const vals=['criminal','child','report','abuse','welfare','disability'].map(k=>String(p&&p[k]||''));
  if(vals.some(x=>!statuses.includes(x)))throw Error('확인 상태를 선택해 주세요.');
  const evidence=bw17Safe_(p&&p.evidence,180),s=bw17Tab_(BW18.STAFF_DOCS,BW18.STAFF_HEADERS,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const rows=bw17Read_(s,500),i=rows.rows.findIndex(r=>String(r[0]).toLowerCase()===email),row=i<0?s.getLastRow()+1:rows.start+i;
    s.getRange(row,1,1,BW18.STAFF_HEADERS.length).setValues([[email,bw17Safe_(target.name,50),...vals,evidence,u.email,new Date()]]);
    bw17Audit_(u,'교직원 서류 상태 변경',email,'성공','조회·교육 완료 여부만 기록');
  }finally{lock.releaseLock();}
  return {ok:true};
}


/**
 * Bridge Wonder V19 | Private Document Center
 * Only paste into the separate STAFF Admin Apps Script project (V18).
 * Never publish these functions in the public parent-facing inquiry project.
 * Google Docs/PDF and email are created by the script owner, not by GitHub Pages.
 */
const BW19 = Object.freeze({
  DOCS:'운영_문서발급이력', MAILS:'운영_문서발송이력',
  DOC_HEADERS:['문서번호','생성일시','문서종류','출처','원본ID','제목','내용버전','PDF파일ID','백업파일ID','PDF_SHA256','생성자','생성자권한','백업상태','마지막발송시각','마지막수신자','발송상태','발송횟수'],
  MAIL_HEADERS:['처리시각','문서번호','받는사람','처리결과','담당자','메시지'],
  SOURCE_LIMIT:400, DOWNLOAD_MAX:2*1024*1024,
  DOC_TYPES:[
    {id:'inquiry',label:'상담 접수 확인서',roles:['owner','director','frontdesk']},
    {id:'registration',label:'수강 등록 확인서',roles:['owner','director']},
    {id:'payment',label:'납부 내역 안내서',roles:['owner','director']},
    {id:'class',label:'수업 안내문',roles:['owner','director','teacher']},
    {id:'contract',label:'전자서명 계약서 원본 사본',roles:['owner','director']},
    {id:'notice',label:'일반 안내문',roles:['owner','director']}
  ]
});
function bw19Type_(user,type) {
  const t=BW19.DOC_TYPES.find(x=>x.id===String(type||''));
  if(!t||!t.roles.includes(user.role))throw Error('이 문서를 발급할 권한이 없습니다.');
  const required={inquiry:['inquiries'],registration:['registrations'],payment:['registrations','tuition'],class:['classes'],contract:['registrations'],notice:[]}[t.id];
  if(!required||required.some(module=>!bw24Can_(user,module,'read')))throw Error('문서의 원본 자료를 조회할 권한이 없습니다.');
  return t;
}
function bw19TypeAllowed_(user,type){try{bw19Type_(user,type);return true;}catch(_){return false;}}
function bw19Tabs_(){return {docs:bw17Tab_(BW19.DOCS,BW19.DOC_HEADERS,true),mails:bw17Tab_(BW19.MAILS,BW19.MAIL_HEADERS,true)};}
function bw19Folder_(kind) {
  const p=PropertiesService.getScriptProperties();
  const name=kind==='backup'?'BW19_DOC_BACKUP_FOLDER_ID':'BW19_DOC_PRIVATE_FOLDER_ID';
  const prev=String(p.getProperty(name)||'').trim();
  if(prev){try{return DriveApp.getFolderById(prev);}catch(e){throw Error('문서 보관 폴더에 접근할 수 없습니다. 원장 계정의 Drive 설정을 확인해 주세요.');}}
  const folder=DriveApp.createFolder(kind==='backup'?'Bridge_Wonder_문서_사본_비공개':'Bridge_Wonder_문서_원본_비공개');
  p.setProperty(name,folder.getId());
  return folder;
}
function bw19Hex_(bytes) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(v=>('0'+((v+256)%256).toString(16)).slice(-2)).join('');}
function bw19Date_(){return Utilities.formatDate(new Date(),'Asia/Seoul','yyyy.MM.dd HH:mm');}
function bw19Name_(text,n){return String(text==null?'':text).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n||140);}
function bw19Money_(value){if(String(value==null?'':value).trim()==='')return '미확인';const n=Number(String(value||'0').replace(/[^\d.-]/g,''));return Number.isFinite(n)?Math.round(n).toLocaleString('ko-KR')+'원':String(value||'미확인');}
function bw19RegRows_(){const s=bw17Book_().getSheetByName(BW17.REGISTRATIONS);return bw17Read_(s,5000);}
function bw19Lookup_(type,id){
  const book=bw17Book_();
  const name=type==='inquiry'?BW17.INQUIRIES:type==='class'?BW17.CLASSES:BW17.REGISTRATIONS;
  const d=bw17Read_(book.getSheetByName(name),type==='class'?800:5000);
  if(!d.rows.length)throw Error('원본 기록을 찾을 수 없습니다.');
  const field=type==='inquiry'||type==='class'?null:'접수번호';
  const idx=type==='inquiry'?1:type==='class'?0:d.headers.indexOf(field);
  if(idx<0)throw Error('원본 자료의 필수 열을 찾지 못했습니다.');
  const row=d.rows.slice().reverse().find(r=>String(r[idx]||'').trim()===id);
  if(!row)throw Error('선택한 자료가 없거나 검색 범위를 벗어났습니다.');
  return {headers:d.headers,row:row,get:(label)=>bw17Field_(d.headers,row,label)};
}
function bw19ContractEligible_(d){
  return !!(d.get('PDF 파일 ID') && d.get('PDF 보관상태')==='보관완료' && String(d.get('법정대리인 이메일 회신 확인')).includes('회신확인'));
}
function bw19Build_(u,p){
  const type=String(p&&p.type||'').trim(),id=bw19Name_(p&&p.sourceId,90);bw19Type_(u,type);
  let title='',items=[],paragraphs=[],recEmail='',originalId='',notes='',source=id;
  if(type==='notice'){
    source='GENERAL';title=bw19Name_(p.title,95);const body=bw19Name_(p.note,1600);
    if(title.length<3||body.length<8)throw Error('안내 제목과 내용을 입력해 주세요.');
    paragraphs=[body];items=[['작성자',u.name||'브릿지 원더']];
  } else if(type==='class'){
    const d=bw19Lookup_('class',id),r=d.row;
    if(u.role==='teacher')bw17RequireClass_(u,id);
    title='수업 일정 안내';
    items=[['등록반 코드',String(r[0]||'')],['시작일',String(r[2]||'')],['요일',String(r[3]||'')],['수업 시간',String(r[4]||'')],['교습기간',String(r[5]||'')]];
    notes=bw19Name_(p.note,500);
    paragraphs=['수업 참여 전에 일정을 확인해 주시기 바랍니다. 변경이 필요한 경우 담당자에게 연락해 주세요.'];
    if(notes)paragraphs.push('추가 안내: '+notes);
  } else if(type==='inquiry'){
    const d=bw19Lookup_('inquiry',id),r=d.row;
    title='상담 접수 확인서';
    const child=d.get('아이 이름');
    items=[['상담 접수번호',String(r[1]||'')],['신청일시',String(r[0]||'')],
      [child?'아이 이름':'보호자 성함(이전 접수)',String(child||r[2]||'')],
      ['문의 유형',String(r[5]||'')],['연락 선호 방식',String(r[11]||'전화')],['처리 상태',String(r[8]||'접수')]];
    paragraphs=['본 문서는 온라인 상담 문의가 접수된 사실을 안내합니다. 실제 방문 상담 일정이나 수강 등록 확정을 의미하지 않습니다.'];
  } else {
    const d=bw19Lookup_('registration',id);const status=d.get('운영자 최종 등록 상태');
    if(type==='registration'||type==='payment'){
      if(status!=='등록확정')throw Error('등록이 확정된 기록만 문서로 발급할 수 있습니다.');
    }
    recEmail=bw17Email_(d.get('이메일'));
    const common=[['수강등록 접수번호',d.get('접수번호')],['보호자',d.get('보호자 성함')],['수강생',d.get('아동 이름')],['과정명',d.get('과정명')],['수업 시작일',d.get('수업 시작일')],['교습기간',d.get('교습기간')],['요일·시간',d.get('수업요일·시간')]];
    if(type==='registration'){
      if(!d.get('과정명')||!d.get('수업 시작일')||!d.get('교습비(원)')||!d.get('운영자 법정 상호')||!d.get('학원 등록번호'))throw Error('수강등록 확정 기록의 기관정보·교습비·수업조건을 먼저 확인해 주세요.');
      title='수강 등록 확인서';items=common.concat([['교습비',bw19Money_(d.get('교습비(원)'))],['기타경비',bw19Money_(d.get('기타경비(원)'))],['운영자 등록 상태',status],['운영기관',d.get('운영자 법정 상호')],['학원 등록번호',d.get('학원 등록번호')]]);
      paragraphs=['수강등록 시스템에 기록된 확정 내용을 기준으로 작성했습니다. 실제 수강계약의 원본, 교습비 납부 영수증 또는 법정대리인 신원확인 서류를 대신하지 않습니다.'];
    }
    if(type==='payment'){
      title='납부·반환 처리 내역 안내서';
      const s=bw17Book_().getSheetByName(BW18.PAYMENTS),r=bw17Read_(s,5000).rows.filter(x=>String(x[1])===id);
      if(!r.some(x=>x[2]==='납부확인'))throw Error('확인된 수납기록이 없어 문서를 만들 수 없습니다.');
      const paid=r.filter(x=>x[2]==='납부확인').reduce((n,x)=>n+Number(String(x[3]||0).replace(/[^0-9.-]/g,'')),0);
      const refunded=r.filter(x=>x[2]==='환불완료').reduce((n,x)=>n+Number(String(x[3]||0).replace(/[^0-9.-]/g,'')),0);
      items=common.slice(0,4).concat([['확인된 납부액',bw19Money_(paid)],['기록된 반환액',bw19Money_(refunded)],['납부·반환 순액',bw19Money_(paid-refunded)],['처리기록 수',r.length+'건']]);
      paragraphs=['수납 담당자가 확인·기록한 내역을 바탕으로 작성한 안내서입니다. 실제 결제사 거래내역과 대조해 주세요. 이 문서는 법정 교습비 영수증·현금영수증·카드매출전표를 대신하지 않습니다.'];
    }
    if(type==='contract'){
      if(!bw19ContractEligible_(d))throw Error('법정대리인 회신 확인과 PDF 보관이 완료된 전자서명 계약서만 교부할 수 있습니다.');
      originalId=d.get('PDF 파일 ID');title='전자서명 수강계약서 원본 사본';
      items=common.slice(0,4).concat([['보관 문서',String(originalId).slice(0,6)+'…'],['PDF 보관상태',d.get('PDF 보관상태')]]);
      paragraphs=['기존 등록 시스템에서 생성한 전자서명 PDF의 파일 바이트를 변경하지 않고 사본을 제공합니다. 계약 내용은 다시 작성하지 않습니다.'];
    }
  }
  return {type:type,sourceId:source,title:title,items:items.map(x=>[bw19Name_(x[0],80),bw19Name_(x[1],1200)]),paragraphs:paragraphs,recipient:recEmail,originalFileId:originalId};
}
function bw19Public_(d){
  return {type:d.type,sourceId:d.sourceId,title:d.title,items:d.items,paragraphs:d.paragraphs,recipient:d.recipient,version:'BW19-1',fingerprint:bw17Hash_(JSON.stringify([d.type,d.sourceId,d.title,d.items,d.paragraphs,d.recipient]))};
}
function staffDocTypes(token){const u=bw24Authorized_(token,'documents','read');return BW19.DOC_TYPES.filter(x=>bw19TypeAllowed_(u,x.id)).map(x=>({id:x.id,label:x.label}));}
function staffDocSources(token,type){
  const u=bw24Authorized_(token,'documents','read');bw19Type_(u,type);
  if(type==='notice')return [{id:'GENERAL',label:'새 안내문 작성',desc:'제목과 내용을 입력합니다.'}];
  if(type==='class'){
    const d=bw17Read_(bw17Book_().getSheetByName(BW17.CLASSES),900);
    return d.rows.filter(r=>u.role!=='teacher'||u.classes.includes(String(r[0]))).map(r=>({id:String(r[0]),label:String(r[0])+' · '+String(r[3]||'')+' '+String(r[4]||''),desc:'수업 일정'}));
  }
  if(type==='inquiry'){
    const d=bw17Read_(bw17Book_().getSheetByName(BW17.INQUIRIES),BW19.SOURCE_LIMIT);
    return d.rows.slice().reverse().map(r=>({id:String(r[1]||''),label:bw19Name_(r[2],30)+' · '+bw19Name_(r[1],35),desc:bw19Name_(r[8],30)})).filter(x=>x.id);
  }
  const d=bw19RegRows_();return d.rows.slice().reverse().filter(r=>{
    const get=k=>bw17Field_(d.headers,r,k);
    if(type==='contract')return Boolean(get('PDF 파일 ID')&&get('PDF 보관상태')==='보관완료'&&get('법정대리인 이메일 회신 확인').includes('회신확인'));
    return get('운영자 최종 등록 상태')==='등록확정';
  }).slice(0,BW19.SOURCE_LIMIT).map(r=>({id:bw17Field_(d.headers,r,'접수번호'),label:bw19Name_(bw17Field_(d.headers,r,'아동 이름'),30)+' · '+bw19Name_(bw17Field_(d.headers,r,'접수번호'),40),desc:bw19Name_(bw17Field_(d.headers,r,'과정명'),60)})).filter(x=>x.id);
}
function staffDocPreview(token,p){
  const u=bw24Authorized_(token,'documents','read');const d=bw19Build_(u,p||{});return bw19Public_(d);
}
/* BW21 BRAND: Lossless official Bridge Wonder logo artwork, embedded for private PDF/email output.
 * The public source PNG in GitHub and all V12 illustrations remain unchanged.
 * No external URL or Drive file permission is required to render the logo.
 */
const BW21_BRAND_LOGO_PNG_BASE64 = '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';
function bw21LogoBlob_(){
  return Utilities.newBlob(Utilities.base64Decode(BW21_BRAND_LOGO_PNG_BASE64),'image/png','Bridge_Wonder_Official_Logo.png');
}
function bw21HtmlEscape_(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function bw21EmailBody_(body){
  const paragraphs=bw21HtmlEscape_(body).replace(/\n/g,'<br>');
  return '<div style="font-family:Arial,sans-serif;background:#fbf8f2;padding:22px 12px;color:#364536">'
   + '<div style="max-width:590px;margin:0 auto;background:#fffdf8;border:1px solid #e6dac8;border-radius:18px;padding:28px 24px">'
   + '<img src="cid:bwWonderLogo" width="178" alt="Bridge Wonder Sensory Play Studio" style="display:block;max-width:100%;height:auto;margin:0 0 23px" />'
   + '<div style="font-size:14px;line-height:1.95;white-space:normal">'+paragraphs+'</div>'
   + '<div style="margin-top:28px;padding-top:15px;border-top:1px solid #e6dac8;color:#74796e;font-size:11px">Bridge Wonder · Sensory Play Studio</div>'
   + '</div></div>';
}

function bw19StyledPdf_(d,number){
  const title='BW_'+number+'_'+d.type;
  const doc=DocumentApp.create(title);let closed=false;
  try{
    const body=doc.getBody();
    // Brand header uses the actual official logo, not a recreated font wordmark.
    const logo=body.appendImage(bw21LogoBlob_());
    logo.setWidth(170).setHeight(100);
    const sub=body.appendParagraph('발급번호  '+number+'   |   Bridge Wonder · Sensory Play Studio');
    sub.editAsText().setForegroundColor('#74796e').setFontSize(9);
    body.appendHorizontalRule();
    body.appendParagraph(d.title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph('발급일시  '+bw19Date_()).editAsText().setFontSize(9).setForegroundColor('#606b5d');
    body.appendParagraph('');
    if(d.items.length){
      const t=body.appendTable(d.items.map(x=>[x[0],x[1]||'—']));
      t.setBorderColor('#e2e4da');t.setBorderWidth(0.5);
      for(let r=0;r<d.items.length;r++){
        t.getCell(r,0).setBackgroundColor('#f1f2e9');
        t.getCell(r,0).editAsText().setFontSize(10).setBold(true).setForegroundColor('#40543a');
        t.getCell(r,1).editAsText().setFontSize(10);
      }
    }
    body.appendParagraph('');
    d.paragraphs.forEach((x,i)=>{
      const p=body.appendParagraph(x);p.setSpacingAfter(8);p.editAsText().setFontSize(10).setForegroundColor(i===0?'#40543a':'#42483e');
    });
    body.appendParagraph('');body.appendHorizontalRule();
    body.appendParagraph('Bridge Wonder · Sensory Play Studio | 부산광역시 강서구 명지국제2로 80, e편한세상 명지 비주거시설동 2층 75호').editAsText().setFontSize(8).setForegroundColor('#7c8378');
    body.appendParagraph('안내 및 확인용 발급 문서 · 사업자 정보 및 실제 계약 원본은 관련 원장과 대조하여 관리합니다.').editAsText().setFontSize(8).setForegroundColor('#7c8378');
    doc.saveAndClose();closed=true;
    return DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(title+'.pdf');
  } finally{
    if(!closed){try{doc.saveAndClose();}catch(_) {}}
    try{DriveApp.getFileById(doc.getId()).setTrashed(true);}catch(_){ }
  }
}
function bw19FindDoc_(docId){
  if(!/^BW-DOC-20\d{6}-[a-f0-9]{12}$/i.test(String(docId||'')))throw Error('발급번호를 확인해 주세요.');
  const s=bw17Tab_(BW19.DOCS,BW19.DOC_HEADERS,false);if(!s||s.getLastRow()<2)throw Error('발급된 문서가 없습니다.');
  const ids=s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().flat();const i=ids.lastIndexOf(docId);
  if(i<0)throw Error('발급 이력을 찾지 못했습니다.');
  const row=i+2,vals=s.getRange(row,1,1,BW19.DOC_HEADERS.length).getDisplayValues()[0];return {sheet:s,row:row,vals:vals};
}
function bw19DocAuth_(u,r){
  const t=String(r.vals[2]),id=String(r.vals[4]);bw19Type_(u,t);
  if(u.role==='teacher')bw17RequireClass_(u,id);
}
function bw19HistoryRow_(r){const v=r.vals;return {id:v[0],at:v[1],type:v[2],source:v[4],title:v[5],backup:v[12],lastSent:v[13],recipient:v[14],mailStatus:v[15],sendCount:v[16]};}
function staffDocGenerate(token,p){
  const u=bw24Authorized_(token,'documents','write'),d=bw19Build_(u,p||{}),view=bw19Public_(d);
  if(view.fingerprint!==String(p&&p.fingerprint||''))throw Error('원본 내용이 변경되었습니다. 미리보기를 다시 확인해 주세요.');
  const number='BW-DOC-'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,12);
  let pdf;
  if(d.type==='contract'){
    const f=DriveApp.getFileById(d.originalFileId);
    if(f.getMimeType()!==MimeType.PDF)throw Error('전자서명 PDF 원본 형식이 올바르지 않습니다.');
    pdf=f.getBlob().setName('BW_Original_Contract_'+d.sourceId+'.pdf');
  }else pdf=bw19StyledPdf_(d,number);
  if(pdf.getBytes().length>BW19.DOWNLOAD_MAX)throw Error('생성된 문서가 너무 큽니다. 관리자에게 확인해 주세요.');
  const file=bw19Folder_('original').createFile(pdf);
  try{file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);}catch(_) { }
  let backup=null,backupStatus='백업필요';
  try{backup=bw19Folder_('backup').createFile(pdf);backup.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);backupStatus='백업완료';}catch(e){Logger.log('문서 백업 오류: '+e.message);}
  const ids=bw19Tabs_(),sha=bw19Hex_(pdf.getBytes()),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    ids.docs.appendRow([number,new Date(),d.type,d.type==='class'?'수업반':d.type==='inquiry'?'상담접수':d.type==='notice'?'직접작성':'수강등록',bw17Safe_(d.sourceId,90),bw17Safe_(d.title,95),'BW19-1',file.getId(),backup?backup.getId():'',sha,u.email,u.role,backupStatus,'','','미발송',0]);
    bw17Audit_(u,'문서 생성',number,'성공',d.type+' · '+backupStatus);
  }finally{lock.releaseLock();}
  return {ok:true,document:bw19HistoryRow_(bw19FindDoc_(number)),backupReady:backupStatus==='백업완료'};
}
function staffDocDownload(token,docId){
  const u=bw24Authorized_(token,'documents','read'),r=bw19FindDoc_(docId);bw19DocAuth_(u,r);
  const pdf=DriveApp.getFileById(r.vals[7]).getBlob(),bytes=pdf.getBytes();
  if(bytes.length>BW19.DOWNLOAD_MAX)throw Error('다운로드 용량이 제한을 넘었습니다. 원장 계정에서 원본 폴더를 확인해 주세요.');
  const actual=bw19Hex_(bytes);if(actual!==String(r.vals[9]))throw Error('문서 무결성 검사가 일치하지 않습니다. 다운로드를 중단합니다.');
  bw17Audit_(u,'문서 PDF 다운로드',docId,'성공',String(bytes.length)+' bytes');
  return {filename:'BridgeWonder_'+docId+'.pdf',contentType:'application/pdf',base64:Utilities.base64Encode(bytes)};
}
function staffDocSend(token,p){
  const u=bw24Authorized_(token,'documents','write'),docId=String(p&&p.docId||''),r=bw19FindDoc_(docId);bw19DocAuth_(u,r);
  const recipient=bw17Email_(p&&p.recipient),confirm=String(p&&p.confirmRecipient||'').trim().toLowerCase();
  if(!recipient||confirm!==recipient||p.confirm!==true)throw Error('받는 분의 이메일 주소를 두 번 확인하고 발송 동의에 체크해 주세요.');
  if(r.vals[12]!=='백업완료')throw Error('문서 백업이 완료되지 않았습니다. 백업 확인 후 발송해 주세요.');
  const type=String(r.vals[2]),source=String(r.vals[4]);
  if(['registration','payment','contract'].includes(type)){
    const reg=bw19Lookup_('registration',source),target=bw17Email_(reg.get('이메일'));
    if(!target||recipient!==target)throw Error('등록 문서는 확인된 보호자 이메일로만 발송할 수 있습니다. 이메일 정보를 먼저 확인해 주세요.');
    if(!reg.get('법정대리인 이메일 회신 확인').includes('회신확인'))throw Error('법정대리인 이메일 회신이 확인되지 않았습니다.');
  }
  if(MailApp.getRemainingDailyQuota()<1)throw Error('오늘 발송 가능한 메일 한도에 도달했습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    // Prevent accidental double-click resends to the same address within five minutes.
    const last=r.sheet.getRange(r.row,14,1,2).getDisplayValues()[0],when=Date.parse(String(last[0]).replace(' ','T')+'+09:00');
    if(String(last[1]).toLowerCase()===recipient && Number.isFinite(when) && Date.now()-when<300000)throw Error('같은 주소로 최근 발송한 문서입니다. 잠시 후 다시 확인해 주세요.');
    const blob=DriveApp.getFileById(r.vals[7]).getBlob();if(bw19Hex_(blob.getBytes())!==String(r.vals[9]))throw Error('첨부 문서 검증에 실패했습니다.');
    const note=bw19Name_(p&&p.message,350),subject='[Bridge Wonder] '+r.vals[5]+' · '+docId;
    const body='안녕하세요, 브릿지 원더입니다.\n\n요청하신 '+r.vals[5]+' PDF 파일을 보내드립니다.\n첨부된 문서의 내용과 수신자가 맞는지 확인해 주세요.\n'+(note?'\n'+note+'\n':'')+'\n문의: 010-2693-2471\n브릿지 원더 드림';
    // Email transmission and audit recording are separated: a log error must not be reported as a send failure.
    try{
      MailApp.sendEmail({to:recipient,subject:subject,body:body,htmlBody:bw21EmailBody_(body),inlineImages:{bwWonderLogo:bw21LogoBlob_()},attachments:[blob.setName('BridgeWonder_'+docId+'.pdf')],name:'Bridge Wonder Sensory Play Studio'});
    }catch(err){
      try{r.sheet.getRange(r.row,16).setValue('전송오류');bw19Tabs_().mails.appendRow([new Date(),docId,recipient,'전송오류',u.email,bw19Name_(err.message,100)]);}catch(_){ }
      try{bw17Audit_(u,'문서 이메일 발송',docId,'실패','메일 서비스 오류');}catch(_){ }
      throw Error('메일 전송 요청이 실패했습니다. 메일함과 발송기록을 확인한 후 다시 시도해 주세요.');
    }
    try{
      r.sheet.getRange(r.row,14,1,4).setValues([[Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd HH:mm:ss'),recipient,'전송요청완료',Number(r.vals[16]||0)+1]]);
      bw19Tabs_().mails.appendRow([new Date(),docId,recipient,'전송요청완료',u.email,'발송 서버에 요청됨. 수신 완료는 별도 확인']);
      bw17Audit_(u,'문서 이메일 발송',docId,'성공','수신자 확인 후 1건');
    }catch(err){
      Logger.log('메일 발송 요청 완료 후 이력 기록 실패: '+docId);
      return {ok:true,warning:true,message:'메일 발송은 요청했지만 기록 저장에 문제가 있었습니다. 중복 발송하지 말고 메일함에서 먼저 확인해 주세요.'};
    }
  }finally{lock.releaseLock();}
  return {ok:true,message:'메일 발송을 요청했습니다. 수신 여부는 받는 분의 메일함에서 확인해 주세요.'};
}
function staffDocHistory(token){
  const u=bw24Authorized_(token,'documents','read'),s=bw17Tab_(BW19.DOCS,BW19.DOC_HEADERS,false);if(!s)return [];
  const d=bw17Read_(s,120),rows=d.rows.slice().reverse();
  return rows.filter(v=>{
    const type=String(v[2]),id=String(v[4]);return bw19TypeAllowed_(u,type)&&(u.role!=='teacher'||u.classes.includes(id));
  }).slice(0,70).map(v=>({id:v[0],at:v[1],type:v[2],source:v[4],title:v[5],backup:v[12],lastSent:v[13],recipient:u.role==='teacher'?'':v[14],mailStatus:v[15],sendCount:v[16]}));
}
function staffDocRepairBackup(token,docId){
  const u=bw24Authorized_(token,'documents','write',['owner']),r=bw19FindDoc_(docId);
  if(r.vals[12]==='백업완료')return {ok:true,status:'백업완료'};
  const blob=DriveApp.getFileById(r.vals[7]).getBlob();if(bw19Hex_(blob.getBytes())!==String(r.vals[9]))throw Error('PDF 파일 검증에 실패했습니다.');
  const f=bw19Folder_('backup').createFile(blob);try{f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);}catch(_){ }
  r.sheet.getRange(r.row,9).setValue(f.getId());r.sheet.getRange(r.row,13).setValue('백업완료');bw17Audit_(u,'문서 백업 복구',docId,'성공','PDF 사본 저장');return {ok:true,status:'백업완료'};
}
/** Run manually ONCE from the owner account after pasting V19 into the private staff project. */
function setupStaffDocumentsV19(){
  bw24RequireEditorOwner_();
  const cfg=bw17Config_();const tabs=bw19Tabs_();const a=bw19Folder_('original'),b=bw19Folder_('backup');
  const ts=ScriptApp.getProjectTriggers();
  if(!ts.some(x=>x.getHandlerFunction()==='bw19DailyBackupCheck_'))ScriptApp.newTrigger('bw19DailyBackupCheck_').timeBased().everyDays(1).atHour(3).create();
  // Migrate this legacy backup trigger only; retain every unrelated project trigger.
  ts.filter(x=>x.getHandlerFunction()==='bw19DailyBackupCheck').forEach(x=>ScriptApp.deleteTrigger(x));
  Logger.log('문서센터 준비 완료 | 운영원장: '+cfg.owner+' | 문서이력: '+tabs.docs.getName()+' | 발송이력: '+tabs.mails.getName());
  Logger.log('보관 폴더 ID: '+a.getId()+' | 백업 폴더 ID: '+b.getId());
}
function bw19DailyBackupCheck(){
  // Compatibility entry for an editor invoking an old name. Anonymous RPC is denied.
  bw24RequireEditorOwner_();
  return bw19DailyBackupCheck_();
}
function bw19DailyBackupCheck_(){
  const s=bw17Tab_(BW19.DOCS,BW19.DOC_HEADERS,false);if(!s||s.getLastRow()<2)return;
  const d=bw17Read_(s,500);let done=0;
  for(let i=0;i<d.rows.length&&done<30;i++){
    const row=d.rows[i];if(row[12]==='백업완료'||!row[7])continue;
    try{const blob=DriveApp.getFileById(String(row[7])).getBlob();if(bw19Hex_(blob.getBytes())!==String(row[9]))throw Error('해시 불일치');
      const file=bw19Folder_('backup').createFile(blob);
      try{file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);}catch(_){ }
      s.getRange(d.start+i,9).setValue(file.getId());s.getRange(d.start+i,13).setValue('백업완료');done++;
    }catch(e){Logger.log('문서백업 재시도 실패: '+row[0]);}
  }
}

/* =====================================================================
 * V20 | Attendance follow-through, capacity/waitlist, monthly shared theme
 * Same PRIVATE staff Apps Script. Never deploy via public parent web app.
 * All endpoints check bw17Authorized_() and enforce server-side scope.
 * ===================================================================== */
const BW20 = Object.freeze({
  CAPS:'운영_정원설정', WAIT:'운영_대기자', MAKEUP:'운영_결석보강', THEMES:'운영_월간공통주제',
  CAP_HEAD:['수업반 코드','기준 정원','확인자','수정시각'],
  WAIT_HEAD:['대기번호','접수시각','상담 접수번호','희망 수업반','희망 시작일','처리 상태','업무 메모','수정자','수정시각'],
  MAKEUP_HEAD:['보강번호','접수시각','수강등록 접수번호','원래 수업반','원래 수업일','요청 구분','보강 수업반','보강 날짜','처리 상태','담당자','업무 메모','수정자','수정시각'],
  THEME_HEAD:['적용 월','공통 주제','연계 그림책','노래·리듬','공통 감각활동','7~12개월','13~18개월','19~24개월','25~35개월','36~48개월','검토 상태','확인자','수정시각'],
  WAIT_STATUSES:['대기','연락중','안내완료','철회'],
  MAKEUP_STATUSES:['접수','검토중','확정','거절','취소'],
  DAYS:['일요일','월요일','화요일','수요일','목요일','금요일','토요일']
});
function bw20Tab_(key,create){
  const opts={CAPS:[BW20.CAPS,BW20.CAP_HEAD],WAIT:[BW20.WAIT,BW20.WAIT_HEAD],MAKEUP:[BW20.MAKEUP,BW20.MAKEUP_HEAD],THEMES:[BW20.THEMES,BW20.THEME_HEAD]};
  if(!opts[key])throw Error('운영 자료 종류가 올바르지 않습니다.');
  return bw17Tab_(opts[key][0],opts[key][1],create===true);
}
function bw20Date_(v,allowBlank){return bw18Date_(v,allowBlank===true);}
function bw20ClassData_(){const d=bw17Read_(bw17Book_().getSheetByName(BW17.CLASSES),1500);return d.rows.map(r=>({id:String(r[0]||'').trim().toUpperCase(),starts:String(r[2]||'').slice(0,10),day:String(r[3]||''),time:String(r[4]||''),publicStatus:String(r[6]||''),review:String(r[7]||'')})).filter(x=>x.id);}
function bw20Class_(id){const code=String(id||'').trim().toUpperCase(),c=bw20ClassData_().find(x=>x.id===code);if(!c)throw Error('등록된 수업반을 선택해 주세요.');return c;}
function bw20Counts_(){
  const d=bw17Read_(bw17Book_().getSheetByName(BW17.REGISTRATIONS),20000),counts={};let legacy=0;
  for(const r of d.rows){if(bw17Field_(d.headers,r,'운영자 최종 등록 상태')!=='등록확정')continue;
    const code=bw17Field_(d.headers,r,'등록코드');if(!code.startsWith('공통등록:')){legacy++;continue;}
    const id=code.slice('공통등록:'.length).toUpperCase();counts[id]=(counts[id]||0)+1;
  }
  // Direct registrations count toward real class capacity only after verified activation.
  for(const student of bw37ManualActive_({role:'owner',classes:[],canContact:true})){
    for(const id of student.classIds)counts[id]=(counts[id]||0)+1;
  }
  return {counts:counts,legacy:legacy};
}
function bw20Caps_(){const d=bw17Read_(bw20Tab_('CAPS',false),5000),out={};for(const r of d.rows){const key=String(r[0]||'').toUpperCase();if(key)out[key]=Number(r[1])||0;}return out;}
function bw20WaitCount_(){const d=bw17Read_(bw20Tab_('WAIT',false),5000),out={};for(const r of d.rows){if(!['대기','연락중'].includes(String(r[5])))continue;const key=String(r[3]||'').toUpperCase();out[key]=(out[key]||0)+1;}return out;}
function staff20Capacity(token){
 const u=bw24Authorized_(token,'capacity','read'),limits=bw20Caps_(),en=bw20Counts_(),w=bw20WaitCount_();
 const classes=bw20ClassData_().filter(c=>u.role!=='teacher'||u.classes.includes(c.id));
 // Deliberately no child/guardian identifiers in this summary.
 return {rows:classes.map(c=>({id:c.id,starts:c.starts,day:c.day,time:c.time,capacity:limits[c.id]||0,enrolled:en.counts[c.id]||0,waiting:w[c.id]||0,
   free:limits[c.id]>0?Math.max(0,limits[c.id]-(en.counts[c.id]||0)):null,
   status:limits[c.id]<=0?'정원 미설정':(en.counts[c.id]||0)>limits[c.id]?'정원 초과':(en.counts[c.id]||0)===limits[c.id]?'마감':'여유'})),
   legacyNotice:u.role==='owner'||u.role==='director'?en.legacy:undefined};
}
function staff20SetCapacity(token,p){
 const u=bw24Authorized_(token,'capacity','write',['owner','director']),id=bw20Class_(p&&p.classId).id,n=Number(p&&p.capacity);
 if(!Number.isSafeInteger(n)||n<1||n>4)throw Error('브릿지 원더 수업은 한 회차에 아이 최대 4명으로 설정해 주세요.');
 const enrolled=bw20Counts_().counts[id]||0;if(n<enrolled)throw Error('확정 등록 인원보다 작은 정원으로 저장할 수 없습니다.');
 const s=bw20Tab_('CAPS',true),lock=LockService.getScriptLock();lock.waitLock(15000);
 try{const d=bw17Read_(s,5000),idx=d.rows.findIndex(r=>String(r[0]).toUpperCase()===id),row=idx>=0?d.start+idx:s.getLastRow()+1;
  s.getRange(row,1,1,4).setValues([[id,n,u.email,new Date()]]);bw17Audit_(u,'수업반 정원 설정',id,'성공',String(n)+'명');}
 finally{lock.releaseLock();}return {ok:true};
}
function bw20InquiryData_(){const d=bw17Read_(bw17Book_().getSheetByName(BW17.INQUIRIES),12000),map={},childIdx=d.headers.indexOf('아이 이름');
 for(const r of d.rows){if(r[1])map[String(r[1])] = {child:childIdx>=0?bw17Safe_(r[childIdx],40):'',guardian:bw17Safe_(r[2],40),phone:bw17EscapedPhone_(r[3]),status:String(r[8]||'')};}return map;}
function staff20Waitlist(token){
 const u=bw24Authorized_(token,'waitlist','read',['owner','director','frontdesk']),d=bw17Read_(bw20Tab_('WAIT',false),5000),inquiries=bw20InquiryData_();
 return d.rows.slice().reverse().map(r=>{const c=inquiries[String(r[2])]||{};return {id:r[0],at:r[1],receipt:r[2],child:c.child||'',guardian:c.guardian||'',phone:c.phone||'',classId:r[3],starts:r[4],status:r[5],note:r[6],updated:r[8]};});
}
function staff20SaveWaitlist(token,p){
 const u=bw24Authorized_(token,'waitlist','write',['owner','director','frontdesk']),id=String(p&&p.id||''),receipt=String(p&&p.receipt||'').trim(),classId=bw20Class_(p&&p.classId).id,
 starts=bw20Date_(p&&p.starts,true),status=String(p&&p.status||'대기'),note=bw17Safe_(p&&p.note,180);
 if(!BW20.WAIT_STATUSES.includes(status))throw Error('대기 상태를 선택해 주세요.');
 if(!bw20InquiryData_()[receipt])throw Error('먼저 상담 접수번호를 확인해 주세요.');
 const s=bw20Tab_('WAIT',true),lock=LockService.getScriptLock();lock.waitLock(15000);
 try{const d=bw17Read_(s,9000),found=id?d.rows.findIndex(r=>String(r[0])===id):-1;
   if(id&&found<0)throw Error('수정할 대기 기록을 찾지 못했습니다.');
   if(!id&&d.rows.some(r=>String(r[2])===receipt&&String(r[3])===classId&&['대기','연락중'].includes(String(r[5]))))throw Error('같은 수업반에 진행 중인 대기 접수가 있습니다.');
   const key=id||'BW-W-'+Utilities.getUuid().slice(0,12).toUpperCase(),row=found>=0?d.start+found:s.getLastRow()+1;
   const created=found>=0?d.rows[found][1]:new Date();
   s.getRange(row,1,1,BW20.WAIT_HEAD.length).setValues([[key,created,receipt,classId,starts,status,note,u.email,new Date()]]);
   bw17Audit_(u,'대기자 '+(id?'변경':'등록'),key,'성공',status+' / '+classId);return {ok:true,id:key};
 }finally{lock.releaseLock();}
}
function bw20Student_(receipt,originalDate){
  if(/^BW-S-[A-F0-9]{12}$/.test(String(receipt||'')))return bw37ManualStudent_(receipt,originalDate);
  const d=bw17Read_(bw17Book_().getSheetByName(BW17.REGISTRATIONS),15000);
 const r=d.rows.slice().reverse().find(x=>bw17Field_(d.headers,x,'접수번호')===receipt);
 if(!r||bw17Field_(d.headers,r,'운영자 최종 등록 상태')!=='등록확정')throw Error('확정된 수강등록 번호를 확인해 주세요.');
 const code=bw17Field_(d.headers,r,'등록코드');if(!code.startsWith('공통등록:'))throw Error('수업반 배정을 먼저 확인해 주세요.');
 return {receipt:receipt,child:bw17Field_(d.headers,r,'아동 이름'),classId:code.slice('공통등록:'.length).toUpperCase()};
}
function staff20Makeups(token){const u=bw24Authorized_(token,'makeups','read',['owner','director','teacher']),d=bw17Read_(bw20Tab_('MAKEUP',false),6000);
 const allowed=u.role==='teacher'?d.rows.filter(r=>u.classes.includes(String(r[3]).toUpperCase())):d.rows;
 return allowed.slice().reverse().map(r=>({id:r[0],at:r[1],receipt:r[2],classId:r[3],date:r[4],reason:r[5],targetClass:r[6],targetDate:r[7],status:r[8],operator:r[9],note:r[10],updated:r[12]}));
}
function bw20TargetOK_(klass,date,ignoreId){
 const c=bw20Class_(klass),d=bw20Date_(date,false),weekday=BW20.DAYS[new Date(d+'T12:00:00+09:00').getUTCDay()];
 // getUTCDay can differ by timezone for UTC+9 local noon? local noon = UTC03:00 => same weekday.
 if(weekday!==c.day)throw Error('보강일은 대상 반의 실제 수업 요일과 맞아야 합니다.');
 if(c.review!=='검토완료')throw Error('운영자가 검토한 수업반만 보강 배정할 수 있습니다.');
 if(c.starts && d<c.starts)throw Error('반 시작일 이전으로 보강을 배정할 수 없습니다.');
 const caps=bw20Caps_(),cap=caps[c.id];if(!cap)throw Error('보강을 승인하기 전에 대상 반의 정원을 설정해 주세요.');
 const regular=bw20Counts_().counts[c.id]||0;
 const makeup=bw17Read_(bw20Tab_('MAKEUP',false),10000).rows.filter(r=>r[0]!==ignoreId&&String(r[6])===c.id&&String(r[7])===d&&String(r[8])==='확정').length;
 if(regular+makeup>=cap)throw Error('대상 수업에 빈자리가 없습니다. 다른 날짜나 반을 선택해 주세요.');
 return c.id;
}
function staff20SaveMakeup(token,p){
 const u=bw24Authorized_(token,'makeups','write',['owner','director','teacher']);const id=String(p&&p.id||'').trim(),receipt=String(p&&p.receipt||'').trim(),date=bw20Date_(p&&p.date,false),student=bw20Student_(receipt,date);
 const klass=bw17RequireClass_(u,student.classId),reason=String(p&&p.reason||''),status=String(p&&p.status||'접수'),
  targetClass=String(p&&p.targetClass||'').toUpperCase(),targetDate=bw20Date_(p&&p.targetDate,true),note=bw17Safe_(p&&p.note,180);
 if(!['결석','일정변경','기타'].includes(reason)||!BW20.MAKEUP_STATUSES.includes(status))throw Error('요청 구분이나 처리 상태를 확인해 주세요.');
 const original=bw20Class_(klass);if(BW20.DAYS[new Date(date+'T12:00:00+09:00').getUTCDay()]!==original.day)throw Error('원래 수업일은 해당 반의 수업 요일에 맞아야 합니다.');
 if(u.role==='teacher'&&(id||status!=='접수'||targetClass||targetDate))throw Error('선생님은 담당 반의 보강 요청을 새로 등록할 수 있습니다. 일정 확정은 관리자가 진행합니다.');
 if(status==='확정'&&(!targetClass||!targetDate))throw Error('확정하려면 대상 반과 보강일을 선택해 주세요.');
 if((targetClass&&!targetDate)||(!targetClass&&targetDate))throw Error('보강 반과 날짜를 함께 선택해 주세요.');
 const s=bw20Tab_('MAKEUP',true),lock=LockService.getScriptLock();lock.waitLock(15000);
 try{const d=bw17Read_(s,9000),index=id?d.rows.findIndex(r=>String(r[0])===id):-1;
   if(id&&index<0)throw Error('보강 요청 기록이 없습니다.');
   if(index>=0&&(String(d.rows[index][2])!==receipt||String(d.rows[index][3])!==klass))throw Error('기존 신청 내역의 대상은 변경할 수 없습니다.');
   if(!id&&d.rows.some(r=>String(r[2])===receipt&&String(r[4])===date&&!['취소','거절'].includes(String(r[8]))))throw Error('같은 날짜의 보강 요청이 이미 있습니다.');
   if(status==='확정')bw20TargetOK_(targetClass,targetDate,id);
   const key=id||'BW-M-'+Utilities.getUuid().slice(0,12).toUpperCase(),row=index>=0?d.start+index:s.getLastRow()+1,created=index>=0?d.rows[index][1]:new Date();
   s.getRange(row,1,1,BW20.MAKEUP_HEAD.length).setValues([[key,created,receipt,klass,date,reason,targetClass,targetDate,status,u.email,note,u.email,new Date()]]);
   bw17Audit_(u,'결석·보강 '+(id?'변경':'요청'),key,'성공',status);
   return {ok:true,id:key};
 }finally{lock.releaseLock();}
}
function staff20Themes(token){const u=bw24Authorized_(token,'themes','read'),d=bw17Read_(bw20Tab_('THEMES',false),300);
 const a=u.role==='teacher'||u.role==='frontdesk'?d.rows.filter(r=>String(r[10])==='확정'):d.rows;
 return a.slice().reverse().map(r=>({month:r[0],theme:r[1],book:r[2],song:r[3],activity:r[4],methods:r.slice(5,10),status:r[10],updated:r[12]}));}
function staff20SaveTheme(token,p){const u=bw24Authorized_(token,'themes','write',['owner','director']),month=String(p&&p.month||'').trim(),theme=bw17Safe_(p&&p.theme,80),book=bw17Safe_(p&&p.book,140),song=bw17Safe_(p&&p.song,140),activity=bw17Safe_(p&&p.activity,250),status=String(p&&p.status||'초안');
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!theme||!['초안','확정'].includes(status))throw Error('적용 월과 주제를 확인해 주세요.');
 if(status==='확정'&&(!book||!song||!activity))throw Error('확정 전에 그림책·노래·공통 활동을 작성해 주세요.');
 const methods=Array.isArray(p&&p.methods)?p.methods.map(x=>bw17Safe_(x,270)):[];if(methods.length!==5)throw Error('5개 월령별 진행 방식을 모두 입력해 주세요.');
 if(status==='확정'&&methods.some(x=>!x))throw Error('월령별 교사 진행 방식을 모두 입력해 주세요.');
 const s=bw20Tab_('THEMES',true),lock=LockService.getScriptLock();lock.waitLock(15000);
 try{const d=bw17Read_(s,1200),idx=d.rows.findIndex(r=>String(r[0])===month),row=idx>=0?d.start+idx:s.getLastRow()+1;
   s.getRange(row,1,1,BW20.THEME_HEAD.length).setValues([[month,theme,book,song,activity,...methods,status,u.email,new Date()]]);
   bw17Audit_(u,'월간 공통주제 저장',month,'성공',status);return {ok:true};
 }finally{lock.releaseLock();}}
function staff20ActionCenter(token){
 const u=bw24Authorized_(token,'home','read'),items=[];
 if(u.role!=='teacher'){
  const inquiry=bw17Read_(bw17Book_().getSheetByName(BW17.INQUIRIES),1200).rows.filter(r=>['신규','연락중'].includes(String(r[8]))).length;
  items.push({label:'상담 연락 확인',count:inquiry,page:'inquiries'});
  const waits=bw17Read_(bw20Tab_('WAIT',false),1200).rows.filter(r=>['대기','연락중'].includes(String(r[5]))).length;
  items.push({label:'대기자 안내 확인',count:waits,page:'waitlist'});
 }
 if(u.role!=='frontdesk'){
  const all=bw17Read_(bw20Tab_('MAKEUP',false),1200).rows;
  const todo=all.filter(r=>['접수','검토중'].includes(String(r[8]))&&(u.role!=='teacher'||u.classes.includes(String(r[3]).toUpperCase()))).length;
  items.push({label:'보강 요청 확인',count:todo,page:'makeups'});
 }
 if(['owner','director'].includes(u.role)){
  const tasks=bw17Read_(bw17Book_().getSheetByName(BW18.TASKS),500).rows;
  const now=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');
  const overdue=tasks.filter(r=>String(r[5])&&String(r[5])<now&&String(r[4])!=='완료').length;
  items.push({label:'기한 지난 운영 점검',count:overdue,page:'operations'});
 }
 return {items:items.filter(x=>bw24Can_(u,x.page,'read')),updatedAt:bw17Now_()};
}
/** One-time setup for V20; adds separate tabs and never deletes existing data. */
function setupStaffOperationsV20(){
  bw24RequireEditorOwner_();
 const cfg=bw17Config_();['CAPS','WAIT','MAKEUP','THEMES'].forEach(k=>bw20Tab_(k,true));
 Logger.log('V20 운영 탭 추가 완료 | 원장: '+cfg.owner+' | 기존 탭·서명 PDF 변경 없음');
}


/**
 * Bridge Wonder V21 ONE-SHOT SETUP - STAFF ADMIN project ONLY.
 * Requires separate Staff project with Code.gs AND Admin.html.
 * Script Properties: SPREADSHEET_ID = same PRIVATE Sheet, OWNER_EMAIL = principal email.
 * Run ONCE BEFORE deploying the Staff web app; legacy V17-20 installs unnecessary.
 */
function setupBridgeWonderV21() {
  bw24RequireEditorOwner_();
  const cfg = bw17Config_(); // validates both script properties without creating a new spreadsheet
  HtmlService.createHtmlOutputFromFile('Admin'); // fail before mutations when the Admin.html file is missing
  const book = SpreadsheetApp.openById(cfg.id);
  const required = [BW17.INQUIRIES, BW17.REGISTRATIONS, BW17.CLASSES, BW17.TEMPLATES];
  const missing = required.filter(name => !book.getSheetByName(name));
  if (missing.length) {
    throw Error('중단: 학부모 공개 프로젝트 V21 초기 설정 후 진행하세요. 없는 탭: ' + missing.join(', '));
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('BW21_STAFF_PREINSTALL_BACKUP_ID')) {
    const folder = DriveApp.createFolder('Bridge Wonder - V21 Staff Install Backup (restricted)');
    folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    const stamp = Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd_HHmmss');
    const copy = DriveApp.getFileById(cfg.id).makeCopy('BridgeWonder_Before_V21_Staff_' + stamp, folder);
    copy.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    props.setProperty('BW21_STAFF_PREINSTALL_BACKUP_ID',copy.getId());
    props.setProperty('BW21_STAFF_PREINSTALL_BACKUP_FOLDER_ID',folder.getId());
    Logger.log('관리자 설치 전 Google Sheets 백업: ' + copy.getUrl());
  }
  // V17: create the empty account, access-audit and attendance headers.
  bw17Tab_(BW17.USERS, BW17.USER_HEADERS, true);
  bw17Tab_(BW17.AUDIT, BW17.AUDIT_HEADERS, true);
  bw17Tab_(BW17.ATTENDANCE, BW17.ATT_HEADERS, true);
  bw17Secret_(); // initialize private OTP signing secret in project properties
  // V18: existing operational and compliance tabs; seed default checklist only if empty.
  bw18OpsTab_();
  bw17Tab_(BW18.PAYMENTS, BW18.PAYMENT_HEADERS, true);
  bw17Tab_(BW18.STAFF_DOCS, BW18.STAFF_HEADERS, true);
  bw17Tab_(BW18.SAFETY, BW18.SAFETY_HEADERS, true);
  bw17Tab_(BW18.HANDOFF, BW18.HANDOFF_HEADERS, true);
  // V19+V20 are included in the final V21 source: their own routines are idempotent.
  setupStaffDocumentsV19();
  setupStaffOperationsV20();
  props.setProperty('BW21_STAFF_ONE_SHOT_PREPARED_AT',new Date().toISOString());
  const tabs = book.getSheets().map(s => s.getName());
  Logger.log('STAFF V21 준비 완료: ' + book.getUrl());
  Logger.log('원장 이메일: ' + cfg.owner);
  Logger.log('관리자 추가 탭: ' + tabs.filter(x=>/^관리자_|^운영_|^수업_|^교직원_|^수납_/.test(x)).join(', '));
  Logger.log('다음: STAFF 웹앱 -> 실행 사용자 나 / 액세스 모든 사용자 -> 배포 후 OTP와 권한 분리를 테스트하세요.');
  return { ok:true, spreadsheetUrl:book.getUrl(), sheetCount:tabs.length, owner:cfg.owner };
}


// Single-course contract/tuition conditions editable from Google-only admin UI.
const BW22_COURSE_KEYS_=['code','name','fee','extras','refund','business','license','retention','location','makeup','accompaniment','materials','safety','status'];
function staff22GetCourseSettings(token){
  bw24Authorized_(token,'courseSettings','read',['owner','director']);
  const d=bw17Read_(bw17Book_().getSheetByName(BW17.TEMPLATES),250);
  return {rows:d.rows.filter(r=>String(r[0]||'').trim()).map(r=>{
    const x={};BW22_COURSE_KEYS_.forEach((k,i)=>{x[k]=String(r[i]||'');});return x;
  })};
}
function staff22SaveCourseSettings(token,p){
  const u=bw24Authorized_(token,'courseSettings','write',['owner','director']);
  const code=String(p&&p.code||'').trim().toUpperCase();
  if(code!=='BW-SENSORY')throw Error('현재는 단일 수강 과정만 운영합니다.');
  const name=bw17Safe_(p.name,90),fee=Number(p.fee),extras=Number(p.extras),status=String(p.status||'중지');
  if(!name||!Number.isSafeInteger(fee)||fee<0||fee>100000000||!Number.isSafeInteger(extras)||extras<0||extras>100000000)throw Error('과정명과 교습비를 확인해 주세요.');
  if(!['활성','중지'].includes(status))throw Error('운영 상태를 확인해 주세요.');
  const extrasData=[p.refund,p.business,p.license,p.retention,p.location,p.makeup,p.accompaniment,p.materials,p.safety];
  if(status==='활성'&&extrasData.some(v=>!String(v||'').trim()))throw Error('활성화하려면 필수 운영·법정 정보를 모두 입력해야 합니다.');
  const values=[code,name,fee,extras,...extrasData.map((x,i)=>bw17Safe_(x,i===0?4000:1200)),status];
  const b=bw17Book_(),s=b.getSheetByName(BW17.TEMPLATES);if(!s)throw Error('수강조건 설정 탭이 없습니다. 기존 공개 Apps Script의 초기화를 확인하세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const d=bw17Read_(s,300),idx=d.rows.findIndex(r=>String(r[0]||'').trim().toUpperCase()===code),row=idx>=0?d.start+idx:s.getLastRow()+1;
    s.getRange(row,1,1,14).setValues([values]);
    s.getRange(row,3,1,2).setNumberFormat('0');
    bw17Audit_(u,'수강조건 저장',code,'성공',status);
  }finally{lock.releaseLock();}
  PropertiesService.getScriptProperties().setProperty('BW24_CLASS_VER',String(Date.now()));return {ok:true};
}



// BW23 Google-only authentication. Not an external REST API.
// Password verifiers are kept in private Script Properties, never in GitHub or Sheets.
// GAS Utilities lacks native scrypt/Argon2; this PBKDF2-HMAC-SHA256 implementation is rate-limited.
const BW23_PASSWORD_ROUNDS_ = 24000;
const BW23_MAX_PASSWORD_ATTEMPTS_ = 5;
const BW23_LOCK_SECONDS_ = 900;

function bw23CredentialKey_(email) {
  return 'BW23_CRED_' + bw17Hash_(email).slice(0,40);
}
function bw23LockKey_(email) {
  return 'BW23_FAIL_' + bw17Hash_(email).slice(0,40);
}
function bw23Pepper_() {
  const props = PropertiesService.getScriptProperties();
  let v = props.getProperty('BW23_PRIVATE_PEPPER');
  if (!v) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      v = props.getProperty('BW23_PRIVATE_PEPPER');
      if (!v) {
        v = [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid()].join('');
        props.setProperty('BW23_PRIVATE_PEPPER', v);
      }
    } finally { lock.releaseLock(); }
  }
  return v;
}
function bw23Hex_(a) {
  return a.map(v => ('0' + ((v + 256) % 256).toString(16)).slice(-2)).join('');
}
function bw23Unhex_(h) {
  const a=[];
  for(let i=0;i<h.length;i+=2) a.push(parseInt(h.slice(i,i+2),16));
  return a;
}
function bw23Equals_(a,b) {
  a=String(a||'');b=String(b||'');
  if(a.length!==b.length)return false;
  let n=0; for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);
  return n===0;
}
function bw23PasswordValid_(pwd) {
  return typeof pwd==='string' && pwd.length>=12 && pwd.length<=100 && !/[\u0000-\u001f\u007f]/.test(pwd);
}
function bw23Pbkdf2_(pwd,salt,rounds) {
  // HMAC-SHA256 PBKDF2 block #1, 32-byte output. Uses server-side pepper.
  const key=Utilities.newBlob(pwd+'|'+bw23Pepper_()).getBytes();
  const msg=bw23Unhex_(salt).concat([0,0,0,1]);
  let u=Utilities.computeHmacSha256Signature(msg,key);
  const t=u.map(v=>(v+256)%256);
  for(let i=1;i<rounds;i++) {
    u=Utilities.computeHmacSha256Signature(u,key);
    for(let j=0;j<t.length;j++)t[j]^=(u[j]+256)%256;
  }
  return bw23Hex_(t);
}
// BW29 native-browser KDF migration: no change to owner/teacher authorization.
const BW29_CLIENT_ROUNDS_ = 160000;
function bw29ValidProof_(p) {return typeof p==='string'&&/^[a-f0-9]{64}$/.test(p);}
function bw29ProofHash_(email,proof) {
  if(!bw29ValidProof_(proof))throw Error('비밀번호 확인이 필요합니다.');
  // Only the peppered HMAC is stored. Never log or persist the client proof.
  const key=Utilities.newBlob(bw23Pepper_()).getBytes();
  const msg=Utilities.newBlob('BW29-V2|'+String(email||'').trim().toLowerCase()+'|'+proof).getBytes();
  return bw23Hex_(Utilities.computeHmacSha256Signature(msg,key));
}
function bw29Credential_(email,proof,legacy) {
  const c={v:2,scheme:'BW29-WEBCRYPTO-PBKDF2-SHA256-PEPPER-HMAC',rounds:BW29_CLIENT_ROUNDS_,
    hash:bw29ProofHash_(email,proof),updatedAt:new Date().toISOString()};
  // Legacy Google HtmlService clients may still log in by their original password.
  // Retain only the existing peppered v1 verifier; never store plaintext or browser proof.
  if(legacy&&legacy.v===1&&legacy.salt&&legacy.hash&&Number.isInteger(legacy.rounds)){
    c.legacy={salt:legacy.salt,hash:legacy.hash,rounds:legacy.rounds};
  }
  return c;
}
function bw23GetCred_(email){
  const raw=PropertiesService.getScriptProperties().getProperty(bw23CredentialKey_(email));
  if(!raw)return null;
  try {
    const c=JSON.parse(raw);
    if(c.v===1&&c.hash&&c.salt&&Number.isInteger(c.rounds))return c;
    if(c.v===2&&c.scheme==='BW29-WEBCRYPTO-PBKDF2-SHA256-PEPPER-HMAC'&&
       c.rounds===BW29_CLIENT_ROUNDS_&&/^[a-f0-9]{64}$/.test(c.hash))return c;
  }catch(_){ }
  throw Error('로그인 정보가 손상되었습니다. 원장에게 문의해 주세요.');
}
function bw23IssueSession_(user) {
  const token=Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid();
  const authState=bw30AccountState_(user.email);
  CacheService.getScriptCache().put('session_'+bw17Hash_(token),bw30PackSession_(user.email),BW17.SESSION_SECONDS);
  bw17Audit_(user,'비밀번호 로그인','직원 포털','성공','개별 이메일 계정');
  return {ok:true,token:token,user:{email:user.email,name:user.name,role:user.role,canContact:user.canContact,mustChange:authState.mustChange,permissions:bw24Permissions_(user)},expiresInMinutes:60};
}
function setupBridgeWonderV23() {
  bw24RequireEditorOwner_();
  const cfg=bw17Config_();
  HtmlService.createHtmlOutputFromFile('Admin');
  const wb=SpreadsheetApp.openById(cfg.id);
  const needed=[BW17.USERS,BW17.AUDIT,BW17.CLASSES,BW17.TEMPLATES];
  const missing=needed.filter(n=>!wb.getSheetByName(n));
  if(missing.length)throw Error('기존 V21 설정이 필요합니다: '+missing.join(', '));
  bw23Pepper_();
  Logger.log('BW23 Google-only 준비 완료. 기존 Sheets 및 PDF 변경 없음.');
  Logger.log('배포 관리 → 기존 직원 관리자 배포 → 새 버전 → 배포로 갱신하세요.');
  return {ok:true};
}
function staff23PasswordStartEnrollment(email) {
  // Reuse the existing, rate-limited OTP. Return a generic response to avoid account enumeration.
  return staffLoginStart(email);
}
function staff23PasswordCompleteEnrollment(p) {
  const email=bw17Email_(p&&p.email),code=String(p&&p.code||'').trim();
  const pwd=p&&p.password,mode=String(p&&p.mode||'setup');
  if(!email || !/^\d{6}$/.test(code) || !bw23PasswordValid_(pwd)) throw Error('이메일·인증번호·12자 이상 비밀번호를 확인해 주세요.');
  if(!['setup','reset'].includes(mode))throw Error('요청을 처리할 수 없습니다.');
  const user=bw17User_(email);
  if(!user||user.status!=='사용')throw Error('사용할 수 없는 계정입니다.');
  const existing=bw23GetCred_(email);
  if(mode==='setup'&&existing)throw Error('이미 등록된 계정입니다. 비밀번호 재설정을 이용해 주세요.');
  // Verification burns the OTP and creates a short-lived session, which we revoke below.
  const verified=staffLoginVerify({email:email,code:code});
  if(!verified || verified.user.email!==email)throw Error('인증 정보가 일치하지 않습니다.');
  const proof=p&&p.proof,fast=bw29ValidProof_(proof);
  // Native browser KDF avoids 24,000 Apps Script HMAC operations during enrollment.
  const next=fast?bw29Credential_(email,proof):null;
  const salt=fast?'':Utilities.getUuid().replace(/-/g,'');
  const digest=fast?'':bw23Pbkdf2_(pwd,salt,BW23_PASSWORD_ROUNDS_);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    if(mode==='setup'&&bw23GetCred_(email))throw Error('이미 등록된 계정입니다.');
    PropertiesService.getScriptProperties().setProperty(bw23CredentialKey_(email),JSON.stringify(next||{v:1,salt:salt,hash:digest,rounds:BW23_PASSWORD_ROUNDS_,updatedAt:new Date().toISOString()}));
    PropertiesService.getScriptProperties().deleteProperty(bw23LockKey_(email));
    bw30ReviseAccount_(email,false);
    bw17Audit_(user,mode==='reset'?'비밀번호 재설정':'비밀번호 최초 설정','직원 포털','성공','이메일 OTP 확인');
  } finally {lock.releaseLock();}
  // Clean the now-unused OTP-created session and require a fresh password login.
  try{CacheService.getScriptCache().remove('session_'+bw17Hash_(verified.token));}catch(_){}
  return {ok:true,message:'비밀번호가 등록되었습니다. 새 비밀번호로 로그인해 주세요.'};
}
function staff23PasswordLogin(p) {
  const started=Date.now();
  const email=bw17Email_(p&&p.email),pwd=p&&p.password,proof=p&&p.proof;
  const invalid='이메일 또는 비밀번호가 올바르지 않습니다.';
  if(!email||!bw23PasswordValid_(pwd))throw Error(invalid);
  const user=bw17User_(email),cred=bw23GetCred_(email);
  if(!user || user.status!=='사용' || !cred)throw Error(invalid);
  const props=PropertiesService.getScriptProperties(),k=bw23LockKey_(email);
  let attemptNumber=0;
  const gate=LockService.getScriptLock();gate.waitLock(15000);
  try {
    let rec={n:0,until:0};
    try{rec=JSON.parse(props.getProperty(k)||'{"n":0,"until":0}');}catch(_){ }
    if(rec.until>Date.now())throw Error('로그인 실패 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.');
    if(Number(rec.n||0)>=BW23_MAX_PASSWORD_ATTEMPTS_){
      props.setProperty(k,JSON.stringify({n:0,until:Date.now()+BW23_LOCK_SECONDS_*1000}));
      throw Error('로그인 실패 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.');
    }
    attemptNumber=Number(rec.n||0)+1;
    props.setProperty(k,JSON.stringify({n:attemptNumber,until:0}));
  }finally{gate.releaseLock();}
  // Existing V1 passwords are verified normally once; successful accounts migrate.
  // V2 verifies one HMAC of native-browser PBKDF2 proof, not 24,000 GAS HMAC calls.
  const isV2=cred.v===2,hasProof=bw29ValidProof_(proof);
  const cache=CacheService.getScriptCache();
  let proofKey='',valid=false;
  if(isV2){
    if(hasProof)valid=bw23Equals_(bw29ProofHash_(email,proof),cred.hash);
    else if(cred.legacy&&cred.legacy.salt&&cred.legacy.hash&&Number.isInteger(cred.legacy.rounds)){
      // Older Google UI still works, but uses its original slow verifier.
      valid=bw23Equals_(bw23Pbkdf2_(pwd,cred.legacy.salt,cred.legacy.rounds),cred.legacy.hash);
    }
  }else{
    proofKey='bw24_ok_'+bw17Hash_(email+'|'+String(cred.updatedAt||'')+'|'+bw24FastProof_(pwd)).slice(0,42);
    valid=cache.get(proofKey)==='yes'||bw23Equals_(bw23Pbkdf2_(pwd,cred.salt,cred.rounds),cred.hash);
  }
  const finish=LockService.getScriptLock();finish.waitLock(15000);
  try{
    if(valid){
      if(!isV2 && hasProof){
        // Never silently overwrite another session's concurrent password reset.
        const current=bw23GetCred_(email);
        if(current&&current.v===1&&current.hash===cred.hash){
          props.setProperty(bw23CredentialKey_(email),JSON.stringify(bw29Credential_(email,proof,cred)));
        }else if(!current||current.v!==2||!bw23Equals_(bw29ProofHash_(email,proof),current.hash)){
          throw Error('로그인 정보가 갱신되었습니다. 다시 로그인해 주세요.');
        }
      }
      props.deleteProperty(k);
      if(!isV2)cache.put(proofKey,'yes',180);
    }else if(attemptNumber>=BW23_MAX_PASSWORD_ATTEMPTS_){
      props.setProperty(k,JSON.stringify({n:0,until:Date.now()+BW23_LOCK_SECONDS_*1000}));
    }
  }finally{finish.releaseLock();}
  if(!valid)throw Error(invalid);
  const result=bw23IssueSession_(user);
  // Timing only: never log password, browser proof or authentication token.
  Logger.log('BW29_AUTH ms='+String(Date.now()-started)+' credential='+String(cred.v));
  return result;
}

const BW24_ACCESS_ = Object.freeze({"home":{"label":"오늘의 업무","read":["owner","director","teacher","frontdesk"],"write":[]},"inquiries":{"label":"상담 접수","read":["owner","director","frontdesk"],"write":["owner","director","frontdesk"]},"registrations":{"label":"수강 신청 확인","read":["owner","director"],"write":[]},"classes":{"label":"수업 시간표","read":["owner","director","teacher","frontdesk"],"write":["owner","director"]},"courseSettings":{"label":"학원 운영정보","read":["owner","director"],"write":["owner","director"]},"roster":{"label":"우리 반 아이들","read":["owner","director","teacher"],"write":[]},"attendance":{"label":"출석 체크","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"operations":{"label":"개원·운영 체크리스트","read":["owner","director"],"write":["owner","director"]},"compliance":{"label":"법정·행정 관리","read":["owner","director"],"write":["owner","director"]},"tuition":{"label":"수납·환불 기록","read":["owner","director"],"write":["owner","director"]},"safety":{"label":"수업 준비·안전","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"handoff":{"label":"보호자 인계 기록","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"staffCompliance":{"label":"선생님 준수 사항","read":["owner"],"write":["owner"]},"users":{"label":"선생님 계정·권한","read":["owner"],"write":["owner"]},"documents":{"label":"안내문·확인서","read":["owner","director","teacher","frontdesk"],"write":["owner","director","teacher","frontdesk"]},"capacity":{"label":"반별 정원","read":["owner","director","teacher","frontdesk"],"write":["owner","director"]},"waitlist":{"label":"대기 상담","read":["owner","director","frontdesk"],"write":["owner","director","frontdesk"]},"makeups":{"label":"결석·보강 관리","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"themes":{"label":"이달의 수업 주제","read":["owner","director","teacher","frontdesk"],"write":["owner","director"]},"experiences":{"label":"홈페이지 체험 테마","read":["owner","director"],"write":["owner","director"]},"students":{"label":"학생 기본정보 관리","read":["owner","director"],"write":["owner","director"]},"security":{"label":"이용 기록·백업","read":["owner"],"write":["owner"]},"payroll":{"label":"직원 급여관리","read":["owner"],"write":["owner"]},"finance":{"label":"운영 손익·현금흐름","read":["owner"],"write":["owner"]}});
function bw24UserCacheKey_(email) {return 'bw24_user_' + bw17Hash_(String(email||'').toLowerCase()).slice(0,38);}
function bw24PolicyKey_(email) {return 'BW24_POLICY_' + bw17Hash_(String(email||'').toLowerCase()).slice(0,40);}
function bw24Base_(user){
  const out={read:{},write:{}};
  Object.keys(BW24_ACCESS_).forEach(key=>{
    out.read[key]=BW24_ACCESS_[key].read.includes(user.role);
    out.write[key]=BW24_ACCESS_[key].write.includes(user.role);
  });
  return out;
}
function bw24Permissions_(user){
  const out=bw24Base_(user);
  if(user.role==='owner')return out;
  try{
    const raw=PropertiesService.getScriptProperties().getProperty(bw24PolicyKey_(user.email));
    // An absent override uses role defaults. A storage error or malformed override never does.
    if(raw===null||raw===undefined)return out;
    const chosen=JSON.parse(raw);
    if(!chosen||Array.isArray(chosen)||!Array.isArray(chosen.read)||!Array.isArray(chosen.write)||
      chosen.read.some(k=>typeof k!=='string'||!Object.prototype.hasOwnProperty.call(BW24_ACCESS_,k))||
      chosen.write.some(k=>typeof k!=='string'||!Object.prototype.hasOwnProperty.call(BW24_ACCESS_,k)||!chosen.read.includes(k)))throw Error('Invalid access policy');
    for(const name of Object.keys(BW24_ACCESS_)){
      out.read[name]=out.read[name] && chosen.read.includes(name);
      out.write[name]=out.read[name] && out.write[name] && chosen.write.includes(name);
    }
  }catch(_){/* Fail closed: retain only role-allowed home access; deny all other grants. */
    Object.keys(out.read).forEach(k=>{out.read[k]=k==='home'&&out.read[k];out.write[k]=false;});
  }
  return out;
}
function bw24Can_(user,module,mode){
  if(!user || !Object.prototype.hasOwnProperty.call(BW24_ACCESS_,module))return false;
  const p=bw24Permissions_(user);
  return p[mode==='write'?'write':'read'][module]===true;
}
function bw24Require_(user,module,mode){
  if(!bw24Can_(user,module,mode))throw Error('이 업무는 원장님이 설정한 권한 범위에 포함되어 있지 않습니다.');
  return user;
}
function bw24Authorized_(token,module,mode,roles){
  const u=bw17Authorized_(token,roles);
  return bw24Require_(u,module,mode);
}
function staff24SavePermissions(token,p){
  const owner=bw17Authorized_(token,['owner']);
  const email=bw17Email_(p&&p.email);
  if(!email || email===bw17Config_().owner)throw Error('변경할 선생님 계정을 선택해 주세요.');
  const u=bw17User_(email);
  if(!u || !['director','teacher','frontdesk'].includes(u.role))throw Error('계정이 존재하지 않습니다.');
  const read=p&&p.read,write=p&&p.write;
  if(!Array.isArray(read)||!Array.isArray(write)||read.length>25||write.length>25)throw Error('권한 설정을 확인해 주세요.');
  if(read.some(k=>typeof k!=='string'||!Object.prototype.hasOwnProperty.call(BW24_ACCESS_,k)) ||
     write.some(k=>typeof k!=='string'||!Object.prototype.hasOwnProperty.call(BW24_ACCESS_,k)))throw Error('지원하지 않는 업무 권한입니다.');
  const basis=bw24Base_(u);
  if(read.some(k=>!basis.read[k])||write.some(k=>!basis.write[k]||!read.includes(k)))throw Error('역할에 허용되지 않은 권한은 부여할 수 없습니다.');
  const cleanRead=[...new Set(read)],cleanWrite=[...new Set(write)];
  if(!cleanRead.includes('home'))cleanRead.unshift('home');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    PropertiesService.getScriptProperties().setProperty(bw24PolicyKey_(email),JSON.stringify({read:cleanRead,write:cleanWrite,role:u.role,updatedAt:Date.now()}));
    bw24PermissionTrail_(email,u.role,cleanRead,cleanWrite,'설정');
    bw17Audit_(owner,'직원별 메뉴 권한 변경',email,'성공','조회 '+cleanRead.length+'/입력 '+cleanWrite.length);
  }finally{lock.releaseLock();}
  return {ok:true,permissions:bw24Permissions_(u)};
}
function staff24ResetPermissions(token,email){
  const owner=bw17Authorized_(token,['owner']);const address=bw17Email_(email);
  if(!address||address===bw17Config_().owner||!bw17User_(address))throw Error('계정을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{PropertiesService.getScriptProperties().deleteProperty(bw24PolicyKey_(address));
    const u=bw17User_(address);bw24PermissionTrail_(address,u.role,[],[],'역할 기본값 복원');
    bw17Audit_(owner,'직원별 권한 기본값 복원',address,'성공','역할 기본 권한');
  }finally{lock.releaseLock();}
  return {ok:true};
}
function setupBridgeWonderV24(){
  bw24RequireEditorOwner_();
  const cfg=bw17Config_(),book=SpreadsheetApp.openById(cfg.id);
  if(!book.getSheetByName(BW17.USERS))throw Error('기존 선생님 계정 대장이 없습니다. V23 설치 상태를 확인해 주세요.');
  bw17Tab_('관리자_개별권한',['변경시각','이메일','역할','조회메뉴','수정메뉴','처리상태'],true);
  HtmlService.createHtmlOutputFromFile('Admin');
  Logger.log('BW24 화면·권한 업그레이드 준비 완료. 기존 자료·직원 계정·PDF는 변경하지 않았습니다.');
  return {ok:true};
}

function bw24PermissionTrail_(email,role,read,write,status){
  const tab=bw17Tab_("관리자_개별권한",["변경시각","이메일","역할","조회메뉴","수정메뉴","처리상태"],true);
  tab.appendRow([new Date(),email,role,(read||[]).join(","),(write||[]).join(","),status]);
}

function bw24RequireEditorOwner_(){
  const owner=bw17Config_().owner;
  const active=String(Session.getActiveUser().getEmail()||"").trim().toLowerCase();
  if(!active || active!==owner)throw Error("설정 작업은 원장 계정의 Apps Script 편집기에서만 실행할 수 있습니다.");
}

function bw24FastProof_(pwd){
  const key=Utilities.newBlob(bw23Pepper_()).getBytes();
  const result=Utilities.computeHmacSha256Signature(Utilities.newBlob(String(pwd)).getBytes(),key);
  return bw23Hex_(result);
}


/* Bridge Wonder V30 — email accounts, owner-issued temporary credentials,
 * mandatory first-login change, self-service password rotation.
 * User profiles/roles remain in private Google Sheets; verifiers & session
 * revisions remain in Apps Script Script Properties. Never store raw passwords.
 */
function bw30AccountStateKey_(email) {
  return 'BW30_AUTH_' + bw17Hash_(String(email).trim().toLowerCase()).slice(0,40);
}
function bw30AccountState_(email) {
  const raw=PropertiesService.getScriptProperties().getProperty(bw30AccountStateKey_(email));
  if(!raw)return {revision:0,mustChange:false};
  try {
    const state=JSON.parse(raw);
    if(state && Number.isSafeInteger(state.revision) && state.revision>=0 &&
       state.revision<1000000000 && typeof state.mustChange==='boolean')
      return {revision:state.revision,mustChange:state.mustChange};
  } catch (_) {}
  throw Error('계정 보안 설정을 확인할 수 없습니다. 관리자에게 문의해 주세요.');
}
// Call only while holding ScriptLock for account mutations.
function bw30ReviseAccount_(email,mustChange) {
  const state=bw30AccountState_(email);
  const next={revision:state.revision+1,mustChange:mustChange===true,updatedAt:new Date().toISOString()};
  PropertiesService.getScriptProperties().setProperty(bw30AccountStateKey_(email),JSON.stringify(next));
  return next;
}
function bw30PackSession_(email) {
  const state=bw30AccountState_(email);
  return JSON.stringify({email:email,revision:state.revision});
}
function bw30SessionUser_(token,allowPasswordChange) {
  if(typeof token!=='string'||!/^([a-f0-9-]{36}){3}$/.test(token))throw Error('로그인이 필요합니다.');
  const key='session_'+bw17Hash_(token);
  const stored=CacheService.getScriptCache().get(key);
  if(!stored)throw Error('접속 시간이 만료되었습니다. 다시 로그인해 주세요.');
  let email=stored,revision=0;
  if(stored.charAt(0)==='{'){
    let entry;
    try {entry=JSON.parse(stored);}catch(_){throw Error('로그인 정보가 올바르지 않습니다.');}
    email=bw17Email_(entry&&entry.email);
    revision=entry&&entry.revision;
    if(!Number.isSafeInteger(revision)||revision<0)throw Error('로그인 정보가 올바르지 않습니다.');
  }
  email=bw17Email_(email);
  if(!email)throw Error('로그인 정보가 올바르지 않습니다.');
  const account=bw30AccountState_(email);
  if(revision!==account.revision){
    CacheService.getScriptCache().remove(key);
    throw Error('로그인 정보가 변경되었습니다. 다시 로그인해 주세요.');
  }
  const user=bw17User_(email);
  if(!user||user.status!=='사용')throw Error('사용 권한이 중지되었습니다.');
  if(account.mustChange && allowPasswordChange!==true)
    throw Error('임시 비밀번호를 먼저 변경해야 이용할 수 있습니다.');
  return user;
}
function staff30IssueTemporaryPassword(token,p) {
  const actor=bw17Authorized_(token,['owner']);
  const email=bw17Email_(p&&p.email),proof=p&&p.proof;
  if(!email||email===bw17Config_().owner||!bw29ValidProof_(proof))
    throw Error('비밀번호를 발급할 선생님 계정을 확인해 주세요.');
  const user=bw17User_(email);
  if(!user||user.status!=='사용'||!['teacher','frontdesk','director'].includes(user.role))
    throw Error('사용 중인 직원 계정만 비밀번호를 발급할 수 있습니다.');
  // Ensure pepper creation never tries to acquire ScriptLock inside the main lock.
  const next=JSON.stringify(bw29Credential_(email,proof,null));
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    // A successful issuance revokes all existing sessions for this employee.
    const current=bw17User_(email);
    if(!current||current.status!=='사용')throw Error('계정 사용 상태가 변경되었습니다.');
    PropertiesService.getScriptProperties().setProperty(bw23CredentialKey_(email),next);
    PropertiesService.getScriptProperties().deleteProperty(bw23LockKey_(email));
    bw30ReviseAccount_(email,true);
  } finally {lock.releaseLock();}
  bw17Audit_(actor,'직원 임시 비밀번호 발급',email,'성공','첫 로그인 비밀번호 변경 필수');
  return {ok:true,email:email,mustChange:true};
}
function staff30ChangeOwnPassword(token,p) {
  const user=bw30SessionUser_(token,true),email=user.email;
  const oldPassword=p&&p.currentPassword,oldProof=p&&p.currentProof;
  const nextPassword=p&&p.newPassword,nextProof=p&&p.newProof;
  if(!bw23PasswordValid_(oldPassword)||!bw23PasswordValid_(nextPassword)||
     !bw29ValidProof_(nextProof)||oldPassword===nextPassword)
    throw Error('현재 비밀번호와 12자 이상인 새 비밀번호를 확인해 주세요.');
  const existing=bw23GetCred_(email);
  if(!existing)throw Error('비밀번호가 등록되어 있지 않습니다.');
  let correct=false;
  if(existing.v===2){
    if(!bw29ValidProof_(oldProof))throw Error('현재 비밀번호를 확인해 주세요.');
    correct=bw23Equals_(bw29ProofHash_(email,oldProof),existing.hash);
    if(bw23Equals_(oldProof,nextProof))throw Error('기존 비밀번호와 다른 비밀번호를 사용해 주세요.');
  } else {
    correct=bw23Equals_(bw23Pbkdf2_(oldPassword,existing.salt,existing.rounds),existing.hash);
  }
  if(!correct)throw Error('현재 비밀번호가 올바르지 않습니다.');
  // Precompute HMAC outside the script lock.
  const next=JSON.stringify(bw29Credential_(email,nextProof,null));
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    // Fail closed when password was reset concurrently by the owner or OTP.
    const current=bw23GetCred_(email);
    if(JSON.stringify(current)!==JSON.stringify(existing))throw Error('계정 정보가 변경되었습니다. 다시 로그인해 주세요.');
    const stored=PropertiesService.getScriptProperties();
    stored.setProperty(bw23CredentialKey_(email),next);
    stored.deleteProperty(bw23LockKey_(email));
    bw30ReviseAccount_(email,false);
  } finally {lock.releaseLock();}
  CacheService.getScriptCache().remove('session_'+bw17Hash_(token));
  bw17Audit_(user,'본인 비밀번호 변경',email,'성공','기존 세션 모두 종료');
  return {ok:true,message:'비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.'};
}
