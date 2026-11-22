/* Bridge Wonder V33 — enterprise-style top workspace navigation.
 * Progressive enhancement: if this file fails, original sidebar remains usable.
 * Routes and visibility come from existing server-provided role permissions.
 * No private data, credentials, storage, fetch or new Google API calls.
 */
(function(global){
  'use strict';
  // Operational navigation does not determine the business's legal classification.
  // IDs, server permissions and original contractual records are unchanged.
  const NAV=Object.freeze([
    {id:'consult',label:'상담·등록',sections:[
      {name:'문의와 대기',pages:['inquiries','waitlist']},
      {name:'아이 정보와 등록 서류',pages:['students','registrations']}
    ]},
    {id:'class',label:'클래스 운영',sections:[
      {name:'일정과 정원',pages:['classes','capacity']},
      {name:'아이 명단·출결·보강',pages:['roster','attendance','makeups']},
      {name:'보호자 인계',pages:['handoff']}
    ]},
    {id:'sensory',label:'오감놀이 준비',sections:[
      {name:'테마·놀이 콘텐츠',pages:['experiences','themes']},
      {name:'재료와 안전',pages:['safety']}
    ]},
    {id:'service',label:'이용료·문서',sections:[
      {name:'수납·환불',pages:['tuition']},
      {name:'보호자 요청 서류',pages:['documents']}
    ]},
    {id:'admin',label:'스튜디오 관리',sections:[
      {name:'운영정보와 시설',pages:['operations','courseSettings']},
      {name:'안전·규정·직원 관리',pages:['compliance','staffCompliance']},
      {name:'계정·급여·이용 기록',pages:['users','payroll','finance','security']}
    ]}
  ]);
  const DOCUMENT_TYPES=Object.freeze([
    {type:'registration',label:'등록 확인서',note:'등록 내용 확인'},
    {type:'contract',label:'서명한 계약서 사본',note:'보관된 서명 계약서'},
    {type:'payment',label:'납부 내역 안내서',note:'납부 기록 확인'},
    {type:'class',label:'수업 안내문',note:'일정과 준비물 안내'},
    {type:'inquiry',label:'상담 접수 확인서',note:'상담 내용 확인'},
    {type:'notice',label:'일반 안내문',note:'안내 내용을 작성해 발급'}
  ]);
  const KEYWORDS=Object.freeze({
    documents:'pdf 발급 서류 증명서 계약서 등록확인서 납부 안내문 다운로드 보호자 아이 가족 요청',
    attendance:'출결 출석 결석 체크',
    classes:'센서리 스튜디오 클래스 일정 시간표 수업 반 배정',
    inquiries:'체험 상담 예약 문의 보호자 신청 전화',
    registrations:'등록 계약 신청 보호자 서명 원본',
    tuition:'클래스 수업비 이용료 교습비 수납 환불 영수증 결제 내역',
    makeups:'보강 결석 일정 변경',
    compliance:'법정 교육청 실사 현장점검 보험 허가',
    operations:'스튜디오 개원 시설 운영 점검 준비 인허가',
    payroll:'급여 월급 명세서 직원',
    students:'아이 기본정보 학생 인적사항 센서리 체험 상담 등록 반배정 주2회',
    experiences:'센서리 오감놀이 월간 체험 테마 재료 주제 홈페이지 공개',
    users:'직원 계정 권한 비밀번호 발급'
  });
  const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const $=id=>document.getElementById(id);
  let env=null,bound=false,navSignature='',activePanel='',docTypePending='',lastSearch='';
  const allowed=()=>env?.MENU?.filter(item=>env.can(item[0]))||[];
  const groupFor=page=>NAV.find(g=>g.sections.some(section=>section.pages.includes(page)))||null;
  const uniqueGroups=()=>{
    const valid=new Set(allowed().map(item=>item[0]));
    return NAV.map(g=>({...g,sections:g.sections.map(section=>({...section,pages:section.pages.filter(id=>valid.has(id))})).filter(s=>s.pages.length)})).filter(g=>g.sections.length);
  };
  function context(){
    const root=$('workspace'),main=root?.querySelector('.main');
    return root&&main?{root,main}:null;
  }
  function renderShell(){
    const {root,main}=context()||{};
    if(!root||!main||!env?.state?.user)return;
    if(!$('bw33Navigation')){
      const bar=document.createElement('section');bar.id='bw33Navigation';bar.className='bw33-navigation';
      bar.setAttribute('aria-label','직원 운영 업무 메뉴');
      bar.innerHTML='<nav class="bw33-primary" aria-label="상단 업무 메뉴">'+
        '<button type="button" class="bw33-home" data-bw33home>스튜디오 홈</button>'+
        '<div class="bw33-primary-groups" id="bw33NavGroups"></div>'+
        '<div class="bw33-primary-actions">'+
          '<button type="button" class="bw33-search-trigger" id="bw33SearchToggle" aria-expanded="false" aria-controls="bw33SearchPanel">메뉴 찾기 <small>Ctrl + K</small></button>'+
          '<button type="button" class="bw33-pdf-trigger" id="bw33PdfToggle" aria-expanded="false" aria-controls="bw33PdfPanel">서류 발급</button>'+
        '</div></nav>'+
        '<div class="bw33-popovers">'+
          '<div id="bw33MenuPanels"></div>'+
          '<section id="bw33SearchPanel" class="bw33-popover bw33-search-panel" aria-label="업무 검색" hidden>'+
            '<label for="bw33SearchInput">메뉴 찾기</label><input type="search" id="bw33SearchInput" autocomplete="off" placeholder="메뉴 이름을 입력해 주세요 (예: 상담, 출결)">'+
            '<div id="bw33SearchResults" class="bw33-search-results"></div>'+
          '</section>'+
          '<section id="bw33PdfPanel" class="bw33-popover bw33-doc-panel" aria-label="보호자 요청 서류 선택" hidden>'+
            '<div class="bw33-doc-head"><strong>보호자에게 드릴 서류</strong><small>등록·수납·계약 기록을 확인한 뒤 발급해 주세요.</small></div>'+
            '<div id="bw33DocShortcuts" class="bw33-doc-shortcuts"></div>'+
            '<p>아이와 문서 내용을 확인한 뒤 PDF를 발급해 주세요. 납부 내역 안내서는 교습비 영수증과 다릅니다.</p>'+
          '</section>'+
        '</div>';
      const top=main.querySelector('.topbar');
      if(!top)return;
      top.after(bar);
      const crumb=document.createElement('div');crumb.className='bw33-breadcrumb';crumb.id='bw33Breadcrumb';crumb.setAttribute('aria-label','현재 업무 위치');
      bar.after(crumb);
      bar.querySelector('[data-bw33home]').onclick=()=>navigate('home');
      $('bw33PdfToggle').onclick=()=>togglePanel('pdf');
      $('bw33SearchToggle').onclick=()=>togglePanel('search');
      $('bw33SearchInput').addEventListener('input',updateSearch);
      $('bw33SearchInput').addEventListener('keydown',event=>{
        if(event.key==='Enter'){
          const first=$('bw33SearchResults')?.querySelector('[data-bw33go]');
          if(first){event.preventDefault();first.click();}
        }
      });
      $('bw33SearchResults').addEventListener('click',event=>{
        const button=event.target.closest('[data-bw33go]');
        if(button)navigate(button.dataset.bw33go);
      });
      $('bw33DocShortcuts').addEventListener('click',event=>{
        const button=event.target.closest('[data-bw33doc]');
        if(button)openDocument(button.dataset.bw33doc);
      });
    }
    if(!root.classList.contains('bw33-ready'))root.classList.add('bw33-ready');
  }
  function navGroupHTML(group,menuById){
    return '<div class="bw33-group" data-bw33group="'+esc(group.id)+'">'+
      '<button type="button" class="bw33-group-trigger" data-bw33group-trigger="'+esc(group.id)+'" aria-expanded="false" aria-controls="bw33Panel-'+esc(group.id)+'">'+esc(group.label)+'</button>'+
      (global.BW50Workspaces?.urlForGroup(group.id,env.can)?
        '<a class="bw50-workspace-link" data-bw50-entry="'+esc(global.BW50Workspaces.allowedPageInGroup(group.id,env.can))+
        '" href="'+esc(global.BW50Workspaces.urlForGroup(group.id,env.can))+
        '" aria-label="'+esc(group.label)+' 업무공간 열기" title="'+esc(group.label)+' 독립 주소로 열기">열기</a>':'')+
      '</div>';
  }
  function panelGroupHTML(group,menuById){
    return '<section class="bw33-popover bw33-menu-panel" id="bw33Panel-'+esc(group.id)+'" aria-label="'+esc(group.label)+' 세부 업무" hidden>'+
      '<div class="bw33-panel-title">'+esc(group.label)+' <small>원하는 업무를 선택하세요</small></div>'+
      '<div class="bw33-panel-columns">'+group.sections.map(section=>'<div class="bw33-subgroup"><h3>'+esc(section.name)+'</h3>'+
        section.pages.map(id=>{
          const item=menuById.get(id);
          return '<button type="button" data-bw33go="'+esc(id)+'" class="bw33-route"'+(id===env.state.page?' aria-current="page"':'')+'>'+esc(item?.[2]||id)+'</button>';
        }).join('')+'</div>').join('')+'</div></section>';
  }
  function closePanels(){
    activePanel='';
    document.querySelectorAll('#bw33Navigation .bw33-popover').forEach(el=>{el.hidden=true;});
    document.querySelectorAll('#bw33Navigation [aria-expanded]').forEach(el=>el.setAttribute('aria-expanded','false'));
  }
  function togglePanel(which){
    const id=which==='pdf'?'bw33PdfPanel':which==='search'?'bw33SearchPanel':'bw33Panel-'+which;
    const panel=$(id);
    if(!panel)return;
    const isOpen=activePanel===which&&!panel.hidden;
    closePanels();
    if(isOpen)return;
    activePanel=which;panel.hidden=false;
    const trigger=which==='pdf'?$('bw33PdfToggle'):which==='search'?$('bw33SearchToggle'):document.querySelector('[data-bw33group-trigger="'+which+'"]');
    if(trigger)trigger.setAttribute('aria-expanded','true');
    if(which==='search'){
      $('bw33SearchInput').focus();updateSearch();
    }else if(which==='pdf'){
      panel.querySelector('button')?.focus();
    }
  }
  function navigate(page){
    if(!env?.state?.user||!env.can(page))return;
    closePanels();
    if(page===env.state.page)return;
    env.navigate(page);
  }
  function openDocument(type){
    if(!env.can('documents'))return;
    docTypePending=String(type||'');
    closePanels();
    if(env.state.page==='documents'&&$('docType'))applyDocType();
    else env.navigate('documents');
  }
  function updateSearch(){
    const input=$('bw33SearchInput'),result=$('bw33SearchResults');
    if(!input||!result)return;
    const query=input.value.trim().toLowerCase();lastSearch=query;
    const menu=allowed().filter(x=>{
      const key=x[0],search=[x[2],groupFor(key)?.label||'',KEYWORDS[key]||''].join(' ').toLowerCase();
      return !query||search.includes(query);
    }).slice(0,12);
    result.innerHTML=menu.length?menu.map(item=>'<button type="button" data-bw33go="'+esc(item[0])+'">'+
      '<span>'+esc(item[2])+'</span><small>'+esc(groupFor(item[0])?.label||'운영 홈')+'</small></button>').join(''):
      '<p>찾으시는 메뉴가 없습니다. 다른 검색어를 입력해 주세요.</p>';
  }
  function sync(){
    if(!env?.state?.user)return;
    renderShell();
    const shell=$('bw33Navigation');if(!shell)return;
    const menu=allowed(),signature=menu.map(x=>x[0]).join('|');
    if(navSignature!==signature){
      navSignature=signature;
      const groups=uniqueGroups(),menuById=new Map(menu.map(x=>[x[0],x]));
      $('bw33NavGroups').innerHTML=groups.map(x=>navGroupHTML(x,menuById)).join('');
      $('bw33MenuPanels').innerHTML=groups.map(x=>panelGroupHTML(x,menuById)).join('');
      $('bw33DocShortcuts').innerHTML=DOCUMENT_TYPES.map(t=>'<button type="button" data-bw33doc="'+esc(t.type)+'">'+
        '<span>'+esc(t.label)+'</span><small>'+esc(t.note)+'</small></button>').join('');
      shell.querySelectorAll('[data-bw33group-trigger]').forEach(btn=>{
        btn.onclick=()=>togglePanel(btn.dataset.bw33groupTrigger);
      });
      shell.querySelectorAll('[data-bw50-entry]').forEach(link=>{
         link.onclick=event=>{
           // Respect ctrl/cmd-click and new tab actions; ordinary clicks stay in the SPA.
           if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
           event.preventDefault();
           navigate(link.dataset.bw50Entry);
         };
       });
       shell.querySelectorAll('[data-bw33go]').forEach(btn=>{
        if(!btn.closest('#bw33SearchResults'))btn.onclick=()=>navigate(btn.dataset.bw33go);
      });
      $('bw33PdfToggle').hidden=!env.can('documents');
      updateSearch();
    }
    const page=env.state.page,group=groupFor(page);
    shell.querySelectorAll('[data-bw33group-trigger]').forEach(button=>{
      const selected=button.dataset.bw33groupTrigger===group?.id;
      button.classList.toggle('is-active',selected);
    });
    shell.querySelectorAll('[data-bw33go]').forEach(button=>{
      if(button.dataset.bw33go===page)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    shell.querySelector('[data-bw33home]')?.classList.toggle('is-active',page==='home');
    const m=menu.find(x=>x[0]===page);
    const label=m?.[2]||'스튜디오 홈';
    $('bw33Breadcrumb').innerHTML='<span>Bridge Wonder</span><span aria-hidden="true">/</span>'+
      '<span>'+esc(group?.label||'스튜디오 홈')+'</span><span aria-hidden="true">/</span><strong>'+esc(label)+'</strong>';
    if(activePanel&&activePanel!=='search'&&activePanel!=='pdf')closePanels();
  }
  function applyDocType(){
    const requested=docTypePending;docTypePending='';
    if(!requested)return;
    const select=$('docType');
    if(!select)return;
    if(![...select.options].some(option=>option.value===requested)){
      env.toast?.('현재 계정으로 발급할 수 없는 서류입니다. 다른 서류를 선택해 주세요.',true);
      select.focus();
      return;
    }
    if(select.value!==requested){
      select.value=requested;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    select.scrollIntoView?.({behavior:'smooth',block:'center'});
    select.focus({preventScroll:true});
  }
  function decorateDocuments(){
    const pane=$('pageBody'),select=$('docType');
    if(!pane||!select)return;
    if(!$('bw33DocumentHub')){
      const hub=document.createElement('section');
      hub.id='bw33DocumentHub';hub.className='bw33-document-hub';
      hub.innerHTML='<div class="bw33-doc-hub-head"><div><span class="bw33-eyebrow">빠른 문서 발급</span>'+
        '<h3>보호자 서류 발급</h3><p>서류와 발급 대상을 선택하고 내용을 확인해 주세요.</p></div>'+
        '<button type="button" class="btn btn-outline btn-small" id="bw33HistoryOpen">이전 발급 문서 보기</button></div>'+
        '<div id="bw33DocumentChoices" class="bw33-doc-template-list"></div>'+
        '<div class="bw33-document-hint">계약서 사본은 보관된 서명 원본을 기준으로 발급합니다. 납부 내역 안내서는 교습비 영수증과 다릅니다.</div>';
      const heading=pane.querySelector('.page-description'),place=heading||pane.firstElementChild;
      if(place)place.after(hub);else pane.prepend(hub);
      const options=new Set([...select.options].map(o=>o.value));
      $('bw33DocumentChoices').innerHTML=DOCUMENT_TYPES.filter(t=>options.has(t.type)).map(t=>
        '<button type="button" class="bw33-doc-choice" data-bw33doc="'+esc(t.type)+'">'+
        '<strong>'+esc(t.label)+'</strong><small>'+esc(t.note)+'</small></button>').join('');
      $('bw33DocumentChoices').addEventListener('click',event=>{
        const btn=event.target.closest('[data-bw33doc]');
        if(btn)openDocument(btn.dataset.bw33doc);
      });
      $('bw33HistoryOpen').onclick=()=>{
        const history=$('docHistory');const holder=history?.closest('details');
        if(holder)holder.open=true;
        (holder||history)?.scrollIntoView?.({behavior:'smooth',block:'start'});
      };
      select.addEventListener('change',()=>{
        pane.querySelectorAll('[data-bw33doc]').forEach(b=>b.classList.toggle('is-active',b.dataset.bw33doc===select.value));
      });
    }
    applyDocType();
    pane.querySelectorAll('[data-bw33doc]').forEach(b=>b.classList.toggle('is-active',b.dataset.bw33doc===select.value));
  }
  function pageReady(page){
    if(!env||page!==env.state.page)return;
    if(page==='documents')decorateDocuments();
  }
  function configure(options){
    if(bound)return;
    if(!options||!Array.isArray(options.MENU)||!options.state||typeof options.can!=='function'||typeof options.navigate!=='function')
      throw Error('직원 상단 메뉴 초기화 정보가 올바르지 않습니다.');
    env=options;bound=true;
    document.addEventListener('click',event=>{
      const shell=$('bw33Navigation');
      if(shell&&activePanel&&!shell.contains(event.target))closePanels();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&activePanel){closePanels();return;}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        if(!env?.state?.user)return;
        event.preventDefault();sync();
        togglePanel('search');
      }
    });
    global.BW33Enterprise?.sync?.();
  }
  global.BW33Enterprise=Object.freeze({configure,sync,pageReady,openDocument,definitions:NAV});
})(window);
