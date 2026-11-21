/**
 * Bridge Wonder V45 — private lesson-plan file library.
 * INSTALL ONLY in the existing STAFF Apps Script project.
 *
 * No public GET endpoints, public Drive links, file bytes in Sheets or
 * user data in GitHub. All exported RPC methods authorize the staff session.
 * Files are kept as private Drive blobs and indexed by a private Sheet.
 */
const BW45 = Object.freeze({
  SHEET:'운영_수업안자료',
  HEADERS:['자료번호','제목','적용월','월령','메모','원본파일명','파일형식','크기(바이트)','공유상태','등록직원','등록일','수정일','Drive파일ID','임시폴더ID','전체조각','내용해시','개정번호'],
  FOLDER_PROPERTY:'BW45_LESSON_FOLDER_ID',
  MAX_BYTES:8*1024*1024,
  PART_BYTES:160*1024,
  MAX_ROWS:600,
  AGES:['전체','7~12개월','13~18개월','19~24개월','25~35개월','36~48개월'],
  TYPES:Object.freeze({
    pdf:['application/pdf','pdf'],
    docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document','zip'],
    xlsx:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','zip'],
    pptx:['application/vnd.openxmlformats-officedocument.presentationml.presentation','zip'],
    hwp:['application/x-hwp','ole'],
    hwpx:['application/hwp+zip','zip'],
    doc:['application/msword','ole'],
    xls:['application/vnd.ms-excel','ole'],
    ppt:['application/vnd.ms-powerpoint','ole'],
    txt:['text/plain','text'],
    jpg:['image/jpeg','jpg'],
    jpeg:['image/jpeg','jpg'],
    png:['image/png','png'],
    webp:['image/webp','webp']
  })
});
function bw45Auth_(token,write){
  return bw24Authorized_(token,'themes',write?'write':'read',write?['owner','director']:['owner','director','teacher']);
}
function bw45Clean_(value,max){
  return String(value==null?'':value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
}
function bw45Meta_(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('수업안 정보를 확인해 주세요.');
  const fileName=bw45Clean_(input.fileName,125).replace(/[\\/]/g,'_').replace(/^\.+/,'');
  const ext=(fileName.split('.').pop()||'').toLowerCase();
  const spec=BW45.TYPES[ext];
  if(!spec||!fileName||fileName.length<3||fileName.includes('..')||!/\.[a-z0-9]{2,5}$/i.test(fileName))
    throw Error('지원하지 않는 파일 형식입니다. PDF, 문서, PPT, 한글, 이미지 또는 TXT 파일을 선택해 주세요.');
  const title=bw45Clean_(input.title,100),month=String(input.month||'').trim(),age=String(input.age||'전체').trim();
  const note=bw45Clean_(input.note,300),bytes=Number(input.size);
  if(!title)throw Error('수업안 제목을 입력해 주세요.');
  if(month&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('적용 월을 확인해 주세요.');
  if(!BW45.AGES.includes(age))throw Error('대상 월령을 확인해 주세요.');
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>BW45.MAX_BYTES)throw Error('파일은 8MB 이하로 올려 주세요.');
  return {fileName,mime:spec[0],signature:spec[1],title,month,age,note,bytes,parts:Math.ceil(bytes/BW45.PART_BYTES)};
}
function bw45Tab_(create){return bw17Tab_(BW45.SHEET,BW45.HEADERS,create);}
function bw45Rows_(sheet){
  if(!sheet||sheet.getLastRow()<2)return [];
  const len=Math.min(BW45.MAX_ROWS,sheet.getLastRow()-1);
  const start=sheet.getLastRow()-len+1;
  return sheet.getRange(start,1,len,BW45.HEADERS.length).getDisplayValues().map((values,index)=>({values,row:start+index}));
}
function bw45Find_(sheet,id){
  if(typeof id!=='string'||!/^LP-[a-f0-9-]{36}$/.test(id))throw Error('수업안 번호가 올바르지 않습니다.');
  const item=bw45Rows_(sheet).find(x=>x.values[0]===id);
  if(!item)throw Error('수업안 자료를 찾을 수 없습니다.');
  return item;
}
function bw45Folder_(){
  const props=PropertiesService.getScriptProperties();
  const saved=String(props.getProperty(BW45.FOLDER_PROPERTY)||'');
  if(saved){
    try{return DriveApp.getFolderById(saved);}catch(_){throw Error('수업안 보관 폴더를 찾지 못했습니다. 원장에게 확인해 주세요.');}
  }
  const folder=DriveApp.createFolder('BridgeWonder_수업안_비공개');
  folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  props.setProperty(BW45.FOLDER_PROPERTY,folder.getId());
  return folder;
}
function bw45Digest_(bytes){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(x=>('0'+((x+256)%256).toString(16)).slice(-2)).join('');
}
function bw45Sig_(bytes,kind){
  const has=(at,a)=>a.every((x,i)=>(bytes[at+i]+256)%256===x);
  if(kind==='pdf')return has(0,[37,80,68,70,45]);
  if(kind==='zip')return has(0,[80,75,3,4])||has(0,[80,75,5,6]);
  if(kind==='ole')return has(0,[208,207,17,224,161,177,26,225]);
  if(kind==='jpg')return has(0,[255,216,255]);
  if(kind==='png')return has(0,[137,80,78,71,13,10,26,10]);
  if(kind==='webp')return has(0,[82,73,70,70])&&has(8,[87,69,66,80]);
  if(kind==='text')return !bytes.slice(0,512).some(x=>(x+256)%256===0);
  return false;
}
function bw45Public_(r){
  const x=r.values;
  return {
    id:String(x[0]),title:String(x[1]),month:String(x[2]),age:String(x[3]),note:String(x[4]),
    fileName:String(x[5]),mime:String(x[6]),size:Number(x[7])||0,visibility:String(x[8]),
    owner:String(x[9]),created:String(x[10]),updated:String(x[11]),revision:Number(x[16])||0
  };
}
function staff45ListLessons(token){
  const user=bw45Auth_(token,false),sheet=bw45Tab_(false);
  const rows=bw45Rows_(sheet).filter(r=>{
    const state=String(r.values[8]||'');
    return user.role==='teacher'?state==='공유':state!=='업로드중'&&state!=='취소';
  });
  return rows.reverse().map(bw45Public_);
}
function staff45BeginLesson(token,p){
  const user=bw45Auth_(token,true),meta=bw45Meta_(p);
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const sheet=bw45Tab_(true),folder=bw45Folder_(),id='LP-'+Utilities.getUuid();
    const temp=folder.createFolder('임시_'+id);
    temp.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    const date=bw17Now_();
    sheet.appendRow([id,meta.title,meta.month,meta.age,meta.note,meta.fileName,meta.mime,meta.bytes,
      '업로드중',user.email,date,date,'',temp.getId(),meta.parts,'',0]);
    bw17Audit_(user,'수업안 업로드 시작',id,'성공',meta.fileName);
    return {id,partBytes:BW45.PART_BYTES,parts:meta.parts,maxBytes:BW45.MAX_BYTES};
  }finally{lock.releaseLock();}
}
function bw45Pending_(user,id){
  const sheet=bw45Tab_(false),r=bw45Find_(sheet,id),x=r.values;
  if(x[8]!=='업로드중'||x[9]!==user.email||!x[13])throw Error('업로드 중인 자료가 아닙니다. 자료실 목록을 확인해 주세요.');
  return {sheet,row:r.row,values:x,folder:DriveApp.getFolderById(x[13])};
}
function staff45UploadPart(token,id,index,b64){
  const user=bw45Auth_(token,true);
  const n=Number(index);
  if(!Number.isSafeInteger(n)||n<0)throw Error('파일 조각 번호를 확인해 주세요.');
  if(typeof b64!=='string'||!b64.length||b64.length>Math.ceil(BW45.PART_BYTES/3)*4+8||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(b64))throw Error('파일 전송 내용이 올바르지 않습니다.');
  const bytes=Utilities.base64Decode(b64);
  if(bytes.length>BW45.PART_BYTES)throw Error('파일 조각이 너무 큽니다.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const upload=bw45Pending_(user,id),size=Number(upload.values[7]),parts=Number(upload.values[14]);
    if(n>=parts)throw Error('파일 조각 번호를 확인해 주세요.');
    const expected=n===parts-1?size-n*BW45.PART_BYTES:BW45.PART_BYTES;
    if(bytes.length!==expected)throw Error('파일 조각의 크기가 올바르지 않습니다.');
    const name='part-'+('000'+n).slice(-3),existing=upload.folder.getFilesByName(name);
    if(existing.hasNext()){
      const current=existing.next().getBlob().getBytes();
      if(bw45Digest_(current)!==bw45Digest_(bytes))throw Error('이전에 전송한 파일 조각과 내용이 다릅니다.');
      return {ok:true,index:n,alreadySaved:true};
    }
    const file=upload.folder.createFile(Utilities.newBlob(bytes,'application/octet-stream',name));
    file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    return {ok:true,index:n};
  }finally{lock.releaseLock();}
}
function staff45FinishLesson(token,id){
  const user=bw45Auth_(token,true),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const upload=bw45Pending_(user,id),x=upload.values,total=Number(x[7]),parts=Number(x[14]);
    const bytes=[],spec=BW45.TYPES[String(x[5]).split('.').pop().toLowerCase()];
    if(!spec||parts<1||parts>Math.ceil(BW45.MAX_BYTES/BW45.PART_BYTES))throw Error('수업안 파일 정보를 확인해 주세요.');
    for(let i=0;i<parts;i++){
      const f=upload.folder.getFilesByName('part-'+('000'+i).slice(-3));
      if(!f.hasNext())throw Error('업로드가 끝나지 않았습니다. 빠진 파일 조각을 확인해 주세요.');
      const buffer=f.next().getBlob().getBytes();
      const expected=i===parts-1?total-i*BW45.PART_BYTES:BW45.PART_BYTES;
      if(buffer.length!==expected)throw Error('파일 내용이 서로 맞지 않습니다. 다시 업로드해 주세요.');
      for(let j=0;j<buffer.length;j++)bytes.push(buffer[j]);
    }
    if(bytes.length!==total||!bw45Sig_(bytes,spec[1]))throw Error('파일 형식이 확장자와 다릅니다. 파일을 확인해 주세요.');
    const folder=bw45Folder_(),file=folder.createFile(Utilities.newBlob(bytes,spec[0],x[5]));
    file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    const now=bw17Now_(),digest=bw45Digest_(bytes);
    const changed=x.slice();changed[8]='비공개';changed[11]=now;changed[12]=file.getId();
    changed[13]='';changed[15]=digest;changed[16]=1;
    upload.sheet.getRange(upload.row,1,1,BW45.HEADERS.length).setValues([changed]);
    try{upload.folder.setTrashed(true);}catch(_){}
    bw17Audit_(user,'수업안 파일 등록',id,'성공',String(total)+' bytes');
    return {ok:true,lesson:bw45Public_({values:changed})};
  }finally{lock.releaseLock();}
}
function staff45AbortLesson(token,id){
  const user=bw45Auth_(token,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const upload=bw45Pending_(user,id),x=upload.values.slice();
    x[8]='취소';x[11]=bw17Now_();x[13]='';
    upload.sheet.getRange(upload.row,1,1,BW45.HEADERS.length).setValues([x]);
    try{upload.folder.setTrashed(true);}catch(_){}
    bw17Audit_(user,'수업안 업로드 취소',id,'성공','');
    return {ok:true};
  }finally{lock.releaseLock();}
}
function staff45SaveLesson(token,p){
  const user=bw45Auth_(token,true);
  if(!p||typeof p!=='object')throw Error('변경 내용을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw45Tab_(false),row=bw45Find_(sheet,p.id),x=row.values.slice();
    if(!['비공개','공유'].includes(x[8]))throw Error('변경할 수 없는 자료입니다.');
    if(Number(p.revision)!==Number(x[16]))throw Error('다른 직원이 먼저 수정했습니다. 목록을 다시 확인해 주세요.');
    const title=bw45Clean_(p.title,100),month=String(p.month||'').trim(),age=String(p.age||'전체'),note=bw45Clean_(p.note,300);
    if(!title||month&&!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!BW45.AGES.includes(age)||!['비공개','공유'].includes(p.visibility))
      throw Error('수업안 제목과 적용 월, 공유 상태를 확인해 주세요.');
    x[1]=title;x[2]=month;x[3]=age;x[4]=note;x[8]=p.visibility;x[11]=bw17Now_();x[16]=Number(x[16])+1;
    sheet.getRange(row.row,1,1,BW45.HEADERS.length).setValues([x]);
    bw17Audit_(user,'수업안 정보 수정',p.id,'성공',p.visibility);
    return {ok:true,lesson:bw45Public_({values:x})};
  }finally{lock.releaseLock();}
}
function staff45ArchiveLesson(token,p){
  const user=bw45Auth_(token,true),lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw45Tab_(false),row=bw45Find_(sheet,p&&p.id),x=row.values.slice();
    if(!['비공개','공유'].includes(x[8])||Number(p.revision)!==Number(x[16]))throw Error('자료 상태를 새로 확인해 주세요.');
    x[8]='보관';x[11]=bw17Now_();x[16]=Number(x[16])+1;
    sheet.getRange(row.row,1,1,BW45.HEADERS.length).setValues([x]);
    bw17Audit_(user,'수업안 자료 보관',x[0],'성공','');
    return {ok:true};
  }finally{lock.releaseLock();}
}
function staff45DownloadLesson(token,id){
  const user=bw45Auth_(token,false),sheet=bw45Tab_(false),row=bw45Find_(sheet,id),x=row.values;
  if((user.role==='teacher'&&x[8]!=='공유')||
     (user.role!=='teacher'&&!['비공개','공유','보관'].includes(x[8]))||
     !x[12])throw Error('이 자료를 열람할 권한이 없습니다.');
  const file=DriveApp.getFileById(x[12]),data=file.getBlob().getBytes();
  if(data.length!==Number(x[7])||bw45Digest_(data)!==x[15])throw Error('보관 파일을 확인할 수 없습니다. 원장에게 문의해 주세요.');
  bw17Audit_(user,'수업안 파일 다운로드',id,'성공',x[5]);
  return {fileName:x[5],mime:x[6],size:data.length,base64:Utilities.base64Encode(data)};
}
