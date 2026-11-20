/**
 * Bridge Wonder V32 — private Korean academy compliance & refund deadline tracker.
 * INSTALL ONLY in the existing STAFF Admin Apps Script project; never in the
 * public inquiry/registration deployment. Legal texts are shown from GitHub UI.
 * This file stores only staff-entered status/evidence references and refund logs.
 * It is a management aid, not a legal decision, receipt or payment processor.
 */
const BW32 = Object.freeze({
  CHECKS:'법정_행정점검이력',
  REFUNDS:'환불_처리기한대장',
  CHECK_HEADERS:['점검코드','처리상태','적용여부','다음 확인일','담당자','비공개 증빙 참조','확인 메모','최종 확인일','수정자','수정시각','개정번호'],
  REFUND_HEADERS:['환불건 ID','등록 접수번호','반환 사유','사유 발생일','반환 확인기한','수납액','검토 반환액','처리상태','실제 반환일','비공개 증빙 참조','업무 메모','수정자','수정시각','개정번호','작업 ID'],
  CHECK_IDS:[
    'REG01','REG02','REG03','REG04','REG05',
    'FEE01','FEE02','FEE03','FEE04','FEE05',
    'STAFF01','STAFF02','STAFF03','STAFF04',
    'PRIV01','PRIV02','PRIV03','PRIV04',
    'SAFE01','SAFE02','SAFE03','SAFE04','SAFE05',
    'OPS01','OPS02','OPS03'
  ],
  STATUS:['미확인','확인중','내부확인','보완필요'],
  APPLIES:['확인필요','적용','해당없음'],
  REFUND_REASONS:['학습자 수강 포기','학원 운영·교습 불가','등록말소·교습정지 등','격리 등 반환사유','기타(별도 확인)'],
  REFUND_STATUSES:['접수','반환금액 검토','반환예정','반환완료','분쟁·보류']
});
function bw32Tab_(name,headers) {
  const s=bw17Tab_(name,headers,true);
  if(!s)throw Error('관리 대장을 열 수 없습니다.');
  const actual=s.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if(headers.some((header,i)=>actual[i]!==header))throw Error('법정 관리 대장의 열 구성이 다릅니다. 기존 시트를 변경하지 않았습니다.');
  return s;
}
function bw32FiniteMoney_(value) {
  const str=String(value===undefined||value===null?'':value).trim();
  if(!/^\d{1,9}$/.test(str))throw Error('금액은 0~999,999,999원 범위의 정수로 입력해 주세요.');
  return Number(str);
}
function bw32Revision_(raw) {
  const n=Number(raw);
  if(!Number.isSafeInteger(n)||n<0||n>999999999)throw Error('저장 정보를 새로 불러와 주세요.');
  return n;
}
function bw32KstDate_(value,optional) {
  return bw18Date_(value,optional===true);
}
function bw32DateAfter_(day,n) {
  const date=new Date(day+'T12:00:00+09:00');
  date.setTime(date.getTime()+n*86400000);
  return Utilities.formatDate(date,'Asia/Seoul','yyyy-MM-dd');
}
function bw32Rows_(tab,max) {
  const count=tab.getLastRow()-1;
  if(count<1)return [];
  if(count>5000)throw Error('기록이 많아 추가 조회가 필요합니다. 관리자에게 문의해 주세요.');
  return tab.getRange(2,1,count,tab.getLastColumn()).getDisplayValues();
}
function bw32CheckClean_(p) {
  const code=String(p&&p.code||'').trim();
  if(!BW32.CHECK_IDS.includes(code))throw Error('지원하지 않는 법정 확인 항목입니다.');
  const status=String(p&&p.status||'미확인');
  const applies=String(p&&p.applies||'확인필요');
  if(!BW32.STATUS.includes(status)||!BW32.APPLIES.includes(applies))throw Error('확인 상태를 목록에서 선택해 주세요.');
  const due=bw32KstDate_(p&&p.due,true);
  const checkedAt=bw32KstDate_(p&&p.checkedAt,true);
  const assignee=bw17Safe_(p&&p.assignee,45);
  const evidence=bw17Safe_(p&&p.evidence,180);
  const note=bw17Safe_(p&&p.note,240);
  if(applies==='해당없음'&&!note)throw Error('해당 없음으로 표시할 때는 근거를 메모에 남겨 주세요.');
  if(status==='내부확인'&&(!checkedAt||!evidence))throw Error('내부 확인 시 확인일과 비공개 증빙 참조를 남겨 주세요.');
  if(applies!=='적용'&&status==='내부확인')throw Error('적용 여부를 확인한 다음 내부 확인으로 변경해 주세요.');
  return {code,status,applies,due,checkedAt,assignee,evidence,note,revision:bw32Revision_(p?.revision)};
}
function staff32ListCompliance(token) {
  const user=bw24Authorized_(token,'compliance','read',['owner','director']);
  const s=bw32Tab_(BW32.CHECKS,BW32.CHECK_HEADERS);
  const rows=bw32Rows_(s,500);
  // Do not log sensitive memo/evidence values.
  bw17Audit_(user,'법정 점검 대장 조회',BW32.CHECKS,'성공',rows.length+'건');
  return rows.map(r=>({code:r[0],status:r[1],applies:r[2],due:r[3],assignee:r[4],evidence:r[5],note:r[6],checkedAt:r[7],editor:r[8],updated:r[9],revision:Number(r[10])||0}));
}
function staff32SaveCompliance(token,p) {
  const actor=bw24Authorized_(token,'compliance','write',['owner','director']);
  const clean=bw32CheckClean_(p);
  const tab=bw32Tab_(BW32.CHECKS,BW32.CHECK_HEADERS);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const rows=bw32Rows_(tab,500);
    const ix=rows.findIndex(r=>r[0]===clean.code);
    const existing=ix<0?0:bw32Revision_(rows[ix][10]||0);
    if(existing!==clean.revision)throw Error('다른 직원이 먼저 수정했습니다. 새로고침 후 다시 확인해 주세요.');
    const row=ix<0?tab.getLastRow()+1:ix+2;
    tab.getRange(row,1,1,BW32.CHECK_HEADERS.length).setValues([[
      clean.code,clean.status,clean.applies,clean.due,clean.assignee,
      clean.evidence,clean.note,clean.checkedAt,actor.email,new Date(),existing+1
    ]]);
    bw17Audit_(actor,'법정 점검 업데이트',clean.code,'성공',clean.status+' / '+clean.applies);
    return {ok:true,code:clean.code,revision:existing+1};
  }finally{lock.releaseLock();}
}
function bw32RefundClean_(p) {
  const id=String(p&&p.id||'').trim();
  if(id&&!/^RF-[0-9]{8}-[a-f0-9]{12}$/.test(id))throw Error('환불 관리번호가 올바르지 않습니다.');
  const receipt=bw17Safe_(p&&p.receipt,90);
  if(!receipt||receipt.length>90)throw Error('수강등록 접수번호를 선택해 주세요.');
  const reason=String(p&&p.reason||'').trim();
  const status=String(p&&p.status||'').trim();
  if(!BW32.REFUND_REASONS.includes(reason)||!BW32.REFUND_STATUSES.includes(status))throw Error('반환 사유와 처리 상태를 선택해 주세요.');
  const eventDate=bw32KstDate_(p&&p.eventDate,false);
  const completedAt=bw32KstDate_(p&&p.completedAt,true);
  const paid=bw32FiniteMoney_(p&&p.paid);
  const returnAmount=bw32FiniteMoney_(p&&p.returnAmount);
  if(returnAmount>paid)throw Error('검토 반환액이 수납액을 초과했습니다. 금액을 확인해 주세요.');
  const evidence=bw17Safe_(p&&p.evidence,180),note=bw17Safe_(p&&p.note,240);
  if(status==='반환완료'&&(!completedAt||!evidence))throw Error('실제 반환일과 비공개 증빙 참조를 입력해야 반환완료로 표시할 수 있습니다.');
  if(status!=='반환완료'&&completedAt)throw Error('반환 완료일은 실제 반환 완료 상태에서만 기록합니다.');
  const operationId=String(p&&p.operationId||'').trim();
  if(!/^[a-f0-9]{32}$/.test(operationId))throw Error('중복 저장 방지 식별값이 누락되었습니다.');
  return {id,receipt,reason,status,eventDate,completedAt,paid,returnAmount,evidence,note,operationId,revision:bw32Revision_(p?.revision)};
}
function staff32ListRefunds(token) {
  const actor=bw24Authorized_(token,'tuition','read',['owner','director']);
  const tab=bw32Tab_(BW32.REFUNDS,BW32.REFUND_HEADERS),rows=bw32Rows_(tab,500);
  // Requests never include guardian/child names, health info or payout account details.
  bw17Audit_(actor,'반환기한 관리 조회',BW32.REFUNDS,'성공',rows.length+'건');
  return rows.slice().reverse().map(r=>({id:r[0],receipt:r[1],reason:r[2],eventDate:r[3],due:r[4],
    paid:Number(r[5])||0,returnAmount:Number(r[6])||0,status:r[7],completedAt:r[8],
    evidence:r[9],note:r[10],editor:r[11],updated:r[12],revision:Number(r[13])||0}));
}
function staff32SaveRefund(token,p) {
  const actor=bw24Authorized_(token,'tuition','write',['owner','director']);
  const clean=bw32RefundClean_(p);
  // Must be a real registered receipt; do not create shadow student records.
  bw18Reg_(clean.receipt);
  const tab=bw32Tab_(BW32.REFUNDS,BW32.REFUND_HEADERS);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const rows=bw32Rows_(tab,1000);
    const replay=rows.find(r=>r[14]===clean.operationId);
    if(replay)return {ok:true,id:replay[0],due:replay[4],revision:Number(replay[13])||0,replayed:true};
    const index=clean.id?rows.findIndex(r=>r[0]===clean.id):-1;
    if(clean.id&&index<0)throw Error('수정할 환불 기록을 찾지 못했습니다.');
    const revision=index<0?0:bw32Revision_(rows[index][13]||0);
    if(revision!==clean.revision)throw Error('다른 직원이 이 환불건을 수정했습니다. 새로고침 후 확인해 주세요.');
    if(index>=0&&rows[index][7]==='반환완료'&&clean.status!=='반환완료')throw Error('이미 완료된 반환 기록은 다른 상태로 되돌릴 수 없습니다. 관리자에게 정정 절차를 문의해 주세요.');
    const id=index>=0?clean.id:'RF-'+Utilities.formatDate(new Date(),'Asia/Seoul','yyyyMMdd')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,12);
    const due=bw32DateAfter_(clean.eventDate,5);
    const row=index>=0?index+2:tab.getLastRow()+1;
    tab.getRange(row,1,1,BW32.REFUND_HEADERS.length).setValues([[
      id,clean.receipt,clean.reason,clean.eventDate,due,clean.paid,clean.returnAmount,
      clean.status,clean.completedAt,clean.evidence,clean.note,actor.email,new Date(),
      revision+1,clean.operationId
    ]]);
    bw17Audit_(actor,'환불기한 기록',id,'성공',clean.status+' / '+due);
    return {ok:true,id,due,revision:revision+1};
  }finally{lock.releaseLock();}
}
