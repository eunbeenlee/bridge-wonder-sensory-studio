/* Bridge Wonder V49 | owner-only studio finance dashboard.
 * Uses the private staff RPCs for ledger storage. Never reads private finance data
 * from a public asset, browser storage, analytics or public-site endpoints.
 */
(function(global){
  'use strict';
  const $=(root,sel)=>root.querySelector(sel);
  const escapeHTML=v=>String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const M=global.BW49FinanceModel;
  const money=M.krw;
  const num=v=>Number.isFinite(v)?v:0;
  const displayPercent=v=>Number.isFinite(v)?v.toFixed(1)+'%':'산출 불가';
  const monthNow=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}).slice(0,7);
  const dateNow=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
  const requestId=()=>global.crypto?.randomUUID?.()||'00000000-0000-4000-8000-'+Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12);
  const errorMessage=e=>String(e?.message||e||'요청을 완료하지 못했습니다.');
  function field(row,values){
    const key=row[0],label=row[1],unit=row[2],note=row[4];
    const value=values[key];
    const isCapacity=key==='capacity';
    const step=unit==='%'||unit==='개월'||key==='regularFee'?'0.01':'1';
    return '<div class="bw49-field"><label for="bw49-'+key+'">'+escapeHTML(label)+'</label>'+
      '<div class="bw49-control"><input id="bw49-'+key+'" name="'+key+'" type="number" step="'+step+'" min="0"'+
      (isCapacity?' max="4" readonly':'')+' inputmode="decimal" value="'+escapeHTML(value)+'"><span>'+escapeHTML(unit)+'</span></div>'+
      '<small>'+escapeHTML(note)+'</small></div>';
  }
  function selectField(def,value){
    return '<div class="bw49-field"><label for="bw49-'+def.key+'">'+escapeHTML(def.label)+'</label>'+
      '<select id="bw49-'+def.key+'" name="'+def.key+'">'+def.values.map(row=>
        '<option value="'+escapeHTML(row[0])+'"'+(row[0]===value?' selected':'')+'>'+escapeHTML(row[1])+'</option>').join('')+
      '</select></div>';
  }
  function groupHTML(group,values,index){
    return '<details class="bw49-group"'+(index===0||index===1?' open':'')+'><summary>'+escapeHTML(group.title)+
      ' <small>('+group.fields.length+'개 항목)</small></summary><div class="bw49-fields">'+group.fields.map(row=>field(row,values)).join('')+'</div></details>';
  }
  function kpi(label,value,hint,critical){
    return '<article class="bw49-kpi'+(critical?' negative':'')+'"><small>'+escapeHTML(label)+
      '</small><strong>'+escapeHTML(value)+'</strong><em>'+escapeHTML(hint)+'</em></article>';
  }
  function tabRow(title,value,critical){
    return '<tr><td>'+escapeHTML(title)+'</td><td'+(critical?' class="negative"':'')+'>'+escapeHTML(money(value))+'</td></tr>';
  }
  function makeCSV(rows,headers){
    const quote=x=>'"'+String(x==null?'':x).replace(/"/g,'""')+'"';
    return '\uFEFF'+[headers,...rows].map(r=>r.map(quote).join(',')).join('\r\n');
  }
  async function mount(root,ctx){
    if(!root||!ctx||!ctx.token||ctx.user?.role!=='owner'||!M)throw Error('운영 손익은 원장 계정에서만 이용할 수 있습니다.');
    const session=ctx.token,nav=ctx.navigation;
    const good=()=>ctx.isCurrent()&&root.isConnected;
    let values={...M.DEFAULTS},savedRevision=0,savedUpdated='',entries=[],backend=false,working=false;
    let period=monthNow(),tab='overview',edit=null,budgetDirty=false,entryDirty=false,refreshing=false,readEpoch=0,budgetPending=null,entryPending=null;
    const groups=M.FIELD_GROUPS,special=M.SPECIAL_FIELDS,categories=M.CATEGORY;
    const find=sel=>$(root,sel);
    const note=(message,warning)=>{
      const el=find('#bw49State');if(!el)return;
      el.textContent=message;el.classList.toggle('warning',Boolean(warning));
    };
    root.innerHTML='<div class="bw49" id="bw49Root">'+
      '<div class="bw49-header"><div><h2>운영 손익·현금흐름</h2>'+
      '<p>정규 10주 320,000원 · 한 반 최대 4명. 평균 유료 등록 인원에 따라 예상 매출을 조절할 수 있어요.</p></div>'+
      '<div class="bw49-actions"><a class="btn btn-outline btn-small" href="/staff/planning/">반별 손익 계획</a></div>'+
      '<div class="bw49-month"><label for="bw49Month">조회 연월</label><input id="bw49Month" type="month" value="'+period+'"></div></div>'+
      '<div class="bw49-alert warning" id="bw49State" role="status">재무 자료 저장 기능을 확인하고 있습니다.</div>'+
      '<nav class="bw49-tabs" role="tablist" aria-label="재무 관리 항목">'+
        [['overview','손익 요약'],['budget','예산·가정'],['ledger','실제 거래'],['opening','개원자금'],['tax','세금·보험']].map(row=>
         '<button type="button" role="tab" data-bw49tab="'+row[0]+'" aria-selected="'+(row[0]===tab)+'">'+row[1]+'</button>').join('')+
      '</nav>'+
      '<section class="bw49-pane" data-bw49pane="overview">'+
        '<div class="bw49-cards" id="bw49OverviewCards"></div>'+
        '<div class="bw49-2col"><div class="bw49-panel"><h3>월 예상 손익계산</h3>'+
        '<div class="bw49-table-scroll"><table class="bw49-table"><thead><tr><th>항목</th><th>예상 금액</th></tr></thead><tbody id="bw49ProfitRows"></tbody></table></div></div>'+
        '<div class="bw49-panel"><h3>손익분기점·가동률</h3><div id="bw49BreakEven"></div></div></div>'+
        '<div class="bw49-panel"><h3>실제 거래와 예상값 비교</h3><p>실제 거래는 원장님이 아래 ‘실제 거래’ 탭에 입력한 기록만 합산합니다. 기존 수납·급여 대장과 자동 연결되지 않습니다.</p>'+
        '<div class="bw49-cards" id="bw49ActualCards"></div></div></section>'+
      '<section class="bw49-pane" data-bw49pane="budget" hidden>'+
        '<div class="bw49-panel"><h3>예산 입력·손익 시뮬레이션</h3>'+
        '<p>10주 이용료와 예상 등록 인원을 먼저 설정하세요. 아래 원가·비용·세율도 모두 바꿀 수 있습니다.</p>'+
        '<form id="bw49BudgetForm">'+
        '<div class="bw54-budget-quick" aria-label="정규 요금·유료 등록 인원 조절">'+
          '<div class="bw54-budget-intro"><div><b>정규 과정·등록 인원</b><p>최대 4명 정원이더라도 1~3명만 등록할 수 있어요. 미등록 인원은 매출에 포함하지 않습니다.</p></div>'+
          '<button type="button" class="btn btn-outline btn-small" id="bw54ApplyStandard">10주 320,000원 적용</button></div>'+
          '<div class="bw54-budget-grid"><label for="bw54TermFee"><span>정규 과정 총액 (원)</span><input id="bw54TermFee" type="number" min="0" max="100000000" step="1" value="320000" inputmode="numeric"></label>'+
          '<label for="bw54PaidSeats"><span>한 회 평균 유료 등록 인원 (명)</span><input id="bw54PaidSeats" type="number" min="0" max="4" step="0.25" value="3" inputmode="decimal"></label>'+
          '<div class="bw54-budget-result"><span>회당 환산 이용료</span><strong id="bw54UnitFee">32,000원</strong><small>총액 ÷ 정규 수업 횟수</small></div></div>'+
          '<div class="bw54-seat-presets" role="group" aria-label="유료 등록 인원 바로 선택">'+
          [1,2,3,4].map(n=>'<button class="bw54-seat-button" type="button" data-bw54seats="'+n+'">'+n+'명</button>').join('')+
          '</div>'+
          '<p class="bw49-small">실제 반별 정원은 ‘클래스 정원’ 메뉴에서 1~4명으로 설정합니다. 결석은 자동 환불로 처리하지 않으며, 요금·등록률 변경은 이 예산 화면의 예상값에 먼저 적용됩니다.</p></div>'+
        '<div class="bw49-form-groups">'+groups.filter(g=>g.id!=='opening').map((group,i)=>groupHTML(group,values,i)).join('')+
        '</div><div class="bw49-actions" style="margin-top:15px"><button type="submit" id="bw49SaveBudget" class="btn btn-primary">예산 설정 저장</button>'+
        '<button type="button" class="btn btn-outline" id="bw49ResetBudget">예시값으로 돌아가기</button>'+
        '<span class="bw49-feedback" id="bw49SaveStatus" role="status"></span></div></form></div></section>'+
      '<section class="bw49-pane" data-bw49pane="ledger" hidden>'+
        '<div class="bw49-panel"><h3>실제 입출금 등록</h3><p>은행 계좌와 자동 연동되지 않습니다. 결제·지급이 확인된 금액만 입력하고, 부가세 예수금·보증금·대표자 인출은 별도 분류해 주세요.</p>'+
        '<form id="bw49TransactionForm" class="bw49-actual-form">'+
        '<div class="bw49-field"><label for="bw49Date">거래일</label><input type="date" id="bw49Date" required></div>'+
        '<div class="bw49-field"><label for="bw49Category">거래 분류</label><select id="bw49Category" required>'+
        categories.map(x=>'<option value="'+x.id+'">'+escapeHTML(x.label)+'</option>').join('')+'</select></div>'+
        '<div class="bw49-field"><label for="bw49Amount">금액 (원)</label><input id="bw49Amount" type="number" min="1" max="1000000000" step="1" required></div>'+
        '<div class="bw49-field"><label for="bw49Method">지급수단</label><select id="bw49Method"><option>계좌이체</option><option>카드</option><option>현금</option><option>기타</option></select></div>'+
        '<div class="bw49-field full"><label for="bw49Note">거래 메모 (선택)</label><input id="bw49Note" type="text" maxlength="160" placeholder="예: 11월 임대료"></div>'+
        '<div class="bw49-actions full"><button class="btn btn-primary" id="bw49SaveEntry" type="submit">거래 기록 저장</button>'+
        '<button class="btn btn-outline" type="button" id="bw49CancelEdit">입력 초기화</button><span id="bw49EntryStatus" class="bw49-feedback" role="status"></span></div>'+
        '</form></div>'+
        '<div class="bw49-panel"><div class="bw49-panel-head"><h3>선택한 달의 거래 내역</h3>'+
        '<button class="btn btn-outline btn-small" type="button" id="bw49Export">CSV 내려받기</button></div>'+
        '<p>수정·취소 시 원본 기록을 삭제하지 않고 변경 이력이 남습니다. 세무 신고자료를 대신하지 않습니다.</p>'+
        '<div id="bw49Transactions"></div></div></section>'+
      '<section class="bw49-pane" data-bw49pane="opening" hidden>'+
        '<div class="bw49-cards" id="bw49OpeningCards"></div>'+
        '<div class="bw49-panel"><h3>초기 지출·운영자금 계획</h3><p>보증금 1,000만 원은 매월 비용이 아니라 회수 예정 자산입니다. 인테리어·설비는 현금 유출과 감가상각 손익 비용을 따로 봅니다.</p>'+
        '<div class="bw49-table-scroll"><table class="bw49-table"><thead><tr><th>항목</th><th>예상 금액</th></tr></thead><tbody id="bw49OpeningRows"></tbody></table></div></div>'+
        '<div class="bw49-panel"><h3>개원 비용 입력</h3><div class="bw49-fields" id="bw49OpeningFields">'+
        groups.find(g=>g.id==='opening').fields.map(row=>field(row,values)).join('')+'</div></div></section>'+
      '<section class="bw49-pane" data-bw49pane="tax" hidden>'+
        '<div class="bw49-panel"><h3>부가세 과세 사업자 기준</h3>'+
        '<p>기본은 일반과세 10%이며, 수업료는 부가세 포함 소비자가격으로 가정합니다. 간이과세는 실제 업종·등록 상태가 확인된 경우만 선택하세요.</p>'+
        '<div class="bw49-special" id="bw49TaxFields">'+special.map(s=>selectField(s,values[s.key])).join('')+'</div>'+
        '<div id="bw49VATPreview" style="margin-top:13px"></div></div>'+
        '<div class="bw49-2col bw54-tax-columns"><div class="bw49-panel"><h3>종합소득세·지방소득세</h3><div id="bw49IncomeTax"></div></div>'+
        '<div class="bw49-panel"><h3>직원 사업주 부담 보험·퇴직급여</h3><div id="bw49EmployerCost"></div></div></div>'+
        '<div class="bw49-alert warning">세금 계산은 예산을 위한 참고치입니다. 실제 신고는 매출·매입 증빙, 사업자 과세유형, 인적공제, 다른 소득, 세액공제, 예정·확정신고 및 실제 고지서를 기준으로 확인해야 합니다. 2027년 개원 시 변경된 요율을 다시 입력하세요.</div></section>'+
      '</div>';
    const financeRoot=find('#bw49Root');
    global.BW57Workspace?.setGuard(()=>good()?(working?'저장 결과가 아직 확인되지 않았습니다. 이동할까요?':budgetDirty||entryDirty||budgetPending||entryPending?'저장하지 않았거나 확인이 필요한 재무 입력이 있습니다. 이동할까요?':''):'');
    function collect(){
      const value={...values};
      for(const group of groups)for(const row of group.fields){
        const input=find('#bw49-'+row[0]);
        if(input)value[row[0]]=Number(input.value)||0;
      }
      for(const def of special){const input=find('#bw49-'+def.key);if(input)value[def.key]=input.value;}
      // Capacity is a four-child policy ceiling; paid enrollment is the editable occupancy assumption.
      value.capacity=4;
      return M.sanitize(value);
    }
    function updateInputValues(){
      for(const g of groups)for(const f of g.fields){
        const el=find('#bw49-'+f[0]);if(el)el.value=values[f[0]];
      }
      for(const entry of special){const el=find('#bw49-'+entry.key);if(el)el.value=values[entry.key];}
      syncQuickControls();
    }
    // V54 stores only existing, authorized V49 fields (regularFee/termWeeks/occupancy).
    // The UI's 10-week total and 0–4 paid-seat editor need no new Apps Script API.
    function syncQuickControls(except){
      const weeks=Math.max(1,Number(find('#bw49-termWeeks')?.value)||10);
      const perVisit=Math.max(0,Number(find('#bw49-regularFee')?.value)||0);
      const paidSeats=Math.max(0,Math.min(4,(Number(find('#bw49-occupancy')?.value)||0)*4/100));
      if(except!=='fee')find('#bw54TermFee').value=String(Math.round(weeks*perVisit));
      if(except!=='seats')find('#bw54PaidSeats').value=String(Math.round(paidSeats*100)/100);
      find('#bw54UnitFee').textContent=money(perVisit);
      financeRoot.querySelectorAll('[data-bw54seats]').forEach(btn=>{
        btn.setAttribute('aria-pressed',String(paidSeats===Number(btn.dataset.bw54seats)));
      });
    }
    function updateFromTermTotal(){
      const weeks=Number(find('#bw49-termWeeks').value);
      if(!Number.isFinite(weeks)||weeks<1)return;
      const total=Math.max(0,Math.min(100000000,Number(find('#bw54TermFee').value)||0));
      find('#bw49-regularFee').value=String(Math.round(total/weeks*100)/100);
    }
    function updateFromPaidSeats(){
      const count=Math.max(0,Math.min(4,Number(find('#bw54PaidSeats').value)||0));
      find('#bw49-occupancy').value=String(Math.round(count*25*100)/100);
    }
    function rowText(key,amount){return '<tr><td>'+escapeHTML(key)+'</td><td>'+escapeHTML(money(amount))+'</td></tr>';}
    function summary(d){
      const overview=find('#bw49OverviewCards');
      overview.innerHTML=[
        kpi('월 예상 결제액',money(d.salesGross),'부가세 포함 고객 납부액',false),
        kpi('월 추정 영업손익',money(d.operatingProfit),'세금 적립 전 · 감가상각 반영',d.operatingProfit<0),
        kpi('월 추정 잔여현금',money(d.cashAfterTax),'원장 인출·세금 적립 반영',d.cashAfterTax<0),
        kpi('손익분기 등록률',displayPercent(d.breakEvenFill),'주 '+d.input.weeklyClasses+'회 운영 기준',!d.occupancyFeasible)
      ].join('');
      find('#bw49ProfitRows').innerHTML=
        rowText('정규 수업 결제액',d.regGross)+
        rowText('체험·기타 결제액',d.trialGross+d.otherGross)+
        rowText('고객 결제 총액',d.salesGross)+
        rowText('매출에 포함된 부가세 (참고)',-d.outputVat)+
        '<tr class="total">'+rowText('매출(부가세 제외)',d.revenueBook).replace('<tr>','').replace('</tr>','')+'</tr>'+
        rowText('시설·월 고정비',-d.fixedBase)+rowText('재료·소모품',-d.material)+
        rowText('카드/PG 수수료',-d.processing)+
        rowText('직원 급여·사업주 4대보험·퇴직충당',-(d.wages+d.employerTotal))+
        rowText('외주 인건비',-d.input.contractLabor)+
        rowText('대표자 건강보험 참고',-d.input.ownerHealth)+
        rowText('비현금 감가상각',-d.input.depreciation)+
        '<tr class="total">'+rowText('월 예상 영업손익',d.operatingProfit).replace('<tr>','').replace('</tr>','')+'</tr>';
      const max=Math.max(1,Math.min(100,d.breakEvenFill)),fill=Math.max(0,Math.min(100,d.input.occupancy));
      find('#bw49BreakEven').innerHTML=
        '<p class="bw49-small">한 회 최대 4명 · 유료 등록 평균 '+d.registeredPerSession.toFixed(2)+'명 · 주 '+d.input.weeklyClasses+'회 수업(월 평균 '+d.monthlyClasses.toFixed(1)+'회) 기준입니다.</p>'+
        '<div class="bw49-meter" aria-label="평균 가동률 '+fill.toFixed(1)+'%"><span style="width:'+fill+'%"></span></div>'+
        '<p class="bw49-small">현재 가정: '+fill.toFixed(1)+'% · 예상 이용 '+d.monthlySessions.toFixed(1)+'회(아이 기준) / 월</p>'+
        '<div class="bw49-table-scroll"><table class="bw49-table"><tbody>'+
        rowText('아이 1회당 공헌이익',d.unitContribution)+
        rowText('한 달에 필요한 아이 참여 횟수',d.targetSeats===Infinity?0:d.targetSeats)+
        '</tbody></table></div>'+
        (d.occupancyFeasible?
         '<div class="bw49-alert">추정 손익분기점은 평균 '+displayPercent(d.breakEvenFill)+' 등록률입니다. 실제 결석·휴강·시즌 수요를 고려하세요.</div>':
         '<div class="bw49-alert warning">현재 주간 수업 편성만으로는 손익분기점을 넘기기 어려울 수 있습니다. 가격·원가·반 편성 또는 등록률을 함께 조정해 보세요.</div>')+
        '<p class="bw49-small">정규 과정 '+d.input.termWeeks+'주 총 '+money(d.termTotal)+'(회당 환산 '+money(d.input.regularFee)+') 기준입니다. 선결제와 실제 제공 회차 매출을 중복 합산하지 마세요.</p>';
      const actual=d.actual;
      find('#bw49ActualCards').innerHTML=[
        kpi('기록된 현금 수입',money(actual.income),'선택한 월 거래내역 기준',false),
        kpi('기록된 운영지출',money(actual.opex+actual.ownerHealth),'결제 실제 발생분',false),
        kpi('실제 거래 기준 영업현금차',money(actual.operatingPnl),'감가상각·미수금·미지급금 미반영',actual.operatingPnl<0),
        kpi('전체 현금 순변동',money(actual.netCash),'보증금·투자·세금·대표 인출 등 포함',actual.netCash<0)
      ].join('');
    }
    function opening(d){
      find('#bw49OpeningCards').innerHTML=[
        kpi('임대보증금',money(d.input.deposit),'반환 예정 자산',false),
        kpi('초기 투자·예비비',money(d.initialNonDeposit),'보증금 외 현금 확보액',false),
        kpi('운영자금 여유분',money(d.operatingCashReserve),d.input.workingCapitalMonths+'개월 기준',false),
        kpi('총 개원 필요자금',money(d.startupTotal),'초기 지출 + 운영자금',false)
      ].join('');
      const rows=groups.find(g=>g.id==='opening').fields.filter(f=>f[0]!=='workingCapitalMonths').map(f=>rowText(f[1],d.input[f[0]])).join('');
      find('#bw49OpeningRows').innerHTML=rows+'<tr class="total">'+rowText('초기 지출·예비비 합계',d.startupImmediate).replace('<tr>','').replace('</tr>','')+'</tr>'+
        '<tr class="total">'+rowText('운영자금 포함 총 필요액',d.startupTotal).replace('<tr>','').replace('</tr>','')+'</tr>';
    }
    function tax(d){
      const table=(values)=>'<div class="bw49-table-scroll"><table class="bw49-table"><tbody>'+
        values.map(x=>rowText(x[0],x[1])).join('')+'</tbody></table></div>';
      find('#bw49VATPreview').innerHTML=
        '<div class="bw49-grid2"><div>'+table([
         ['월 결제액(입금 예상)',d.salesGross],
         ['공급가액(예상)',d.revenueBook],
         ['매출 부가세',d.outputVat],
         ['월세·관리비 부가세 추가 지출',d.vatPaidOnRent],
         ['공제 가능한 매입세액 가정',d.vatRecoverable],
         ['월 부가세 적립 추정',d.vatEstimate||0]])+'</div></div>'+
        '<div class="bw49-alert warning">월세·기본관리비 70만·30만원은 계약서상 부가세 별도 여부가 미확정입니다. 별도 청구되는 경우에만 체크하고, 세금계산서 등 적격증빙으로 공제 가능 여부를 확인하세요. 간이과세 예상액은 정확한 신고액이 아닙니다.</div>';
      find('#bw49IncomeTax').innerHTML=table([
        ['사업장 연간 예상 영업손익',d.annualOperatingProfit],
        ['연간 과세표준(다른 소득 합산·공제 후 추정)',d.combinedBase],
        ['연간 사업으로 인한 추가 종합소득세 추정',d.annualIncomeTax],
        ['연간 개인지방소득세 추정',d.annualLocalTax],
        ['월 세금 적립 참고액',d.monthlyIncomeTax]
      ])+'<p class="bw49-small">개인사업자 대표자 생활비 인출은 비용이 아닙니다. 국민연금은 사업 운영비와 별도로 현금유출로 보며, 실제 소득공제 가능 여부는 확인하세요. 실제 종합소득세는 연 1회 신고 결과로 달라집니다.</p>';
      find('#bw49EmployerCost').innerHTML=table([
        ['직원 월 급여',d.wages],
        ['사업주 국민연금',d.employerPension],
        ['사업주 건강보험',d.employerHealth],
        ['건강보험에 따른 장기요양',d.employerLtc],
        ['고용보험(사업주)',d.employerEmployment],
        ['산재보험(예시)',d.employerAccident],
        ['퇴직급여 준비액',d.severance],
        ['월 사업주 추가 부담 총액',d.employerTotal]
      ])+'<p class="bw49-small">4대보험 요율은 2026년 참고치이며 업종, 근무시간, 연령, 가입 여부와 보험료 고지에 따라 달라집니다. 직원 원천세는 직원 급여에서 공제·납부하는 예수금이므로 중복 비용으로 잡지 않습니다.</p>';
    }
    function transactionRows(){
      if(!entries.length){find('#bw49Transactions').innerHTML='<div class="bw49-empty">선택한 달에 등록된 거래가 없습니다.</div>';return;}
      find('#bw49Transactions').innerHTML='<div class="bw49-table-scroll"><table class="bw49-table"><thead><tr>'+
        ['날짜','구분','금액','메모','수정·취소'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+
        entries.map(e=>'<tr><td>'+escapeHTML(e.date)+'</td><td>'+escapeHTML(categories.find(c=>c.id===e.category)?.label||e.category)+'</td>'+
        '<td>'+escapeHTML(money(e.amount))+'</td><td>'+escapeHTML(e.note||e.method)+'</td><td>'+
        '<div class="bw49-actions"><button type="button" class="btn btn-outline btn-small" data-bw49-edit="'+escapeHTML(e.id)+'">수정</button>'+
        '<button type="button" class="bw49-delete" data-bw49-void="'+escapeHTML(e.id)+'">취소</button></div></td></tr>').join('')+
        '</tbody></table></div>';
    }
    function calculate(except,updateLedger=false){
      values=collect();
      const d=M.compute(values,entries);
      summary(d);opening(d);tax(d);if(updateLedger)transactionRows();syncQuickControls(except);
      return d;
    }
    function activate(name){
      tab=name;
      financeRoot.querySelectorAll('[data-bw49tab]').forEach(button=>{
        const active=button.dataset.bw49tab===name;
        button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
      });
      financeRoot.querySelectorAll('[data-bw49pane]').forEach(pane=>pane.hidden=pane.dataset.bw49pane!==name);
    }
    function allowSave(allowed){
      backend=allowed;
      const save=find('#bw49SaveBudget'),entry=find('#bw49SaveEntry');
      if(save)save.disabled=!allowed||working||refreshing;
      if(entry)entry.disabled=!allowed||working||refreshing;
    }
    async function refresh(){
      if(!good())return;
      const requestPeriod=period,epoch=++readEpoch;refreshing=true;allowSave(backend);
      try{
        const data=await ctx.call('staff49FinanceRead',session,requestPeriod);
        if(!good()||epoch!==readEpoch||period!==requestPeriod)return;
        if(!data||!Array.isArray(data.entries)||!data.settings)throw Error('재무 조회 결과를 확인해 주세요.');
        if(!budgetDirty&&!budgetPending&&data.settings.values){
          values=M.sanitize(data.settings.values);
          savedRevision=Number(data.settings.revision)||0;
          savedUpdated=String(data.settings.updatedAt||'');
          updateInputValues();
        }
        else if(!budgetDirty&&!budgetPending){values={...M.DEFAULTS};savedRevision=0;savedUpdated='';updateInputValues();}
        entries=data.entries;
        refreshing=false;allowSave(true);
        note('비공개 재무 기록과 연결됐습니다. 예상 손익은 가정값이며, 실제 입출금은 직접 등록한 거래만 표시됩니다.',false);
        calculate(undefined,true);
      }catch(error){
        if(!good()||epoch!==readEpoch||period!==requestPeriod)return;
        refreshing=false;allowSave(false);
        note('계산 기능은 사용할 수 있지만 저장·실제 거래 기록은 아직 연결되지 않았습니다. 직원용 Apps Script에 V49 재무 모듈을 설치하고 기존 웹앱을 재배포해 주세요. ('+
          escapeHTML(errorMessage(error))+')',true);
        entries=[];calculate(undefined,true);
      }finally{if(good()&&epoch===readEpoch){refreshing=false;allowSave(backend);}}
    }
    financeRoot.querySelectorAll('[data-bw49tab]').forEach(button=>button.onclick=()=>activate(button.dataset.bw49tab));
    financeRoot.addEventListener('input',event=>{
      const id=event.target.id;
      if(event.target.closest('#bw49TransactionForm')){entryDirty=true;return;}
      if(id==='bw49Month')return;
      budgetDirty=true;
      if(id==='bw54TermFee'){updateFromTermTotal();calculate('fee');return;}
      if(id==='bw54PaidSeats'){updateFromPaidSeats();calculate('seats');return;}
      if(id==='bw49-termWeeks'){updateFromTermTotal();calculate('fee');return;}
      if(event.target.matches('input[name]')||id.startsWith('bw49-')&&!['bw49Month','bw49Amount','bw49Date'].includes(id))calculate();
    });
    financeRoot.addEventListener('change',event=>{
      if(event.target.closest('#bw49TransactionForm')){entryDirty=true;return;}
      if(event.target.matches('select[name]')){budgetDirty=true;calculate();}
    });
    financeRoot.querySelectorAll('[data-bw54seats]').forEach(btn=>btn.onclick=()=>{
      budgetDirty=true;find('#bw54PaidSeats').value=btn.dataset.bw54seats;
      updateFromPaidSeats();calculate();
    });
    find('#bw54ApplyStandard').onclick=()=>{
      budgetDirty=true;find('#bw49-termWeeks').value='10';
      find('#bw49-regularFee').value='32000';
      calculate();
      find('#bw49SaveStatus').textContent='10주 320,000원 요금을 예상값에 적용했습니다. 유지하려면 아래 예산 설정 저장을 눌러 주세요.';
    };
    find('#bw49Month').onchange=async event=>{
      const requested=event.target.value;
      if(working||refreshing||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(requested)){event.target.value=period;return;}
      if((budgetDirty||entryDirty||budgetPending||entryPending)&&!global.confirm('저장하지 않았거나 확인이 필요한 입력값이 있습니다. 조회 월을 바꾸고 다시 불러올까요?')){event.target.value=period;return;}
      period=requested;budgetDirty=false;budgetPending=null;entryPending=null;resetEntry();await refresh();
    };
    find('#bw49BudgetForm').onsubmit=async event=>{
      event.preventDefault();
      if(!backend||working||refreshing)return;
      const feedback=find('#bw49SaveStatus'),sent=collect(),key=JSON.stringify([savedRevision,sent]);
      if(budgetPending&&budgetPending.key!==key){feedback.textContent='이전 저장 결과를 먼저 확인해 주세요. 같은 내용으로 다시 시도하거나 조회 월을 다시 선택하세요.';return;}
      if(!budgetPending)budgetPending={key,requestId:requestId()};
      working=true;allowSave(backend);
      try{
        const result=await ctx.call('staff49FinanceSaveSettings',session,{
          revision:savedRevision,values:sent,requestId:budgetPending.requestId
        });
        if(!good())return;
        if(result?.ok!==true||!Number.isSafeInteger(Number(result.revision)))throw Error('저장 결과를 확인하지 못했습니다.');
        savedRevision=result.revision;budgetPending=null;budgetDirty=JSON.stringify(collect())!==JSON.stringify(sent);
        feedback.textContent=(result.auditWarning?'저장했으나 변경 이력을 확인해 주세요. ':'예산 가정이 저장됐습니다. ')+(budgetDirty?'저장 이후 수정한 값이 남아 있습니다.':'실제 회계장부나 계약 조건은 변경하지 않습니다.');
        calculate();
      }catch(error){if(good())feedback.textContent=errorMessage(error)+' 저장 결과가 불확실하면 다시 조회해 주세요.';}
      finally{working=false;if(good())allowSave(backend);}
    };
    find('#bw49ResetBudget').onclick=()=>{
      if(working||!global.confirm('화면의 예산 입력값을 예시값으로 되돌릴까요? 저장된 서버 설정은 바뀌지 않습니다.'))return;
      budgetDirty=true;values={...M.DEFAULTS};updateInputValues();calculate();
      find('#bw49SaveStatus').textContent='화면에서만 예시값으로 바꿨습니다. 서버 설정은 유지됩니다.';
    };
    function resetEntry(){
      edit=null;entryDirty=false;entryPending=null;const form=find('#bw49TransactionForm');
      form.reset();find('#bw49Date').value=period===monthNow()?dateNow():period+'-01';
      find('#bw49SaveEntry').textContent='거래 기록 저장';
      find('#bw49EntryStatus').textContent='';
    }
    find('#bw49TransactionForm').onsubmit=async event=>{
      event.preventDefault();if(!backend||working||refreshing)return;
      working=true;allowSave(backend);const form=find('#bw49TransactionForm');
      const fields=Array.from(form.querySelectorAll('input,select,textarea'));fields.forEach(el=>el.disabled=true);
      try{
        const date=find('#bw49Date').value;
        if(date.slice(0,7)!==period)throw Error('거래일이 조회 연월과 다릅니다.');
        const payload={id:edit?.id||'',revision:edit?.revision||0,month:period,date,
          category:find('#bw49Category').value,amount:Number(find('#bw49Amount').value),
          method:find('#bw49Method').value,note:find('#bw49Note').value.trim()};
        const key=JSON.stringify(payload);
        if(entryPending&&entryPending.key!==key)throw Error('이전 거래 저장 결과를 먼저 확인해 주세요.');
        if(!entryPending)entryPending={key,requestId:requestId()};
        payload.requestId=entryPending.requestId;
        const response=await ctx.call('staff49FinanceSaveEntry',session,payload);
        if(!good())return;
        if(response?.ok!==true)throw Error('거래 저장 결과를 확인하지 못했습니다.');
        resetEntry();await refresh();
        if(good())find('#bw49EntryStatus').textContent=response.auditWarning?'거래는 저장했으나 변경 이력을 확인해 주세요.':'거래 기록을 저장했습니다.';
      }catch(error){if(good())find('#bw49EntryStatus').textContent=errorMessage(error)+' 목록을 새로 확인한 뒤 다시 시도하세요.';}
      finally{working=false;if(good()){fields.forEach(el=>el.disabled=false);allowSave(backend);}}
    };
    find('#bw49CancelEdit').onclick=()=>{if(working||refreshing)return;if((entryDirty||entryPending)&&!global.confirm('거래 입력 또는 저장 확인 상태를 초기화할까요? 목록에서 저장 여부를 먼저 확인하세요.'))return;resetEntry();};
    find('#bw49Transactions').addEventListener('click',async event=>{
      const editButton=event.target.closest('[data-bw49-edit]');
      const voidButton=event.target.closest('[data-bw49-void]');
      const id=editButton?.dataset.bw49Edit||voidButton?.dataset.bw49Void;
      if(!id||working||refreshing)return;
      if((entryDirty||entryPending)&&!global.confirm('저장하지 않았거나 확인이 필요한 거래 입력이 있습니다. 바꿀까요?'))return;
      const e=entries.find(x=>x.id===id);if(!e)return;
      if(editButton){
        resetEntry();edit=e;entryDirty=true;find('#bw49Date').value=e.date;
        find('#bw49Category').value=e.category;
        find('#bw49Amount').value=e.amount;find('#bw49Method').value=e.method;
        find('#bw49Note').value=e.note||'';
        find('#bw49SaveEntry').textContent='수정 기록 저장';
        find('#bw49TransactionForm').scrollIntoView?.({behavior:'smooth',block:'start'});
      }else if(voidButton&&global.confirm('이 거래를 취소 처리할까요? 원본 기록은 삭제되지 않습니다.')){
        working=true;allowSave(backend);
        try{
          const result=await ctx.call('staff49FinanceVoidEntry',session,{id:e.id,revision:e.revision,requestId:requestId()});
          if(!result?.ok)throw Error('취소 결과를 확인하지 못했습니다.');
          if(good()){resetEntry();await refresh();}
        }catch(error){if(good())note(errorMessage(error),true);}
        finally{working=false;if(good())allowSave(backend);}
      }
    });
    find('#bw49Export').onclick=()=>{
      const headers=['거래일','거래분류','금액','지급수단','메모','기록ID','버전'];
      const csv=makeCSV(entries.map(e=>[e.date,categories.find(c=>c.id===e.category)?.label||e.category,
        e.amount,e.method,e.note,e.id,e.revision]),headers);
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
      try{
        const a=document.createElement('a');a.href=url;a.download='BridgeWonder_재무거래_'+period+'.csv';
        a.hidden=true;document.body.appendChild(a);a.click();a.remove();
      }finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
    };
    find('#bw49Date').value=period===monthNow()?dateNow():period+'-01';
    allowSave(false);calculate(undefined,true);activate(tab);await refresh();
  }
  global.BW49FinanceUI=Object.freeze({mount,version:'54.0.0'});
})(window);
