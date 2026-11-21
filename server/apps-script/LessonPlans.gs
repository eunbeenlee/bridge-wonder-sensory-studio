/**
 * Bridge Wonder V45 — Private lesson plan library for the existing STAFF Apps Script.
 * Read: owner/director/teacher with 'themes' read access.
 * Write: owner/director with 'themes' write access.
 *
 * Uploaded files never receive public Drive links. No pupil/guardian data is accepted.
 * This file belongs ONLY in the existing STAFF project, not the public enrollment project.
 */
const BW45 = Object.freeze({
  PLANS: '운영_수업안파일',
  UPLOADS: '운영_수업안업로드',
  PLAN_HEADERS: ['수업안ID','버전','등록시각','제목','적용월','대상월령','관리메모','원본파일명','파일형식','파일크기','Drive파일ID','SHA256','상태','등록자','수정시각'],
  UPLOAD_HEADERS: ['업로드ID','수업안ID','버전','등록자','상태','원본파일명','파일형식','파일크기','다음청크','업로드바이트','임시파일ID','제목','적용월','대상월령','관리메모','마지막청크해시','수정시각','요청ID','완료파일ID'],
  LIMIT: 5 * 1024 * 1024,
  CHUNK: 180 * 1024, // Multiple of three; concatenated base64 stays valid.
  TYPES: Object.freeze({
    pdf:'application/pdf',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    hwp:'application/x-hwp',
    hwpx:'application/hwp+zip',
    png:'image/png',
    jpg:'image/jpeg',
    jpeg:'image/jpeg',
    txt:'text/plain',
    csv:'text/csv'
  }),
  AGES: ['전체(7~48개월)','7~12개월','13~18개월','19~24개월','25~35개월','36~48개월'],
  STATES: ['사용','보관']
});
function bw45Allowed_(token,write) {
  return bw24Authorized_(token,'themes',write?'write':'read',write?['owner','director']:['owner','director','teacher']);
}
function bw45Tab_(kind) {
  return bw17Tab_(kind==='upload'?BW45.UPLOADS:BW45.PLANS,kind==='upload'?BW45.UPLOAD_HEADERS:BW45.PLAN_HEADERS,true);
}
function bw45Name_(name) {
  const s=String(name||'').replace(/[/\\<>:"|?*\u0000-\u001f\u007f]/g,'_').replace(/^\s*[=+@-]+/,'').trim().slice(0,110);
  if(!s||!s.includes('.'))throw Error('파일 이름과 확장자를 확인해 주세요.');
  const ext=s.split('.').pop().toLowerCase();
  if(!Object.prototype.hasOwnProperty.call(BW45.TYPES,ext))throw Error('지원하지 않는 파일 형식입니다. PDF, 워드, 엑셀, PPT, 한글, 이미지 또는 텍스트 파일을 선택해 주세요.');
  return {name:s,ext,mime:BW45.TYPES[ext]};
}
function bw45Meta_(input) {
  const p=input||{},file=bw45Name_(p.filename);
  const size=Number(p.size);
  if(!Number.isSafeInteger(size)||size<1||size>BW45.LIMIT)throw Error('파일은 5MB 이하로 올려 주세요.');
  const rawTitle=String(p.title||'').trim()||file.name.replace(/\.[^.]+$/,'');
  const title=bw17Safe_(rawTitle,90);
  if(!title)throw Error('수업안 제목을 확인해 주세요.');
  const month=String(p.month||'').trim();
  if(month&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('적용 월을 확인해 주세요.');
  const age=String(p.age||'전체(7~48개월)');
  if(!BW45.AGES.includes(age))throw Error('대상 월령을 목록에서 선택해 주세요.');
  const note=bw17Safe_(p.note||'',300);
  return {file,size,title,month,age,note};
}
function bw45Folder_(stage) {
  const props=PropertiesService.getScriptProperties();
  const key=stage?'BW45_STAGE_FOLDER_ID':'BW45_PLAN_FOLDER_ID';
  const id=String(props.getProperty(key)||'').trim();
  if(id){try{return DriveApp.getFolderById(id);}catch(_){throw Error('수업안 보관 폴더에 접근할 수 없습니다. 원장 Drive 설정을 확인해 주세요.');}}
  const folder=DriveApp.createFolder(stage?'Bridge_Wonder_수업안_업로드중_비공개':'Bridge_Wonder_수업안_비공개');
  props.setProperty(key,folder.getId());
  return folder;
}
function bw45Uploads_(id) {
  if(!/^BW-UP-[a-f0-9]{24}$/i.test(String(id||'')))throw Error('업로드 번호를 확인해 주세요.');
  const s=bw45Tab_('upload');
  if(s.getLastRow()<2)throw Error('업로드 기록을 찾을 수 없습니다.');
  const rows=s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().flat();
  const offset=rows.lastIndexOf(id);
  if(offset<0)throw Error('업로드 기록을 찾을 수 없습니다.');
  const row=offset+2;
  return {sheet:s,row,vals:s.getRange(row,1,1,BW45.UPLOAD_HEADERS.length).getDisplayValues()[0]};
}
function bw45PlanRows_() {
  const d=bw17Read_(bw45Tab_('plan'),4000);
  return d.rows.map((r,i)=>({row:d.start+i,values:r})).filter(x=>/^BW-LP-[a-f0-9]{24}$/i.test(String(x.values[0]||'')));
}
function bw45Latest_(id) {
  const data=bw45PlanRows_().filter(x=>String(x.values[0])===id)
    .sort((a,b)=>Number(b.values[1])-Number(a.values[1]));
  return data[0]||null;
}
function bw45Public_(entry) {
  const v=entry.values;
  return {id:String(v[0]),version:Number(v[1])||1,created:String(v[2]||''),title:String(v[3]||''),
    month:String(v[4]||''),age:String(v[5]||''),note:String(v[6]||''),
    filename:String(v[7]||''),format:String(v[8]||''),size:Number(v[9])||0,
    status:String(v[12]||'사용'),updated:String(v[14]||'')};
}
function bw45Unique_() {return Utilities.getUuid().replace(/-/g,'').slice(0,24).toLowerCase();}
function bw45Digest_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes)
    .map(v=>('0'+((v+256)%256).toString(16)).slice(-2)).join('');
}
function bw45CheckMagic_(ext,bytes) {
  const b=bytes.map(x=>(x+256)%256);
  const sig=prefix=>prefix.every((n,i)=>b[i]===n);
  const zipped=['docx','xlsx','pptx','hwpx'].includes(ext);
  if(zipped&&!sig([0x50,0x4b,0x03,0x04]))throw Error('문서 형식과 실제 파일 내용이 일치하지 않습니다.');
  if(ext==='pdf'&&!sig([0x25,0x50,0x44,0x46,0x2d]))throw Error('PDF 파일을 확인해 주세요.');
  if(ext==='png'&&!sig([137,80,78,71,13,10,26,10]))throw Error('PNG 이미지 파일을 확인해 주세요.');
  if(['jpg','jpeg'].includes(ext)&&!sig([255,216,255]))throw Error('JPG 이미지 파일을 확인해 주세요.');
  if(ext==='hwp'&&!sig([208,207,17,224,161,177,26,225]))throw Error('한글 HWP 파일을 확인해 주세요.');
  if(['txt','csv'].includes(ext)&&b.some(x=>x===0))throw Error('텍스트 파일의 내용을 확인해 주세요.');
}
function staff45ListLessonPlans(token) {
  const user=bw45Allowed_(token,false),all=bw45PlanRows_();
  const latest=new Map();
  all.forEach(item=>{
    const id=String(item.values[0]),v=Number(item.values[1])||0;
    if(!latest.has(id)||v>Number(latest.get(id).values[1]))latest.set(id,item);
  });
  const items=Array.from(latest.values()).filter(x=>user.role!=='teacher'||String(x.values[12])==='사용')
    .map(bw45Public_).sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,250);
  const versions=all.filter(x=>items.some(item=>item.id===String(x.values[0])))
    .map(bw45Public_).sort((a,b)=>a.id.localeCompare(b.id)||b.version-a.version);
  return {items,versions,canEdit:(user.role==='owner'||user.role==='director')&&bw24Can_(user,'themes','write'),maxBytes:BW45.LIMIT,chunkBytes:BW45.CHUNK};
}
function staff45BeginLessonPlan(token,p) {
  const user=bw45Allowed_(token,true),meta=bw45Meta_(p),requestId=String(p&&p.requestId||'');
  if(!/^[a-f0-9-]{36}$/i.test(requestId))throw Error('업로드 요청번호를 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw45Tab_('upload');
    if(sheet.getLastRow()>1){
      const recent=bw17Read_(sheet,350).rows.slice().reverse();
      const prev=recent.find(r=>String(r[17])===requestId&&String(r[3])===user.email);
      if(prev)return {uploadId:prev[0],planId:prev[1],version:Number(prev[2]),nextIndex:Number(prev[8]),uploaded:Number(prev[9]),status:prev[4],chunkBytes:BW45.CHUNK};
    }
    const sourceId=String(p&&p.planId||''),existing=sourceId?bw45Latest_(sourceId):null;
    if(sourceId&&!existing)throw Error('수정할 수업안을 찾지 못했습니다.');
    if(existing&&String(existing.values[12])==='보관')throw Error('보관된 수업안은 다시 사용으로 바꾼 뒤 수정본을 올려 주세요.');
    const id=existing?sourceId:'BW-LP-'+bw45Unique_(),version=existing?Number(existing.values[1])+1:1;
    const uploadId='BW-UP-'+bw45Unique_();
    const staged=bw45Folder_(true).createFile(uploadId+'.b64','','text/plain');
    try{staged.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);}catch(_){}
    try{
      sheet.appendRow([uploadId,id,version,user.email,'업로드중',meta.file.name,meta.file.mime,meta.size,0,0,staged.getId(),
        meta.title,meta.month,meta.age,meta.note,'',new Date(),requestId,'']);
    }catch(e){try{staged.setTrashed(true);}catch(_){}throw e;}
    return {uploadId,planId:id,version,nextIndex:0,uploaded:0,status:'업로드중',chunkBytes:BW45.CHUNK};
  }finally{lock.releaseLock();}
}
function staff45AppendLessonPlanChunk(token,p) {
  const user=bw45Allowed_(token,true),id=String(p&&p.uploadId||''),index=Number(p&&p.index),data=String(p&&p.base64||'');
  if(!Number.isSafeInteger(index)||index<0)throw Error('업로드 순서를 확인해 주세요.');
  if(!data||data.length>250000||data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw Error('파일 조각 형식을 확인해 주세요.');
  const bytes=Utilities.base64Decode(data);
  if(bytes.length<1||bytes.length>BW45.CHUNK)throw Error('파일 조각 크기가 맞지 않습니다.');
  const hash=bw17Hash_(data),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const found=bw45Uploads_(id),v=found.vals;
    if(v[3]!==user.email)throw Error('본인이 시작한 업로드만 이어서 진행할 수 있습니다.');
    if(v[4]!=='업로드중')throw Error('이미 완료되었거나 종료된 업로드입니다.');
    const next=Number(v[8]),done=Number(v[9]),limit=Number(v[7]);
    if(index===next-1&&v[15]===hash)return {ok:true,nextIndex:next,uploaded:done,replayed:true};
    if(index!==next)throw Error('업로드 순서가 맞지 않습니다. 목록을 새로 불러온 뒤 다시 시도해 주세요.');
    if(bytes.length!==Math.min(BW45.CHUNK,limit-done))throw Error('업로드된 파일 크기가 요청 정보와 맞지 않습니다.');
    const stage=DriveApp.getFileById(v[10]),old=stage.getBlob().getDataAsString('UTF-8');
    if(old.length>7200000)throw Error('업로드 임시 저장 용량을 초과했습니다.');
    stage.setContent(old+data);
    found.sheet.getRange(found.row,9,1,9).setValues([[next+1,done+bytes.length,v[10],v[11],v[12],v[13],v[14],hash,new Date()]]);
    return {ok:true,nextIndex:next+1,uploaded:done+bytes.length};
  }finally{lock.releaseLock();}
}
function staff45FinishLessonPlan(token,uploadId) {
  const user=bw45Allowed_(token,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const found=bw45Uploads_(uploadId),v=found.vals;
    if(v[3]!==user.email)throw Error('본인이 시작한 업로드만 완료할 수 있습니다.');
    if(v[4]==='완료'){
      const record=bw45PlanRows_().find(x=>String(x.values[0])===String(v[1])&&Number(x.values[1])===Number(v[2]));
      if(!record)throw Error('업로드 완료 기록을 확인하지 못했습니다.');
      return {ok:true,plan:bw45Public_(record),replayed:true};
    }
    if(v[4]!=='업로드중'||Number(v[9])!==Number(v[7]))throw Error('파일 업로드가 끝나지 않았습니다.');
    const name=bw45Name_(v[5]),planId=String(v[1]),version=Number(v[2]),latest=bw45Latest_(planId);
    if((latest?Number(latest.values[1])+1:1)!==version)throw Error('수정본 버전이 변경되었습니다. 목록을 새로고침한 뒤 다시 등록해 주세요.');
    const stage=DriveApp.getFileById(v[10]),data=stage.getBlob().getDataAsString('UTF-8');
    const bytes=Utilities.base64Decode(data);
    if(bytes.length!==Number(v[7]))throw Error('파일 크기가 다릅니다. 업로드를 다시 시작해 주세요.');
    bw45CheckMagic_(name.ext,bytes);
    const sha=bw45Digest_(bytes);
    // An audit failure must stop the operation before the authoritative plan row is written.
    bw17Audit_(user,'수업안 등록 확인',planId,'시작','v'+version+' · '+bytes.length+' bytes');
    const blob=Utilities.newBlob(bytes,name.mime,'BW45_'+planId+'_v'+version+'_'+name.name);
    const file=bw45Folder_(false).createFile(blob);
    const tab=bw45Tab_('plan');
    let appendedRow=0;
    try{
      try{file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);}catch(_){}
      tab.appendRow([planId,version,new Date(),v[11],v[12],v[13],v[14],name.name,name.mime,bytes.length,file.getId(),sha,'사용',user.email,new Date()]);
      appendedRow=tab.getLastRow();
      found.sheet.getRange(found.row,5).setValue('완료');
      found.sheet.getRange(found.row,17,1,3).setValues([[new Date(),v[17],file.getId()]]);
    }catch(e){
      if(appendedRow)try{tab.deleteRow(appendedRow);}catch(_){}
      try{found.sheet.getRange(found.row,5).setValue('업로드중');}catch(_){}
      try{file.setTrashed(true);}catch(_){}
      throw e;
    }
    try{stage.setTrashed(true);}catch(_){}
    return {ok:true,plan:{id:planId,version,title:v[11],filename:name.name,size:bytes.length,status:'사용'}};
  }finally{lock.releaseLock();}
}
function staff45DownloadLessonPlan(token,p) {
  const user=bw45Allowed_(token,false),id=String(p&&p.planId||''),version=Number(p&&p.version);
  if(!/^BW-LP-[a-f0-9]{24}$/i.test(id)||!Number.isSafeInteger(version)||version<1)throw Error('수업안을 선택해 주세요.');
  const latest=bw45Latest_(id);
  if(!latest)throw Error('수업안이 없습니다.');
  if(user.role==='teacher'&&latest.values[12]!=='사용')throw Error('보관된 수업안은 원장에게 문의해 주세요.');
  const entry=bw45PlanRows_().find(x=>String(x.values[0])===id&&Number(x.values[1])===version);
  if(!entry)throw Error('해당 버전의 파일이 없습니다.');
  const bytes=DriveApp.getFileById(entry.values[10]).getBlob().getBytes();
  if(bytes.length>BW45.LIMIT||bytes.length!==Number(entry.values[9])||bw45Digest_(bytes)!==String(entry.values[11]))
    throw Error('파일 무결성을 확인할 수 없어 다운로드를 중단했습니다.');
  bw17Audit_(user,'수업안 다운로드',id,'성공','v'+version);
  return {filename:bw45Name_(entry.values[7]).name,mime:entry.values[8],size:bytes.length,base64:Utilities.base64Encode(bytes)};
}
function staff45UpdateLessonPlan(token,p) {
  const user=bw45Allowed_(token,true),id=String(p&&p.planId||'');
  if(!/^BW-LP-[a-f0-9]{24}$/i.test(id))throw Error('수업안을 선택해 주세요.');
  const title=bw17Safe_(String(p&&p.title||''),90),note=bw17Safe_(p&&p.note||'',300),month=String(p&&p.month||''),age=String(p&&p.age||'전체(7~48개월)');
  if(!title||month&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!BW45.AGES.includes(age))throw Error('제목·적용 월·대상 월령을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const current=bw45Latest_(id);
    if(!current)throw Error('수업안이 없습니다.');
    bw17Audit_(user,'수업안 정보 변경',id,'성공','v'+current.values[1]);
    const tab=bw45Tab_('plan');
    tab.getRange(current.row,4,1,4).setValues([[title,month,age,note]]);
    tab.getRange(current.row,15).setValue(new Date());
    return {ok:true};
  }finally{lock.releaseLock();}
}
function staff45ArchiveLessonPlan(token,p) {
  const user=bw45Allowed_(token,true),id=String(p&&p.planId||'');
  if(!/^BW-LP-[a-f0-9]{24}$/i.test(id)||!p||typeof p.archived!=='boolean')throw Error('수업안 보관 상태를 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const current=bw45Latest_(id);
    if(!current)throw Error('수업안이 없습니다.');
    const status=p.archived?'보관':'사용';
    bw17Audit_(user,'수업안 보관 상태',id,'성공',status);
    const tab=bw45Tab_('plan');
    tab.getRange(current.row,13).setValue(status);
    tab.getRange(current.row,15).setValue(new Date());
    return {ok:true,status};
  }finally{lock.releaseLock();}
}
