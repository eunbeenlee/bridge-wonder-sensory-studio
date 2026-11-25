/**
 * Bridge Wonder V55 — private integration preflight + approved public pricing.
 * Existing Staff project only. No credentials, child data or ledger mutations.
 * Public response is a validated numeric snapshot, never a private sheet row.
 */
const BW55 = Object.freeze({
  VERSION:'55.0.0',
  PRICE_TAB:'BW55_정규과정요금',
  PRICE_HEADERS:['관리코드','과정 주수','정규 과정 총액(원)','개정번호','수정시각','수정자','요청키'],
  PRICE_CODE:'REGULAR',
  PUBLISHED_KEY:'BW55_PUBLIC_PRICE_SNAPSHOT',
  DEFAULT_PRICE:Object.freeze({weeks:10,total:320000})
});
function bw55Owner_(token,module,write){
  return bw24Authorized_(token,module,write?'write':'read',['owner']);
}
function bw55Specs_(){
  // Existing base tabs must not be recreated: they may belong to a shared
  // registration workbook. Only new operational stores are additive.
  const result=[
    {group:'core',name:BW17.USERS,headers:BW17.USER_HEADERS,create:false,required:true},
    {group:'core',name:BW17.INQUIRIES,create:false,required:true},
    {group:'core',name:BW17.REGISTRATIONS,create:false,required:true},
    {group:'core',name:BW17.CLASSES,headers:BW17.CLASS_HEADERS,create:false,required:true},
    {group:'core',name:BW17.TEMPLATES,create:false,required:true},
    {group:'academic',name:BW37.STUDENTS,headers:BW37.STUDENT_HEADERS,create:true},
    {group:'academic',name:BW37.EXPERIENCES,headers:BW37.EXPERIENCE_HEADERS,create:true},
    {group:'lesson',name:BW45.PLANS,headers:BW45.PLAN_HEADERS,create:true},
    {group:'lesson',name:BW45.UPLOADS,headers:BW45.UPLOAD_HEADERS,create:true},
    {group:'finance',name:BW49.SETTINGS,headers:BW49.SETTINGS_HEADERS,create:true},
    {group:'finance',name:BW49.ENTRIES,headers:BW49.ENTRY_HEADERS,create:true},
    {group:'payroll',name:BWP26_.EMP,headers:BWP26_.HEADERS,create:false},
    {group:'payroll',name:BWP26_.RUN,headers:BWP26_.HEADERS,create:false},
    {group:'payroll',name:BWP26_.SETTINGS,headers:BWP26_.HEADERS,create:false},
    {group:'payroll',name:BWP26_.AUDIT,headers:BWP26_.AUDIT_HEADERS,create:false},
    {group:'pricing',name:BW55.PRICE_TAB,headers:BW55.PRICE_HEADERS,create:true}
  ];
  Object.keys(BW51.SECTIONS).forEach(k=>result.push({
    group:'content',name:BW51.SECTIONS[k].tab,headers:BW51.HEADERS,create:true
  }));
  if(typeof bw56Spec_==='function')result.push(bw56Spec_());
  if(typeof bw59Spec_==='function')result.push(bw59Spec_());
  return result;
}
function bw55TabState_(book,spec){
  const tab=book.getSheetByName(spec.name);
  if(!tab)return 'missing';
  if(!spec.headers)return 'present'; // base schemas owned by existing modules
  const cells=tab.getRange(1,1,1,spec.headers.length).getDisplayValues()[0];
  return spec.headers.every((h,i)=>cells[i]===h)?'ready':'mismatch';
}
function bw55Inspect_(book){
  return bw55Specs_().map(spec=>({
    group:spec.group,name:spec.name,required:spec.required===true,
    canInitialize:spec.create===true,state:bw55TabState_(book,spec)
  }));
}
/** One explicit, authorized diagnostic request; no customer rows, IDs, properties, or account details. */
function staff55SystemStatus(token){
  bw55Owner_(token,'security',false);
  const tabs=bw55Inspect_(bw17Book_());
  const ready=tabs.every(t=>t.state==='ready'||t.state==='present');
  return {version:BW55.VERSION,ready:ready,tabs:tabs,checkedAt:bw17Now_()};
}
function bw55CreateTab_(book,spec){
  const tab=book.insertSheet(spec.name);
  const head=tab.getRange(1,1,1,spec.headers.length);
  head.setValues([spec.headers]);
  tab.setFrozenRows(1);
  head.setBackground('#205646').setFontColor('#ffffff').setFontWeight('bold');
  return tab;
}
/** Run once from the existing Staff Apps Script editor, as the configured owner.
 * Safe to re-run: no existing cells, settings, triggers, credentials or sharing changed.
 * Payroll is deliberately left to its established setup function if tabs are missing.
 */
function setupBridgeWonderV55(){
  bw24RequireEditorOwner_();
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const book=bw17Book_(), specs=bw55Specs_(), initial=bw55Inspect_(book);
    const incompatible=initial.filter(t=>t.state==='mismatch'||(t.required&&t.state==='missing'));
    if(incompatible.length)throw Error('기존 대장 확인이 필요합니다. 기존 데이터는 변경하지 않았습니다: '+incompatible.map(t=>t.name).join(', '));
    const created=[];
    for(let i=0;i<specs.length;i++){
      if(initial[i].state!=='missing'||!specs[i].create)continue;
      bw55CreateTab_(book,specs[i]);created.push(specs[i].name);
    }
    return {ok:true,version:BW55.VERSION,created:created,
      payrollSetupNeeded:initial.some(t=>t.group==='payroll'&&t.state==='missing')};
  }finally{lock.releaseLock();}
}
function bw55Int_(v,min,max,label){
  if(typeof v!=='number' && (typeof v!=='string'||!(/^\d+$/.test(v.trim()))))throw Error(label+'을(를) 정수로 입력해 주세요.');
  const n=Number(v);
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' 범위를 확인해 주세요.');
  return n;
}
function bw55PriceValues_(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('요금 입력 형식을 확인해 주세요.');
  return {weeks:bw55Int_(raw.weeks,1,52,'정규 과정 주수'),total:bw55Int_(raw.total,1,100000000,'정규 과정 총액')};
}
function bw55PriceSheet_(book,create){
  const spec={name:BW55.PRICE_TAB,headers:BW55.PRICE_HEADERS};
  const status=bw55TabState_(book,spec);
  if(status==='mismatch')throw Error('요금 대장 열 이름이 변경되었습니다. 기존 데이터는 수정하지 않습니다.');
  if(status==='missing')return create?bw55CreateTab_(book,spec):null;
  return book.getSheetByName(spec.name);
}
function bw55PriceDraft_(sheet){
  if(!sheet||sheet.getLastRow()<2)return {saved:false,values:{...BW55.DEFAULT_PRICE},revision:0,etag:'new',lastRequestId:''};
  if(sheet.getLastRow()!==2)throw Error('요금 대장은 한 개의 REGULAR 초안 행만 사용합니다. 행 구성을 확인해 주세요.');
  const row=sheet.getRange(2,1,1,BW55.PRICE_HEADERS.length).getValues()[0];
  if(String(row[0])!==BW55.PRICE_CODE)throw Error('요금 대장 관리코드를 확인해 주세요.');
  const values=bw55PriceValues_({weeks:row[1],total:row[2]});
  const revision=bw55Int_(row[3],1,999999999,'개정번호');
  return {saved:true,values:values,revision:revision,
    etag:bw17Hash_(JSON.stringify(row)).slice(0,32),lastRequestId:String(row[6]||'')};
}
function bw55Published_(){
  const raw=PropertiesService.getScriptProperties().getProperty(BW55.PUBLISHED_KEY);
  if(!raw)return null;
  const data=JSON.parse(raw);
  const values=bw55PriceValues_(data);
  // Read only these two allowed fields. Do not return the original JSON.
  return {weeks:values.weeks,total:values.total};
}
function bw55PriceState_(draft){
  const published=bw55Published_();
  return {draft:{saved:draft.saved,values:draft.values,revision:draft.revision,etag:draft.etag},
    published:published,pending:!published||published.weeks!==draft.values.weeks||published.total!==draft.values.total,
    version:BW55.VERSION};
}
function staff55ReadPricing(token){
  bw55Owner_(token,'courseSettings',false);
  return bw55PriceState_(bw55PriceDraft_(bw55PriceSheet_(bw17Book_(),false)));
}
function staff55SavePricing(token,payload){
  const user=bw55Owner_(token,'courseSettings',true);
  const values=bw55PriceValues_(payload&&payload.values);
  const req=String(payload&&payload.requestId||''),etag=String(payload&&payload.etag||'');
  if(!/^[a-f0-9-]{36}$/i.test(req)||!(/^(new|[a-f0-9]{32})$/.test(etag)))throw Error('요금 조회 및 저장 요청을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const book=bw17Book_(),sheet=bw55PriceSheet_(book,true),draft=bw55PriceDraft_(sheet);
    if(draft.lastRequestId===req){
      if(draft.values.weeks!==values.weeks||draft.values.total!==values.total)throw Error('동일 저장 요청에 다른 요금이 입력되었습니다.');
      return {...bw55PriceState_(draft),ok:true,duplicate:true};
    }
    if(draft.etag!==etag)throw Error('다른 화면 또는 스프레드시트에서 수정되었습니다. 최신 초안을 다시 불러오세요.');
    // Single row draft; public snapshot never changes here.
    const row=[BW55.PRICE_CODE,values.weeks,values.total,draft.revision+1,bw17Now_(),user.email,req];
    sheet.getRange(2,1,1,BW55.PRICE_HEADERS.length).setValues([row]);
    const committed=bw55PriceDraft_(sheet);
    let auditWarning=false;
    try{bw17Audit_(user,'정규 과정 요금 초안 저장','BW55 가격','성공','v'+committed.revision);}
    catch(_){auditWarning=true;}
    return {...bw55PriceState_(committed),ok:true,auditWarning:auditWarning};
  }finally{lock.releaseLock();}
}
function staff55PublishPricing(token,payload){
  const user=bw55Owner_(token,'courseSettings',true);
  if(!payload||payload.confirm!==true||!/^[a-f0-9]{32}$/.test(String(payload.etag||'')))throw Error('공개 승인과 최신 초안을 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const draft=bw55PriceDraft_(bw55PriceSheet_(bw17Book_(),false));
    if(!draft.saved||draft.etag!==payload.etag)throw Error('최신 저장 초안과 일치하지 않습니다. 먼저 다시 조회하고 확인해 주세요.');
    // Store the explicit, validated public snapshot separately from editable Sheets.
    // A later direct Sheet edit never silently publishes a new price.
    PropertiesService.getScriptProperties().setProperty(BW55.PUBLISHED_KEY,JSON.stringify(draft.values));
    let auditWarning=false;
    try{bw17Audit_(user,'정규 과정 요금 공개 승인','BW55 가격','성공','v'+draft.revision);}
    catch(_){auditWarning=true;}
    return {...bw55PriceState_(draft),ok:true,auditWarning:auditWarning};
  }finally{lock.releaseLock();}
}
/** Anonymous fixed JSONP response; no arbitrary callback name, no private data. */
function bw55PublicPricingScript_(){
  let value={ok:false};
  try{
    const price=bw55Published_();
    if(price)value={ok:true,price:price};
  }catch(_){/* Keep static fallback when published snapshot is absent or invalid. */}
  return ContentService.createTextOutput('window.BWPublicPricing&&window.BWPublicPricing.receive('+JSON.stringify(value)+');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
