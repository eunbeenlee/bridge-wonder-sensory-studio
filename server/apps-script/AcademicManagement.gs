/**
 * Bridge Wonder V37 — private student records + public monthly experience cards.
 * Install in the EXISTING STAFF Apps Script project, not the parent inquiry app.
 * The two datasets are deliberately isolated:
 *   STUDENTS: guardian/child PII, never available to the public GET endpoint
 *   EXPERIENCES: approved short public marketing descriptions, safe to publish
 * Signed online contracts and the original 수강등록 sheet remain immutable.
 */
const BW37=Object.freeze({
  STUDENTS:'운영_학생기본정보',
  EXPERIENCES:'운영_체험테마공개',
  STUDENT_HEADERS:[
    '학생번호','아동 이름','생년월일','보호자 성명','보호자 관계','보호자 연락처',
    '보호자 이메일','등록 수업반','등록일','운영 상태','보호자 확인 증빙 참조',
    '보호자 확인일','업무 메모','수정자','수정시각','개정번호'
  ],
  EXPERIENCE_HEADERS:[
    '적용 월','상단 제목','월간 소개',
    '테마1 제목','테마1 설명','테마1 키워드','테마1 이미지',
    '테마2 제목','테마2 설명','테마2 키워드','테마2 이미지',
    '테마3 제목','테마3 설명','테마3 키워드','테마3 이미지',
    '공개 상태','개정번호','수정자','수정시각'
  ],
  STATES:['임시등록','재원','휴원','퇴원'],
  EXPERIENCE_STATES:['초안','공개','보관'],
  IMAGE_CODES:['welcome','snowy','colors','teddy','story-book'],
  PUBLIC_MONTH:'BW37_PUBLIC_EXPERIENCE_MONTH',
  PUBLIC_CACHE:'BW37_EXPERIENCE_PUBLIC'
});
function bw37Sheet_(name,headers,create) {
  const sheet=bw17Tab_(name,headers,create===true);
  if(!sheet)return null;
  const actual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if(headers.some((h,i)=>actual[i]!==h))
    throw Error('관리 대장의 열 이름이 변경되었습니다. 기존 데이터를 수정하지 않았습니다.');
  return sheet;
}
function bw37Rows_(sheet,max) {
  if(!sheet||sheet.getLastRow()<2)return [];
  const count=sheet.getLastRow()-1;
  if(count>(max||5000))throw Error('관리 기록이 많아 전체 조회를 중단했습니다. 관리 담당자에게 문의해 주세요.');
  return sheet.getRange(2,1,count,sheet.getLastColumn()).getDisplayValues();
}
function bw37Version_(value) {
  const n=Number(value||0);
  if(!Number.isSafeInteger(n)||n<0||n>=1000000000)
    throw Error('기록 개정번호가 올바르지 않습니다. 다시 조회해 주세요.');
  return n;
}
function bw37Month_(value) {
  const month=String(value||'').trim();
  if(!/^20\d{2}-(?:0[1-9]|1[0-2])$/.test(month))
    throw Error('적용 월을 선택해 주세요.');
  return month;
}
function bw37CleanText_(value,limit,required) {
  const text=bw17Safe_(value,limit);
  if(required&&!text)throw Error('필수 항목을 입력해 주세요.');
  return text;
}
function bw37StudentPhone_(value) {
  const str=String(value||'').replace(/[-()\s]/g,'');
  if(!/^\d{9,12}$/.test(str))throw Error('보호자 연락처를 확인해 주세요.');
  return str;
}
function bw37StudentKey_(child,birth,phone) {
  return [String(child||'').replace(/\s/g,''),String(birth||'').slice(0,7),
    String(phone||'').replace(/\D/g,'')].join('|');
}
function bw37StudentObject_(r){
  return {
    id:String(r[0]||''),child:String(r[1]||''),birth:String(r[2]||''),
    guardian:String(r[3]||''),relation:String(r[4]||''),phone:String(r[5]||''),
    email:String(r[6]||''),classId:String(r[7]||''),joined:String(r[8]||''),
    status:String(r[9]||'임시등록'),evidence:String(r[10]||''),
    verifiedAt:String(r[11]||''),note:String(r[12]||''),
    editor:String(r[13]||''),updated:String(r[14]||''),
    revision:Number(r[15])||0,source:'직접 등록'
  };
}
function bw37ManualStudents_(){
  return bw37Rows_(bw37Sheet_(BW37.STUDENTS,BW37.STUDENT_HEADERS,false),5000).map(bw37StudentObject_);
}
function bw37SignedKeys_(){
  const regs=bw17Read_(bw17Book_().getSheetByName(BW17.REGISTRATIONS),12000);
  const keys=new Set();
  for(const r of regs.rows){
    if(bw17Field_(regs.headers,r,'운영자 최종 등록 상태')!=='등록확정')continue;
    const key=bw37StudentKey_(bw17Field_(regs.headers,r,'아동 이름'),
      bw17Field_(regs.headers,r,'아동 생년월'),bw17Field_(regs.headers,r,'연락처'));
    if(key.split('|').every(Boolean))keys.add(key);
  }
  return keys;
}
function bw37ManualActive_(user,duplicates){
  const signed=duplicates||bw37SignedKeys_();
  const rows=bw37ManualStudents_().filter(s=>s.status==='재원'&&s.evidence&&s.verifiedAt&&s.classId);
  return rows.filter(s=>(user.role!=='teacher'||user.classes.includes(s.classId)) &&
    !signed.has(bw37StudentKey_(s.child,s.birth,s.phone)));
}
function bw37ManualRoster_(user,duplicates){
  return bw37ManualActive_(user,duplicates).map(s=>({
    receipt:s.id,child:s.child,birth:s.birth.slice(0,7),
    classId:s.classId,course:'영어 오감놀이',
    guardian:user.role==='teacher'&&!user.canContact?'':s.guardian,
    phone:user.role==='teacher'&&!user.canContact?'':s.phone,
    source:'직접 등록'
  }));
}
function bw37ManualStudent_(id) {
  if(!/^BW-S-[A-F0-9]{12}$/.test(String(id||'')))return null;
  const found=bw37ManualStudents_().find(s=>s.id===id);
  if(!found||found.status!=='재원'||!found.evidence||!found.verifiedAt)
    throw Error('재원 상태와 보호자 확인 증빙을 먼저 확인해 주세요.');
  return {receipt:found.id,child:found.child,classId:found.classId};
}
function bw37ValidateStudent_(p){
  const id=String(p&&p.id||'').trim().toUpperCase();
  if(id&&!/^BW-S-[A-F0-9]{12}$/.test(id))throw Error('수정할 학생번호를 확인해 주세요.');
  const child=bw37CleanText_(p&&p.child,45,true),
    birth=bw18Date_(p&&p.birth,false),
    guardian=bw37CleanText_(p&&p.guardian,45,true),
    relation=String(p&&p.relation||'').trim(),
    phone=bw37StudentPhone_(p&&p.phone),
    email=String(p&&p.email||'').trim().toLowerCase(),
    classId=String(p&&p.classId||'').trim().toUpperCase(),
    joined=bw18Date_(p&&p.joined,false),
    status=String(p&&p.status||'임시등록').trim(),
    evidence=bw37CleanText_(p&&p.evidence,160,false),
    verifiedAt=bw18Date_(p&&p.verifiedAt,true),
    note=bw37CleanText_(p&&p.note,240,false),
    revision=bw37Version_(p&&p.revision);
  if(!['모','부','조부모','법정대리인','기타 보호자'].includes(relation))
    throw Error('보호자 관계를 목록에서 선택해 주세요.');
  if(email&&!bw17Email_(email))throw Error('보호자 이메일을 확인해 주세요.');
  if(!BW37.STATES.includes(status))throw Error('학생 운영 상태를 선택해 주세요.');
  if(birth>joined)throw Error('생년월일은 등록일보다 앞서야 합니다.');
  if(joined>Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd').slice(0,4)+'-12-31')
    throw Error('등록일을 확인해 주세요.');
  if(classId)bw20Class_(classId);
  if(status==='재원'&&(!classId||!evidence||!verifiedAt))
    throw Error('재원 처리 전에 수업반과 보호자 확인 증빙·확인일을 입력해 주세요.');
  if(verifiedAt&&!evidence)throw Error('보호자 확인일을 기록하려면 증빙 참조를 입력해 주세요.');
  return {id,child,birth,guardian,relation,phone,email,classId,joined,status,
    evidence,verifiedAt,note,revision};
}
function staff37ListStudents(token){
  const user=bw24Authorized_(token,'students','read',['owner','director']);
  const manual=bw37ManualStudents_();
  const online=bw17Roster_(user).filter(s=>!s.receipt.startsWith('BW-S-')).map(s=>({
    id:s.receipt,child:s.child,birth:s.birth,guardian:s.guardian,
    phone:s.phone,classId:s.classId,course:s.course,
    status:'온라인 등록확정',source:'보호자 온라인 신청',editable:false
  }));
  const classes=bw20ClassData_().map(s=>({id:s.id,day:s.day,time:s.time}));
  bw17Audit_(user,'학생 기본정보 조회',BW37.STUDENTS,'성공','직접 '+manual.length+' / 온라인 '+online.length);
  return {manual,online,classes};
}
function staff37SaveStudent(token,p){
  const user=bw24Authorized_(token,'students','write',['owner','director']);
  const clean=bw37ValidateStudent_(p);
  const sheet=bw37Sheet_(BW37.STUDENTS,BW37.STUDENT_HEADERS,true);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const rows=bw37Rows_(sheet,5000),index=clean.id?rows.findIndex(r=>r[0]===clean.id):-1;
    if(clean.id&&index<0)throw Error('학생번호에 해당하는 기록이 없습니다.');
    const old=index>=0?bw37StudentObject_(rows[index]):null;
    const revision=old?bw37Version_(old.revision):0;
    if(revision!==clean.revision)throw Error('다른 직원이 먼저 학생정보를 수정했습니다. 새로고침해 주세요.');
    const key=bw37StudentKey_(clean.child,clean.birth,clean.phone);
    if(rows.some((r,i)=>i!==index&&bw37StudentKey_(r[1],r[2],r[5])===key))
      throw Error('같은 이름·생년월·연락처의 직접 등록 학생이 있습니다.');
    if(bw37SignedKeys_().has(key))
      throw Error('이미 온라인 등록이 확정된 학생입니다. 기존 온라인 학생 명단을 확인해 주세요.');
    if(clean.status==='재원'){
      const counts=bw20Counts_().counts,cap=bw20Caps_()[clean.classId]||0;
      const occupied=counts[clean.classId]||0;
      const currentIsCounted=old&&old.status==='재원'&&old.classId===clean.classId&&old.evidence&&old.verifiedAt?1:0;
      if(cap>0&&occupied-currentIsCounted>=cap)
        throw Error('수업반 정원이 찼습니다. 다른 수업반을 확인해 주세요.');
    }
    const id=old?old.id:'BW-S-'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
    const row=index>=0?index+2:sheet.getLastRow()+1;
    sheet.getRange(row,1,1,BW37.STUDENT_HEADERS.length).setValues([[
      id,clean.child,clean.birth,clean.guardian,clean.relation,
      clean.phone,clean.email,clean.classId,clean.joined,clean.status,
      clean.evidence,clean.verifiedAt,clean.note,user.email,new Date(),revision+1
    ]]);
    bw17Audit_(user,'학생 기본정보 '+(old?'수정':'등록'),id,'성공',
      clean.status+' / '+clean.classId);
    return {ok:true,id,revision:revision+1};
  }finally{lock.releaseLock();}
}
function bw37ExperienceItem_(r){
  return {
    month:String(r[0]||''),heading:String(r[1]||''),
    intro:String(r[2]||''),
    cards:[0,1,2].map(i=>{
      const off=3+i*4;
      return {title:String(r[off]||''),description:String(r[off+1]||''),
        tags:String(r[off+2]||''),image:String(r[off+3]||'welcome')};
    }),
    status:String(r[15]||'초안'),
    revision:Number(r[16])||0,
    editor:String(r[17]||''),updated:String(r[18]||'')
  };
}
function bw37ExperienceRows_(){
  return bw37Rows_(bw37Sheet_(BW37.EXPERIENCES,BW37.EXPERIENCE_HEADERS,false),120)
    .map(bw37ExperienceItem_);
}
function bw37CleanExperience_(p){
  const month=bw37Month_(p&&p.month),
    heading=bw37CleanText_(p&&p.heading,85,false),
    intro=bw37CleanText_(p&&p.intro,250,false),
    status=String(p&&p.status||'초안'),
    revision=bw37Version_(p&&p.revision);
  if(!BW37.EXPERIENCE_STATES.includes(status))throw Error('공개 상태를 선택해 주세요.');
  const cards=Array.isArray(p&&p.cards)?p.cards:[];
  if(cards.length!==3)throw Error('체험 테마를 세 개 작성해 주세요.');
  const clean=cards.map((x,i)=>{
    const title=bw37CleanText_(x&&x.title,65,false),
      description=bw37CleanText_(x&&x.description,195,false),
      tags=bw37CleanText_(x&&x.tags,90,false),
      image=String(x&&x.image||'welcome');
    if(!BW37.IMAGE_CODES.includes(image))throw Error((i+1)+'번째 이미지 선택이 올바르지 않습니다.');
    return {title,description,tags,image};
  });
  if(status==='공개'&&(!heading||!intro||clean.some(x=>!x.title||!x.description||!x.tags)))
    throw Error('공개하려면 월간 소개와 세 가지 테마 정보를 모두 입력해 주세요.');
  return {month,heading,intro,status,revision,cards:clean};
}
function staff37ListExperiences(token){
  const user=bw24Authorized_(token,'experiences','read',['owner','director']);
  const rows=bw37ExperienceRows_();
  const published=String(PropertiesService.getScriptProperties().getProperty(BW37.PUBLIC_MONTH)||'');
  bw17Audit_(user,'월별 체험 테마 조회',BW37.EXPERIENCES,'성공',rows.length+'개월');
  return {rows:rows.slice().sort((a,b)=>b.month.localeCompare(a.month)),published};
}
function staff37SaveExperience(token,p){
  const user=bw24Authorized_(token,'experiences','write',['owner','director']);
  const data=bw37CleanExperience_(p);
  const sheet=bw37Sheet_(BW37.EXPERIENCES,BW37.EXPERIENCE_HEADERS,true);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const rows=bw37Rows_(sheet,120),index=rows.findIndex(r=>r[0]===data.month),
      prior=index<0?0:bw37Version_(rows[index][16]);
    if(prior!==data.revision)throw Error('다른 직원이 먼저 월간 테마를 수정했습니다. 새로고침해 주세요.');
    const currentPublic=String(PropertiesService.getScriptProperties().getProperty(BW37.PUBLIC_MONTH)||'');
    if(currentPublic===data.month&&data.status!=='공개')
      throw Error('현재 홈페이지 공개 중인 월은 바로 보관할 수 없습니다. 다른 월을 먼저 공개해 주세요.');
    const flattened=data.cards.flatMap(card=>[card.title,card.description,card.tags,card.image]);
    const row=index>=0?index+2:sheet.getLastRow()+1;
    sheet.getRange(row,1,1,BW37.EXPERIENCE_HEADERS.length).setValues([[
      data.month,data.heading,data.intro,...flattened,data.status,prior+1,user.email,new Date()
    ]]);
    if(data.status==='공개'){
      PropertiesService.getScriptProperties().setProperty(BW37.PUBLIC_MONTH,data.month);
      CacheService.getScriptCache().remove(BW37.PUBLIC_CACHE);
    }
    bw17Audit_(user,'월간 체험 테마 '+(data.status==='공개'?'공개':'저장'),
      data.month,'성공',data.status);
    return {ok:true,month:data.month,revision:prior+1,published:data.status==='공개'};
  }finally{lock.releaseLock();}
}
/* The sole anonymous endpoint: no tokens, roster, financial or consent details.
 * Fixed callback identifier — unlike arbitrary JSONP callback parameters.
 */
function bw37PublicExperience_(){
  const cache=CacheService.getScriptCache();
  const previous=cache.get(BW37.PUBLIC_CACHE);
  if(previous){try{return JSON.parse(previous);}catch(_){cache.remove(BW37.PUBLIC_CACHE);}}
  const month=String(PropertiesService.getScriptProperties().getProperty(BW37.PUBLIC_MONTH)||'');
  if(!/^20\d{2}-(?:0[1-9]|1[0-2])$/.test(month))return {ok:true,theme:null};
  const item=bw37ExperienceRows_().find(x=>x.month===month&&x.status==='공개');
  if(!item)return {ok:true,theme:null};
  const value={ok:true,theme:{month:item.month,heading:item.heading,intro:item.intro,
    cards:item.cards.map(c=>({title:c.title,description:c.description,
      tags:c.tags,image:c.image}))}};
  cache.put(BW37.PUBLIC_CACHE,JSON.stringify(value),90);
  return value;
}
function bw37PublicExperienceScript_(){
  const payload=JSON.stringify(bw37PublicExperience_())
    .replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput(
    'window.BWPublicExperience&&window.BWPublicExperience.receive('+payload+');'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
