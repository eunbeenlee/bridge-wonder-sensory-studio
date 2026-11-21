/* Bridge Wonder V32 — Korean Academy Compliance Workspace
 * Lazy loaded from GitHub. Only references and status are displayed.
 * All sensitive reads and writes are authenticated in Apps Script.
 */
(function(global){
  'use strict';
  // V43: Applicability is subject to the real operation, not its tax registration name.
  // Preserve V32 code IDs because status records are keyed by those IDs.
  const LAW=Object.freeze({
    academy:'https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21501&ancYd=20260331&efYd=20261001&lsiSeq=285147',
    rules:'https://www.law.go.kr/LSW/lsInfoP.do?efYd=20261001&lsiSeq=290261',
    busan:'https://www.pen.go.kr/main/cm/cntnts/cntntsView.do?cntntsId=188&mi=30308',
    busanRules:'https://www.law.go.kr/ordinInfoP.do?ordinId=211002',
    privacy:'https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1034516085',
    child:'https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260227&lsiSeq=283741',
    vat:'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032155877',
    food:'https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1026749099',
    consumer:'https://www.law.go.kr/admRulInfoP.do?admRulSeq=2100000270136',
    commerce:'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=11300000006&HighCtg=',
    classification:'https://indicode.kr/explanation/industry/11/85709',
    smallGroup:'https://law.go.kr/LSW/expcInfoP.do?expcSeq=342701',
    safety:'https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260227&lsiSeq=283741',
    childcare:'https://law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1022687647',
    labour:'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1025589901',
    childProtection:'https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1033125939'
  });
  const CATALOG=Object.freeze([
    ['REG01','사업 형태','사업자등록 업종이 실제 운영과 맞는지 확인','관할 확인','교육지원 서비스업(85709)은 교육 지원업입니다. 직접 오감놀이 프로그램을 진행하는 경우에도 맞는 분류인지 세무서에 확인하세요.',LAW.classification],
    ['REG02','사업 형태','학원·교습소 등록이 필요한지 확인','관할 확인','7~48개월 아이 최대 4명, 보호자 4명 동반, 50분 대면 활동으로 운영합니다. 법제처의 2026년 소규모 대면교습 해석은 참고자료이며, 반을 동시에 운영하는지와 교습소 신고 해당 여부까지 북부교육지원청에 확인하세요.',LAW.smallGroup],
    ['REG03','사업 형태','건축물 용도와 실제 사용 공간 확인','관할 확인','2층 상가의 건축물대장과 평면도를 기준으로 사용 용도, 소방·피난, 건물 관리규약을 확인하세요.',LAW.busan],
    ['REG04','사업 형태','정규·체험 가격 및 할인 조건 점검','운영 확인','정규 50분 30,000원, 체험 50분 25,000원 안내와 할인 조건·재료 포함 여부를 홈페이지 및 실제 결제 금액과 대조하세요.',LAW.consumer],
    ['REG05','사업 형태','홍보 문구와 실제 프로그램 내용 대조','관할 확인','영어학원·어린이집·돌봄 서비스로 오해할 수 있는 표현은 사업 형태를 확인하기 전까지 사용하지 마세요.',LAW.academy],
    ['FEE01','결제·환불','결제 기록과 증빙 발행 확인','운영 확인','실제 결제와 카드전표·현금영수증 발행 내역을 대조하세요. 내부 납부 안내서는 영수증이 아닙니다.',LAW.consumer],
    ['FEE02','결제·환불','예약 변경·취소 조건 안내','운영 확인','체험과 정기 클래스의 취소·변경 시점을 나누어 안내하고, 이용 전에 보호자가 확인했는지 살펴보세요.',LAW.consumer],
    ['FEE03','결제·환불','적용되는 환불 규정 확인','관할 확인','학원법, 계속거래 및 소비자분쟁해결기준 적용 여부를 먼저 확인하세요. 기존 화면의 5일 계산값을 새 서비스의 법정기한으로 쓰지 마세요.',LAW.consumer],
    ['FEE04','결제·환불','부가세와 과세·면세 여부 확인','관할 확인','교육지원 서비스업 등록만으로 부가세가 면제되지는 않습니다. 실제 업종과 제공 서비스에 따라 과세·면세를 확인하세요.',LAW.vat],
    ['FEE05','결제·환불','신청·결제·환불 기록 대조','운영 확인','신청 내용, 수납 내역, 환불 처리와 증빙 보관 위치가 서로 맞는지 확인하세요.',LAW.consumer],
    ['STAFF01','직원 관리','근로계약·급여·보험 확인','법령 확인','직원별 고용 형태에 맞게 근로계약, 급여 및 사회보험 관련 기록을 관리하세요.',LAW.labour],
    ['STAFF02','직원 관리','성범죄·아동학대 취업제한 조회 대상 확인','관할 확인','실제 시설·사업 유형에 따라 취업제한 조회가 필요한지 관계기관에 확인하고, 조회 결과 원본은 별도 보관하세요.',LAW.childProtection],
    ['STAFF03','직원 관리','종사자 의무교육 대상 확인','관할 확인','아동학대 신고의무자 교육 등 직원에게 적용되는 교육을 확인하고 이수 기록을 보관하세요.',LAW.childcare],
    ['STAFF04','직원 관리','보호자 동반·인계 운영 원칙 정리','운영 확인','아이 한 명당 보호자 한 명이 수업 내내 동반합니다. 분리수업을 운영하지 않는다는 원칙과 인계 절차를 직원에게 공유하세요.',LAW.childcare],
    ['PRIV01','개인정보','아동 개인정보의 보호자 동의 확인','법령 확인','동의가 필요한 아동 개인정보 처리에는 법정대리인의 동의와 확인 절차가 필요합니다.',LAW.privacy],
    ['PRIV02','개인정보','사진·영상 활용 동의 따로 관리','법령 확인','사진 촬영과 홍보 활용의 동의 범위를 나누어 받고, 동의하지 않아도 기본 프로그램 이용에 불이익이 없게 관리하세요.',LAW.privacy],
    ['PRIV03','개인정보','개인정보 안내문·보관·삭제 기준','법령 확인','수집하는 정보와 보관 기간, 삭제 방법을 실제 운영 및 개인정보 처리방침과 맞춰 주세요.',LAW.privacy],
    ['PRIV04','개인정보','직원별 조회 권한·이용 기록 관리','법령 확인','퇴사·담당 변경 시 접근 권한을 정리하고 아동 정보와 기록을 승인된 직원에게만 공개하세요.',LAW.privacy],
    ['SAFE01','시설·안전','사고 배상책임보험 보장 범위 확인','관할 확인','영유아 체험 활동, 재료 사용, 낙상·배상책임을 실제로 보장하는지 보험 약관과 특약을 확인하세요.',LAW.safety],
    ['SAFE02','시설·안전','소방·피난·출입문과 안전 설비','관할 확인','아이 4명과 보호자 4명, 운영 직원의 수를 고려해 2층 상가의 출입·피난 동선과 소방·안전설비를 관할 부서와 확인하세요.',LAW.safety],
    ['SAFE03','시설·안전','보호자 인계·비상연락 절차 점검','운영 확인','참여 전 비상연락처를 확인하고 아이·보호자 1:1 참여를 안내하세요. 보호자가 잠시 자리를 비우려는 경우의 대응과 인계 방법도 정해 두세요.',LAW.childcare],
    ['SAFE04','시설·안전','식재료·자연재료 위생과 삼킴 위험 점검','운영 확인','재료는 만지기용과 먹기용을 구분하고, 7~48개월 아이의 삼킴·질식 위험과 식품 제공 여부를 확인하세요.',LAW.food],
    ['SAFE05','시설·안전','실내 놀이시설 해당 여부 및 교구 안전','관할 확인','설치한 놀이기구와 놀이공간에 어린이놀이시설법이 적용되는지 확인하세요. 2027년 개정 시행 내용도 별도로 검토하세요.',LAW.safety],
    ['OPS01','개원 준비','기관에 확인한 내용과 서류 보관','운영 확인','교육지원청·세무서·구청의 확인 내용과 회신 날짜, 건축물대장 등 증빙 위치를 남겨 두세요.',LAW.busan],
    ['OPS02','개원 준비','개원 전 미완료 사항과 담당자 정리','운영 확인','아직 답변을 받지 못한 항목은 완료로 표시하지 말고 담당자와 다음 확인일을 기록하세요.',LAW.busan],
    ['OPS03','개원 준비','수업 계획·안전 기록·보호자 안내 대조','운영 확인','월간 재료·활동 계획과 현장 점검표, 보호자 안내 내용이 서로 맞는지 확인하세요.',LAW.safety]
  ].map(x=>Object.freeze({code:x[0],category:x[1],title:x[2],kind:x[3],help:x[4],url:x[5]})));
  const STATUSES=['미확인','확인중','내부확인','보완필요'];
  const APPLIES=['확인필요','적용','해당없음'];
  const REFUND_REASONS=['학습자 수강 포기','학원 운영·교습 불가','등록말소·교습정지 등','격리 등 반환사유','기타(별도 확인)'];
  const REFUND_STATES=['접수','반환금액 검토','반환예정','반환완료','분쟁·보류'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selected=(choices,current)=>choices.map(x=>'<option value="'+esc(x)+'"'+(x===current?' selected':'')+'>'+esc(x)+'</option>').join('');
  const $=id=>document.getElementById(id);
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  const dueAfter=(iso,n)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';const d=new Date(iso+'T12:00:00+09:00');return new Date(d.getTime()+86400000*n).toISOString().slice(0,10);};
  const safeError=e=>String(e?.message||e||'처리 중 문제가 발생했습니다.');
  function downloadPdf(name,b64) {
    if(!/^BridgeWonder_[a-zA-Z0-9_]+\.pdf$/.test(name))throw Error('PDF 파일 이름이 올바르지 않습니다.');
    if(typeof b64!=='string'||b64.length>3000000||!/^[a-zA-Z0-9+/=\r\n]+$/.test(b64))throw Error('PDF 다운로드 데이터를 확인해 주세요.');
    const decoded=atob(b64),buffer=new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++)buffer[i]=decoded.charCodeAt(i);
    const blob=new Blob([buffer],{type:'application/pdf'}),url=URL.createObjectURL(blob);
    try{const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();}
    finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
  }
  function banner(text){
    return '<div class="bw32-notice">'+esc(text)+'</div>';
  }
  function summary(state){
    const all=CATALOG.map(c=>Object.assign({status:'미확인',applies:'확인필요',due:''},state.get(c.code)||{}));
    const internal=all.filter(x=>x.status==='내부확인'&&x.applies==='적용').length;
    const overdue=all.filter(x=>x.due&&x.due<today()&&x.status!=='내부확인').length;
    const waiting=all.filter(x=>x.applies==='확인필요'||x.status==='보완필요'||x.status==='미확인').length;
    return '<div class="bw32-stats"><div><span>전체 확인 항목</span><strong>'+all.length+'</strong></div><div><span>내부 확인 기록</span><strong>'+internal+'</strong></div><div><span>추가 확인 필요</span><strong>'+waiting+'</strong></div><div><span>예정일 경과</span><strong>'+overdue+'</strong></div></div>';
  }
  function complianceCard(item,data){
    const entry=Object.assign({code:item.code,status:'미확인',applies:'확인필요',due:'',checkedAt:'',assignee:'',evidence:'',note:'',revision:0},data||{});
    const late=entry.due&&entry.due<today()&&entry.status!=='내부확인';
    return '<details class="bw32-item" data-code="'+esc(item.code)+'" data-status="'+esc(entry.status)+'" data-applies="'+esc(entry.applies)+'" data-category="'+esc(item.category)+'" data-search="'+esc((item.title+' '+item.code+' '+item.category).toLowerCase())+'">'+
      '<summary><span class="bw32-item-title"><small>'+esc(item.code)+' · '+esc(item.category)+' · '+esc(item.kind)+'</small><b>'+esc(item.title)+'</b></span><span class="bw32-status'+(late?' late':'')+'">'+esc(late?'기한 경과':entry.status)+'</span></summary>'+
      '<div class="bw32-body"><p>'+esc(item.help)+'</p>'+
      '<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">관련 법령·기준 보기</a>'+
      '<form class="bw32-item-form" data-save="'+esc(item.code)+'">'+
      '<div class="bw32-grid">'+
      '<label>적용 여부<select name="applies">'+selected(APPLIES,entry.applies)+'</select></label>'+
      '<label>확인 상태<select name="status">'+selected(STATUSES,entry.status)+'</select></label>'+
      '<label>다음 확인일<input type="date" name="due" value="'+esc(entry.due)+'"></label>'+
      '<label>실제 확인일<input type="date" name="checkedAt" value="'+esc(entry.checkedAt)+'"></label>'+
      '<label>담당자<input name="assignee" maxlength="45" value="'+esc(entry.assignee)+'" placeholder="담당 직원"></label>'+
      '<label>비공개 증빙 참조<input name="evidence" maxlength="180" value="'+esc(entry.evidence)+'" placeholder="비공개 Drive 문서명 · 위치"></label>'+
      '</div><label>확인 메모<textarea name="note" maxlength="240" rows="2" placeholder="확인 근거 / 개선·재점검 사항">'+esc(entry.note)+'</textarea></label>'+
      '<p class="bw32-help">‘내부확인’은 실제 확인일과 증빙 참조가 필요합니다. ‘해당없음’은 판단 근거를 메모로 남겨야 합니다.</p>'+
      '<div class="bw32-actions"><button type="submit" class="btn btn-primary btn-small">이 항목 저장</button><small aria-live="polite" class="bw32-feedback"></small></div>'+
      '<input type="hidden" name="revision" value="'+Number(entry.revision||0)+'"></form></div></details>';
  }
  async function render(root,ctx) {
    if(!root||!ctx?.isCurrent?.())return;
    root.innerHTML='<h2 class="page-title">개원 준비·운영 기준</h2><p class="page-description">확인이 필요한 내용을 분야별로 정리했습니다. 답변을 받으면 날짜와 근거를 남겨 주세요.</p>'+banner('교육지원 서비스업으로 등록하더라도 실제로 영유아에게 수업을 제공한다면 학원법 적용 대상이 될 수 있습니다. 북부교육지원청과 세무서에 운영 계획을 설명하고 확인해 주세요. 아래 항목은 확인 목록이며 인허가를 대신하지 않습니다.')+
      '<div id="bw32Stats"></div>'+
      '<section class="panel bw32-main"><div class="bw32-top"><div><h3>운영 전 확인할 내용</h3><p>확인한 항목은 담당자와 관련 자료를 함께 기록해 주세요.</p></div><div class="bw32-actions"><button type="button" id="bw32Pdf" class="btn btn-primary">현장점검 준비 PDF 다운로드</button><button type="button" id="bw32OpenLegacy" class="btn btn-outline">기존 운영 점검표</button></div></div>'+
      '<div class="bw32-filters"><label>관리 분야<select id="bw32Category"><option value="">전체 분야</option></select></label><label>적용 여부<select id="bw32Applies"><option value="">전체</option></select></label><label>진행 상태<select id="bw32Status"><option value="">전체</option></select></label><label>검색<input type="search" id="bw32Search" placeholder="서류·보험·등록 검색"></label></div>'+
      '<p id="bw32Count" class="bw32-help" role="status"></p><div id="bw32Items">법정 점검 정보를 불러오는 중입니다…</div></section>'+
      '<section class="panel"><h3>기존 계약의 환불 기록</h3><p>기존 서버는 학원형 계약 기준으로 기한을 계산합니다. 신규 체험·정기 이용권의 환불 기준과 기한은 적용 법령을 확인해 따로 정해야 합니다.</p><button class="btn btn-outline" type="button" id="bw32Tuition">이용료·환불 기록 보기</button></section>';
    const data=await ctx.call('staff32ListCompliance',ctx.token);
    if(!ctx.isCurrent())return;
    const records=new Map(data.map(r=>[r.code,r]));
    const categories=[...new Set(CATALOG.map(c=>c.category))];
    $('bw32Category').innerHTML+='<optgroup label="확인 분야">'+selected(categories,'')+'</optgroup>';
    $('bw32Status').innerHTML+=selected(STATUSES,'');
    $('bw32Applies').innerHTML+=selected(APPLIES,'');
    const grid=$('bw32Items');
    const redraw=()=>{
      if(!ctx.isCurrent())return;
      const cat=$('bw32Category').value,status=$('bw32Status').value,applies=$('bw32Applies').value,q=$('bw32Search').value.trim().toLowerCase();
      const allowed=CATALOG.filter(c=>{
        const d=records.get(c.code)||{},s=d.status||'미확인',a=d.applies||'확인필요';
        return (!cat||c.category===cat)&&(!status||s===status)&&(!applies||a===applies)&&(!q||(c.title+' '+c.code+' '+c.category+' '+c.help).toLowerCase().includes(q));
      });
      $('bw32Count').textContent='표시 '+allowed.length+'건 / 총 '+CATALOG.length+'개 항목';
      $('bw32Stats').innerHTML=summary(records);
      grid.innerHTML=allowed.map(c=>complianceCard(c,records.get(c.code))).join('')||'<div class="empty">검색 조건과 일치하는 항목이 없습니다.</div>';
      grid.querySelectorAll('form[data-save]').forEach(form=>{form.onsubmit=async e=>{
        e.preventDefault();
        const button=form.querySelector('button[type=submit]'),message=form.querySelector('.bw32-feedback');
        const payload={code:form.dataset.save,status:form.elements.status.value,applies:form.elements.applies.value,
          due:form.elements.due.value,checkedAt:form.elements.checkedAt.value,assignee:form.elements.assignee.value,
          evidence:form.elements.evidence.value,note:form.elements.note.value,revision:Number(form.elements.revision.value)};
        button.disabled=true;message.textContent='저장 중…';
        try{const result=await ctx.call('staff32SaveCompliance',ctx.token,payload);
          if(!ctx.isCurrent())return;
          records.set(payload.code,Object.assign({},payload,{revision:result.revision}));
          message.textContent='저장 완료';ctx.toast('법정 점검 기록을 저장했습니다.');
          $('bw32Stats').innerHTML=summary(records);
        }catch(err){message.textContent=safeError(err);ctx.toast(safeError(err),true);}
        finally{button.disabled=false;}
      };});
    };
    ['bw32Category','bw32Status','bw32Applies'].forEach(id=>$(id).addEventListener('change',redraw));
    $('bw32Search').addEventListener('input',redraw);
    $('bw32OpenLegacy').onclick=()=>ctx.navigate('operations');
    $('bw32Tuition').onclick=()=>ctx.navigate('tuition');
    $('bw32Pdf').onclick=async()=>{const button=$('bw32Pdf');button.disabled=true;button.textContent='PDF 생성 중…';
      try{const result=await ctx.call('staff32DownloadInspectionPdf',ctx.token);
        downloadPdf(result.filename,result.base64);
        ctx.toast('현장점검 준비자료 PDF 다운로드를 시작했습니다. 원본도 비공개 Drive에 보관됩니다.');
      }catch(err){ctx.toast(safeError(err),true);}
      finally{if(button.isConnected){button.disabled=false;button.textContent='현장점검 준비 PDF 다운로드';}}
    };
    redraw();
  }
  function appendRefunds(root,ctx,students) {
    if(!root||root.querySelector('#bw32Refunds'))return;
    const section=document.createElement('section');section.id='bw32Refunds';section.className='panel bw32-refunds';
    section.innerHTML='<div class="bw32-top"><div><h3>기존 계약 환불대장</h3><p>기존 수강계약의 환불 내역을 확인하는 화면입니다. 새 스튜디오 서비스의 환불 기준을 자동 계산하는 기능은 아닙니다.</p></div><button id="bw32LoadRefunds" class="btn btn-outline" type="button">환불대장 열기</button></div>'+
      '<p class="bw32-help">이 화면의 5일 기한은 기존 서버 계산값이며 신규 교육지원 서비스에 바로 적용할 수 없습니다. 실제 환불 기한과 금액을 확인한 뒤 사용해 주세요.</p><div id="bw32RefundBody"></div>';
    root.appendChild(section);
    const load=$('bw32LoadRefunds'),body=$('bw32RefundBody');
    let rows=[],pending=null;
    let editingId='',editingRev=0;
    const options=(students||[]).filter(x=>x.receipt).map(x=>'<option value="'+esc(x.receipt)+'">'+esc((x.name||'수강생')+' · '+x.receipt)+'</option>').join('');
    const show=()=>{
      if(!ctx.isCurrent())return;
      body.innerHTML='<form id="bw32RefundForm" class="stack"><h4 id="bw32RefundMode">'+(editingId?'환불 기록 수정':'새 환불 기록')+'</h4>'+
      '<div class="bw32-grid">'+
      '<label>등록 접수<select id="bw32Receipt" required><option value="">수강등록 접수 선택</option>'+options+'</select></label>'+
      '<label>반환 사유<select id="bw32Reason" required>'+selected(REFUND_REASONS,REFUND_REASONS[0])+'</select></label>'+
      '<label>사유 발생일<input id="bw32Event" type="date" required></label>'+
      '<label>기존 시스템 참고일 (5일)<output id="bw32Due">사유 발생일 선택</output></label>'+
      '<label>실제 납부액 (원)<input id="bw32Paid" type="number" min="0" max="999999999" step="1" value="0" required></label>'+
      '<label>검토 반환액 (원)<input id="bw32Return" type="number" min="0" max="999999999" step="1" value="0" required></label>'+
      '<label>처리 상태<select id="bw32RefundStatus">'+selected(REFUND_STATES,'접수')+'</select></label>'+
      '<label>실제 반환일<input id="bw32Completed" type="date"></label>'+
      '<label>증빙 참조 (비공개)<input id="bw32RefundEvidence" maxlength="180" placeholder="이체확인증 등 비공개 문서 참조"></label>'+
      '</div><label>처리 메모<textarea id="bw32RefundNote" maxlength="240" rows="2" placeholder="금액 검토 근거·담당자 확인 내용 (계좌번호·민감정보 제외)"></textarea></label>'+
      '<div class="bw32-actions"><button type="submit" class="btn btn-primary">환불 처리 기록 저장</button><button type="button" class="btn btn-outline" id="bw32RefundNew">새 기록</button><span id="bw32RefundFeedback" role="status" class="bw32-help"></span></div></form>'+
      '<h4>기존 환불 기록 '+rows.length+'건</h4><div class="table-scroll"><table class="data-table"><thead><tr><th>관리번호</th><th>접수번호</th><th>기존 참고일</th><th>진행 상태</th><th>관리</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.receipt)+'</td><td>'+esc(x.due)+'</td><td>'+esc(x.status)+'</td><td><button class="btn btn-outline btn-small" type="button" data-bw32edit="'+esc(x.id)+'">수정</button></td></tr>').join('')+'</tbody></table></div>';
      const updateDue=()=>{$('bw32Due').textContent=dueAfter($('bw32Event').value,5)||'사유 발생일 선택';};
      $('bw32Event').addEventListener('change',updateDue);
      function reset(){
        editingId='';editingRev=0;pending=null;$('bw32RefundForm').reset();
        $('bw32Paid').value='0';$('bw32Return').value='0';
        $('bw32Completed').value='';$('bw32RefundMode').textContent='새 환불 기록';updateDue();
      }
      $('bw32RefundNew').onclick=reset;
      body.querySelectorAll('[data-bw32edit]').forEach(b=>b.onclick=()=>{
        const x=rows.find(r=>r.id===b.dataset.bw32edit);if(!x)return;
        editingId=x.id;editingRev=x.revision;pending=null;
        $('bw32Receipt').value=x.receipt;$('bw32Reason').value=x.reason;
        $('bw32Event').value=x.eventDate;$('bw32Paid').value=String(x.paid);
        $('bw32Return').value=String(x.returnAmount);$('bw32RefundStatus').value=x.status;
        $('bw32Completed').value=x.completedAt||'';$('bw32RefundEvidence').value=x.evidence||'';
        $('bw32RefundNote').value=x.note||'';$('bw32RefundMode').textContent='환불 기록 수정: '+x.id;
        updateDue();$('bw32RefundForm').scrollIntoView({behavior:'smooth',block:'start'});
      });
      $('bw32RefundForm').onsubmit=async e=>{
        e.preventDefault();const form=$('bw32RefundForm'),button=form.querySelector('[type=submit]'),feedback=$('bw32RefundFeedback');
        const payload={id:editingId,revision:editingRev,receipt:$('bw32Receipt').value,reason:$('bw32Reason').value,
          eventDate:$('bw32Event').value,paid:$('bw32Paid').value,returnAmount:$('bw32Return').value,
          status:$('bw32RefundStatus').value,completedAt:$('bw32Completed').value,
          evidence:$('bw32RefundEvidence').value,note:$('bw32RefundNote').value};
        const fingerprint=JSON.stringify(payload);
        if(pending&&pending.fingerprint!==fingerprint){feedback.textContent='앞선 저장 결과를 먼저 확인해 주세요. 기록 중복을 막기 위해 입력을 변경한 재전송은 중지했습니다.';return;}
        if(!pending){
          const bytes=new Uint8Array(16);
          crypto.getRandomValues(bytes);
          pending={fingerprint,operationId:Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')};
        }
        payload.operationId=pending.operationId;
        button.disabled=true;feedback.textContent='확인 기록 저장 중…';
        try{const result=await ctx.call('staff32SaveRefund',ctx.token,payload);
          pending=null;feedback.textContent=result.replayed?'기존 요청 결과를 확인했습니다.':'저장했습니다.';
          rows=await ctx.call('staff32ListRefunds',ctx.token);if(ctx.isCurrent()){editingId='';editingRev=0;show();}
          ctx.toast('환불 관리대장을 저장했습니다. 실제 반환금 지급 여부는 별도 확인하세요.');
        }catch(err){feedback.textContent=safeError(err);ctx.toast(safeError(err),true);}
        finally{if(button.isConnected)button.disabled=false;}
      };
    };
    load.onclick=async()=>{
      load.disabled=true;load.textContent='대장을 불러오는 중…';
      try{rows=await ctx.call('staff32ListRefunds',ctx.token);if(ctx.isCurrent()){show();load.textContent='환불대장 새로고침';}}
      catch(err){ctx.toast(safeError(err),true);load.textContent='환불대장 다시 열기';}
      finally{load.disabled=false;}
    };
  }
  global.BW32Compliance=Object.freeze({render,appendRefunds,catalog:CATALOG});
})(window);
