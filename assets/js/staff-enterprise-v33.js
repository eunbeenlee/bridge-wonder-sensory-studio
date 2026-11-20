/* Bridge Wonder V33 — enterprise-style top workspace navigation.
 * Progressive enhancement: if this file fails, original sidebar remains usable.
 * Routes and visibility come from existing server-provided role permissions.
 * No private data, credentials, storage, fetch or new Google API calls.
 */
(function(global){
  'use strict';
  const NAV=Object.freeze([
    {id:'classes',label:'교육·수업',sections:[
      {name:'수업 기획',pages:['classes','themes','capacity']},
      {name:'학생·출결',pages:['roster','attendance','makeups']},
      {name:'안전·인계',pages:['safety','handoff']}
    ]},
    {id:'parents',label:'학부모·등록',sections:[
      {name:'상담 관리',pages:['inquiries','waitlist']},
      {name:'수강 등록',pages:['registrations']},
      {name:'요청 서류·PDF',pages:['documents']}
    ]},
    {id:'finance',label:'수납·정산',sections:[
      {name:'교습비·환불',pages:['tuition']},
      {name:'급여 관리',pages:['payroll']}
    ]},
    {id:'admin',label:'학원·행정',sections:[
      {name:'등록·운영 점검',pages:['operations','compliance','courseSettings']},
      {name:'교직원 준수사항',pages:['staffCompliance']}
    ]},
    {id:'people',label:'직원·보안',sections:[
      {name:'직원·계정',pages:['users']},
      {name:'접속 기록·백업',pages:['security']}
    ]}
  ]);
  const DOCUMENT_TYPES=Object.freeze([
    {type:'registration',label:'수강 등록 확인서',note:'등록 확인 자료'},
    {type:'contract',label:'서명 계약서 사본',note:'보관된 계약 PDF 원본 사본'},
    {type:'payment',label:'납부 내역 안내서',note:'법정 영수증을 대체하지 않음'},
    {type:'class',label:'수업 안내문',note:'수업반별 안내'},
    {type:'inquiry',label:'상담 접수 확인서',note:'상담 기록 기반'},
    {type:'notice',label:'일반 안내문',note:'내용 직접 입력'}
  ]);
  const KEYWORDS=Object.freeze({
    documents:'pdf 발급 서류 증명서 계약서 등록확인서 납부 안내문 다운로드 학부모 부모 요청',
    attendance:'출결 출석 결석 체크',
    classes:'시간표 수업 일정 반 배정',
    inquiries:'상담 문의 전화 신청',
    registrations:'등록 계약 신청 학부모',
    tuition:'교습비 수납 환불 영수증 결제 내역',
    makeups:'보강 결석 일정 변경',
    compliance:'법정 교육청 실사 현장점검 보험 허가',
    operations:'운영 점검 준비 마감 인허가',
    payroll:'급여 월급 명세서 직원',
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
        '<button type="button" class="bw33-home" data-bw33home>운영 홈</button>'+
        '<div class="bw33-primary-groups" id="bw33NavGroups"></div>'+
        '<div class="bw33-primary-actions">'+
          '<button type="button" class="bw33-search-trigger" id="bw33SearchToggle" aria-expanded="false" aria-controls="bw33SearchPanel">업무 검색 <small>Ctrl K</small></button>'+
          '<button type="button" class="bw33-pdf-trigger" id="bw33PdfToggle" aria-expanded="false" aria-controls="bw33PdfPanel">학부모 서류 PDF</button>'+
        '</div></nav>'+
        '<div class="bw33-popovers">'+
          '<div id="bw33MenuPanels"></div>'+
          '<section id="bw33SearchPanel" class="bw33-popover bw33-search-panel" aria-label="업무 검색" hidden>'+
            '<label for="bw33SearchInput">업무 이름으로 빠르게 찾기</label><input type="search" id="bw33SearchInput" autocomplete="off" placeholder="예: 출결, 상담, 수납, PDF 발급">'+
            '<div id="bw33SearchResults" class="bw33-search-results"></div>'+
          '</section>'+
          '<section id="bw33PdfPanel" class="bw33-popover bw33-doc-panel" aria-label="학부모 서류 유형 선택" hidden>'+
            '<div class="bw33-doc-head"><strong>학부모 요청 서류</strong><small>기존 등록·수납·계약 기록 기반</small></div>'+
            '<div id="bw33DocShortcuts" class="bw33-doc-shortcuts"></div>'+
            '<p>대상 기록을 확인한 후 PDF를 발급합니다. 납부내역 안내서는 법정 영수증이 아닙니다.</p>'+
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
      '</div>';
  }
  function panelGroupHTML(group,menuById){
    return '<section class="bw33-popover bw33-menu-panel" id="bw33Panel-'+esc(group.id)+'" aria-label="'+esc(group.label)+' 세부 업무" hidden>'+
      '<div class="bw33-panel-title">'+esc(group.label)+' <small>세부 업무를 선택하세요</small></div>'+
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
      '<p>검색된 업무가 없습니다. 접근할 수 있는 메뉴만 표시됩니다.</p>';
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
    const label=m?.[2]||'운영 홈';
    $('bw33Breadcrumb').innerHTML='<span>Bridge Wonder</span><span aria-hidden="true">/</span>'+
      '<span>'+esc(group?.label||'운영 홈')+'</span><span aria-hidden="true">/</span><strong>'+esc(label)+'</strong>';
    if(activePanel&&activePanel!=='search'&&activePanel!=='pdf')closePanels();
  }
  function applyDocType(){
    const requested=docTypePending;docTypePending='';
    if(!requested)return;
    const select=$('docType');
    if(!select)return;
    if(![...select.options].some(option=>option.value===requested)){
      env.toast?.('해당 서류는 현재 계정에서 발급할 수 없습니다. 이용 가능한 서류를 선택해 주세요.',true);
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
      hub.innerHTML='<div class="bw33-doc-hub-head"><div><span class="bw33-eyebrow">PARENT DOCUMENT SERVICE</span>'+
        '<h3>학부모 요청 서류 · 바로 발급</h3><p>서류 선택 → 해당 기록 확인 → 내용 미리보기 → PDF 생성·다운로드</p></div>'+
        '<button type="button" class="btn btn-outline btn-small" id="bw33HistoryOpen">기존 발급 PDF 찾기</button></div>'+
        '<div id="bw33DocumentChoices" class="bw33-doc-template-list"></div>'+
        '<div class="bw33-document-hint">계약서 사본은 보관된 원본을 기준으로 합니다. 납부 내역 안내서는 법정 영수증을 대체하지 않습니다.</div>';
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
