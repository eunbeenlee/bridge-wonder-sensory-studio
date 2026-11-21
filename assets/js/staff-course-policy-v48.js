/* Bridge Wonder V48 — studio operations reference on the existing course-settings screen.
 * Staff UI enhancement only. Never writes Google data, never edits the original fee,
 * business/license fields, refund terms, status or historical contract records by itself.
 * Manager explicitly chooses suggested text and then uses existing Save if appropriate.
 */
(function(global){
  'use strict';
  const TERM=Object.freeze({weeks:10,sessionsPerWeek:1,children:4,guardiansPerChild:1,ageMin:7,ageMax:48,minutes:50});
  const TEXT=Object.freeze({
    accompaniment:'현재 운영하는 클래스는 생후 7~48개월 아이가 보호자와 함께 참여하는 방식입니다. 아이 한 명당 보호자 한 명이 수업 시작부터 종료까지 함께합니다. 36개월 이후 분리형 수업은 별도 반 편성 및 운영 기준이 확정되기 전까지 제공하지 않습니다.',
    makeup:'결석이나 일정 변경이 필요하면 수업 전에 연락해 주세요. 같은 주 또는 별도 보강일에 가능한 자리가 있으면 일정을 조정할 수 있습니다. 당일 취소, 발열 등 건강상 사유, 보강·이월 가능 여부는 확정된 이용 조건과 적용 법령에 따라 안내합니다.',
    materials:'오감놀이 활동 재료비는 이용료에 포함할 계획입니다. 움직이기 편한 옷과 여벌 옷, 앞치마 또는 미술가운을 준비해 주세요. 여분 미술가운은 사이즈별로 구비할 예정이며, 준비 여부는 사전에 안내합니다. 식재료는 먹기 위한 것이 아니라 감각 탐색용으로 사용합니다.',
    safety:'수업 전 재료의 위생 상태와 월령별 삼킴·질식 위험을 확인하고, 활동 중에는 선생님과 보호자가 함께 아이를 살핍니다. 재료를 입에 넣으려는 행동이 있으면 해당 활동을 즉시 멈추고 안전하게 안내합니다. 주의가 필요한 재료는 별도로 사전 상담하고, 열이나 감염 우려 증상이 있을 때는 수업 참여를 미뤄 주세요.'
  });
  const FIELDS=Object.freeze([
    {key:'accompaniment',title:'보호자 동반 기준',note:'7~48개월 현재 수업은 모두 보호자 참여형'},
    {key:'makeup',title:'결석·보강 안내',note:'당일 취소와 발열 예외는 운영·환불 규정 확정 전'},
    {key:'materials',title:'재료·준비물 안내',note:'재료비 포함 계획, 미술가운 구비 예정'},
    {key:'safety',title:'수업 안전 안내',note:'알레르기 관련 민감정보는 별도 절차로 확인'}
  ]);
  const CHECKS=Object.freeze([
    {title:'체험 요금',state:'확인 필요',copy:'2027년 1~2월 프로모션 25,000원, 3월 체험 35,000원은 운영자 초안입니다. 공개 사이트에는 현재 체험 25,000원·정규 30,000원으로 안내 중이므로 확정 후 일괄 변경해야 합니다.'},
    {title:'10주 텀·이용료',state:'확인 필요',copy:'주 1회, 총 10주 텀으로 운영할 계획입니다. 현재 계약용 수업료와 실제 10주 결제 총액이 일치하는지 확인해야 합니다. 중간 등록·취소·재료비·세금 표시도 별도로 정합니다.'},
    {title:'36개월 이후 참여 방식',state:'현행 동반',copy:'36개월까지 보호자 동반은 필수이며, 37~48개월도 현재 운영되는 클래스에서는 보호자가 함께합니다. 향후 분리반은 편성·관련 신고 검토가 끝난 뒤에만 안내합니다.'},
    {title:'보강과 발열',state:'확인 필요',copy:'같은 주 또는 보강 주에 자리가 있으면 일정 변경을 검토합니다. 당일 결석은 보강하지 않는다는 초안과 발열 시 대체수업을 제공한다는 답변이 충돌합니다.'},
    {title:'환불 규정',state:'법률 검토',copy:'개인 사유·단순 변심이면 무조건 환불하지 않는 규칙은 사용하지 않습니다. 이용 중단·환불액·기한은 실제 사업 유형에 적용되는 법령과 결제·이용 기간을 기준으로 확정해야 합니다.'},
    {title:'안전사고 책임',state:'법률 검토',copy:'보호자가 동반하더라도 사업자의 책임을 일괄 면제하는 문구는 사용하지 않습니다. 보호자·운영자 각자의 의무를 안내하되 과실 책임은 법령에 따라 판단합니다.'},
    {title:'알레르기·건강정보',state:'별도 절차',copy:'주의 재료는 사전에 확인하되 건강정보는 공개 문의 메모나 일반 수업안에 적지 않습니다. 필요한 최소 항목과 보관·접근 권한·동의 절차를 별도로 정해야 합니다.'},
    {title:'주차·기저귀 교체',state:'현장 확인',copy:'주차 1시간 기준은 건물 관리 기준에 따라 확인해 안내합니다. 기저귀 교체 공간은 준비 예정이나 씻기는 시설은 제공하지 않습니다. 수유 공간 제공 여부는 미확정입니다.'},
    {title:'사진·영상 알림장',state:'별도 동의',copy:'보호자 개별 사진 공유와 홈페이지·SNS 홍보는 다른 선택동의로 관리합니다. 카카오톡·키즈노트 사용 여부와 발송 주기·보관기간은 확정 전입니다.'},
    {title:'클래스 운영',state:'운영안',copy:'한 타임에 아이 최대 4명(형제·쌍둥이도 각각 1명), 교사 1명이 진행합니다. 50분 동안 각 아이의 발달과 관심을 살피며 영어를 활용한 감각놀이를 합니다. 주 2회 정규반은 현재 미개설입니다.'}
  ]);
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId=id=>document.getElementById(id);
  function css(){
    if(byId('bw48SettingsStyle'))return;
    const style=document.createElement('style');style.id='bw48SettingsStyle';
    style.textContent=[
      '#workspace #bw48Settings{margin-bottom:17px;border:1px solid #dce5d8;background:#fffdf8;color:#40543a;}',
      '#workspace .bw48-head{display:flex;gap:10px;justify-content:space-between;align-items:start;flex-wrap:wrap;}',
      '#workspace .bw48-head h3{margin:0 0 6px;font-size:17px;color:#40543a;}',
      '#workspace .bw48-head p{margin:0 0 12px;font-size:12px;line-height:1.75;color:#6c7b66;}',
      '#workspace .bw48-kicker{font-size:10px;font-weight:750;letter-spacing:.08em;color:#789070;}',
      '#workspace .bw48-pills{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0;}',
      '#workspace .bw48-pill{min-width:0;border-radius:9px;border:1px solid #e2e6da;background:#f6f8f2;padding:12px;display:flex;flex-direction:column;gap:4px;}',
      '#workspace .bw48-pill strong{font-size:15px;line-height:1.35;color:#40543a;}',
      '#workspace .bw48-pill small{font-size:10px;color:#70836b;}',
      '#workspace .bw48-copy{font-size:12px;line-height:1.9;color:#586b55;margin:10px 0;word-break:keep-all;}',
      '#workspace .bw48-alert{border-left:3px solid #d1693b;background:#fbf6ef;color:#7d5b40;padding:11px 13px;border-radius:5px;font-size:11px;line-height:1.85;margin:12px 0;word-break:keep-all;}',
      '#workspace .bw48-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;}',
      '#workspace .bw48-status{font-size:11px;line-height:1.8;color:#586d52;}',
      '#workspace .bw48-policy-list{display:grid;gap:7px;margin-top:9px;}',
      '#workspace .bw48-policy{display:flex;align-items:flex-start;gap:10px;border:1px solid #e5e9df;background:#fff;padding:10px 12px;border-radius:8px;}',
      '#workspace .bw48-policy input{width:17px;height:17px;flex:none;margin:2px 0 0;accent-color:#40543a;}',
      '#workspace .bw48-policy span{display:flex;flex-direction:column;gap:3px;min-width:0;}',
      '#workspace .bw48-policy b{font-size:12px;color:#40543a;}',
      '#workspace .bw48-policy small{font-size:11px;color:#687a66;line-height:1.5;}',
      '#workspace .bw48-inspect{margin-top:15px;padding-top:10px;border-top:1px solid #e0e6dc;}',
      '#workspace .bw48-inspect>summary{cursor:pointer;color:#40543a;font-size:12px;font-weight:700;}',
      '#workspace .bw48-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px;}',
      '#workspace .bw48-review{padding:12px 13px;border:1px solid #e4e9e0;border-radius:9px;background:#fafbf8;}',
      '#workspace .bw48-review strong{display:block;font-size:11px;color:#40543a;margin-bottom:5px;}',
      '#workspace .bw48-review span{display:inline-block;font-size:10px;color:#945f35;background:#fff0e5;padding:2px 6px;border-radius:3px;}',
      '#workspace .bw48-review p{font-size:11px;line-height:1.75;margin:6px 0 0;color:#687864;word-break:keep-all;}',
      '#workspace .bw48-legacy-flag{font-size:11px;line-height:1.75;margin-bottom:12px;color:#815836;border-left:3px solid #d1693b;background:#fcf7f0;padding:11px 13px;border-radius:6px;}',
      '#workspace .bw48-legacy-flag strong{color:#815836;}',
      '#workspace .bw48-form-apply{margin-top:14px;}',
      '@media(max-width:750px){#workspace .bw48-pills{grid-template-columns:repeat(2,minmax(0,1fr));}#workspace .bw48-review-grid{grid-template-columns:1fr;}}',
      '@media(max-width:400px){#workspace .bw48-pills{grid-template-columns:1fr 1fr;gap:7px;}#workspace .bw48-pill{padding:9px;}#workspace .bw48-pill strong{font-size:13px;}}'
    ].join('');
    document.head.appendChild(style);
  }
  function mount(root){
    if(!root)return;
    const form=root.querySelector('#bw23CourseForm');
    if(!form||byId('bw48Settings'))return;
    css();
    const originalPanel=form.closest('.panel');
    if(!originalPanel)return;
    const outer=document.createElement('section');outer.id='bw48Settings';outer.className='panel';
    outer.setAttribute('aria-label','센서리 스튜디오 운영안');
    outer.innerHTML=
      '<div class="bw48-head"><div><span class="bw48-kicker">BRIDGE WONDER · INTERNAL OPERATING NOTES</span>'+
      '<h3>스튜디오 운영안</h3><p>보호자 예상 질문 22개를 바탕으로 정리했습니다. 아래 내용은 현재 운영 계획과 확정 전 검토 사항을 구분해 보여줍니다.</p></div></div>'+
      '<div class="bw48-pills">'+
      '<div class="bw48-pill"><strong>7~48개월</strong><small>참여 월령</small></div>'+
      '<div class="bw48-pill"><strong>아이 최대 4명</strong><small>교사 1명 · 한 회차</small></div>'+
      '<div class="bw48-pill"><strong>보호자 동반</strong><small>현재 모든 클래스</small></div>'+
      '<div class="bw48-pill"><strong>주 1회 × 10주</strong><small>1텀 · 50분씩 · 운영 계획</small></div></div>'+
      '<p class="bw48-copy">매주 계절·주간 테마에 맞춰 재료와 놀이를 준비합니다. 정해진 학습 단계를 따라가는 수업이 아니라 아이가 스스로 탐색하도록 돕는 시간입니다. 10년 이상 북미에서 거주하며 공부한 경험이 있는 원장이 직접 활동을 진행할 예정입니다. 영어를 자연스럽게 듣는 놀이 환경을 만들고, 아이가 즐겁게 참여하는 것을 가장 중요하게 생각합니다.</p>'+
      '<p class="bw48-copy">재료비는 이용료에 포함할 계획이며, 여벌 옷과 앞치마·미술가운을 준비하도록 안내합니다. 여분 미술가운은 사이즈별로 구비할 예정입니다. 정규 수업 중간 체험은 빈자리가 있을 때 상담할 수 있습니다.</p>'+
      '<div class="bw48-alert" id="bw48FeeAlert" role="note">기존 저장 금액을 확인하고 있습니다.</div>'+
      '<div class="bw48-form-apply"><h4 style="margin:10px 0 5px;font-size:13px;">운영 문구를 아래 입력칸에 적용</h4>'+
      '<p class="bw48-copy">사용할 문구만 선택해 가져오세요. <strong>가져오기만으로 서버에 저장되지는 않습니다.</strong> 적용 후 기존 계약용 입력칸을 확인하고 저장해야 합니다.</p>'+
      '<div class="bw48-policy-list">'+FIELDS.map(item=>
        '<label class="bw48-policy"><input type="checkbox" data-bw48-field="'+item.key+'" checked>'+
        '<span><b>'+esc(item.title)+'</b><small>'+esc(item.note)+'</small></span></label>'
      ).join('')+'</div>'+
      '<div class="bw48-actions"><button type="button" class="btn btn-outline btn-small" id="bw48Apply">선택한 문구 가져오기</button>'+
      '<span id="bw48Result" role="status" class="bw48-status"></span></div></div>'+
      '<details class="bw48-inspect" id="bw48Review"><summary>아직 확인이 필요한 운영 조건 (10개)</summary>'+
      '<div class="bw48-review-grid">'+CHECKS.map(item=>
        '<div class="bw48-review"><strong>'+esc(item.title)+' <span>'+esc(item.state)+'</span></strong>'+
        '<p>'+esc(item.copy)+'</p></div>'
      ).join('')+'</div></details>';
    originalPanel.parentNode.insertBefore(outer,originalPanel);
    const legacy=document.createElement('div');legacy.className='bw48-legacy-flag';legacy.id='bw48LegacyWarning';
    legacy.innerHTML='<strong>기존 계약서에 연결된 설정입니다.</strong> 이곳의 수업비·법정 상호·등록번호·환불 기준은 기존 계약용 데이터입니다. 새 10주 텀의 요금이나 법정 정보가 확정되기 전까지 임의로 바꾸지 마세요. 위 운영 문구를 가져오면 선택한 4개 안내 입력칸만 바뀝니다.';
    originalPanel.insertBefore(legacy,form);
    const feeInput=root.querySelector('#bw23Course_fee'),feeHint=outer.querySelector('#bw48FeeAlert');
    const currentFee=Number(feeInput?.value);
    const displayedFee=feeInput?.value&&Number.isFinite(currentFee)?
      currentFee.toLocaleString('ko-KR')+'원':'미설정';
    feeHint.textContent='기존 계약용 수업비 저장값: '+displayedFee+
      ' · 새 운영안: 주 1회 × 10주, 재료비 포함. 텀 총액과 부가세·환불 조건은 아직 확인이 필요합니다. '+
      '1~2월 체험 25,000원 및 3월 체험 35,000원은 운영자 초안이며 공개 홈페이지·기존 계약 금액은 자동으로 변경하지 않습니다.'+
      (/학원/.test(String(root.querySelector('#bw23Course_business')?.value||''))?' 현재 저장된 법정 상호에는 ‘학원’ 표시가 포함되어 있습니다. 사업자등록 내용이 확정되기 전까지 임의로 변경하지 마세요.':'');
    const feedback=outer.querySelector('#bw48Result');
    outer.querySelector('#bw48Apply').addEventListener('click',()=>{
      const selection=FIELDS.filter(item=>outer.querySelector('[data-bw48-field="'+item.key+'"]').checked);
      if(!selection.length){feedback.textContent='가져올 문구를 선택해 주세요.';return;}
      const changes=selection.map(item=>({...item,input:root.querySelector('#bw23Course_'+item.key)}))
        .filter(item=>item.input&&item.input.value.trim()!==TEXT[item.key]);
      if(!changes.length){feedback.textContent='선택한 문구가 이미 입력되어 있습니다.';return;}
      const overwritten=changes.filter(item=>item.input.value.trim());
      if(overwritten.length&&typeof global.confirm==='function'&&
         !global.confirm('기존에 입력된 '+overwritten.map(x=>x.title).join(' · ')+' 내용을 새 초안으로 바꿀까요?\n변경은 아직 저장되지 않습니다.'))return;
      for(const item of changes){
        item.input.value=TEXT[item.key];
        item.input.dispatchEvent(new Event('input',{bubbles:true}));
      }
      feedback.textContent='선택한 '+changes.length+'개 문구를 입력했습니다. 아래 내용과 기존 계약용 항목을 확인한 후 저장해 주세요.';
      const first=changes[0].input;
      if(first?.scrollIntoView)first.scrollIntoView({block:'center',behavior:'smooth'});
    });
    // Block exact forms of the harmful proposed blanket waiver/refund refusal.
    form.addEventListener('submit',event=>{
      const safety=String(root.querySelector('#bw23Course_safety')?.value||'');
      const refund=String(root.querySelector('#bw23Course_refund')?.value||'');
      const liability=/(민형사상.{0,20}책임.{0,25}물을\s*수\s*없|모든\s*(민형사상\s*)?책임.{0,25}면제|일체.{0,10}책임.{0,15}지지\s*않)/;
      const refusal=/(개인\s*사유|단순\s*변심).{0,30}(환불|반환).{0,15}(불가|불가능|안\s*됨)|(환불|반환).{0,15}(불가|불가능).{0,30}(개인\s*사유|단순\s*변심)/;
      if(liability.test(safety)||liability.test(refund)||refusal.test(refund)){
        event.preventDefault();event.stopImmediatePropagation();
        feedback.textContent='일괄 사고 책임 면제나 모든 개인 사유의 환불 거절 문구는 저장하지 않습니다. 해당 문장을 수정해 주세요.';
        outer.querySelector('#bw48Review').open=true;
        if(outer.scrollIntoView)outer.scrollIntoView({block:'start',behavior:'smooth'});
      }
    },true);
  }
  function init(){
    const root=byId('pageBody');if(!root)return;
    let scheduled=false;
    const observer=new MutationObserver(()=>{
      if(scheduled)return;scheduled=true;
      Promise.resolve().then(()=>{scheduled=false;mount(root);});
    });
    observer.observe(root,{childList:true,subtree:false});
    mount(root);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  global.BW48CoursePolicy=Object.freeze({mount,term:TERM,templates:TEXT,checks:CHECKS});
})(window);
