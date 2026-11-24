/**
 * Bridge Wonder V51 — private, sheet-backed operational content editor.
 * Only install in the existing Staff Apps Script project.
 * Never install in public enrollment/inquiry scripts.
 * Uses the existing staff sessions and BW24 role permissions.
 * Public homepage, tuition contracts, payroll, and financial ledger are untouched.
 */
const BW51 = Object.freeze({
  HEADERS:['관리ID','분류','항목명','내용','금액','단위','적용일','상태','추가정보JSON','버전','수정시각','수정자','요청키'],
  SECTIONS:Object.freeze({
    settings:{tab:'BW51_운영설정',permission:'courseSettings',roles:['owner','director']},
    copy:{tab:'BW51_안내문구',permission:'courseSettings',roles:['owner','director']},
    lessons:{tab:'BW51_회차별수업안',permission:'themes',roles:['owner','director','teacher']},
    materials:{tab:'BW51_재료목록',permission:'themes',roles:['owner','director','teacher']},
    costs:{tab:'BW51_비용항목',permission:'finance',roles:['owner']},
    templates:{tab:'BW51_서식문구',permission:'documents',roles:['owner','director']}
  }),
  LIMIT:500
});
function bw51Section_(section){
  const key=String(section||'');
  if(!Object.prototype.hasOwnProperty.call(BW51.SECTIONS,key))throw Error('지원하지 않는 관리 영역입니다.');
  return BW51.SECTIONS[key];
}
function bw51Auth_(token,section,write){
  const config=bw51Section_(section);
  const roles=write?config.roles.filter(role=>role==='owner'||role==='director'):config.roles;
  const user=bw24Authorized_(token,config.permission,write?'write':'read',roles);
  return {user:user,mayWrite:['owner','director'].includes(user.role) && bw24Can_(user,config.permission,'write')};
}
function bw51Sheet_(section,create){
  const config=bw51Section_(section);
  const sheet=bw17Tab_(config.tab,BW51.HEADERS,create===true);
  if(!sheet)return null;
  const actual=sheet.getRange(1,1,1,BW51.HEADERS.length).getDisplayValues()[0];
  if(BW51.HEADERS.some((h,i)=>actual[i]!==h))throw Error('운영 자료 대장의 열 구성이 바뀌었습니다. 기존 기록을 덮어쓰지 않습니다.');
  return sheet;
}
function bw51Clean_(value,max){
  const s=String(value==null?'':value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);
  return /^[\s]*[=+\-@]/.test(s)?"'"+s:s;
}
function bw51Fields_(record,section){
  if(!record||typeof record!=='object'||Array.isArray(record))throw Error('입력 형식을 확인해 주세요.');
  const category=bw51Clean_(record.category,90),title=bw51Clean_(record.title,110);
  const content=bw51Clean_(record.content,6000),unit=bw51Clean_(record.unit,50);
  const effectiveDate=String(record.effectiveDate||'').trim(),status=String(record.status||'초안');
  if(!title)throw Error('항목명을 입력해 주세요.');
  if(!['초안','사용','보관'].includes(status))throw Error('상태를 확인해 주세요.');
  if(effectiveDate&&!/^20\d\d-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(effectiveDate))throw Error('적용일은 YYYY-MM 또는 YYYY-MM-DD로 입력해 주세요.');
  if(section==='lessons'&&!content)throw Error('수업 진행 내용을 입력해 주세요.');
  if(section==='copy'&&!content)throw Error('안내 문구 내용을 입력해 주세요.');
  let amount='';
  if(section==='costs'||section==='materials'){
    if(record.amount!==''&&record.amount!==null&&record.amount!==undefined){
      const n=Number(record.amount);
      if(!Number.isSafeInteger(n)||n<0||n>1000000000)throw Error('금액은 0~10억 원 사이의 정수로 입력해 주세요.');
      amount=n;
    }
  }
  const extra=record.extra==null?{}:record.extra;
  if(typeof extra!=='object'||Array.isArray(extra))throw Error('추가정보 형식을 확인해 주세요.');
  const keys=Object.keys(extra);
  if(keys.some(k=>!['ageGroup','durationMinutes','preparation','safety','quantity','taxType'].includes(k)))throw Error('허용되지 않은 추가 항목이 있습니다.');
  const safe={};
  for(const k of keys){
    const val=bw51Clean_(extra[k],k==='preparation'||k==='safety'?900:120);
    safe[k]=val;
  }
  const extraJson=JSON.stringify(safe);
  if(extraJson.length>2500)throw Error('추가 정보가 너무 깁니다.');
  return [category,title,content,amount,unit,effectiveDate,status,extraJson];
}
function bw51Tag_(row){return bw17Hash_(JSON.stringify(row.slice(0,9).map(v=>String(v==null?'':v)))).slice(0,24);}
function bw51Item_(row){
  let extra={};try{const value=JSON.parse(String(row[8]||'{}'));if(value&&typeof value==='object'&&!Array.isArray(value))extra=value;}catch(_){}
  const n=String(row[4]||'').replace(/,/g,'');
  return {id:String(row[0]||''),category:String(row[1]||''),title:String(row[2]||''),
    content:String(row[3]||''),amount:n===''?null:Number(n),unit:String(row[5]||''),
    effectiveDate:String(row[6]||''),status:String(row[7]||''),extra:extra,
    version:Number(row[9])||1,updatedAt:String(row[10]||''),updatedBy:String(row[11]||''),etag:bw51Tag_(row)};
}
function bw51Rows_(sheet){
  if(!sheet||sheet.getLastRow()<2)return [];
  const length=sheet.getLastRow()-1;
  if(length>BW51.LIMIT)throw Error('운영 자료 500개 한도를 초과했습니다. 일부만 표시하지 않고 조회를 중단합니다.');
  const first=sheet.getLastRow()-length+1;
  return sheet.getRange(first,1,length,BW51.HEADERS.length).getDisplayValues().map((row,index)=>{Object.defineProperty(row,'_sheetRow',{value:first+index});return row;}).filter(row=>String(row[0]||'').trim());
}
/** One section per request; 45s foreground polling detects direct Sheet edits without extra triggers. */
function staff51ListContent(token,section,previousSignature){
  const auth=bw51Auth_(token,section,false);
  const sheet=bw51Sheet_(section,false);
  let rows=bw51Rows_(sheet);
  if(auth.user.role==='teacher')rows=rows.filter(r=>String(r[7])==='사용');
  const signature=bw17Hash_(JSON.stringify(rows)).slice(0,32);
  if(previousSignature&&previousSignature===signature){return {section:section,signature:signature,unchanged:true,canWrite:auth.mayWrite,checkedAt:bw17Now_()};}
  return {section:section,signature:signature,unchanged:false,canWrite:auth.mayWrite,
    items:rows.reverse().map(bw51Item_),checkedAt:bw17Now_()};
}
/** Upsert: optimistic hash check + locked sheet write + idempotent request ID. */
function staff51SaveContent(token,record){
  const section=String(record&&record.section||'');
  const auth=bw51Auth_(token,section,true),fields=bw51Fields_(record,section);
  if(!auth.mayWrite)throw Error('이 항목을 수정할 권한이 없습니다.');
  const id=String(record.id||'').trim(),etag=String(record.etag||'').trim();
  const requestId=String(record.requestId||'').trim();
  if(id&&!/^BW51-[a-f0-9-]{36}$/i.test(id))throw Error('항목 ID를 확인해 주세요.');
  if(id&&!/^[a-f0-9]{24}$/i.test(etag))throw Error('현재 항목을 다시 불러온 후 수정해 주세요.');
  if(!/^[a-f0-9-]{36}$/i.test(requestId))throw Error('저장 요청 ID가 올바르지 않습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw51Sheet_(section,true);
    const rows=bw51Rows_(sheet);
    const duplicate=rows.find(row=>String(row[12])===requestId);
    if(duplicate)return {ok:true,item:bw51Item_(duplicate),duplicate:true};
    const existing=rows.findIndex(row=>String(row[0])===id);
    if(id&&existing<0)throw Error('항목을 찾을 수 없습니다. 다시 불러와 주세요.');
    if(id&&bw51Tag_(rows[existing])!==etag)throw Error('다른 사용자가 항목을 수정했습니다. 최신 내용을 확인한 후 다시 저장해 주세요.');
    if(!id&&sheet.getLastRow()-1>=BW51.LIMIT)throw Error('관리 항목이 500개를 초과했습니다. 보관된 항목을 별도 정리해 주세요.');
    const nextId=id||'BW51-'+Utilities.getUuid();
    const version=existing>=0?Number(rows[existing][9]||0)+1:1;
    const now=bw17Now_();
    const line=[nextId,...fields.slice(0,3),fields[3],...fields.slice(4),version,now,auth.user.email,requestId];
    // fields order: category,title,content,amount,unit,effectiveDate,status,extraJson
    const rownum=existing>=0?rows[existing]._sheetRow:sheet.getLastRow()+1;
    sheet.getRange(rownum,1,1,BW51.HEADERS.length).setValues([line]);
    if(section==='costs'||section==='materials')sheet.getRange(rownum,5).setNumberFormat('#,##0');
    const stored=sheet.getRange(rownum,1,1,BW51.HEADERS.length).getDisplayValues()[0];
    bw17Audit_(auth.user,'운영 콘텐츠 저장',section+'/'+nextId,'성공','버전 '+version);
    return {ok:true,item:bw51Item_(stored),duplicate:false};
  }finally{lock.releaseLock();}
}
/** Archive rather than delete; preserve the sheet record and append an action audit entry. */
function staff51ArchiveContent(token,record){
  const section=String(record&&record.section||''),auth=bw51Auth_(token,section,true);
  if(!auth.mayWrite)throw Error('보관할 권한이 없습니다.');
  const id=String(record&&record.id||''),etag=String(record&&record.etag||'');
  if(!/^BW51-[a-f0-9-]{36}$/i.test(id)||!/^[a-f0-9]{24}$/i.test(etag))throw Error('항목 ID를 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw51Sheet_(section,false);if(!sheet)throw Error('항목을 찾을 수 없습니다.');
    const rows=bw51Rows_(sheet),index=rows.findIndex(r=>String(r[0])===id);
    if(index<0)throw Error('항목을 찾을 수 없습니다.');
    const row=rows[index].slice();
    if(bw51Tag_(row)!==etag)throw Error('항목이 변경되었습니다. 최신 내용을 다시 확인해 주세요.');
    const version=(Number(row[9])||0)+1;
    const rownum=rows[index]._sheetRow;
    sheet.getRange(rownum,8).setValue('보관');
    sheet.getRange(rownum,10,1,4).setValues([[version,bw17Now_(),auth.user.email,Utilities.getUuid()]]);
    const stored=sheet.getRange(rownum,1,1,BW51.HEADERS.length).getDisplayValues()[0];
    bw17Audit_(auth.user,'운영 콘텐츠 보관',section+'/'+id,'성공','버전 '+version);
    return {ok:true,item:bw51Item_(stored)};
  }finally{lock.releaseLock();}
}
function setupBridgeWonderContentV51(){
  bw24RequireEditorOwner_();
  bw17Config_();
  const created=[];
  for(const section of Object.keys(BW51.SECTIONS)){
    const conf=BW51.SECTIONS[section];
    if(!bw17Book_().getSheetByName(conf.tab)){
      bw51Sheet_(section,true);created.push(conf.tab);
    }
  }
  return {ok:true,created:created,sections:Object.keys(BW51.SECTIONS)};
}
