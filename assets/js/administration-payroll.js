/* Bridge Wonder V26. Owner-only payroll UI; private data remains in memory. */
(function (global) {
  'use strict';
  if (global.BWPayroll && global.BWPayroll.version === '26.0.0') return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const won = v => v===null||v===undefined?'확인 필요':Number(v).toLocaleString('ko-KR') + '원';
  const percent = v => v == null ? '확인 필요' : (Number(v)*100).toLocaleString('ko-KR',{maximumFractionDigits:4})+'%';
  const statuses = {draft:'초안',confirmed:'확정',paid:'지급 기록 완료',void:'취소'};
  const kinds = {meal:'식대',transport:'자가운전 보조금',overtime:'연장근로 수당',night:'야간근로 수당',holiday:'휴일근로 수당',weekly:'주휴수당',bonus:'상여금',custom:'기타 수당'};
  const insuranceNames = {pension:'국민연금',health:'건강보험',ltc:'장기요양보험',employment:'고용보험'};
  let current = null;
  function field(name,label,value='',type='text',extra='',note='') {
    return `<label class="pay-field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value == null ? '' : value)}" ${extra}>${note?`<small>${esc(note)}</small>`:''}</label>`;
  }
  function number(name,label,value,extra='',note='') {const defaults=[['min','0'],['max','1000000000'],['step','1']].filter(([key])=>!new RegExp('(?:^|\\s)'+key+'=').test(extra)).map(([key,v])=>key+'=\"'+v+'\"').join(' ');return field(name,label,value,'number',`${defaults} inputmode="decimal" ${extra}`,note);}
  function textarea(name,label,value='',note='') {return `<label class="pay-field wide"><span>${esc(label)}</span><textarea name="${esc(name)}" maxlength="${name==='taxReference'?200:180}" rows="2">${esc(value)}</textarea>${note?`<small>${esc(note)}</small>`:''}</label>`;}
  function select(name,label,value,options) {return `<label class="pay-field"><span>${esc(label)}</span><select name="${esc(name)}">${Object.entries(options).map(([v,l])=>`<option value="${esc(v)}"${String(value)===v?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;}
  function check(name,label,value) {return `<label><input type="checkbox" name="${esc(name)}"${value===true?' checked':''}><span>${esc(label)}</span></label>`;}
  function statusTag(status) {return `<span class="pay-status ${esc(status)}">${esc(statuses[status]||status)}</span>`;}
  function btn(action,label,primary=false,extra='') {return `<button type="button" class="btn ${primary?'btn-primary':'btn-outline'}" data-pay-action="${action}" ${extra}>${esc(label)}</button>`;}
  function safeUrl(value) {try {const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch(_){return '';}}
  function sourceList(sources) {
    if(!sources)return '';
    const values=Array.isArray(sources)?sources:Object.entries(sources).map(([key,v])=>typeof v==='string'?{url:v,title:key}:{...v,title:v.title||v.label||v.note||key});
    return values.map(x=>{const url=safeUrl(x.url);return url?`<a class="pay-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(x.title||x.label||x.note||new URL(url).hostname)}</a>`:'';}).join('');
  }
  function makeScope(root,ctx) {
    const scope={root,ctx,alive:true,epoch:0,busy:false,data:null,month:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).format(new Date()),tab:'monthly',employeeId:'',editEmployeeId:'',dirty:false,preview:null,report:null};
    scope.valid=()=>scope.alive&&root.isConnected&&ctx.isCurrent();
    scope.request=async(action,payload)=>{
      const result=await ctx.call('payrollCommand',ctx.token,action,payload||{});
      if(!scope.valid())throw Error('BW24_STALE_VIEW');
      if(!result||result.ok!==true)throw Error(result?.message||'급여 정보를 확인하지 못했습니다. 다시 조회해 주세요.');
      return result;
    };
    return scope;
  }
  const employee=s=>s.data?.employees?.find(x=>x.id===s.employeeId);
  const run=s=>s.data?.runs?.find(x=>x.employeeId===s.employeeId&&x.month===s.month);
  function feedback(s,message,error=false) {if(!s.valid())return;const el=s.root.querySelector('#payFeedback');if(el){el.textContent=message;el.className='pay-message'+(error?' error':'');el.setAttribute('role',error?'alert':'status');}}
  function allowDiscard(s) {return !s.dirty||global.confirm('저장하지 않은 변경 내용이 있습니다. 이동하시겠습니까?');}
  async function work(s,fn) {
    if(s.busy||!s.valid())return;
    s.busy=true;
    const saved=[...s.root.querySelectorAll('button,input,select,textarea')].map(el=>[el,el.disabled]);
    saved.forEach(([el])=>el.disabled=true);
    try{await fn();}catch(e){if(e.message!=='BW24_STALE_VIEW')feedback(s,e.message,true);}
    finally {s.busy=false;if(s.valid())saved.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled;});}
  }
  async function refresh(s) {
    const epoch=++s.epoch,month=s.month;
    const d=await s.request('bootstrap',{month});
    if(epoch!==s.epoch||month!==s.month)return;
    s.data=d;s.preview=null;s.dirty=false;
    if(!d.employees?.some(x=>x.id===s.employeeId))s.employeeId=d.employees?.[0]?.id||'';
    render(s);
  }
  function header(s) {
    return `<div class="pay-header"><div><div class="pay-eyebrow">BRIDGE WONDER · 원장 전용</div><h2>직원 급여관리</h2><p>월별 급여를 작성하고 지급 내역과 명세서를 확인하세요.</p></div><div class="pay-period"><label>급여 귀속월<input id="payMonth" type="month" min="2025-01" max="2045-12" value="${esc(s.month)}"></label>${btn('refresh','새로고침')}</div></div><div id="payFeedback" class="pay-message" aria-live="polite"></div>`;
  }
  function render(s) {
    if(!s.valid())return;
    const d=s.data;
    if(d.setupRequired){s.root.innerHTML=header(s)+`<section class="pay-card"><h3>급여관리 설정을 확인해 주세요</h3><p class="pay-note">급여관리 서버 연결과 초기 설정이 완료되지 않았습니다. 원장 계정에서 설정 상태를 확인해 주세요. 기존 직원과 수강생 기록은 유지됩니다.</p><p class="pay-note">설정을 마친 뒤 새로고침하면 급여관리를 사용할 수 있습니다.</p></section>`;bind(s);return;}
    const active=(d.runs||[]).filter(x=>x.status!=='void'),sum=k=>active.some(x=>x.snapshot?.calculation?.[k]==null)?null:active.reduce((a,x)=>a+Number(x.snapshot.calculation[k]),0);
    const metrics=[['작성한 지급 합계',won(sum('gross'))],['작성한 공제 합계',won(sum('deductions'))],['작성한 실지급 합계',won(sum('net'))],['급여 작성',`${active.length}명 / ${d.employees.length}명`]];
    s.root.innerHTML=header(s)+`<div class="pay-metrics">${metrics.map(([a,b])=>`<div class="pay-metric"><small>${a}</small><strong>${b}</strong></div>`).join('')}</div><div class="pay-tabs" role="tablist" aria-label="급여 업무">${Object.entries({monthly:'월별 급여',employees:'직원 급여설정',rates:'정부 기준 요율',reports:'연간 지급현황',settings:'사업장 정보'}).map(([v,label])=>`<button class="pay-tab" type="button" role="tab" aria-selected="${s.tab===v}" data-pay-tab="${v}">${label}</button>`).join('')}</div><div role="tabpanel">${s.tab==='monthly'?monthly(s):s.tab==='employees'?employees(s):s.tab==='rates'?rates(s):s.tab==='reports'?reports(s):settings(s)}</div>`;
    bind(s);
  }
  function monthly(s) {
    const e=employee(s),r=run(s);
    return `<section class="pay-card"><h3>${esc(s.month.replace('-','년 '))}월 급여대장</h3><p class="pay-note">이번 달 급여 작성 내역입니다. 금액과 공제 내역을 확인한 후 확정하고, 실제 지급을 마치면 지급 완료로 표시하세요.</p>${ledger(s)}</section>`+(e?`<section class="pay-card"><div class="pay-inline"><label class="pay-field" style="flex:1"><span>급여를 작성할 직원</span><select id="payEmployee">${s.data.employees.map(x=>`<option value="${esc(x.id)}"${x.id===s.employeeId?' selected':''}>${esc(x.name)}${x.employmentEnd?' · 퇴직':''}</option>`).join('')}</select></label>${btn('newEmployee','직원 추가')}</div><div class="pay-actions">${r?statusTag(r.status):'<span class="pay-status">미작성</span>'}<span class="pay-note">${esc(e.department||'')} ${esc(e.position||'')}</span></div>${r&&['confirmed','paid'].includes(r.status)?`<p class="pay-message">확정한 급여는 당시의 직원 정보와 계산 기준으로 보관됩니다. 정정할 때는 취소 사유를 남긴 뒤 다시 작성하세요.</p><div class="pay-actions">${btn('payslip','급여명세서 인쇄 / PDF',true,`data-id="${esc(e.id)}"`)}${r.status==='confirmed'?btn('paid','지급 완료 기록',false,`data-id="${esc(e.id)}"`):''}${btn('void','확정 취소',false,`data-id="${esc(e.id)}"`)}</div>`:payForm(s,e,r)}</section>`:`<section class="pay-card pay-empty"><p>아직 등록된 직원이 없습니다.<br>직원의 급여 유형과 보험 가입 여부를 먼저 등록해 주세요.</p>${btn('newEmployee','첫 직원 등록',true)}</section>`);
  }
  function ledger(s) {
    if(!s.data.runs?.length)return '<div class="pay-empty">이달에 작성한 급여가 없습니다.</div>';
    return `<div class="pay-table"><table><thead><tr><th>직원 / 지급일</th><th class="num">지급 합계</th><th class="num">공제 합계</th><th class="num">실지급액</th><th>상태</th><th>관리</th></tr></thead><tbody>${s.data.runs.map(r=>{const c=r.snapshot?.calculation||{};return `<tr><td>${esc(r.snapshot?.employee?.name||'직원')}<br><small>예정 ${esc(r.payDate)}${r.paidDate?'<br>지급 '+esc(r.paidDate):''}</small></td><td class="num">${won(c.gross)}</td><td class="num">${won(c.deductions)}</td><td class="num"><b>${won(c.net)}</b></td><td>${statusTag(r.status)}</td><td>${btn('editRun',r.status==='draft'?'작성 계속':'상세 보기',false,`data-id="${esc(r.employeeId)}"`)}${r.status==='draft'?btn('finalize','확정',false,`data-id="${esc(r.employeeId)}"`):''}</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  function itemRow(item={},deduction=false) {
    return `<div class="pay-item" data-item="${deduction?'deduction':'pay'}"><div class="pay-item-head"><span>${deduction?'추가 공제':'지급 항목'}</span><button type="button" class="pay-remove" data-pay-action="removeItem" aria-label="이 항목 삭제">항목 삭제</button></div><div class="pay-grid">${deduction?'':select('kind','항목 구분',item.kind||'custom',kinds)}${field('label','항목명',item.label||'','text','maxlength="60" required')}${number('amount','금액 (원)',item.amount??0,'required')}${deduction?'':number('taxFreeAmount','비과세 금액 (원)',item.taxFreeAmount??0)}${deduction?'':number('hours','시간',item.hours??'','step="0.01" max="744"')}${deduction?'':number('rate','기준 시급 (원)',item.rate??'')}${deduction?'':number('multiplier','적용 배율',item.multiplier??'','step="0.01" max="5"')}${textarea('calculation','계산 방법 / 적용 근거',item.calculation||'',deduction?'공제 사유와 산정 근거를 입력하세요.':'시간 × 시급 × 배율 또는 정액 지급 근거를 적어 주세요. 비과세 항목은 적용 요건도 함께 기록합니다.')}</div>${deduction?'':`<div class="pay-actions">${btn('calculateItem','시간·시급·배율로 금액 계산')}</div>`}</div>`;
  }
  function payForm(s,e,r) {
    const a=r?.snapshot?.inputs||{},review=a.review||{};
    return `<form id="payForm"><input type="hidden" name="revision" value="${Number(r?.revision||0)}"><div class="pay-section"><div class="pay-grid">${field('payDate','급여 지급 예정일',r?.payDate||s.month+'-25','date','required')}${number('basePay','기본급 직접 입력 (원)',a.basePay??'','placeholder="직원 설정 / 근로시간으로 계산"','일할 계산 등 기본 설정과 다른 경우 입력하세요. 0원도 직접 입력한 값으로 처리합니다.')}${number('paidHours','유급 근로시간',a.paidHours??'','step="0.01" max="744"',e.payType==='hourly'?'시급제 기본급 = 시급 × 유급 근로시간 (원 미만 올림)':'시간에 따른 급여 산정 시 입력하세요.')}${number('paidDays','유급 근로일수',a.paidDays??'','step="0.01" max="31"',e.payType==='daily'?'일급제 기본급 = 일급 × 유급 근로일수 (원 미만 올림)':'일급제의 지급일수를 입력하세요.')}${number('ordinaryHourly','통상시급 (수당 산정 참고)',a.ordinaryHourly??'')}${number('minimumWageBasis','최저임금 산입 대상 금액 (원)',a.minimumWageBasis??'','placeholder="미입력 시 기본급 기준"','산입 대상 수당을 포함한 금액입니다. 적용 시간과 함께 확인하세요.')}${textarea('baseCalculation','기본급 계산 방법',a.baseCalculation||'', '기본급을 직접 입력했다면 계산 근거를 남겨 주세요. 예: 월급 × 재직일수 ÷ 해당 월 일수.')}</div></div><details class="pay-section" open><summary>지급 수당</summary><p class="pay-note">수당은 근로시간과 적용 배율을 확인해 입력하세요. 식대·자가운전 보조금의 비과세 한도는 항목별 월 20만 원이며, 적용 요건도 확인해야 합니다.</p><div id="payItems" class="pay-items">${(a.items||[]).map(x=>itemRow(x)).join('')}</div><div class="pay-actions">${btn('addItem','지급 항목 추가')}</div></details><details class="pay-section" open><summary>보험료와 세금</summary><p class="pay-note">보험료는 신고된 기준소득·보수월액을 기준으로 계산합니다. 공단 고지액이 있으면 해당 금액을 입력하고, 소득세는 지급일에 적용되는 간이세액표를 확인해 주세요.</p><div class="pay-grid">${number('pensionBase','국민연금 기준소득월액',a.pensionBase??'')}${number('healthBase','건강보험 보수월액',a.healthBase??'')}${number('employmentBase','고용보험 보수',a.employmentBase??'')}${Object.entries(insuranceNames).map(([key,label])=>number('actual_'+key,label+' 고지액',a.actualInsurance?.[key]??'','placeholder="미입력 시 계산액"')).join('')}${number('incomeTax','근로소득세 (원)',a.incomeTax??'','','미입력 초안은 저장할 수 있으며, 세액을 확인해야 확정할 수 있습니다.')}${number('localTax','지방소득세 (원)',a.localTax??'')}${select('taxPercent','간이세액 적용 비율',String(a.taxPercent||100),{'80':'80%','100':'100%','120':'120%'})}${number('familyCount','공제 대상 가족 수 (본인 포함)',a.familyCount??1,'min="1" max="30"')}${number('childCount','공제 대상 자녀 수',a.childCount??0,'max="30"')}${textarea('taxReference','간이세액 확인 근거',a.taxReference||'','확인한 간이세액표 시행일과 계산에 사용한 가족 수·비율을 기록하세요.')}${textarea('insuranceReference','보험료 고지 / 확인 근거',a.insuranceReference||'','공단 고지월과 금액을 확인한 자료를 기록하세요. 정산·감면이 있다면 사유도 남겨 주세요.')}</div><div class="pay-sources">${sourceList([s.data.sources?.incomeTax2026,s.data.sources?.incomeTax].filter(Boolean))}</div><p class="pay-note">간이세액표는 실제 지급일에 적용되는 기준을 사용하세요. 화면의 2026년 3월 기준은 다른 지급 시기에 그대로 적용하면 안 됩니다.</p></details><details class="pay-section"><summary>기타 공제</summary><div id="deductionItems" class="pay-items">${(a.deductionItems||[]).map(x=>itemRow(x,true)).join('')}</div><div class="pay-actions">${btn('addDeduction','공제 항목 추가')}</div></details><div class="pay-section"><h3>확정 전 확인</h3><div class="pay-checks">${check('review_tax','간이세액표의 시행일과 가족·자녀 수, 적용 비율 및 세액을 확인했습니다.',review.tax)}${check('review_insurance','보험 가입 구분, 신고 기준금액과 공단 고지·정산 내역을 확인했습니다.',review.insurance)}${check('review_taxFree','비과세 항목의 적용 요건·한도와 과세 급여를 확인했습니다.',review.taxFree)}${check('review_hours','근로시간·일수, 통상임금과 수당 계산, 최저임금 산입 기준을 확인했습니다.',review.hours)}</div></div><div class="pay-actions">${btn('preview','계산 미리보기')}<button type="submit" class="btn btn-primary">급여 초안 저장</button></div><div id="payPreview" class="pay-preview">${s.preview?previewHTML(s.preview):''}</div></form>`;
  }
  function employees(s) {
    const e=s.data.employees.find(x=>x.id===s.editEmployeeId)||{id:'',revision:0,payType:'monthly',monthlyHours:209,coverage:{}};
    return `<section class="pay-card"><h3>직원별 급여 설정</h3><p class="pay-note">급여·보험 정보는 직원 로그인 계정과 별도로 관리하며, 원장만 확인하거나 수정할 수 있습니다.</p><div class="pay-inline"><select id="payEditEmployee" aria-label="급여설정을 수정할 직원"><option value="">새 직원 등록</option>${s.data.employees.map(x=>`<option value="${esc(x.id)}"${x.id===e.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div><form id="employeeForm"><input name="id" type="hidden" value="${esc(e.id)}"><input name="revision" type="hidden" value="${Number(e.revision||0)}"><div class="pay-grid pay-section">${field('name','직원 성명',e.name,'text','required maxlength="60"')}${field('email','업무용 이메일',e.email,'email','required maxlength="180"')}${select('payType','급여 유형',e.payType, {monthly:'월급제',hourly:'시급제',daily:'일급제'})}${field('employmentStart','입사일',e.employmentStart,'date','required')}${field('employmentEnd','퇴사일 (해당 시)',e.employmentEnd,'date')}${field('department','부서',e.department,'text','maxlength="60"')}${field('position','직위',e.position,'text','maxlength="60"')}${number('basePay','기본 월급 (원)',e.basePay??0)}${number('hourlyRate','시급 (원)',e.hourlyRate??0)}${number('dailyRate','일급 (원)',e.dailyRate??0)}${number('monthlyHours','월 유급시간',e.monthlyHours??209,'step="0.01" max="744"','근로계약에 따라 입력하세요. 일급제의 전체 유급시간은 월별 급여 작성 시 입력하세요.')}</div><div class="pay-checks">${check('pension','국민연금 가입',e.coverage?.pension)}${check('health','건강보험·장기요양보험 가입',e.coverage?.health)}${check('employment','고용보험 가입',e.coverage?.employment)}${check('coverageVerified','근로형태·연령·가입 예외를 확인하고 보험 가입 구분을 설정했습니다.',e.coverageVerified)}</div><div class="pay-actions"><button type="submit" class="btn btn-primary">직원 급여설정 저장</button></div></form></section>`;
  }
  function rates(s) {
    const r=s.data.rate,year=Number(s.month.slice(0,4));
    if(!r)return `<section class="pay-card"><h3>${year}년 공식 기준 확인이 필요합니다</h3><p class="pay-message error">선택한 연도의 요율이 아직 확인되지 않았습니다. 공식 고시를 확인하고 요율을 등록해 주세요.</p></section>`;
    const approved=r.approved===true,cap=s.data.pensionRange,h=s.data.healthBounds;
    return `<section class="pay-card"><h3>${year}년 정부 기준 요율</h3><p class="pay-message">${esc(r.status||'공식 기준 확인')} · 자료 확인일 ${esc(r.verifiedAsOf||'')}</p><p class="pay-note">${esc(s.month)} 급여에 적용할 기준입니다. 시행일과 공식 자료를 확인한 뒤 승인하세요. 화면의 요율은 보기 쉽게 반올림해 표시됩니다.</p><div class="pay-rate-list">${[['국민연금 · 근로자',percent(r.pensionEmployee)],['건강보험 · 근로자',percent(r.healthTotal/2)],['장기요양 · 건강보험료 대비',percent(r.ltcDisplayRatio??r.ltcRatio)],['고용보험 · 근로자',percent(r.employmentEmployee)],['최저시급',won(r.minimumWage)],['요율 확인',approved?'확인 완료':'확인 필요']].map(([a,b])=>`<div class="pay-rate"><span>${a}</span><b>${b}</b></div>`).join('')}</div><p class="pay-note">국민연금 기준소득월액: ${cap?`${won(cap.min)} ~ ${won(cap.max)} (${esc(cap.from)} ~ ${esc(cap.to)})`:'해당 월의 상·하한 확인이 필요합니다.'}<br>건강보험 근로자 부담 상·하한: ${h?`${won(h.min)} ~ ${won(h.max)}`:'적용 상·하한 확인이 필요합니다. 공단 고지액을 입력해 주세요.'}</p><p class="pay-note">2026년 11월부터 적용되는 장기요양보험 반올림 기준을 확인하세요. 산재보험과 사업주 부담 고용보험료는 직원 급여에서 공제하지 않습니다.</p>${approved?'<div class="pay-message">이 연도의 공식 기준을 확인했습니다. 이미 확정한 급여는 확정 당시의 기준을 유지합니다.</div>':btn('approveYear',`${year}년 공식 기준 확인`,true)}<details class="pay-section" open><summary>공식 근거 자료</summary><div class="pay-sources">${sourceList(r.sources||s.data.sources)}${sourceList([s.data.sources?.incomeTax2026,s.data.sources?.incomeTax].filter(Boolean))}</div></details></section>`;
  }
  function settings(s) {
    const v=s.data.settings||{};
    return `<section class="pay-card"><h3>급여명세서 사업장 정보</h3><p class="pay-note">사업자등록증과 동일하게 입력해 주세요. 급여명세서에는 확정 당시의 사업장 정보가 표시됩니다.</p><form id="paySettingsForm"><input type="hidden" name="revision" value="${Number(v.revision||0)}"><div class="pay-grid two">${field('businessName','사업장 상호',v.businessName,'text','required maxlength="100"')}${field('businessNumber','사업자등록번호',v.businessNumber,'text','required maxlength="12" placeholder="000-00-00000"')}${field('representative','대표자',v.representative,'text','required maxlength="60"')}${field('address','사업장 주소',v.address,'text','required maxlength="200"')}</div><div class="pay-actions"><button type="submit" class="btn btn-primary">사업장 정보 저장</button></div></form></section>`;
  }
  function reports(s) {
    const r=s.report;
    return `<section class="pay-card"><h3>연간 급여 지급현황</h3><p class="pay-note">연도별 급여 작성·확정·지급 내역을 확인하거나 CSV 파일로 내려받을 수 있습니다. 취소한 기록은 합계에서 제외됩니다.</p><div class="pay-inline">${number('reportYear','귀속연도',s.month.slice(0,4),'id="payReportYear" min="2025" max="2045"')}${btn('loadReport','연간 내역 조회',true)}${r?btn('exportReport','CSV 내려받기'):''}</div>${r?reportTable(r):'<div class="pay-empty">연도를 선택하고 연간 내역을 조회해 주세요.</div>'}</section>`;
  }
  function reportTable(report) {
    if(!report.rows?.length)return '<div class="pay-empty">해당 연도에 작성한 급여가 없습니다.</div>';
    return `<div class="pay-table pay-section"><table><thead><tr><th>귀속월</th><th>직원</th><th>지급 예정일 / 실제 지급일</th><th class="num">지급 합계</th><th class="num">공제 합계</th><th class="num">실지급액</th><th>상태</th></tr></thead><tbody>${report.rows.map(x=>{const c=x.snapshot?.calculation||x;return `<tr><td>${esc(x.month)}</td><td>${esc(x.employeeName||x.name||x.snapshot?.employee?.name)}</td><td>${esc(x.payDate)}<br><small>실제 ${esc(x.paidDate||'미기록')}</small></td><td class="num">${won(c.gross)}</td><td class="num">${won(c.deductions)}</td><td class="num">${won(c.net)}</td><td>${statusTag(x.status)}</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  function previewHTML(c) {
    return `<div class="pay-section"><h3>급여 계산 결과</h3><div class="pay-metrics">${[['지급 합계',c.gross],['공제 합계',c.deductions],['실지급액',c.net],['비과세 합계',c.taxFree]].map(([l,v])=>`<div class="pay-metric"><small>${l}</small><strong>${won(v)}</strong></div>`).join('')}</div><div class="pay-table"><table><thead><tr><th>공제 항목</th><th class="num">금액</th><th>계산 / 확인 근거</th></tr></thead><tbody>${(c.deductionItems||[]).map(i=>`<tr><td>${esc(i.label||i.name)}</td><td class="num">${won(i.amount)}</td><td>${esc(i.calculation)}</td></tr>`).join('')}</tbody></table></div>${(c.warnings||[]).map(t=>`<p class="pay-message">${esc(t)}</p>`).join('')}${(c.blockingReasons||[]).map(t=>`<p class="pay-message error">확정 전 확인: ${esc(t)}</p>`).join('')}</div>`;
  }
  function value(form,name) {return form.querySelector(`[name="${name}"]`)?.value??'';}
  function numeric(form,name,nullable=false) {const v=value(form,name).trim();if(v==='')return nullable?null:0;const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('숫자 입력값을 확인해 주세요.');return n;}
  function checked(form,name) {return form.querySelector(`[name="${name}"]`)?.checked===true;}
  function readItems(form,kind) {return [...form.querySelectorAll(`[data-item="${kind}"]`)].map(el=>({label:value(el,'label'),amount:numeric(el,'amount'),calculation:value(el,'calculation'),...(kind==='pay'?{kind:value(el,'kind'),taxFreeAmount:numeric(el,'taxFreeAmount'),hours:numeric(el,'hours',true),rate:numeric(el,'rate',true),multiplier:numeric(el,'multiplier',true)}:{})}));}
  function readPay(s) {
    const form=s.root.querySelector('#payForm'),a={};
    if(!form.reportValidity())throw Error('필수 입력값을 확인해 주세요.');
    ['basePay','paidHours','paidDays','ordinaryHourly','minimumWageBasis','pensionBase','healthBase','employmentBase','incomeTax','localTax'].forEach(k=>a[k]=numeric(form,k,true));
    ['taxPercent','familyCount','childCount'].forEach(k=>a[k]=numeric(form,k));
    ['baseCalculation','taxReference','insuranceReference'].forEach(k=>a[k]=value(form,k));
    a.items=readItems(form,'pay');a.deductionItems=readItems(form,'deduction');a.actualInsurance={};
    Object.keys(insuranceNames).forEach(k=>a.actualInsurance[k]=numeric(form,'actual_'+k,true));
    a.review={};['tax','insurance','taxFree','hours'].forEach(k=>a.review[k]=checked(form,'review_'+k));
    return {month:s.month,employeeId:s.employeeId,payDate:value(form,'payDate'),revision:numeric(form,'revision'),inputs:a};
  }
  function bind(s) {
    const root=s.root;
    root.querySelector('#payMonth').onchange=e=>{if(!e.target.value||!allowDiscard(s)){e.target.value=s.month;return;}s.month=e.target.value;s.report=null;work(s,()=>refresh(s));};
    root.querySelectorAll('[data-pay-tab]').forEach(b=>b.onclick=()=>{if(s.busy||!allowDiscard(s))return;s.tab=b.dataset.payTab;s.dirty=false;render(s);});
    const choose=root.querySelector('#payEmployee');if(choose)choose.onchange=e=>{if(!allowDiscard(s)){e.target.value=s.employeeId;return;}s.employeeId=e.target.value;s.dirty=false;s.preview=null;render(s);};
    const edit=root.querySelector('#payEditEmployee');if(edit)edit.onchange=e=>{if(!allowDiscard(s)){e.target.value=s.editEmployeeId;return;}s.editEmployeeId=e.target.value;s.dirty=false;render(s);};
    root.querySelectorAll('form').forEach(f=>f.addEventListener('input',()=>s.dirty=true));
    root.querySelectorAll('[data-pay-action]').forEach(b=>b.onclick=()=>action(s,b));
    const pay=root.querySelector('#payForm');if(pay)pay.onsubmit=e=>{e.preventDefault();if(!pay.reportValidity())return;work(s,async()=>{const result=await s.request('saveDraft',readPay(s));s.dirty=false;await refresh(s);s.preview=result.calculation;const p=root.querySelector('#payPreview');if(p)p.innerHTML=previewHTML(result.calculation);feedback(s,'급여 초안을 저장했습니다. 계산 내역을 확인한 후 급여대장에서 확정하세요.');});};
    const ef=root.querySelector('#employeeForm');if(ef)ef.onsubmit=e=>{e.preventDefault();if(!ef.reportValidity())return;work(s,async()=>{if(!ef.reportValidity())return;const p={};['id','name','email','payType','employmentStart','employmentEnd','department','position'].forEach(k=>p[k]=value(ef,k));['revision','basePay','hourlyRate','dailyRate','monthlyHours'].forEach(k=>p[k]=numeric(ef,k));p.coverage={pension:checked(ef,'pension'),health:checked(ef,'health'),employment:checked(ef,'employment')};p.coverageVerified=checked(ef,'coverageVerified');const r=await s.request('saveEmployee',p);s.editEmployeeId=r.employee.id;s.employeeId=r.employee.id;s.dirty=false;await refresh(s);feedback(s,'직원 급여설정을 저장했습니다.');});};
    const sf=root.querySelector('#paySettingsForm');if(sf)sf.onsubmit=e=>{e.preventDefault();if(!sf.reportValidity())return;work(s,async()=>{if(!sf.reportValidity())return;const p={revision:numeric(sf,'revision')};['businessName','businessNumber','representative','address'].forEach(k=>p[k]=value(sf,k));await s.request('saveSettings',p);s.dirty=false;await refresh(s);feedback(s,'사업장 정보를 저장했습니다.');});};
  }
  function action(s,b) {
    if(s.busy)return;
    const what=b.dataset.payAction,id=b.dataset.id||s.employeeId,r=s.data?.runs?.find(x=>x.employeeId===id&&x.month===s.month);
    if(['addItem','addDeduction'].includes(what)){
      const host=s.root.querySelector(what==='addItem'?'#payItems':'#deductionItems');
      if(host.children.length>=30){feedback(s,'지급·공제 항목은 각각 30개까지 등록할 수 있습니다.',true);return;}
      host.insertAdjacentHTML('beforeend',itemRow({},what==='addDeduction'));s.dirty=true;bindItemButtons(s,host.lastElementChild);host.lastElementChild.querySelector('input')?.focus();return;
    }
    if(what==='removeItem'){b.closest('[data-item]').remove();s.dirty=true;return;}
    if(what==='calculateItem'){
      try{const row=b.closest('[data-item]'),hours=numeric(row,'hours',true),rate=numeric(row,'rate',true),multi=numeric(row,'multiplier',true);if(hours==null||rate==null||multi==null)throw Error('근로시간·시급·배율을 모두 입력해 주세요.');row.querySelector('[name="amount"]').value=Math.floor(hours*rate*multi+0.000001);row.querySelector('[name="calculation"]').value=`${hours}시간 × ${won(rate)} × ${multi}`;s.dirty=true;}catch(e){feedback(s,e.message,true);}return;
    }
    if(what==='newEmployee'){if(!allowDiscard(s))return;s.tab='employees';s.editEmployeeId='';s.dirty=false;render(s);return;}
    if(what==='editRun'){if(!allowDiscard(s))return;s.employeeId=id;s.dirty=false;s.preview=null;render(s);s.root.querySelector('#payEmployee')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(what==='preview'&&!s.root.querySelector('#payForm')?.reportValidity())return;
    if(what==='payslip'){
      const popup=global.open('','_blank');if(!popup){feedback(s,'팝업을 허용한 후 다시 열어 주세요.',true);return;}popup.opener=null;popup.document.title='급여명세서를 불러오는 중';popup.document.body.textContent='명세서를 불러오는 중입니다.';
      work(s,async()=>{try{const res=await s.request('getPayslip',{month:s.month,employeeId:id,revision:r.revision});popup.document.open();popup.document.write(payslipHTML(res.snapshot,res));popup.document.close();}catch(e){popup.close();throw e;}});return;
    }
    if(what==='exportReport'){exportCSV(s.report,s.report.year||s.month.slice(0,4));return;}
    work(s,async()=>{
      if(what==='refresh'){if(allowDiscard(s))await refresh(s);return;}
      if(what==='preview'){const result=await s.request('preview',readPay(s));s.preview=result.calculation;s.root.querySelector('#payPreview').innerHTML=previewHTML(result.calculation);feedback(s,'계산 결과를 확인했습니다. 초안을 저장하면 이 내역이 보관됩니다.');return;}
      if(what==='approveYear'){await s.request('approveYear',{year:Number(s.month.slice(0,4)),confirmed:true});await refresh(s);feedback(s,'해당 연도의 공식 기준을 확인했습니다.');return;}
      if(what==='loadReport'){s.report=await s.request('annualReport',{year:numeric(s.root,'reportYear')});render(s);return;}
      if(!r)throw Error('작성한 급여를 먼저 선택해 주세요.');
      const p={month:s.month,employeeId:id,revision:r.revision};
      if(what==='finalize'){if(!global.confirm('저장한 초안의 금액과 계산 근거로 급여를 확정하시겠습니까?'))return;await s.request('finalize',p);}
      if(what==='paid'){const date=global.prompt('실제 급여를 송금한 날짜를 입력하세요. (YYYY-MM-DD)',r.payDate);if(date===null)return;p.paidDate=date;await s.request('markPaid',p);}
      if(what==='void'){const reason=global.prompt('확정을 취소하는 사유를 입력하세요. 기존 명세서와 변경 이력은 보관됩니다.');if(reason===null)return;p.reason=reason;await s.request('void',p);}
      await refresh(s);feedback(s,what==='paid'?'지급 완료를 기록했습니다.':what==='void'?'확정을 취소했습니다. 기존 내역은 변경 이력에 보관됩니다.':'급여를 확정했습니다. 명세서를 발급할 수 있습니다.');
    });
  }
  function bindItemButtons(s,row){row.querySelectorAll('[data-pay-action]').forEach(b=>b.onclick=()=>action(s,b));row.addEventListener('input',()=>s.dirty=true);}
  function exportCSV(report,year) {
    const cell=v=>'"'+String(v==null?'':v).replace(/^(?=\s*[=+\-@\t\r])/,"'").replace(/"/g,'""')+'"';
    const rows=[['귀속월','직원 성명','지급 예정일','실제 지급일','지급 합계','공제 합계','실지급액','상태'],...(report?.rows||[]).map(r=>{const c=r.snapshot?.calculation||r;return [r.month,r.employeeName||r.name||r.snapshot?.employee?.name,r.payDate,r.paidDate||'',c.gross,c.deductions,c.net,statuses[r.status]||r.status];})];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`Bridge_Wonder_Payroll_${year}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function payslipHTML(s,meta={}) {
    const c=s.calculation,e=s.employee,v=s.settings;
    const rows=items=>(items||[]).map(i=>`<tr><td>${esc(i.label||i.name)}</td><td class="money">${won(i.amount)}</td><td>${esc(i.calculation||'')}</td></tr>`).join('');
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${esc(s.month)} 급여명세서 · ${esc(e.name)}</title><style>body{font:14px/1.65 system-ui,-apple-system,'Noto Sans KR',sans-serif;color:#263a2a;max-width:860px;margin:40px auto;padding:0 24px}header{border-bottom:2px solid #42583d;padding-bottom:18px;margin-bottom:22px}h1{font-size:28px;margin:5px 0}h2{font-size:17px;margin-top:26px}.brand{font-size:12px;letter-spacing:.12em;color:#7e8f73}.info{display:grid;grid-template-columns:1fr 1fr;gap:8px 25px;font-size:13px}.info span{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 8px;border-bottom:1px solid #dce3d8;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f5ec}.money{text-align:right;white-space:nowrap}.total{display:flex;justify-content:space-between;background:#edf3e6;padding:15px 18px;margin-top:20px;font-size:20px;font-weight:700}.note{font-size:11px;color:#65735f;overflow-wrap:anywhere}.print{border:0;background:#42583d;color:white;padding:11px 20px;border-radius:7px;cursor:pointer;margin-bottom:20px}.summary{display:flex;gap:30px;justify-content:flex-end;margin-top:12px;font-size:13px}@media print{@page{size:A4;margin:15mm}body{margin:0;padding:0;max-width:none}.print{display:none}tr,.total{break-inside:avoid}thead{display:table-header-group}h2{break-after:avoid}a{color:inherit}}@media(max-width:500px){.info{grid-template-columns:1fr}body{padding:0 14px}.summary{display:block}}</style></head><body><button class="print" onclick="window.print()">인쇄 / PDF로 저장</button><header><div class="brand">BRIDGE WONDER · PAY STATEMENT</div><h1>급여명세서</h1><span>${esc(s.month)} 귀속 · 지급 예정일 ${esc(s.payDate)}<br>실제 지급일 ${esc(meta.paidDate||'미기록')} · ${esc(statuses[meta.status]||'확정')}</span></header><div class="info"><span><b>사업장</b> ${esc(v.businessName)}</span><span><b>사업자등록번호</b> ${esc(v.businessNumber)}</span><span><b>대표자</b> ${esc(v.representative)}</span><span><b>주소</b> ${esc(v.address)}</span><span><b>직원 성명</b> ${esc(e.name)}</span><span><b>직원번호</b> ${esc(e.id)}</span><span><b>부서 / 직위</b> ${esc(e.department)} / ${esc(e.position)}</span><span><b>급여 유형</b> ${esc({monthly:'월급제',hourly:'시급제',daily:'일급제'}[e.payType])}</span></div><h2>지급 내역</h2><table><thead><tr><th>항목</th><th class="money">금액</th><th>계산 방법</th></tr></thead><tbody>${rows(c.payItems)}</tbody></table><div class="summary"><span>지급 합계 ${won(c.gross)}</span><span>비과세 합계 ${won(c.taxFree)}</span></div><h2>공제 내역</h2><table><thead><tr><th>항목</th><th class="money">금액</th><th>계산 방법 / 근거</th></tr></thead><tbody>${rows(c.deductionItems)}</tbody></table><div class="summary">공제 합계 ${won(c.deductions)}</div><div class="total"><span>실지급액</span><span>${won(c.net)}</span></div><p class="note">세액 확인: ${esc(s.inputs.taxReference)}<br>보험료 확인: ${esc(s.inputs.insuranceReference)}<br>확정일: ${esc(s.confirmedAt||'')} · 확정 당시의 지급·공제 내역입니다.</p></body></html>`;
  }
  function dispose(){if(current){current.alive=false;current.epoch++;current.data=null;current.preview=null;current.report=null;current.root.replaceChildren();current.root.classList.remove('payroll');current=null;}}
  async function mount(root,ctx) {
    dispose();if(ctx.user?.role!=='owner')throw Error('급여관리는 원장 계정에서만 이용할 수 있습니다.');
    const s=makeScope(root,ctx);current=s;root.classList.add('payroll');root.innerHTML='<div class="pay-loading" role="status">급여 정보를 불러오는 중입니다.</div>';
    try{await refresh(s);}catch(e){if(!s.valid())return;root.innerHTML=header(s)+`<section class="pay-card"><h3>급여 정보를 불러오지 못했습니다</h3><p class="pay-message error">${esc(e.message)}</p><p class="pay-note">급여 자료가 보이지 않으면 직원용 서버 연결과 초기 설정을 확인해 주세요.</p>${btn('refresh','다시 조회',true)}</section>`;bind(s);}
  }
  global.BWPayroll=Object.freeze({mount,dispose,beforeLeave:()=>!current||allowDiscard(current),version:'26.0.0'});
})(window);
