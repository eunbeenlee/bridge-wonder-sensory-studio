/**
 * V56 private planning scenarios. One owner-only, versioned spreadsheet store.
 * Existing approved prices, contracts, ledger, payroll and material records are read-only.
 */
const BW56=Object.freeze({VERSION:'56.0.0',TAB:'BW56_운영손익계획',
  HEADERS:['개정번호','수정시각','수정자','계획JSON','요청키'],MAX_JSON:40000});
function bw56Spec_(){return {group:'finance',name:BW56.TAB,headers:BW56.HEADERS,create:true};}
function bw56Owner_(token,write){return bw24Authorized_(token,'finance',write?'write':'read',['owner']);}
function bw56Sheet_(book,create){
  const spec=bw56Spec_(),status=bw55TabState_(book,spec);
  if(status==='mismatch')throw Error('운영계획 대장의 열 구성이 변경되었습니다. 기존 데이터를 수정하지 않습니다.');
  return status==='missing'?(create?bw55CreateTab_(book,spec):null):book.getSheetByName(spec.name);
}
function bw56Int_(v,min,max,label){
  if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+' 입력값을 확인해 주세요.');
  return v;
}
function bw56Decimal_(v,min,max,label){
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+' 입력값을 확인해 주세요.');
  return v;
}
function bw56Text_(v,max){
  if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v))throw Error('재료명·단위를 확인해 주세요.');
  return v.trim();
}
function bw56Date_(s){
  if(typeof s!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s))throw Error('시작일을 확인해 주세요.');
  const d=new Date(s+'T00:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw Error('시작일을 확인해 주세요.');
  return d;
}
function bw56MonthAt_(start,offset){
  const d=bw56Date_(start+'-01');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,7);
}
function bw56Validate_(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('운영계획 입력 형식을 확인해 주세요.');
  if(typeof raw.startMonth!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(raw.startMonth))throw Error('조회 시작월을 확인해 주세요.');
  const c={startMonth:raw.startMonth,months:bw56Int_(raw.months,1,18,'예측 개월'),weeks:bw56Int_(raw.weeks,1,52,'과정 기간')};
  for(const key of ['termTotal','materialExtra','consumable','prepPerClass','fixedCash','fixedVatCredit','depreciation','otherCashOut','openingCash']){
    c[key]=bw56Int_(raw[key],key==='termTotal'?1:0,key==='termTotal'?100000000:10000000000,key);
  }
  for(const key of ['refundPct','cardPct'])c[key]=bw56Decimal_(raw[key],0,100,key);
  for(const [key,list] of Object.entries({payment:['upfront','weekly'],vatMode:['general','simplified'],vatIncluded:['yes','no']})){
    if(!list.includes(raw[key]))throw Error('수납·세금 계산 설정을 확인해 주세요.');c[key]=raw[key];
  }
  if(c.fixedVatCredit>c.fixedCash)throw Error('고정비 포함 공제 가능 VAT를 확인해 주세요.');
  if(!Array.isArray(raw.cohorts)||raw.cohorts.length>24)throw Error('반 편성은 최대 24줄입니다.');
  c.cohorts=raw.cohorts.map(r=>{
    if(!r||typeof r!=='object')throw Error('반 편성 입력 형식을 확인해 주세요.');
    const start=bw56Date_(r.start).toISOString().slice(0,10);
    if(start<c.startMonth+'-01'||start.slice(0,7)>bw56MonthAt_(c.startMonth,c.months-1))throw Error('반 시작일은 예측 기간 안에 입력해 주세요.');
    const capacity=bw56Int_(r.capacity,1,4,'반별 정원');
    return {start:start,capacity:capacity,seats:bw56Int_(r.seats,0,capacity,'유료 등록 인원'),groups:bw56Int_(r.groups,1,200,'동일 편성 반 수')};
  });
  if(c.cohorts.reduce((n,r)=>n+r.groups,0)>200)throw Error('전체 반 수는 최대 200개입니다.');
  if(!Array.isArray(raw.materials)||raw.materials.length>100)throw Error('재료 목록은 최대 100개입니다.');
  c.materials=raw.materials.map(r=>{
    if(!r||typeof r!=='object')throw Error('재료 입력 형식을 확인해 주세요.');
    const label=bw56Text_(r.label,110);if(!label)throw Error('재료명을 입력해 주세요.');
    return {label:label,unit:bw56Text_(r.unit,50),price:bw56Int_(r.price,0,1000000000,'재료 단가'),qty:bw56Decimal_(r.qty,0,10000,'아이당 사용량')};
  });
  const materialCost=c.materials.reduce((n,r)=>n+r.price*r.qty,0)+c.materialExtra+c.consumable;
  if(materialCost>100000000)throw Error('아이당 전체 재료 원가(최대 1억원)를 확인해 주세요.');
  const json=JSON.stringify(c);if(json.length>BW56.MAX_JSON)throw Error('운영계획이 너무 깁니다.');
  return c;
}
function bw56Saved_(sheet){
  if(!sheet||sheet.getLastRow()<2)return {revision:0,values:null,etag:'new',requestId:'',updatedAt:''};
  const row=sheet.getRange(sheet.getLastRow(),1,1,BW56.HEADERS.length).getValues()[0];
  const revision=bw56Int_(row[0],1,999999999,'개정번호');
  const values=bw56Validate_(JSON.parse(String(row[3])));
  return {revision:revision,values:values,etag:bw17Hash_(JSON.stringify(row)).slice(0,32),requestId:String(row[4]||''),updatedAt:String(row[1]||'')};
}
function bw56View_(saved){return {revision:saved.revision,values:saved.values,etag:saved.etag,updatedAt:saved.updatedAt};}
/** Combined source lookup: one authenticated request; source failures stay separate.
 * Does not fetch actual ledger, staff salary records, child or guardian data.
 */
function staff56PlanningRead(token){
  const user=bw56Owner_(token,false),book=bw17Book_(),saved=bw56Saved_(bw56Sheet_(book,false));
  const sources={pricing:null,finance:null,materials:[]},status={pricing:'unavailable',finance:'unavailable',materials:'unavailable'};
  try{
    if(bw24Can_(user,'courseSettings','read')){
      const published=bw55Published_();
      if(published){sources.pricing=bw55PriceValues_(published);status.pricing='ready';}
      else status.pricing='notPublished';
    }
  }catch(_){status.pricing='error';}
  try{
    const spec={name:BW49.SETTINGS,headers:BW49.SETTINGS_HEADERS};
    const state=bw55TabState_(book,spec);
    if(state==='mismatch')throw Error('schema');
    const financial=bw49Settings_(book.getSheetByName(BW49.SETTINGS));
    if(financial.values){sources.finance=bw49SettingsInput_({values:financial.values});status.finance='ready';}
    else status.finance='empty';
  }catch(_){status.finance='error';}
  try{
    if(bw24Can_(user,'themes','read')){
      const sheet=bw51Sheet_('materials',false),rows=bw51Rows_(sheet);
      sources.materials=rows.filter(row=>String(row[7])==='사용').map(bw51Item_)
        .filter(item=>Number.isSafeInteger(item.amount)&&item.amount>=0&&item.amount<=1000000000)
        .map(item=>({id:item.id,label:String(item.title||'').slice(0,110),unit:String(item.unit||'').slice(0,50),price:item.amount}));
      status.materials='ready';
    }
  }catch(_){status.materials='error';}
  return {version:BW56.VERSION,plan:bw56View_(saved),sources:sources,status:status};
}
function staff56PlanningSave(token,p){
  const user=bw56Owner_(token,true),values=bw56Validate_(p&&p.values);
  const requestId=String(p&&p.requestId||''),etag=String(p&&p.etag||'');
  if(!/^[a-f0-9-]{36}$/i.test(requestId)||!(/^(new|[a-f0-9]{32})$/.test(etag)))throw Error('최신 계획 조회 후 저장해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const book=bw17Book_(),sheet=bw56Sheet_(book,false),saved=bw56Saved_(sheet);
    if(saved.requestId===requestId){
      if(JSON.stringify(saved.values)!==JSON.stringify(values))throw Error('같은 저장 요청에 다른 계획이 입력되었습니다.');
      return {ok:true,duplicate:true,plan:bw56View_(saved),version:BW56.VERSION};
    }
    if(saved.etag!==etag)throw Error('다른 화면에서 변경되었습니다. 최신 계획을 다시 조회해 주세요.');
    const target=sheet||bw56Sheet_(book,true);
    const rev=saved.revision+1;
    if(rev>=1000000000)throw Error('개정번호 한도를 확인해 주세요.');
    target.appendRow([rev,bw17Now_(),user.email,JSON.stringify(values),requestId]);
    const committed=bw56Saved_(target);
    let auditWarning=false;
    try{bw17Audit_(user,'운영 손익 계획 저장','BW56 계획','성공','v'+rev);}
    catch(_){auditWarning=true;}
    return {ok:true,plan:bw56View_(committed),version:BW56.VERSION,auditWarning:auditWarning};
  }finally{lock.releaseLock();}
}
