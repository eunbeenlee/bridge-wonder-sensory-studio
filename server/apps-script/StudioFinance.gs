/**
 * Bridge Wonder V49 | Personal-proprietor operational finance and ledger.
 * Private staff Apps Script ONLY. No public views, no standalone account links.
 * This service is NOT tax filing software. No payroll or tuition ledger is mutated.
 */
const BW49=Object.freeze({
  SETTINGS:'재무_손익계획',
  ENTRIES:'재무_현금거래',
  SETTINGS_HEADERS:['버전','수정시각','수정자','가정JSON','요청키'],
  ENTRY_HEADERS:['기록ID','버전','연월','거래일','분류','금액','지급수단','메모','기록상태','작성자','기록시각','요청키'],
  CATEGORIES:[
    'regular','trial','otherSales','refund','rent','management','utilities','materials',
    'cleaning','insurance','marketing','accounting','payroll','outsourcing','otherExpense',
    'ownerHealth','ownerPension','vat','incomeTax','withholding','deposit','depositReturn',
    'equipment','ownerDraw','ownerCapital','loan','loanRepay','loanInterest'
  ],
  PAYMENT:['계좌이체','카드','현금','기타'],
  NUMERIC:[
    'weeklyClasses','capacity','occupancy','regularFee','termWeeks','trialCount','trialFee',
    'otherSales','refundPercent','materialPerChild','consumablePerChild','cardFeePercent',
    'rent','management','electricity','water','heating','internet','phone','security','cleaning',
    'laundry','waste','repairs','insurance','accounting','marketing','software','supplies',
    'rental','miscFixed','staffGross','employerPensionPct','employerHealthPct',
    'employerLtcPct','employerEmploymentPct','employerAccidentPct','severancePct',
    'contractLabor','ownerHealth','ownerPension','ownerDraw','depreciation',
    'otherIncomeAnnual','deductionAnnual','otherInputVat','simplifiedValueAddedPct',
    'deposit','keyMoney','interior','flooring','furniture','teachingTools','safetySetup',
    'openingMaterials','signage','devices','broker','firstMarketing','contingency',
    'workingCapitalMonths'
  ],
  ENUMS:Object.freeze({
    vatMode:['general','simplified'],priceVatIncluded:['yes','no'],
    rentVatSeparate:['no','yes'],managementVatSeparate:['no','yes']
  })
});
function bw49Auth_(token,write){
  return bw24Authorized_(token,'finance',write?'write':'read',['owner']);
}
function bw49Period_(value){
  const v=String(value||'');
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(v))throw Error('조회할 연월을 확인해 주세요.');
  return v;
}
function bw49Sheet_(kind,create){
  const name=kind==='settings'?BW49.SETTINGS:BW49.ENTRIES;
  const headers=kind==='settings'?BW49.SETTINGS_HEADERS:BW49.ENTRY_HEADERS;
  const sheet=bw17Tab_(name,headers,create===true);
  if(!sheet)return null;
  const actual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if(headers.some((h,i)=>actual[i]!==h))throw Error('재무 대장 열 구성이 변경되었습니다. 기존 데이터를 수정하지 않습니다.');
  return sheet;
}
function bw49Settings_(sheet){
  if(!sheet||sheet.getLastRow()<2)return {revision:0,values:null,updatedAt:null};
  const row=sheet.getRange(sheet.getLastRow(),1,1,BW49.SETTINGS_HEADERS.length).getDisplayValues()[0];
  let parsed=null;
  try{parsed=JSON.parse(row[3]);}catch(_){throw Error('저장된 운영 가정을 읽지 못했습니다. 이전 기록을 확인해 주세요.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('저장된 운영 가정 형식이 올바르지 않습니다.');
  return {revision:Number(row[0])||0,values:parsed,updatedAt:row[1],lastRequestId:row[4]||''};
}
function bw49Entries_(sheet){
  if(!sheet||sheet.getLastRow()<2)return [];
  if(sheet.getLastRow()>5001)throw Error('거래 기록이 5,000건을 넘었습니다. 원장에게 이전 기록 보관 후 확인을 요청해 주세요.');
  const values=sheet.getRange(2,1,sheet.getLastRow()-1,BW49.ENTRY_HEADERS.length).getDisplayValues();
  const recent=new Map();
  values.forEach(row=>{
    const id=String(row[0]||'');
    if(!/^FIN-[a-f0-9-]{36}$/i.test(id))return;
    const item={id,revision:Number(row[1])||0,month:String(row[2]||''),date:String(row[3]||''),
      category:String(row[4]||''),amount:Number(row[5])||0,method:String(row[6]||''),
      note:String(row[7]||''),state:String(row[8]||''),createdBy:String(row[9]||''),
      updatedAt:String(row[10]||''),requestId:String(row[11]||'')};
    const prior=recent.get(id);
    if(!prior||item.revision>prior.revision)recent.set(id,item);
  });
  return Array.from(recent.values()).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
}
function staff49FinanceRead(token,month){
  bw49Auth_(token,false);
  const period=bw49Period_(month),s=bw49Sheet_('settings',false),e=bw49Sheet_('entries',false);
  const settings=bw49Settings_(s);
  const entries=bw49Entries_(e).filter(r=>r.month===period&&r.state==='유효').map(r=>{
    const {requestId,...publicRow}=r;return publicRow;
  });
  return {month:period,settings:{revision:settings.revision,values:settings.values,updatedAt:settings.updatedAt},entries,
    notice:'직원 수납·급여·은행계좌와 자동 연결되지 않습니다. 실제 거래는 중복 입력하지 마세요.'};
}
function bw49RequestId_(value){
  const s=String(value||'').trim();
  if(!/^[a-f0-9-]{36}$/i.test(s))throw Error('요청 식별자가 올바르지 않습니다.');
  return s;
}
function bw49SettingsInput_(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('운영 가정 정보를 확인해 주세요.');
  const src=payload.values;
  if(!src||typeof src!=='object'||Array.isArray(src))throw Error('운영 가정 내용을 확인해 주세요.');
  const keys=Object.keys(src);
  if(keys.length>BW49.NUMERIC.length+Object.keys(BW49.ENUMS).length)throw Error('입력 항목 수를 확인해 주세요.');
  if(keys.some(k=>!BW49.NUMERIC.includes(k)&&!Object.prototype.hasOwnProperty.call(BW49.ENUMS,k)))
    throw Error('알 수 없는 재무 항목이 포함되어 있습니다.');
  const out={};
  for(const key of BW49.NUMERIC){
    if(!Object.prototype.hasOwnProperty.call(src,key))continue;
    const v=Number(src[key]);
    const upper=['occupancy','refundPercent','cardFeePercent','employerPensionPct','employerHealthPct',
      'employerLtcPct','employerEmploymentPct','employerAccidentPct','severancePct','simplifiedValueAddedPct'].includes(key)?100:
      key==='capacity'?4:key==='weeklyClasses'?200:key==='termWeeks'?52:key==='workingCapitalMonths'?24:1e10;
    if(!Number.isFinite(v)||v<0||v>upper)throw Error('재무 항목 '+key+'의 범위를 확인해 주세요.');
    if(['weeklyClasses','termWeeks','capacity','trialCount','workingCapitalMonths'].includes(key)&&!Number.isSafeInteger(v))
      throw Error('주간 운영반·텀·정원·체험 인원은 정수로 입력해 주세요.');
    if(key==='capacity'&&v!==4)throw Error('현재 정원 기준은 한 타임 아이 4명입니다.');
    out[key]=v;
  }
  for(const [key,choices] of Object.entries(BW49.ENUMS)){
    if(!Object.prototype.hasOwnProperty.call(src,key))continue;
    if(!choices.includes(src[key]))throw Error('부가세 계산 설정을 확인해 주세요.');
    out[key]=src[key];
  }
  if(Object.keys(out).length===0)throw Error('저장할 재무 설정을 입력해 주세요.');
  return out;
}
function staff49FinanceSaveSettings(token,p){
  const user=bw49Auth_(token,true);
  const input=bw49SettingsInput_(p),req=bw49RequestId_(p?.requestId),rev=Number(p?.revision);
  if(!Number.isSafeInteger(rev)||rev<0)throw Error('설정 버전을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw49Sheet_('settings',true),current=bw49Settings_(sheet);
    if(current.lastRequestId===req){
      if(JSON.stringify(bw49SettingsInput_({values:current.values}))!==JSON.stringify(input))throw Error('같은 저장 요청에 다른 예산이 입력되었습니다.');
      return {ok:true,revision:current.revision,alreadySaved:true};
    }
    if(rev!==current.revision)throw Error('다른 화면에서 설정이 변경됐습니다. 새로 조회한 뒤 저장해 주세요.');
    const revision=rev+1;
    const json=JSON.stringify(input);
    if(json.length>16000)throw Error('재무 설정이 너무 큽니다.');
    sheet.appendRow([revision,bw17Now_(),user.email,json,req]);
    let auditWarning=false;try{bw17Audit_(user,'재무 시뮬레이션 설정 저장','finance','성공','v'+revision);}catch(_){auditWarning=true;}
    return {ok:true,revision,auditWarning:auditWarning};
  }finally{lock.releaseLock();}
}
function bw49EntryInput_(p){
  if(!p||typeof p!=='object'||Array.isArray(p))throw Error('거래 정보를 확인해 주세요.');
  const id=p.id?String(p.id):'';
  if(id&&!/^FIN-[a-f0-9-]{36}$/i.test(id))throw Error('기록번호가 올바르지 않습니다.');
  const date=String(p.date||''),month=String(p.month||''),category=String(p.category||'');
  if(!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)||
    date.slice(0,7)!==bw49Period_(month)||
    !Number.isFinite(new Date(date+'T00:00:00Z').getTime())||
    new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)
    throw Error('거래 날짜와 연월을 확인해 주세요.');
  if(!BW49.CATEGORIES.includes(category))throw Error('거래 분류를 선택해 주세요.');
  const amount=Number(p.amount);
  if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000)throw Error('거래 금액은 1원부터 10억원까지 입력해 주세요.');
  const method=String(p.method||'계좌이체');
  if(!BW49.PAYMENT.includes(method))throw Error('결제수단을 확인해 주세요.');
  const note=bw17Safe_(p.note||'',160);
  return {id,date,month,category,amount,method,note};
}
function staff49FinanceSaveEntry(token,p){
  const user=bw49Auth_(token,true),v=bw49EntryInput_(p),req=bw49RequestId_(p?.requestId);
  const rev=Number(p?.revision||0);
  if(!Number.isSafeInteger(rev)||rev<0)throw Error('거래 수정 버전을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw49Sheet_('entries',true),rows=bw49Entries_(sheet);
    const duplicate=rows.find(x=>x.requestId===req);
    if(duplicate){
      const clean=x=>String(x||'').replace(/^'(?=[=+\-@])/,'');
      if(duplicate.state!=='유효'||(v.id&&duplicate.id!==v.id)||duplicate.month!==v.month||duplicate.date!==v.date||duplicate.category!==v.category||duplicate.amount!==v.amount||duplicate.method!==v.method||clean(duplicate.note)!==clean(v.note))throw Error('같은 저장 요청에 다른 거래가 입력되었습니다.');
      return {ok:true,id:duplicate.id,revision:duplicate.revision,alreadySaved:true};
    }
    const existing=v.id?rows.find(x=>x.id===v.id):null;
    if(v.id&&(!existing||existing.state!=='유효'))throw Error('수정할 거래 기록을 찾지 못했습니다.');
    if((existing?.revision||0)!==rev)throw Error('다른 화면에서 거래가 변경됐습니다. 새로 조회해 주세요.');
    const id=v.id||'FIN-'+req,revision=rev+1;
    if(!v.id&&rows.some(row=>row.id===id))throw Error('이미 생성된 거래가 변경되었습니다. 거래 목록을 확인해 주세요.');
    sheet.appendRow([id,revision,v.month,v.date,v.category,v.amount,v.method,v.note,
      '유효',user.email,bw17Now_(),req]);
    let auditWarning=false;try{bw17Audit_(user,'재무 거래 기록',id,'성공',v.category+' / '+String(v.amount));}catch(_){auditWarning=true;}
    return {ok:true,id,revision,auditWarning:auditWarning};
  }finally{lock.releaseLock();}
}
function staff49FinanceVoidEntry(token,p){
  const user=bw49Auth_(token,true),req=bw49RequestId_(p?.requestId);
  const id=String(p?.id||''),revision=Number(p?.revision);
  if(!/^FIN-[a-f0-9-]{36}$/i.test(id)||!Number.isSafeInteger(revision)||revision<1)throw Error('삭제할 기록을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const sheet=bw49Sheet_('entries',false),rows=bw49Entries_(sheet);
    const duplicate=rows.find(x=>x.requestId===req);
    if(duplicate){if(duplicate.id!==id||duplicate.state!=='취소'||duplicate.revision!==revision+1)throw Error('같은 요청에 다른 취소 기록이 입력되었습니다.');return {ok:true,id,revision:duplicate.revision,alreadySaved:true};}
    const row=rows.find(x=>x.id===id);
    if(!row||row.state!=='유효'||row.revision!==revision)throw Error('기록이 변경됐습니다. 새로 조회해 주세요.');
    sheet.appendRow([id,revision+1,row.month,row.date,row.category,row.amount,row.method,row.note,
      '취소',user.email,bw17Now_(),req]);
    let auditWarning=false;try{bw17Audit_(user,'재무 거래 취소',id,'성공','원본 보존');}catch(_){auditWarning=true;}
    return {ok:true,id,revision:revision+1,auditWarning:auditWarning};
  }finally{lock.releaseLock();}
}
