/**
 * Bridge Wonder V26 — owner-only payroll.
 * Add beside the existing staff Code.gs. Never add to the public registration project.
 * Setup: run setupBridgeWonderPayrollV26_ from the Apps Script editor as OWNER_EMAIL.
 * The only browser-callable entry point is payrollCommand. Helpers remain private (_).
 * Amounts are integer KRW. This module never transfers funds or sends messages.
 */
const BWP26_ = Object.freeze({
  VERSION: '26.0.0', SOURCE_VERSION: 'KR-2026-11-20-v1', MAX_ROWS: 20000,
  EMP: '급여V26_직원', RUN: '급여V26_월별', SETTINGS: '급여V26_설정', AUDIT: '급여V26_이력',
  HEADERS: ['고유키', '수정번호', '내용 JSON', '수정시각', '처리자'],
  AUDIT_HEADERS: ['기록번호', '시각', '처리자', '작업', '대상', '상세 JSON']
});
const BWP26_SOURCES_ = Object.freeze({
  pension: {label:'국민연금공단 · 연도별 보험료율',url:'https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0016M0.do'},
  pensionBase: {label:'국민연금공단 · 기준소득월액',url:'https://nps.or.kr/pnsinfo/ntpsklg/getOHAF0038M0.do?menuId=MN24001113&tab=tab5'},
  pension2024Cap: {label:'보건복지부 · 2024년 7월 연금 상하한 고시',url:'https://www.law.go.kr/admRulInfoP.do?admRulSeq=2100000235432'},
  pension2026Cap: {label:'보건복지부 · 2026년 7월 연금 상하한 고시',url:'https://www.law.go.kr/admRulInfoP.do?admRulSeq=2100000274228'},
  pensionRounding: {label:'국민연금공단 · 사업장 업무 안내',url:'https://pensioner.nps.or.kr/html/download/minwon/2024_nps_company.pdf'},
  health: {label:'국민건강보험공단 · 보험료율',url:'https://www.nhis.or.kr/english/wbheaa02500m01.do'},
  health2027: {label:'보건복지부 · 2027년 건강보험료율 발표',url:'https://mohw.go.kr/gallery.es?act=view&bid=0003&list_no=380402&mid=a10605040000&tag='},
  health2025Bounds: {label:'보건복지부 · 2025년 건강보험 상하한 고시',url:'https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000252124'},
  health2026Bounds: {label:'보건복지부 · 2026년 건강보험 상하한 고시',url:'https://www.law.go.kr/admRulInfoP.do?admRulSeq=2100000270472'},
  ltc2025_2026: {label:'장기요양보험법 시행령 · 2025·2026년 요율',url:'https://www.nhis.or.kr/lm/lmxsrv/print/lawChangeListPrintView.do?SEQ=31&SEQ_HISTORY=594036'},
  ltc2027: {label:'보건복지부 · 2027년 장기요양보험료율 발표',url:'https://www.mohw.go.kr/gallery.es?act=view&bid=0003&list_no=380579&mid=a10606030000'},
  ltcFormula: {label:'장기요양보험법 제9조·부칙 · 2026년 11월 계산 변경',url:'https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=30'},
  employment: {label:'고용노동부 · 고용보험료율',url:'https://www.moel.go.kr/info/astmgmt/employ/employList.do'},
  minimumWage: {label:'최저임금위원회 · 연도별 최저임금',url:'https://www.minimumwage.go.kr/minWage/policy/decisionMain.do'},
  minimum2027: {label:'고용노동부 2026-60호 · 2027년 최저임금 고시',url:'https://law.go.kr/LSW/flDownload.do?flSeq=167847381'},
  incomeTax: {label:'국세청 · 근로소득 간이세액표 안내',url:'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7862&mi=6583'},
  incomeTax2026: {label:'소득세법 시행령 별표2 · 2026년 3월부터 적용',url:'https://law.go.kr/flDownload.do?bylClsCd=110201&flSeq=163623339&gubun='},
  workersComp: {label:'고용노동부 · 산재보험(사업주 부담)',url:'https://www.moel.go.kr/info/astmgmt/employ/sanjaeList.do'}
});
const BWP26_YEARS_ = Object.freeze({
  2025: {pensionEmployee:0.045,healthTotal:0.0709,employmentEmployee:0.009,minimumWage:10030,healthMin:9890,healthMax:4504170,ltcNumerator:9182,ltcDenominator:70900,status:'고시·법령 확인'},
  2026: {pensionEmployee:0.0475,healthTotal:0.0719,employmentEmployee:0.009,minimumWage:10320,healthMin:10080,healthMax:4591740,ltcNumerator:9448,ltcDenominator:71900,status:'고시·법령 확인'},
  2027: {pensionEmployee:0.05,healthTotal:0.0719,employmentEmployee:0.009,minimumWage:10700,healthMin:null,healthMax:null,ltcNumerator:1390,ltcDenominator:10000,status:'정부 발표·시행 예정; 건강보험 상하한 미확인'}
});
const BWP26_CAPS_ = Object.freeze([
  {from:'2024-07',to:'2025-06',min:390000,max:6170000,source:'pension2024Cap'},
  {from:'2025-07',to:'2026-06',min:400000,max:6370000,source:'pensionBase'},
  {from:'2026-07',to:'2027-06',min:410000,max:6590000,source:'pension2026Cap'}
]);

function payrollCommand(token, action, payload) {
  const user = bw17Authorized_(token, ['owner']);
  if (!user || user.role !== 'owner') throw Error('급여관리는 원장 계정에서만 이용할 수 있습니다.');
  const allowed = ['bootstrap','saveEmployee','saveSettings','approveYear','preview','saveDraft','finalize','markPaid','void','getPayslip','annualReport'];
  if (typeof action !== 'string' || !allowed.includes(action)) throw Error('지원하지 않는 급여 작업입니다.');
  const p = bwp26Object_(payload == null ? {} : payload, '요청');
  // Lock covers lookup, revision comparison and write. No mutation is decided before locking.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw Error('다른 급여 작업을 저장 중입니다. 잠시 후 다시 시도해 주세요.');
  try {
    const book = bw17Book_();
    const ready = bwp26Ready_(book);
    if (!ready) {
      if (action === 'bootstrap') return {ok:true,version:BWP26_.VERSION,setupRequired:true,settings:bwp26DefaultSettings_(),employees:[],runs:[],annualSummary:{},rate:bwp26Rate_(bwp26Month_(p.month)),pensionRange:bwp26Cap_(p.month),healthBounds:bwp26HealthBounds_(p.month),sources:BWP26_SOURCES_};
      throw Error('급여 저장소 설정이 필요합니다. 원장 계정으로 설치 안내의 초기 설정을 실행해 주세요.');
    }
    const db = bwp26ReadDb_(book, action, p);
    if (action === 'bootstrap') return bwp26Bootstrap_(db, p);
    if (action === 'saveEmployee') return bwp26SaveEmployee_(book, db, user, p);
    if (action === 'saveSettings') return bwp26SaveSettings_(book, db, user, p);
    if (action === 'approveYear') return bwp26ApproveYear_(book, db, user, p);
    if (action === 'annualReport') return bwp26AnnualReport_(db, p);
    if (action === 'preview' || action === 'saveDraft') return bwp26Draft_(book, db, user, p, action === 'saveDraft');
    return bwp26RunAction_(book, db, user, action, p);
  } finally { lock.releaseLock(); }
}

function setupBridgeWonderPayrollV26_() {
  const owner = bw17Config_().owner;
  const active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!active || active !== owner) throw Error('원장 계정의 Apps Script 편집기에서만 초기 설정을 실행할 수 있습니다.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const book = bw17Book_();
    [BWP26_.EMP,BWP26_.RUN,BWP26_.SETTINGS,BWP26_.AUDIT].forEach(name => {
      const headers = name === BWP26_.AUDIT ? BWP26_.AUDIT_HEADERS : BWP26_.HEADERS;
      let sheet = book.getSheetByName(name);
      if (!sheet) {
        sheet = book.insertSheet(name);
        sheet.getRange(1,1,1,headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        sheet.getRange(1,1,1,headers.length).setBackground('#40543a').setFontColor('#ffffff').setFontWeight('bold');
        sheet.getRange('A:A').setNumberFormat('@');
        sheet.getRange('C:C').setNumberFormat('@');
      }
      bwp26CheckHeaders_(sheet, headers);
    });
    bwp26Audit_(book, {email:owner}, 'setup', 'payroll', {version:BWP26_.VERSION});
    return {ok:true,version:BWP26_.VERSION};
  } finally { lock.releaseLock(); }
}

function bwp26Object_(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(label + ' 형식이 올바르지 않습니다.');
  return value;
}
function bwp26Text_(value, max, required) {
  const s = String(value == null ? '' : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
  if (s.length > max || (required && !s)) throw Error('입력 내용의 길이를 확인해 주세요.');
  return s;
}
function bwp26Number_(value, label, options) {
  const o = options || {};
  if (value === null || value === undefined || value === '') {
    if (o.nullable) return null;
    if (o.defaultValue !== undefined) return o.defaultValue;
    throw Error(label + '을(를) 입력해 주세요.');
  }
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim()))) throw Error(label + '은(는) 올바른 숫자로 입력해 주세요.');
  const n = Number(value);
  const scale = o.decimals === 2 ? 100 : 1;
  if (!Number.isFinite(n) || n < (o.min == null ? 0 : o.min) || n > (o.max == null ? 1000000000 : o.max) || Math.abs(n * scale - Math.round(n * scale)) > 0.000001) throw Error(label + '의 범위 또는 소수 자릿수를 확인해 주세요.');
  return n;
}
function bwp26Bool_(value, label) {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean') throw Error(label + '은(는) 선택 항목으로 입력해 주세요.');
  return value;
}
function bwp26Month_(value) {
  const s = String(value || '');
  if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(s)) throw Error('귀속 연월을 YYYY-MM 형식으로 입력해 주세요.');
  return s;
}
function bwp26Date_(value, label, optional) {
  const s = String(value || '');
  if (!s && optional) return '';
  if (!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)) throw Error(label + '을(를) YYYY-MM-DD 형식으로 입력해 주세요.');
  const parts = s.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1]-1, parts[2]));
  if (d.getUTCFullYear() !== parts[0] || d.getUTCMonth() !== parts[1]-1 || d.getUTCDate() !== parts[2]) throw Error(label + '이(가) 실제 달력에 없는 날짜입니다.');
  return s;
}
function bwp26Id_(value) {
  const s = String(value || '');
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(s)) throw Error('직원 식별자를 확인해 주세요.');
  return s;
}
function bwp26Now_() { return new Date().toISOString(); }
function bwp26Clone_(value) { return JSON.parse(JSON.stringify(value)); }
function bwp26Json_(value) {
  const text = JSON.stringify(value);
  if (text.length > 45000) throw Error('저장 내용이 너무 큽니다. 계산 설명을 줄여 주세요.');
  return text;
}
function bwp26CheckHeaders_(sheet, headers) {
  const got = sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if (JSON.stringify(got) !== JSON.stringify(headers)) throw Error(sheet.getName() + ' 시트의 열 구성이 변경되었습니다. 원본 열 이름을 복원해 주세요.');
}
function bwp26Ready_(book) { return [BWP26_.EMP,BWP26_.RUN,BWP26_.SETTINGS,BWP26_.AUDIT].every(n => !!book.getSheetByName(n)); }
function bwp26Read_(book, name, filterKey) {
  const sheet = book.getSheetByName(name);
  bwp26CheckHeaders_(sheet, BWP26_.HEADERS);
  const count = sheet.getLastRow() - 1;
  if (count > BWP26_.MAX_ROWS) throw Error(name + '의 처리 한도를 넘었습니다. 보관·분할 후 다시 시도해 주세요.');
  if (count <= 0) return [];
  // Read the compact key index once, then only the requested year/month's JSON records.
  // No tail truncation: old records and duplicate keys are checked across the whole sheet.
  const seen = Object.create(null), wanted=[];
  sheet.getRange(2,1,count,2).getValues().forEach((row,index)=>{
    const key=String(row[0]);
    if(seen[key])throw Error(name+'에 중복 고유키가 있습니다. 관리자 확인이 필요합니다.');
    seen[key]=true;
    if(!filterKey || filterKey(key))wanted.push(index);
  });
  const selected=[];
  for(let i=0;i<wanted.length;){
    const start=wanted[i];let length=1;
    while(i+length<wanted.length && wanted[i+length]===start+length)length++;
    sheet.getRange(start+2,1,length,5).getValues().forEach((row,offset)=>selected.push({values:row,index:start+offset}));
    i+=length;
  }
  return selected.map(entry => {
    const row=entry.values,index=entry.index;
    const key = String(row[0]);
    let record;
    try { record = JSON.parse(String(row[2])); } catch (_) { throw Error(name + '의 저장 데이터가 손상되었습니다.'); }
    if (!record || typeof record !== 'object' || Array.isArray(record) || record.revision !== Number(row[1])) throw Error(name + '의 수정번호를 확인해 주세요.');
    return {key:key,row:index+2,record:record};
  });
}
function bwp26ReadDb_(book, action, p) {
  const settingsRows = bwp26Read_(book, BWP26_.SETTINGS);
  let runFilter=()=>false;
  if(action==='bootstrap') {const year=bwp26Month_(p.month).slice(0,4);runFilter=key=>key.slice(0,4)===year;}
  else if(action==='annualReport') {const year=String(bwp26Number_(p.year,'조회 연도',{min:2000,max:2099}));runFilter=key=>key.slice(0,4)===year;}
  else if(['preview','saveDraft','finalize','markPaid','void','getPayslip'].includes(action)) {const key=bwp26Month_(p.month)+'|'+bwp26Id_(p.employeeId);runFilter=value=>value===key;}
  return {employees:bwp26Read_(book,BWP26_.EMP),runs:bwp26Read_(book,BWP26_.RUN,runFilter),settingsRows:settingsRows,settings:settingsRows.find(r=>r.key==='company')?.record || bwp26DefaultSettings_()};
}
function bwp26DefaultSettings_() { return {revision:0,businessName:'',businessNumber:'',representative:'',address:'',approvedYears:{}}; }
function bwp26Revision_(expected, current) {
  const revision = bwp26Number_(expected,'수정번호',{max:1000000});
  if (revision !== (current ? current.revision : 0)) throw Error('다른 창에서 변경된 내용이 있습니다. 새로고침한 뒤 다시 저장해 주세요.');
}
function bwp26Put_(book, name, key, record, oldRow, user) {
  const sheet = book.getSheetByName(name);
  if (!oldRow && sheet.getLastRow() > BWP26_.MAX_ROWS) throw Error('급여 저장 한도를 넘었습니다.');
  sheet.getRange(oldRow || sheet.getLastRow()+1,1,1,5).setValues([[key,record.revision,bwp26Json_(record),record.updatedAt,user.email]]);
}
function bwp26Audit_(book, user, action, key, details) {
  const sheet = book.getSheetByName(BWP26_.AUDIT);
  bwp26CheckHeaders_(sheet, BWP26_.AUDIT_HEADERS);
  if (sheet.getLastRow() > BWP26_.MAX_ROWS) throw Error('급여 이력 보관 한도를 넘었습니다. 이력을 보관한 뒤 다시 시도해 주세요.');
  const safeKey = /^[=+\-@]/.test(key) ? "'" + key : key;
  sheet.appendRow([Utilities.getUuid(),bwp26Now_(),user.email,action,safeKey,bwp26Json_(details)]);
}
function bwp26BeforeWrite_(book, user, action, key, before, after) {
  // An intent record precedes the single authoritative row write. A failed write can be safely retried by revision.
  bwp26Json_(after);
  bwp26Audit_(book,user,action,key,{phase:'intent',fromRevision:before?before.revision:0,toRevision:after.revision,before:before || null});
}

function bwp26Rate_(month) {
  const year = Number(bwp26Month_(month).slice(0,4));
  const source = BWP26_YEARS_[year];
  if (!source) return null;
  const r = bwp26Clone_(source);
  r.year = year;
  if (month >= '2026-11' && month <= '2026-12') {r.ltcNumerator = 1314;r.ltcDenominator = 10000;}
  r.ltcRatio = r.ltcNumerator/r.ltcDenominator;
  r.ltcDisplayRatio = Math.round(r.ltcRatio * 10000)/10000;
  r.effectiveFrom = year===2026 && month>='2026-11' ? '2026-11' : year+'-01';
  r.effectiveTo = year===2026 && month<'2026-11' ? '2026-10' : year+'-12';
  r.sourceVersion = BWP26_.SOURCE_VERSION;
  r.verifiedAsOf = '2026-11-20';
  r.sources = ['pension','pensionBase',year===2027?'health2027':'health',year===2027?'ltc2027':'ltc2025_2026','ltcFormula','employment','minimumWage',year===2027?'minimum2027':year===2026?'health2026Bounds':'health2025Bounds'].map(k=>BWP26_SOURCES_[k]);
  return r;
}
function bwp26Cap_(month) { const m=bwp26Month_(month); return bwp26Clone_(BWP26_CAPS_.find(r=>r.from<=m && m<=r.to) || null); }
function bwp26HealthBounds_(month) {
  const r = bwp26Rate_(month);
  return r && r.healthMin !== null ? {min:r.healthMin,max:r.healthMax,from:r.year+'-01',to:r.year+'-12',scope:'employee'} : null;
}
function bwp26Employee_(db,id) {
  const found = db.employees.find(r=>r.key===bwp26Id_(id));
  if (!found) throw Error('등록된 직원이 없습니다. 직원 설정을 먼저 확인해 주세요.');
  return found.record;
}
function bwp26Bootstrap_(db, p) {
  const month = bwp26Month_(p.month);
  const report = bwp26AnnualReport_(db,{year:Number(month.slice(0,4))});
  const rate = bwp26Rate_(month);
  if (rate) rate.approved = db.settings.approvedYears[String(rate.year)]?.sourceVersion === rate.sourceVersion;
  return {ok:true,version:BWP26_.VERSION,setupRequired:false,settings:db.settings,employees:db.employees.map(r=>r.record).sort((a,b)=>a.name.localeCompare(b.name)),runs:db.runs.filter(r=>r.record.month===month).map(r=>r.record),annualSummary:report.totals,rate:rate,pensionRange:bwp26Cap_(month),healthBounds:bwp26HealthBounds_(month),sources:BWP26_SOURCES_};
}
function bwp26SaveSettings_(book, db, user, p) {
  bwp26Revision_(p.revision,db.settings);
  const record = {revision:db.settings.revision+1,businessName:bwp26Text_(p.businessName,100,true),businessNumber:bwp26Text_(p.businessNumber,20,false),representative:bwp26Text_(p.representative,60,false),address:bwp26Text_(p.address,200,false),approvedYears:db.settings.approvedYears || {},updatedAt:bwp26Now_(),updatedBy:user.email};
  if (record.businessNumber && !/^\d{3}-?\d{2}-?\d{5}$/.test(record.businessNumber)) throw Error('사업자등록번호는 10자리 숫자로 입력해 주세요.');
  bwp26BeforeWrite_(book,user,'settings','company',db.settings,record);
  bwp26Put_(book,BWP26_.SETTINGS,'company',record,db.settingsRows.find(r=>r.key==='company')?.row,user);
  return {ok:true,settings:record};
}
function bwp26ApproveYear_(book, db, user, p) {
  const year = bwp26Number_(p.year,'연도',{min:2025,max:2099});
  if (!BWP26_YEARS_[year]) throw Error('공식 기준이 등록되지 않은 연도입니다. 정부 자료를 확인한 업데이트가 필요합니다.');
  if (p.confirmed !== true) throw Error('해당 연도의 공식 자료 확인에 동의해 주세요.');
  const record = bwp26Clone_(db.settings);
  record.revision += 1; record.updatedAt=bwp26Now_();record.updatedBy=user.email;
  record.approvedYears[String(year)]={sourceVersion:BWP26_.SOURCE_VERSION,at:record.updatedAt,by:user.email};
  bwp26BeforeWrite_(book,user,'approveYear',String(year),db.settings,record);
  bwp26Put_(book,BWP26_.SETTINGS,'company',record,db.settingsRows.find(r=>r.key==='company')?.row,user);
  return {ok:true,settings:record};
}
function bwp26SaveEmployee_(book, db, user, p) {
  const id = p.id ? bwp26Id_(p.id) : Utilities.getUuid();
  const found = db.employees.find(r=>r.key===id);
  bwp26Revision_(p.revision,found?.record);
  const email = String(p.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>180) throw Error('직원 이메일을 올바르게 입력해 주세요.');
  if (db.employees.some(r=>r.key!==id && r.record.email===email)) throw Error('같은 이메일의 직원이 이미 등록되어 있습니다.');
  const payType = String(p.payType || 'monthly');
  if (!['monthly','hourly','daily'].includes(payType)) throw Error('급여 유형을 선택해 주세요.');
  const coverage = bwp26Object_(p.coverage || {},'보험 가입 구분');
  const record = {id:id,email:email,name:bwp26Text_(p.name,60,true),department:bwp26Text_(p.department,60,false),position:bwp26Text_(p.position,60,false),employmentStart:bwp26Date_(p.employmentStart,'입사일',false),employmentEnd:bwp26Date_(p.employmentEnd,'퇴사일',true),payType:payType,basePay:bwp26Number_(p.basePay,'기본 월급',{defaultValue:0}),hourlyRate:bwp26Number_(p.hourlyRate,'시급',{defaultValue:0}),dailyRate:bwp26Number_(p.dailyRate,'일급',{defaultValue:0}),monthlyHours:bwp26Number_(p.monthlyHours,'월 유급시간',{decimals:2,max:744,defaultValue:209}),coverage:{pension:bwp26Bool_(coverage.pension,'국민연금'),health:bwp26Bool_(coverage.health,'건강보험'),employment:bwp26Bool_(coverage.employment,'고용보험')},coverageVerified:bwp26Bool_(p.coverageVerified,'가입 구분 확인'),revision:(found?.record.revision || 0)+1,updatedAt:bwp26Now_(),updatedBy:user.email};
  if (record.employmentEnd && record.employmentEnd<record.employmentStart) throw Error('퇴사일은 입사일보다 빠를 수 없습니다.');
  const basis = payType==='monthly'?record.basePay:payType==='hourly'?record.hourlyRate:record.dailyRate;
  if (basis<=0) throw Error('선택한 급여 유형의 기준 금액을 입력해 주세요.');
  bwp26BeforeWrite_(book,user,'employee',id,found?.record,record);
  bwp26Put_(book,BWP26_.EMP,id,record,found?.row,user);
  return {ok:true,employee:record};
}

function bwp26Inputs_(value) {
  const p = bwp26Object_(value,'급여 입력');
  const rawItems = p.items == null ? [] : p.items;
  const rawDeductions = p.deductionItems == null ? [] : p.deductionItems;
  if (!Array.isArray(rawItems) || rawItems.length>30 || !Array.isArray(rawDeductions) || rawDeductions.length>30) throw Error('지급·공제 항목은 각각 30개까지 입력할 수 있습니다.');
  const items = rawItems.map((raw,index) => {
    const item = bwp26Object_(raw,'지급 항목');
    const kind = item.kind || 'custom';
    if (!['meal','transport','custom','overtime','night','holiday','bonus','weekly'].includes(kind)) throw Error('지원하지 않는 지급 항목입니다.');
    const row = {label:bwp26Text_(item.label,60,true),amount:bwp26Number_(item.amount,'지급 금액'),taxFreeAmount:bwp26Number_(item.taxFreeAmount,'비과세 금액',{defaultValue:0}),calculation:bwp26Text_(item.calculation,180,false),kind:kind,hours:bwp26Number_(item.hours,'계산 시간',{nullable:true,decimals:2,max:744}),rate:bwp26Number_(item.rate,'계산 단가',{nullable:true}),multiplier:bwp26Number_(item.multiplier,'계산 배수',{nullable:true,decimals:2,max:5})};
    if (row.taxFreeAmount>row.amount) throw Error('비과세 금액은 해당 지급액을 넘을 수 없습니다.');
    if (['meal','transport'].includes(kind) && row.taxFreeAmount>200000) throw Error('식대·자가운전보조금의 월 비과세액은 각각 20만 원 이내로 입력해 주세요.');
    if (row.taxFreeAmount && !row.calculation) throw Error('비과세 항목의 적용 근거를 계산 설명에 입력해 주세요.');
    const hasCalculationNumbers = row.hours !== null || row.rate !== null || row.multiplier !== null;
    if (hasCalculationNumbers && [row.hours,row.rate,row.multiplier].some(v=>v===null)) throw Error('시간 계산 항목에는 시간·단가·배수를 모두 입력해 주세요.');
    if (hasCalculationNumbers && Math.floor(row.hours*row.rate*row.multiplier+0.000001)!==row.amount) throw Error('지급 항목의 시간 × 단가 × 배수와 금액이 일치하지 않습니다.');
    return row;
  });
  ['meal','transport'].forEach(kind=>{if(items.filter(i=>i.kind===kind).reduce((a,i)=>a+i.taxFreeAmount,0)>200000)throw Error('같은 비과세 항목을 나누어 입력해도 월 한도를 넘을 수 없습니다.');});
  const deductionItems = rawDeductions.map(raw => {
    const item = bwp26Object_(raw,'공제 항목');
    return {label:bwp26Text_(item.label,60,true),amount:bwp26Number_(item.amount,'공제 금액'),calculation:bwp26Text_(item.calculation,180,true)};
  });
  const actual = bwp26Object_(p.actualInsurance || {},'고지 보험료');
  const review = bwp26Object_(p.review || {},'검토 확인');
  const out = {basePay:bwp26Number_(p.basePay,'기본급',{nullable:true}),baseCalculation:bwp26Text_(p.baseCalculation,180,false),paidHours:bwp26Number_(p.paidHours,'유급 시간',{decimals:2,max:744,defaultValue:0}),paidDays:bwp26Number_(p.paidDays,'유급 일수',{decimals:2,max:31,defaultValue:0}),ordinaryHourly:bwp26Number_(p.ordinaryHourly,'통상 시급',{nullable:true}),minimumWageBasis:bwp26Number_(p.minimumWageBasis,'최저임금 산입 급여',{nullable:true}),items:items,deductionItems:deductionItems,pensionBase:bwp26Number_(p.pensionBase,'연금 기준소득월액',{nullable:true}),healthBase:bwp26Number_(p.healthBase,'건강보험 보수월액',{nullable:true}),employmentBase:bwp26Number_(p.employmentBase,'고용보험 보수',{nullable:true}),actualInsurance:{pension:bwp26Number_(actual.pension,'국민연금 고지액',{nullable:true}),health:bwp26Number_(actual.health,'건강보험 고지액',{nullable:true}),ltc:bwp26Number_(actual.ltc,'장기요양 고지액',{nullable:true}),employment:bwp26Number_(actual.employment,'고용보험 고지액',{nullable:true})},insuranceReference:bwp26Text_(p.insuranceReference,180,false),incomeTax:bwp26Number_(p.incomeTax,'근로소득세',{nullable:true}),localTax:bwp26Number_(p.localTax,'지방소득세',{nullable:true}),taxReference:bwp26Text_(p.taxReference,200,false),taxPercent:bwp26Number_(p.taxPercent,'원천징수 비율',{defaultValue:100,max:120}),familyCount:bwp26Number_(p.familyCount,'공제대상 가족 수',{defaultValue:1,min:1,max:99}),childCount:bwp26Number_(p.childCount,'공제대상 자녀 수',{defaultValue:0,max:98}),review:{tax:bwp26Bool_(review.tax,'세액 검토'),insurance:bwp26Bool_(review.insurance,'보험료 검토'),taxFree:bwp26Bool_(review.taxFree,'비과세 검토'),hours:bwp26Bool_(review.hours,'근로시간 검토')}};
  if (![80,100,120].includes(out.taxPercent)) throw Error('원천징수 비율은 80·100·120% 중에서 선택해 주세요.');
  if (out.childCount>=out.familyCount) throw Error('자녀 수는 본인을 포함한 공제대상 가족 수보다 작아야 합니다.');
  return out;
}
function bwp26Floor10_(value) { return Math.floor((value+0.0000001)/10)*10; }
function bwp26Calculate_(employee, settings, month, inputs) {
  const rate = bwp26Rate_(month), pensionRange=bwp26Cap_(month), healthBounds=bwp26HealthBounds_(month);
  const warnings=[], blocking=[];
  const addBlock=(text)=>{if(!blocking.includes(text))blocking.push(text);};
  let expectedBase = employee.basePay, baseCalculation='월 기본급 '+employee.basePay+'원';
  if (employee.payType==='hourly') {expectedBase=Math.ceil(employee.hourlyRate*inputs.paidHours-0.000001);baseCalculation=inputs.paidHours+'시간 × '+employee.hourlyRate+'원 (원 미만 올림)';if(inputs.paidHours<=0)addBlock('시급제의 유급 시간을 입력해 주세요.');}
  if (employee.payType==='daily') {expectedBase=Math.ceil(employee.dailyRate*inputs.paidDays-0.000001);baseCalculation=inputs.paidDays+'일 × '+employee.dailyRate+'원 (원 미만 올림)';if(inputs.paidDays<=0||inputs.paidHours<=0)addBlock('일급제의 유급 일수와 전체 유급 시간을 입력해 주세요.');}
  const basePay = inputs.basePay === null ? expectedBase : inputs.basePay;
  if (basePay !== expectedBase && !inputs.baseCalculation) addBlock('변경한 기본급의 계산 방법을 입력해 주세요.');
  if (inputs.baseCalculation) baseCalculation=inputs.baseCalculation;
  const payItems=[{label:'기본급',amount:basePay,taxFreeAmount:0,calculation:baseCalculation,kind:'base'}].concat(inputs.items.map(item=>{
    const row=bwp26Clone_(item);
    if(row.hours!==null)row.calculation=row.hours+'시간 × '+row.rate+'원 × '+row.multiplier+(row.calculation?' · '+row.calculation:'');
    return row;
  }));
  payItems.forEach(item=>{if(item.amount>0 && !item.calculation)addBlock(item.label+'의 계산 방법을 입력해 주세요.');});
  const gross=payItems.reduce((s,i)=>s+i.amount,0),taxFree=payItems.reduce((s,i)=>s+i.taxFreeAmount,0),taxable=gross-taxFree;
  if (gross>1000000000) throw Error('지급 총액은 10억 원 이내로 입력해 주세요.');
  const insuranceBases={pension:inputs.pensionBase,health:inputs.healthBase,employment:inputs.employmentBase};
  const coverage=employee.coverage, estimate={pension:0,health:0,ltc:0,employment:0},insurance={pension:0,health:0,ltc:0,employment:0};
  if (!rate) addBlock('해당 연도의 정부 기준이 등록되지 않았습니다. 공식 자료가 반영된 업데이트가 필요합니다.');
  if (rate && !settings.approvedYears[String(rate.year)]) addBlock('정부 요율 화면에서 해당 연도의 공식 기준을 확인해 주세요.');
  if (rate && settings.approvedYears[String(rate.year)] && settings.approvedYears[String(rate.year)].sourceVersion!==rate.sourceVersion) addBlock('공식 기준이 갱신되었습니다. 해당 연도를 다시 확인해 주세요.');
  if (!employee.coverageVerified) addBlock('직원 설정에서 보험 가입·제외 구분을 확인해 주세요.');
  if (!settings.businessName) addBlock('명세서에 표시할 사업장명을 설정해 주세요.');
  if (coverage.pension) {
    if (inputs.pensionBase === null) addBlock('국민연금에 신고한 기준소득월액을 입력해 주세요.');
    if (!pensionRange && inputs.actualInsurance.pension===null) addBlock('이 기간의 국민연금 상하한이 확인되지 않았습니다. 공단 고지액을 입력해 주세요.');
    if (rate && inputs.pensionBase !== null && pensionRange) {
      insuranceBases.pension=Math.max(pensionRange.min,Math.min(pensionRange.max,Math.floor(inputs.pensionBase/1000)*1000));
      estimate.pension=bwp26Floor10_(insuranceBases.pension*rate.pensionEmployee);
    } else estimate.pension=null;
  }
  if (coverage.health) {
    if (inputs.healthBase===null) addBlock('건강보험에 신고한 보수월액을 입력해 주세요.');
    if (rate && inputs.healthBase!==null) {
      estimate.health=bwp26Floor10_(inputs.healthBase*rate.healthTotal/2);
      if(healthBounds)estimate.health=Math.max(healthBounds.min,Math.min(healthBounds.max,estimate.health));
      estimate.ltc=bwp26Floor10_(estimate.health*rate.ltcNumerator/rate.ltcDenominator);
    } else {estimate.health=null;estimate.ltc=null;}
    if (!healthBounds && (inputs.actualInsurance.health===null || inputs.actualInsurance.ltc===null)) addBlock('이 연도의 건강보험 상하한이 확인되지 않았습니다. 건강·장기요양 공단 고지액을 모두 입력해 주세요.');
  }
  if (coverage.employment) {
    if (inputs.employmentBase===null) addBlock('고용보험에 신고한 보수를 입력해 주세요.');
    estimate.employment=rate && inputs.employmentBase!==null ? bwp26Floor10_(inputs.employmentBase*rate.employmentEmployee) : null;
    warnings.push('고용보험 계산액은 예상 공제액입니다. 공단 고지 및 개인별 조정 내역과 대조해 주세요.');
  }
  Object.keys(insurance).forEach(key=>{
    const active=key==='ltc'?coverage.health:coverage[key];
    const actual=inputs.actualInsurance[key];
    if (!active && actual!==null && actual!==0) throw Error('미가입 항목에는 보험료를 입력할 수 없습니다. 직원 설정을 먼저 확인해 주세요.');
    insurance[key]=active?(actual===null?estimate[key]:actual):0;
    if (active && insurance[key]===null) addBlock('보험료를 계산할 수 없습니다. 공단 고지액을 입력해 주세요.');
    if (active && actual!==null && !inputs.insuranceReference) addBlock('공단 고지액의 확인 자료·조정 사유를 입력해 주세요.');
  });
  if (coverage.health && inputs.actualInsurance.health!==null && inputs.actualInsurance.ltc===null) addBlock('건강보험 고지액을 입력한 경우 장기요양 고지액도 함께 입력해 주세요.');
  if (inputs.incomeTax===null || inputs.localTax===null) addBlock('확인된 근로소득세와 지방소득세를 입력해 주세요. 세액이 없으면 0을 입력합니다.');
  if (!inputs.taxReference) addBlock('적용한 간이세액표·급여대행 확인 자료를 입력해 주세요.');
  if (inputs.incomeTax!==null && inputs.localTax!==null && inputs.localTax!==bwp26Floor10_(inputs.incomeTax*0.1)) warnings.push('지방소득세가 소득세의 10%를 10원 미만 절사한 값과 다릅니다. 조정 근거를 확인해 주세요.');
  ['tax','insurance','taxFree','hours'].forEach(key=>{if(!inputs.review[key])addBlock({tax:'소득세·지방소득세 검토',insurance:'공단 보험료 대조',taxFree:'비과세 요건 확인',hours:'근로시간·최저임금 확인'}[key]+'을 완료해 주세요.');});
  let minimumWageHourly=null;
  if (employee.payType==='monthly') {
    if (employee.monthlyHours<=0) addBlock('월급제의 월 유급 시간을 직원 설정에 입력해 주세요.');
    else minimumWageHourly=(inputs.minimumWageBasis===null?basePay:inputs.minimumWageBasis)/(inputs.paidHours>0?inputs.paidHours:employee.monthlyHours);
  } else if (employee.payType==='hourly' && inputs.paidHours>0) minimumWageHourly=(inputs.minimumWageBasis===null?basePay:inputs.minimumWageBasis)/inputs.paidHours;
  else if (inputs.paidHours>0) minimumWageHourly=(inputs.minimumWageBasis===null?basePay:inputs.minimumWageBasis)/inputs.paidHours;
  if (rate && minimumWageHourly!==null && minimumWageHourly<rate.minimumWage) addBlock('최저임금 비교 금액이 해당 연도 기준보다 낮습니다. 산입 급여·유급 시간·일할 계산을 확인해 주세요.');
  if (inputs.minimumWageBasis!==null && inputs.minimumWageBasis>gross) throw Error('최저임금 산입 급여는 지급 총액을 넘을 수 없습니다.');
  const monthFirst=month+'-01',parts=month.split('-').map(Number),lastDay=new Date(Date.UTC(parts[0],parts[1],0)).getUTCDate(),monthLast=month+'-'+lastDay;
  if (employee.employmentStart>monthLast || (employee.employmentEnd && employee.employmentEnd<monthFirst)) addBlock('직원의 재직 기간과 급여 귀속월이 겹치지 않습니다.');
  const deductionItems=[
    {label:'국민연금',amount:insurance.pension,calculation:coverage.pension?(inputs.actualInsurance.pension!==null?'공단 고지액 · '+inputs.insuranceReference:'기준소득월액 '+(insuranceBases.pension===null?'미입력':insuranceBases.pension)+'원 × '+(rate?rate.pensionEmployee*100:'미확인')+'%, 10원 미만 절사'):'미가입·적용 제외'},
    {label:'건강보험',amount:insurance.health,calculation:coverage.health?(inputs.actualInsurance.health!==null?'공단 고지액 · '+inputs.insuranceReference:'보수월액 × 근로자 요율, 상하한 적용 및 10원 미만 절사'):'미가입·적용 제외'},
    {label:'장기요양보험',amount:insurance.ltc,calculation:coverage.health?(inputs.actualInsurance.ltc!==null?'공단 고지액 · '+inputs.insuranceReference:'건강보험료 × '+(rate?rate.ltcNumerator+'/'+rate.ltcDenominator:'미확인')+', 10원 미만 절사'):'미가입·적용 제외'},
    {label:'고용보험',amount:insurance.employment,calculation:coverage.employment?(inputs.actualInsurance.employment!==null?'공단 고지액 · '+inputs.insuranceReference:'신고 보수 × 0.9%, 10원 미만 절사 후 고지 대조'):'미가입·적용 제외'},
    {label:'근로소득세',amount:inputs.incomeTax,calculation:inputs.taxReference+' · '+inputs.taxPercent+'% 선택을 반영한 확인 세액'},
    {label:'지방소득세',amount:inputs.localTax,calculation:inputs.taxReference+' · 확인 세액'}
  ].concat(inputs.deductionItems);
  const incompleteComponents=deductionItems.filter(i=>i.amount===null).map(i=>i.label);
  const knownDeductions=deductionItems.reduce((s,i)=>s+(i.amount===null?0:i.amount),0),incomplete=incompleteComponents.length>0;
  if(knownDeductions>gross)throw Error('공제 합계가 지급 합계를 초과합니다. 입력 금액을 확인해 주세요.');
  return {gross:gross,taxable:taxable,taxFree:taxFree,deductions:incomplete?null:knownDeductions,net:incomplete?null:gross-knownDeductions,incomplete:incomplete,incompleteComponents:incompleteComponents,payItems:payItems,deductionItems:deductionItems,insurance:insurance,insuranceEstimate:estimate,insuranceBases:insuranceBases,basePay:basePay,baseCalculation:baseCalculation,rate:rate,pensionRange:pensionRange,healthBounds:healthBounds,minimumWageHourly:minimumWageHourly,warnings:warnings,blockingReasons:blocking};
}

function bwp26Draft_(book, db, user, p, save) {
  const month=bwp26Month_(p.month),employee=bwp26Employee_(db,p.employeeId),payDate=bwp26Date_(p.payDate,'지급일',false),inputs=bwp26Inputs_(p.inputs);
  const key=month+'|'+employee.id,found=db.runs.find(r=>r.key===key);
  if(found && ['confirmed','paid'].includes(found.record.status))throw Error('확정된 급여는 수정할 수 없습니다. 정정이 필요하면 사유를 기록하고 확정을 취소해 주세요.');
  const calculation=bwp26Calculate_(employee,db.settings,month,inputs);
  if(!save)return {ok:true,calculation:calculation};
  bwp26Revision_(p.revision,found?.record);
  const now=bwp26Now_();
  const record={key:key,month:month,employeeId:employee.id,payDate:payDate,revision:(found?.record.revision || 0)+1,status:'draft',snapshot:{schemaVersion:1,month:month,payDate:payDate,employee:bwp26Clone_(employee),settings:bwp26Clone_(db.settings),inputs:inputs,calculation:calculation},createdAt:found?.record.createdAt || now,updatedAt:now,updatedBy:user.email};
  bwp26BeforeWrite_(book,user,'draft',key,found?.record,record);
  bwp26Put_(book,BWP26_.RUN,key,record,found?.row,user);
  return {ok:true,calculation:calculation,run:record};
}
function bwp26RunAction_(book, db, user, action, p) {
  const month=bwp26Month_(p.month),id=bwp26Id_(p.employeeId),key=month+'|'+id,found=db.runs.find(r=>r.key===key);
  if(!found)throw Error('저장된 급여가 없습니다. 급여 초안을 먼저 저장해 주세요.');
  const old=found.record;
  if(action==='getPayslip') {
    if(!['confirmed','paid'].includes(old.status))throw Error('확정한 급여만 명세서로 발급할 수 있습니다.');
    bwp26Audit_(book,user,'payslip',key,{revision:old.revision,status:old.status});
    return {ok:true,snapshot:old.snapshot,status:old.status,revision:old.revision,paidDate:old.paidDate || ''};
  }
  bwp26Revision_(p.revision,old);
  const record=bwp26Clone_(old),now=bwp26Now_();
  if(action==='finalize') {
    if(old.status!=='draft')throw Error('저장된 초안만 확정할 수 있습니다.');
    const employee=bwp26Employee_(db,id);
    if(employee.revision!==old.snapshot.employee.revision || db.settings.revision!==old.snapshot.settings.revision)throw Error('직원 또는 사업장 설정이 변경되었습니다. 급여 초안을 다시 계산·저장해 주세요.');
    const calc=bwp26Calculate_(employee,db.settings,month,bwp26Inputs_(old.snapshot.inputs));
    if(JSON.stringify(calc)!==JSON.stringify(old.snapshot.calculation))throw Error('계산 기준이 변경되었습니다. 초안을 다시 계산·저장해 주세요.');
    if(calc.blockingReasons.length)throw Error(calc.blockingReasons.join('\n'));
    record.status='confirmed';record.snapshot.confirmedAt=now;record.snapshot.confirmedBy=user.email;
  } else if(action==='markPaid') {
    if(old.status!=='confirmed')throw Error('확정된 급여만 지급 완료로 기록할 수 있습니다.');
    record.paidDate=bwp26Date_(p.paidDate || old.payDate,'실제 지급일',false);record.status='paid';
  } else if(action==='void') {
    if(!['confirmed','paid'].includes(old.status))throw Error('확정 또는 지급 완료 기록만 취소할 수 있습니다.');
    record.voidReason=bwp26Text_(p.reason,300,true);record.status='void';record.voidAt=now;
    // The complete original confirmed snapshot is retained here and archived in the intent audit.
  } else throw Error('지원하지 않는 작업입니다.');
  record.revision+=1;record.updatedAt=now;record.updatedBy=user.email;
  bwp26BeforeWrite_(book,user,action,key,old,record);
  bwp26Put_(book,BWP26_.RUN,key,record,found.row,user);
  return {ok:true,run:record};
}
function bwp26AnnualReport_(db, p) {
  const year=bwp26Number_(p.year,'조회 연도',{min:2000,max:2099});
  const rows=db.runs.filter(r=>r.record.month.slice(0,4)===String(year)).map(r=>{
    const v=r.record,c=v.snapshot.calculation,e=v.snapshot.employee;
    return {month:v.month,employeeId:v.employeeId,name:e.name,department:e.department,payDate:v.payDate,status:v.status,revision:v.revision,gross:c.gross,taxable:c.taxable,taxFree:c.taxFree,deductions:c.deductions,net:c.net,paidDate:v.paidDate || ''};
  }).sort((a,b)=>a.month.localeCompare(b.month)||a.name.localeCompare(b.name));
  const totals={draftCount:0,confirmedCount:0,paidCount:0,voidCount:0,gross:0,deductions:0,net:0,paidNet:0};
  rows.forEach(r=>{totals[r.status+'Count']+=1;if(['confirmed','paid'].includes(r.status)){totals.gross+=r.gross;totals.deductions+=r.deductions;totals.net+=r.net;}if(r.status==='paid')totals.paidNet+=r.net;});
  return {ok:true,year:year,rows:rows,totals:totals};
}
