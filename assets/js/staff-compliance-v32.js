/* Bridge Wonder V32 — Korean Academy Compliance Workspace
 * Lazy loaded from GitHub. Only references and status are displayed.
 * All sensitive reads and writes are authenticated in Apps Script.
 */
(function(global){
  'use strict';
  const LAW=Object.freeze({
    academy:'https://www.law.go.kr/LSW/lsInfoP.do?efYd=20261001&lsiSeq=290261',
    rules:'https://www.law.go.kr/lsInfoP.do?lsId=008606',
    busan:'https://www.law.go.kr/LSW/ordinInfoP.do?ordinId=211001',
    busanRules:'https://www.law.go.kr/ordinInfoP.do?ordinId=211002',
    privacy:'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029335069',
    child:'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1033134993'
  });
  const CATALOG=Object.freeze([
    ['REG01','등록·게시','학원 등록증·교습과정·명칭 확인','법정 확인','등록증과 실제 운영 과정을 대조합니다.',LAW.academy],
    ['REG02','등록·게시','시설·운영자 변경 신고사항','법정 확인','변경신고 필요 여부와 신고 원본을 확인합니다.',LAW.busan],
    ['REG03','등록·게시','교습비 및 광고 표시','법정 확인','홈페이지·전단·교습비 게시표의 금액을 대조합니다.',LAW.academy],
    ['REG04','등록·게시','영유아 월령별 교습과정 적합 여부','관할 확인','7~48개월 대상 과정과 학원 등록 범위를 관할 교육지원청에 확인합니다.',LAW.busanRules],
    ['REG05','등록·게시','학원 원칙·등록증 게시와 원본 보관','법정 확인','등록 유형에 맞는 게시·비치 의무를 확인합니다.',LAW.rules],
    ['FEE01','수납·장부','교습비 영수증 원부·현금출납부 대조','법정 확인','실제 수납자료와 발급 원부를 점검합니다.',LAW.rules],
    ['FEE02','수납·장부','수강생대장·출석부·직원명부','법정 확인','원본 전산 기록 및 보존 기준을 점검합니다.',LAW.rules],
    ['FEE03','수납·장부','반환기준 안내 및 반환기한','법정 확인','사유 발생일부터 5일 내 반환 및 별표 4 기준을 확인합니다.',LAW.academy],
    ['FEE04','수납·장부','교습비 변경 신고·증빙 관리','관할 확인','변경 신고와 수납금액·고지 내용의 일치를 확인합니다.',LAW.busanRules],
    ['FEE05','수납·장부','영수증·계약·결제 증빙 대조','권장 관리','등록번호별 결제·문서 원본을 대조합니다.',LAW.rules],
    ['STAFF01','교직원','강사 채용·해임·자격서류','법정 확인','법정 통보·자격·고용 형태별 기록을 확인합니다.',LAW.academy],
    ['STAFF02','교직원','성범죄·아동학대 취업제한 관련 조회','법정 확인','적용 대상 확인 후 적법한 조회 여부만 기록합니다.',LAW.child],
    ['STAFF03','교직원','종사자 의무교육 대상·이수','적용 확인','아동학대 신고의무 등 직원별 적용 교육을 확인합니다.',LAW.child],
    ['STAFF04','교직원','근로계약·임금대장·보험 가입 구분','적용 확인','고용 형태별 노동·사회보험 의무를 별도 확인합니다.',LAW.academy],
    ['PRIV01','개인정보','만 14세 미만 법정대리인 동의 확인','법정 확인','동의가 필요한 처리의 법정대리인 동의와 확인 기록을 확인합니다.',LAW.privacy],
    ['PRIV02','개인정보','사진·영상 활용과 철회 관리','적용 확인','사진·홍보 영상 처리 근거 및 선택 동의·철회 이력을 확인합니다.',LAW.privacy],
    ['PRIV03','개인정보','처리방침·보유기간·파기 관리','법정 확인','개인정보 처리방침 및 보유·파기 절차를 점검합니다.',LAW.privacy],
    ['PRIV04','개인정보','접근권한·접속기록·백업 점검','법정 확인','퇴사자 권한 회수와 계정·자료 접근 통제를 점검합니다.',LAW.privacy],
    ['SAFE01','시설·안전','배상책임보험·공제가입 및 만기','법정 확인','부산 조례의 보장액과 기간을 가입 증권과 대조합니다.',LAW.busan],
    ['SAFE02','시설·안전','비상대피·소방·출입 안전','관할 확인','건축물 용도 및 해당되는 소방·안전 규정을 확인합니다.',LAW.busanRules],
    ['SAFE03','시설·안전','영유아 보호자 인계·비상 연락','권장 관리','수업 전후 동반·인계 기록과 비상연락 절차를 점검합니다.',LAW.busan],
    ['SAFE04','시설·안전','식재료·자연소재 안전·위생','권장 관리','월령별 삼킴 위험, 재료 상태와 위생 점검표를 관리합니다.',LAW.busan],
    ['SAFE05','시설·안전','강의실 면적·시설 등록내용 일치','관할 확인','실측 면적·용도·시설 기준을 관할 교육지원청에 확인합니다.',LAW.busan],
    ['OPS01','실사 준비','현장점검 원본 제출자료 보관처','권장 관리','등록증·보험·영수증·수강생대장의 원본 위치를 점검합니다.',LAW.rules],
    ['OPS02','실사 준비','미비사항 조치·재점검 기록','권장 관리','완료되지 않은 항목의 담당자와 기한을 확인합니다.',LAW.academy],
    ['OPS03','실사 준비','교육·월간계획·안전기록 대조','권장 관리','수업 계획과 실제 안전·출결 기록의 차이를 점검합니다.',LAW.busan]
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
    root.innerHTML='<h2 class="page-title">운영 기준·법정 확인</h2><p class="page-description">스튜디오 운영에 필요한 서류와 안전·개인정보 확인 상태를 관리합니다.</p>'+banner('사업자등록 업종과 실제 운영 형태에 따라 적용 기준이 다를 수 있습니다. 필요한 신고·등록과 법정 요건은 관할기관에 확인하세요.')+
      '<div id="bw32Stats"></div>'+
      '<section class="panel bw32-main"><div class="bw32-top"><div><h3>안전·개인정보·필요 서류 확인</h3><p>기존 점검 기록은 그대로 두고 필요한 항목을 별도로 확인합니다.</p></div><div class="bw32-actions"><button type="button" id="bw32Pdf" class="btn btn-primary">현장점검 준비 PDF 다운로드</button><button type="button" id="bw32OpenLegacy" class="btn btn-outline">기존 운영 점검표</button></div></div>'+
      '<div class="bw32-filters"><label>관리 분야<select id="bw32Category"><option value="">전체 분야</option></select></label><label>적용 여부<select id="bw32Applies"><option value="">전체</option></select></label><label>진행 상태<select id="bw32Status"><option value="">전체</option></select></label><label>검색<input type="search" id="bw32Search" placeholder="서류·보험·등록 검색"></label></div>'+
      '<p id="bw32Count" class="bw32-help" role="status"></p><div id="bw32Items">법정 점검 정보를 불러오는 중입니다…</div></section>'+
      '<section class="panel"><h3>교습비 반환·기한 관리</h3><p>환불 사유 발생일부터 5일 이내 반환 기준을 관리합니다. 실제 금액은 「학원법 시행령」 별표 4와 수강 조건을 검토해 입력해야 합니다.</p><button class="btn btn-outline" type="button" id="bw32Tuition">수납·환불 관리로 이동</button></section>';
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
    section.innerHTML='<div class="bw32-top"><div><h3>환불 기한·처리대장</h3><p>별도 관리대장입니다. 기존 수납 원장·영수증 기록은 수정하지 않습니다.</p></div><button id="bw32LoadRefunds" class="btn btn-outline" type="button">환불대장 열기</button></div>'+
      '<p class="bw32-help">반환사유 발생일부터 5일 이내 반환 원칙. 입력한 반환액은 법정 반환기준 자동 계산값이 아니며 실제 입금·지급을 대신하지 않습니다.</p><div id="bw32RefundBody"></div>';
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
      '<label>확인기한 (자동 계산)<output id="bw32Due">사유 발생일 선택</output></label>'+
      '<label>실제 납부액 (원)<input id="bw32Paid" type="number" min="0" max="999999999" step="1" value="0" required></label>'+
      '<label>검토 반환액 (원)<input id="bw32Return" type="number" min="0" max="999999999" step="1" value="0" required></label>'+
      '<label>처리 상태<select id="bw32RefundStatus">'+selected(REFUND_STATES,'접수')+'</select></label>'+
      '<label>실제 반환일<input id="bw32Completed" type="date"></label>'+
      '<label>증빙 참조 (비공개)<input id="bw32RefundEvidence" maxlength="180" placeholder="이체확인증 등 비공개 문서 참조"></label>'+
      '</div><label>처리 메모<textarea id="bw32RefundNote" maxlength="240" rows="2" placeholder="금액 검토 근거·담당자 확인 내용 (계좌번호·민감정보 제외)"></textarea></label>'+
      '<div class="bw32-actions"><button type="submit" class="btn btn-primary">환불 처리 기록 저장</button><button type="button" class="btn btn-outline" id="bw32RefundNew">새 기록</button><span id="bw32RefundFeedback" role="status" class="bw32-help"></span></div></form>'+
      '<h4>기존 환불 기록 '+rows.length+'건</h4><div class="table-scroll"><table class="data-table"><thead><tr><th>관리번호</th><th>접수번호</th><th>확인기한</th><th>진행 상태</th><th>관리</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.receipt)+'</td><td>'+esc(x.due)+'</td><td>'+esc(x.status)+'</td><td><button class="btn btn-outline btn-small" type="button" data-bw32edit="'+esc(x.id)+'">수정</button></td></tr>').join('')+'</tbody></table></div>';
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
