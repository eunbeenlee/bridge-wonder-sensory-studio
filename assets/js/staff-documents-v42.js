/* Bridge Wonder V42 — sensory studio document catalog.
 * UI-only progressive enhancement for the existing authorized staff document center.
 * The six server document IDs, permissions, PDF contents, source records, and email flow
 * remain unchanged. Planned forms are READ-ONLY descriptions, not forged consent.
 */
(function(global){
  'use strict';

  const GROUPS=Object.freeze([
    {id:'consult',title:'상담·체험',summary:'상담과 체험 예약 관련 서류',items:[
      {id:'inquiry',type:'inquiry',title:'상담 접수 확인서',note:'상담 신청 내용 확인',status:'available'},
      {id:'experience-booking',title:'체험 예약 확정 안내서',note:'체험 날짜와 방문 안내',status:'planned'},
      {id:'consult-followup',title:'상담 결과·이용 안내',note:'상담 후 다음 일정 안내',status:'planned'}
    ]},
    {id:'agreement',title:'이용 신청·보호자 동의',summary:'신청서와 보호자 동의 서류',items:[
      {id:'studio-application',title:'스튜디오 이용 신청서',note:'아이와 보호자, 신청한 프로그램',status:'planned'},
      {id:'studio-terms',title:'이용 안내 및 취소·환불 조건 확인서',note:'이용 일정, 요금, 취소·환불 조건',status:'planned'},
      {id:'privacy-consent',title:'개인정보 처리 안내·동의서',note:'법정대리인 동의 및 확인이 필요한 서류',status:'planned'},
      {id:'media-consent',title:'사진·영상 활용 선택 동의서',note:'촬영·홍보 동의는 별도 선택',status:'planned'}
    ]},
    {id:'class',title:'클래스·보호자 안내',summary:'날짜와 준비물을 보호자에게 안내',items:[
      {id:'class',type:'class',title:'클래스 안내문',note:'등록된 클래스 일정으로 발급',status:'available'},
      {id:'notice',type:'notice',title:'스튜디오 일반 안내문',note:'제목과 내용을 직접 작성',status:'available'},
      {id:'schedule-change',title:'일정 변경·휴강 안내',note:'변경 날짜와 보강 안내',status:'planned'},
      {id:'materials',title:'오감놀이 준비물 안내',note:'활동에 필요한 준비물 안내',status:'planned'}
    ]},
    {id:'payment',title:'이용료·환불',summary:'결제 내역과 환불 관련 서류',items:[
      {id:'payment',type:'payment',title:'이용료 납부 내역 안내서',note:'납부 기록 확인용 · 영수증 별도',status:'available'},
      {id:'refund-notice',title:'환불 처리 안내서',note:'환불 금액과 처리 날짜 안내',status:'planned'},
      {id:'receipt',title:'결제 증빙·영수증',note:'카드전표·현금영수증은 별도 발급',status:'external'}
    ]},
    {id:'safety',title:'영유아 안전·운영 서식',summary:'재료와 공간의 안전, 보호자 인계',items:[
      {id:'materials-safety',title:'오감놀이 재료·안전 안내문',note:'사용 재료와 안전 주의사항',status:'planned'},
      {id:'handoff',title:'보호자 동반·인계 확인서',note:'보호자 동반과 인계 방법',status:'planned'},
      {id:'emergency',title:'긴급상황 연락·대응 안내',note:'긴급 연락처와 대처 방법',status:'planned'},
      {id:'daily-safety',title:'일일 재료·위생 점검표',note:'재료·안전 점검 메뉴에서 확인',status:'internal'},
      {id:'incident',title:'사고·특이사항 보고서',note:'민감정보는 별도 관리가 필요합니다',status:'planned'}
    ]},
    {id:'legacy',title:'기존 계약·등록 원본',summary:'이전에 작성한 서류를 확인할 때 사용',items:[
      {id:'registration',type:'registration',title:'기존 수강 등록 확인서',note:'기존 학원형 양식 · 등록번호 확인 필요',status:'legacy'},
      {id:'contract',type:'contract',title:'기존 전자서명 계약서 사본',note:'서명된 원본을 그대로 발급 · 신규 스튜디오 이용동의서가 아님',status:'legacy'}
    ]}
  ]);
  const SHORTCUTS={
    inquiry:['상담 접수 확인서','접수한 상담 기록'],
    registration:['기존 등록 확인서','기존 학원형 양식 · 확인 필요'],
    payment:['이용료 납부 내역','영수증과는 별개'],
    class:['클래스 안내문','수업 일정·내용'],
    contract:['기존 서명 계약 사본','보관된 원본만 교부'],
    notice:['스튜디오 일반 안내','직접 작성하는 안내문']
  };
  const escapeHTML=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const byId=id=>document.getElementById(id);
  function styleOnce(){
    if(byId('bw42DocumentsStyle'))return;
    const style=document.createElement('style');
    style.id='bw42DocumentsStyle';
    style.textContent=[
      '#workspace.bw33-ready #bw33DocumentChoices{display:block;grid-template-columns:none;}',
      '#workspace.bw33-ready .bw42-doc-groups{display:grid;gap:15px;width:100%;min-width:0;}',
      '#workspace.bw33-ready .bw42-doc-group{min-width:0;border:1px solid #e4e8de;border-radius:11px;background:#fffdf8;overflow:hidden;}',
      '#workspace.bw33-ready .bw42-doc-group[open]{border-color:#d4ddce;}',
      '#workspace.bw33-ready .bw42-doc-group>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:12px;padding:14px 17px;color:#40543a;font-weight:730;font-size:13px;}',
      '#workspace.bw33-ready .bw42-doc-group>summary::-webkit-details-marker{display:none;}',
      '#workspace.bw33-ready .bw42-doc-group>summary:after{content:"⌄";margin-left:auto;font-size:16px;color:#99a682;}',
      '#workspace.bw33-ready .bw42-doc-group[open]>summary:after{transform:rotate(180deg);}',
      '#workspace.bw33-ready .bw42-doc-group>summary small{font-size:11px;color:#768775;font-weight:450;line-height:1.5;}',
      '#workspace.bw33-ready .bw42-doc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 14px 15px;}',
      '#workspace.bw33-ready .bw42-doc-card{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:7px;width:100%;padding:13px 14px;border:1px solid #e3e6de;border-radius:9px;background:#fff;color:#40543a;text-align:left;box-shadow:none;line-height:1.55;}',
      '#workspace.bw33-ready button.bw42-doc-card{cursor:pointer;}',
      '#workspace.bw33-ready button.bw42-doc-card:hover,#workspace.bw33-ready button.bw42-doc-card.is-active{border-color:#99a682;background:#f0f2e9;}',
      '#workspace.bw33-ready .bw42-doc-card strong{display:block;font-weight:710;font-size:12px;word-break:keep-all;}',
      '#workspace.bw33-ready .bw42-doc-card small{color:#718171;font-size:11px;word-break:keep-all;}',
      '#workspace.bw33-ready .bw42-doc-card[data-status="planned"],#workspace.bw33-ready .bw42-doc-card[data-status="internal"],#workspace.bw33-ready .bw42-doc-card[data-status="external"]{background:#f9faf6;border-style:dashed;}',
      '#workspace.bw33-ready .bw42-doc-badge{display:inline-flex;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:650;line-height:1.5;background:#e8ede3;color:#40543a;}',
      '#workspace.bw33-ready .bw42-doc-badge--legacy{background:#fff0e7;color:#9a512d;}',
      '#workspace.bw33-ready .bw42-doc-badge--planned{background:#f0f1ed;color:#6f7869;}',
      '#workspace.bw33-ready .bw42-doc-legal{padding:10px 13px;border-left:3px solid #d1693b;background:#fbf8f2;font-size:11px;line-height:1.7;color:#596953;}',
      '#workspace.bw33-ready .bw42-doc-key{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0 2px;}',
      '@media(max-width:680px){#workspace.bw33-ready .bw42-doc-grid{grid-template-columns:1fr;padding:0 10px 11px;}#workspace.bw33-ready .bw42-doc-group>summary{padding:12px 11px;align-items:flex-start;}#workspace.bw33-ready .bw42-doc-group>summary small{display:block;}#workspace.bw33-ready .bw42-doc-card{padding:11px 12px;}}'
    ].join('\n');
    document.head.appendChild(style);
  }
  function card(item,allowed){
    const enabled=Boolean(item.type&&allowed.has(item.type));
    const badge=item.status==='legacy'?'기존 원본':enabled?'발급 가능':
      item.status==='external'?'결제수단에서 발급':item.status==='internal'?'별도 메뉴에서 관리':'서식 준비 중';
    const label='<span class="bw42-doc-badge'+(item.status==='legacy'?' bw42-doc-badge--legacy':!enabled?' bw42-doc-badge--planned':'')+'">'+badge+'</span>';
    const inner=label+'<strong>'+escapeHTML(item.title)+'</strong><small>'+escapeHTML(item.note)+'</small>';
    if(enabled)return '<button type="button" class="bw42-doc-card" data-status="'+escapeHTML(item.status)+'" data-bw33doc="'+escapeHTML(item.type)+'">'+inner+'</button>';
    return '<div class="bw42-doc-card" data-status="'+escapeHTML(item.status)+'" aria-disabled="true">'+inner+'</div>';
  }
  function pageReady(){
    const pane=byId('pageBody'),select=byId('docType'),hub=byId('bw33DocumentHub');
    if(!pane||!select||!hub||hub.dataset.bw42Ready==='1')return;
    const target=byId('bw33DocumentChoices');
    if(!target)return;
    const allowed=new Set(Array.from(select.options,option=>option.value));
    hub.dataset.bw42Ready='1';
    const headline=hub.querySelector('h3');
    if(headline)headline.textContent='센소리 스튜디오 문서목록';
    const intro=hub.querySelector('.bw33-doc-hub-head p');
    if(intro)intro.textContent='필요한 서류를 골라 주세요. 아직 만들 수 없는 서식은 준비 중으로 표시했습니다.';
    const oldHint=hub.querySelector('.bw33-document-hint');
    if(oldHint)oldHint.textContent='PDF 발급은 기존 6종만 가능합니다. 보호자 동의서와 안전 서식은 아직 만들 수 없습니다.';
    const title=pane.querySelector('.page-title');
    if(title)title.textContent='센소리 스튜디오 문서센터';
    const desc=pane.querySelector('.page-description');
    if(desc)desc.textContent='체험·이용·안전·정산 서식을 업무별로 확인하고, 발급 가능한 문서를 선택하세요.';
    const warning=pane.querySelector('.warning');
    if(warning)warning.textContent='기존 수강등록 확인서·계약서 사본은 학원형 원본에 연결되어 있습니다. 새 교육서비스 이용 신청·동의 서식으로 간주하지 마세요. 기존 문서와 기록은 유지됩니다.';
    Array.from(select.options).forEach(option=>{
      const names={inquiry:'상담 접수 확인서',registration:'기존 수강 등록 확인서 (학원형)',payment:'이용료 납부 내역 안내서',class:'클래스 안내문',contract:'기존 전자서명 계약서 사본',notice:'스튜디오 일반 안내문'};
      if(names[option.value])option.textContent=names[option.value];
    });
    target.innerHTML='<div class="bw42-doc-groups">'+GROUPS.map(group=>
      '<details class="bw42-doc-group"'+(group.id==='consult'||group.id==='class'?' open':'')+'>'+
      '<summary><span>'+escapeHTML(group.title)+'<small>'+escapeHTML(group.summary)+'</small></span></summary>'+
      '<div class="bw42-doc-grid">'+group.items.map(item=>card(item,allowed)).join('')+'</div></details>'
    ).join('')+'</div>';
    const footnote=pane.querySelector('.footnote:last-child');
    if(footnote)footnote.textContent='발급 안내서는 법정 영수증이나 결제 증빙을 대신하지 않습니다. 만 14세 미만 아동의 개인정보 동의는 법정대리인의 확인 절차가 필요하며, 사진·영상 활용 동의는 별도로 관리해야 합니다.';
    select.addEventListener('change',()=>{
      target.querySelectorAll('[data-bw33doc]').forEach(button=>button.classList.toggle('is-active',button.dataset.bw33doc===select.value));
    });
    target.querySelectorAll('[data-bw33doc]').forEach(button=>button.classList.toggle('is-active',button.dataset.bw33doc===select.value));
  }
  function refreshShortcuts(){
    const target=byId('bw33DocShortcuts');
    if(!target)return;
    target.querySelectorAll('[data-bw33doc]').forEach(button=>{
      const info=SHORTCUTS[button.dataset.bw33doc];if(!info)return;
      const name=button.querySelector('span'),note=button.querySelector('small');
      if(name&&name.textContent!==info[0])name.textContent=info[0];
      if(note&&note.textContent!==info[1])note.textContent=info[1];
    });
    const note=byId('bw33PdfPanel')?.querySelector('p');
    const message='현재 지원하는 PDF만 발급합니다. 새 동의서·안전 서식은 문서센터에서 준비 상태를 확인하세요.';
    if(note&&note.textContent!==message)note.textContent=message;
  }
  let scheduled=false;
  function sync(){styleOnce();refreshShortcuts();pageReady();}
  function boot(){
    const root=byId('workspace');
    if(!root)return;
    const observer=new MutationObserver(()=>{
      if(scheduled)return;
      scheduled=true;
      Promise.resolve().then(()=>{scheduled=false;sync();});
    });
    observer.observe(root,{childList:true,subtree:true});
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  global.BW42Documents=Object.freeze({sync,groups:GROUPS});
})(window);
