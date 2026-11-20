/* Bridge Wonder V31: Progressive enhancement for existing staff app.
 * Grouped navigation, plain-language help, real-choice dropdowns and optional
 * advanced panels. No network calls, no PII persistence, no privilege changes.
 */
(function(global){
  'use strict';
  const GROUPS=[
    {key:'daily',title:'수업·출결',items:['home','classes','roster','attendance','handoff','safety','makeups','capacity','themes']},
    {key:'family',title:'상담·등록',items:['inquiries','waitlist','registrations','tuition','documents']},
    {key:'admin',title:'운영·직원 관리',items:['operations','compliance','courseSettings','staffCompliance','users','payroll','security']}
  ];
  const HELP={
    home:['오늘 확인할 업무','바로가기에서 필요한 업무를 선택하거나 상단 업무 선택 메뉴로 이동하세요.'],
    classes:['수업반을 등록할 때','① 요일과 시간 선택 → ② 시작일과 기간 입력 → ③ 저장. 공개 설정은 추가 설정에서 변경합니다.'],
    roster:['담당 아이들 확인','수업반을 선택해 필요한 학생만 확인하세요. 보호자 연락처는 허용된 계정에만 보입니다.'],
    attendance:['출결 기록하기','① 수업반 선택 → ② 수업일 확인 → ③ 명단 불러오기 → ④ 학생별 상태 저장.'],
    handoff:['보호자 인계 기록','① 반과 날짜 선택 → ② 명단 불러오기 → ③ 보호자 동반과 종료 인계를 각각 확인하세요.'],
    safety:['수업 전 안전 확인','수업반·날짜·재료를 확인한 뒤 항목별 점검 결과를 선택하고 저장하세요.'],
    makeups:['결석·보강 처리','학생을 선택해 요청을 남기세요. 보강 확정은 원장·관리자가 정원과 일정을 확인합니다.'],
    capacity:['수업반 정원 확인','확정 인원과 빈자리를 확인하고, 운영자 권한이 있으면 기준 정원을 조정할 수 있습니다.'],
    themes:['월간 주제 기록','적용 월과 공통 주제를 먼저 입력하고 필요한 월령별 진행 방법을 펼쳐 작성하세요.'],
    inquiries:['상담 접수 관리','이름·연락처로 검색한 뒤 접수 상태를 확인하고 후속 연락을 기록하세요.'],
    waitlist:['대기자 기록','상담 기록과 희망 반을 선택한 뒤 상태를 저장하세요. 정식 등록 확정은 별도 절차입니다.'],
    registrations:['수강 신청 확인','접수 내용을 검색하고 확인하세요. 이 화면에서 계약이나 결제를 임의로 확정하지 않습니다.'],
    tuition:['수납 기록 남기기','① 등록 접수 선택 → ② 실제 처리 업무·금액 입력 → ③ 증빙 확인 후 저장.'],
    documents:['안내문과 확인서 발급','① 문서·대상 선택 → ② 미리보기 → ③ PDF 생성 → ④ 다운로드 또는 수신자 확인 후 발송.'],
    operations:['운영 점검표 사용','분야·진행 상태로 먼저 항목을 좁힌 뒤 담당자·예정일·상태를 확인해 저장하세요.'],
    courseSettings:['학원 기본 정보 설정','과정·교습비를 먼저 확인하고 법정 상호와 안내 규정이 맞는지 확인한 뒤 저장하세요.'],
    staffCompliance:['선생님 필수 확인','직원을 선택하고 법정 조회·교육 확인 상태를 기록하세요. 실제 신고·조회를 대신하지 않습니다.'],
    users:['직원 계정 발급','① 이메일·이름·역할 등록 → ② 임시 비밀번호 발급 → ③ 직원 첫 로그인 후 직접 변경. 세부 권한은 별도로 펼쳐 설정합니다.'],
    payroll:['급여 관리','귀속월과 직원을 선택하세요. 급여 계산 결과를 검토한 뒤 확정·지급 처리 순서로 진행합니다.'],
    security:['접속 이력 확인','이용 기록을 확인하고 필요한 경우 비공개 백업을 생성하세요.'],
  };
  const $=id=>document.getElementById(id);
  let context=null,configured=false;
  function escape(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function allowed(){return context?.MENU.filter(m=>context.can(m[0]))||[];}
  function groupOf(id){return GROUPS.find(g=>g.items.includes(id))||GROUPS[2];}
  function groupedOptions(menu){
    const valid=new Map(menu.map(item=>[item[0],item]));
    return GROUPS.map(group=>{
      const members=group.items.map(key=>valid.get(key)).filter(Boolean);
      return members.length?'<optgroup label="'+escape(group.title)+'">'+members.map(item=>
        '<option value="'+escape(item[0])+'">'+escape(item[2])+'</option>').join('')+'</optgroup>':'';
    }).join('');
  }
  function configure(options){
    if(configured)return;
    if(!options||!options.state||!Array.isArray(options.MENU)||typeof options.can!=='function'||typeof options.navigate!=='function')
      throw Error('직원 운영 화면 설정이 올바르지 않습니다.');
    context=options;configured=true;
    const top=document.querySelector('#workspace .topbar');
    if(top&&!$('bw31TaskSelect')){
      const wrap=document.createElement('div');wrap.className='bw31-task-switch';
      const label=document.createElement('label');label.setAttribute('for','bw31TaskSelect');label.textContent='업무 바로 이동';
      const select=document.createElement('select');select.id='bw31TaskSelect';select.setAttribute('aria-label','이동할 업무 선택');
      select.addEventListener('change',()=>{if(select.value)context.navigate(select.value);});
      wrap.append(label,select);
      const right=top.querySelector('.row');
      if(right)top.insertBefore(wrap,right);else top.appendChild(wrap);
    }
    // Login help is progressively disclosed. Existing OTP buttons/handlers
    // remain in the DOM; moving the nodes does not alter functionality.
    const links=document.querySelector('#loginStepPassword .bw23-login-actions');
    if(links&&!$('bw31LoginDetails')){
      const details=document.createElement('details');details.id='bw31LoginDetails';details.className='bw31-login-help';
      const summary=document.createElement('summary');summary.textContent='비밀번호를 잊었거나 처음 사용하시나요?';
      links.before(details);details.append(summary,links);
      const note=document.querySelector('#loginStepPassword .bw23-legal');
      if(note)note.textContent='원장이 발급한 임시 비밀번호가 있다면 바로 로그인하세요. 초기 설정·비밀번호 복구는 위 도움말을 이용할 수 있습니다.';
    }
  }
  function decorateNav(){
    if(!configured)return;
    const menu=allowed(),selected=context.state.page;
    // The original menu buttons already carry server-derived permission checks
    // and click handlers. Regroup the same buttons, never invent new routes.
    const sidebar=$('sideNav');
    if(sidebar){
      const direct=Array.from(sidebar.children).filter(e=>e.matches('button[data-page]'));
      if(direct.length){
        const map=new Map(direct.map(button=>[button.dataset.page,button]));
        const nodes=GROUPS.map(group=>{
          const buttons=group.items.map(id=>map.get(id)).filter(Boolean);
          if(!buttons.length)return null;
          const details=document.createElement('details');
          details.className='bw31-nav-group';details.dataset.bw31Group=group.key;
          details.open=buttons.some(b=>b.dataset.page===selected);
          const summary=document.createElement('summary');
          summary.textContent=group.title;
          const qty=document.createElement('span');qty.className='bw31-nav-count';qty.textContent=String(buttons.length);
          summary.appendChild(qty);
          const list=document.createElement('div');list.className='bw31-nav-items';list.append(...buttons);
          details.append(summary,list);
          return details;
        }).filter(Boolean);
        if(nodes.length)sidebar.replaceChildren(...nodes);
      }else{
        sidebar.querySelectorAll('.bw31-nav-group').forEach(details=>{
          if(details.querySelector('[data-page="'+selected+'"]'))details.open=true;
        });
      }
    }
    const quick=$('bw31TaskSelect');
    if(quick){
      const signature=menu.map(x=>x[0]).join('|');
      if(quick.dataset.bw31Options!==signature){
        quick.innerHTML=groupedOptions(menu);
        quick.dataset.bw31Options=signature;
      }
      quick.value=selected;
    }
  }
  function addGuide(page,root){
    if(!root||root.querySelector('#bw31Guide'))return;
    const [heading,body]=HELP[page]||['이 화면의 사용법','필요한 내용을 확인한 뒤 저장해 주세요.'];
    const details=document.createElement('details');details.id='bw31Guide';details.className='bw31-guide';
    details.open=['classes','users','documents','operations'].includes(page);
    const summary=document.createElement('summary');summary.textContent=heading+' · 사용 순서';
    const paragraph=document.createElement('p');paragraph.textContent=body;
    details.append(summary,paragraph);
    const intro=root.querySelector('.page-description');
    if(intro)intro.after(details);else root.prepend(details);
  }
  function makeSelect(options,placeholder){
    const select=document.createElement('select');select.className='bw31-preset-select';
    const first=document.createElement('option');first.value='';first.textContent=placeholder;select.appendChild(first);
    options.forEach(value=>{const opt=document.createElement('option');opt.value=value;opt.textContent=value;select.appendChild(opt);});
    return select;
  }
  function addPreset(input,values,placeholder){
    if(!input||!Array.isArray(values))return;
    const distinct=[...new Set(values.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,30);
    if(!distinct.length)return;
    const select=makeSelect(distinct,placeholder);
    select.setAttribute('aria-label',placeholder);
    input.before(select);
    select.onchange=()=>{if(!select.value)return;input.value=select.value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));};
  }
  function advanced(elements,title,open){
    const available=elements.filter(Boolean);
    if(!available.length)return null;
    const first=available[0],originalParents=[...new Set(available.map(item=>item.parentElement))],details=document.createElement('details');
    details.className='bw31-advanced';details.open=!!open;
    const summary=document.createElement('summary');summary.textContent=title;
    const body=document.createElement('div');body.className='bw31-advanced-grid';
    first.before(details);details.append(summary,body);
    available.forEach(item=>body.appendChild(item));
    for(const element of originalParents){
      if(element&&element!==body&&element.classList?.contains('bw241-grid')&&!element.querySelector('.form-item'))element.remove();
    }
    return details;
  }
  function formItem(id){
    const input=$(id);return input?.closest('.form-item')||null;
  }
  function classes(){
    const form=$('classForm');if(!form)return;
    addPreset($('classTime'),Array.from(form.querySelectorAll('[data-bw241-time]')).map(el=>el.dataset.bw241Time),'이전에 사용한 수업 시간 선택');
    addPreset($('classPeriod'),Array.from(form.querySelectorAll('[data-bw241-period]')).map(el=>el.dataset.bw241Period),'교습 기간 빠른 선택');
    form.querySelectorAll('.bw241-chip-row').forEach(row=>{
      if(row.querySelector('[data-bw241-time],[data-bw241-period]'))row.hidden=true;
    });
    const advancedPanel=advanced(['classId','classTemplate','classPublic','classReview'].map(formItem),
      '추가 설정 · 반 코드 / 과정 / 홈페이지 공개',false);
    if(advancedPanel){
      const needsSetup=()=>!$('classId').value||!$('classTemplate').value;
      // A fresh class code is generated after choosing day/time; do not expose advanced options before then.
      if(!$('classTemplate').value)advancedPanel.open=true;
      form.addEventListener('submit',()=>{if(needsSetup())advancedPanel.open=true;},true);
      $('pageBody').addEventListener('click',event=>{
        if(event.target.closest('[data-class],[data-bw241-clone]'))advancedPanel.open=true;
      },true);
    }
    const note=document.createElement('p');note.className='bw31-form-note';
    note.textContent='반 코드와 수강 과정은 기본값을 자동으로 사용합니다. 홈페이지 공개는 검토 완료 후 변경하세요.';
    form.querySelector('.bw241-form-intro')?.after(note);
  }
  function users(){
    const form=$('userForm');if(!form)return;
    const classes=$('userClasses')?.parentElement;
    const contact=$('userContact')?.closest('label');
    const advisory=contact?.nextElementSibling?.classList.contains('help')?contact.nextElementSibling:null;
    const details=advanced([classes,contact,advisory],'담당 반·보호자 연락처 권한 (필요한 경우 펼치기)',
      !!form.querySelector('#userClasses input:checked'));
    const profile=form.querySelector('#userEmail');
    if(profile){profile.setAttribute('autocomplete','off');profile.setAttribute('autocapitalize','none');}
    form.querySelector('button[type=submit]')?.setAttribute('aria-label','직원 계정 정보 저장');
    // Editing an existing user should reveal assigned classes without changing them.
    $('pageBody').addEventListener('click',event=>{
      if(event.target.closest('[data-edit-user]')&&details)details.open=true;
    },true);
    const access=$('bw24Person')?.closest('.panel');
    if(access&&!access.closest('.bw31-permissions')){
      const wrap=document.createElement('details');wrap.className='bw31-permissions';
      const heading=document.createElement('summary');heading.textContent='고급 설정 · 메뉴별 조회·수정 권한 변경';
      access.before(wrap);wrap.append(heading,access);
    }
  }
  function ops(){
    const category=$('opsCategory'),host=$('opsRows');
    if(!category||!host)return;
    const toolbar=category.closest('.toolbar');if(!toolbar)return;
    const search=document.createElement('input');search.type='search';search.placeholder='점검 항목 검색';search.setAttribute('aria-label','운영 점검 항목 검색');search.className='bw31-filter';
    const select=makeSelect(['미확인','진행중','완료','보완필요'],'전체 진행 상태');select.setAttribute('aria-label','운영 점검 진행 상태');
    const count=document.createElement('span');count.className='bw31-visible-count';count.setAttribute('aria-live','polite');
    toolbar.append(select,search,count);
    const filter=()=>{
      let shown=0;const query=search.value.trim().toLowerCase();
      host.querySelectorAll('.ops-task-card').forEach(card=>{
        const status=card.querySelector('[data-op-status]')?.value||'';
        const code=card.querySelector('[data-op-save]')?.dataset.opSave||'';
        const title=card.querySelector('h4')?.textContent||'';
        const match=(!select.value||status===select.value)&&(!query||(title+' '+code).toLowerCase().includes(query));
        card.hidden=!match;if(match)shown++;
      });
      count.textContent='표시 '+shown+'건';
    };
    select.onchange=filter;search.oninput=filter;
    category.addEventListener('change',filter);
    host.addEventListener('change',e=>{if(e.target.matches('[data-op-status]'))filter();});
    filter();
  }
  function roster(){
    const table=$('pageBody')?.querySelector('.data-table');
    if(!table)return;
    const trs=[...table.querySelectorAll('tbody tr')];
    const classes=[...new Set(trs.map(r=>r.cells[0]?.textContent.trim()).filter(Boolean))].sort();
    if(classes.length<2)return;
    const select=makeSelect(classes,'모든 수업반');select.setAttribute('aria-label','수강생 명단 수업반 필터');
    const toolbar=document.createElement('div');toolbar.className='bw31-table-filter';
    const label=document.createElement('span');label.textContent='수업반별 보기';
    const count=document.createElement('span');count.className='bw31-visible-count';count.setAttribute('aria-live','polite');
    toolbar.append(label,select,count);
    table.closest('.table-scroll')?.before(toolbar);
    const filter=()=>{let shown=0;trs.forEach(row=>{const match=!select.value||row.cells[0]?.textContent.trim()===select.value;row.hidden=!match;if(match)shown++;});count.textContent=shown+'명';};
    select.onchange=filter;filter();
  }
  function compliance(){
    const root=$('pageBody'),cards=[...root.querySelectorAll('.ops-task-card')];
    if(cards.length<2)return;
    const select=document.createElement('select');select.className='bw31-preset-select';select.setAttribute('aria-label','확인할 직원 선택');
    cards.forEach((card,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=card.querySelector('h4')?.textContent.trim()||'직원 '+(i+1);select.appendChild(opt);});
    const toolbar=document.createElement('div');toolbar.className='bw31-table-filter';
    const label=document.createElement('span');label.textContent='직원 선택';
    toolbar.append(label,select);
    root.querySelector('.ops-card-grid')?.before(toolbar);
    const filter=()=>cards.forEach((card,i)=>card.hidden=String(i)!==select.value);
    select.onchange=filter;filter();
  }
  function themes(){
    const form=$('bw20ThemeForm');if(!form)return;
    const items=Array.from({length:5},(_,i)=>formItem('bw20ThemeMethod'+i));
    const details=advanced(items,'월령별 진행 방법 · 필요할 때 펼쳐 입력',false);
    if(details){
      $('pageBody').addEventListener('click',e=>{if(e.target.closest('[data-bw20theme]'))details.open=true;},true);
      form.addEventListener('submit',()=>{if(items.some(i=>i?.querySelector('textarea:invalid')))details.open=true;},true);
    }
  }
  function documents(){
    const history=$('docHistory')?.closest('.panel');
    if(!history)return;
    const details=document.createElement('details');details.className='bw31-history';
    const summary=document.createElement('summary');summary.textContent='이전에 발급한 PDF 보기';
    history.before(details);details.append(summary,history);
  }
  function onPageRendered(page){
    if(!configured||!context?.state?.user||page!==context.state.page)return;
    const root=$('pageBody');if(!root)return;
    addGuide(page,root);
    if(page==='classes')classes();
    else if(page==='users')users();
    else if(page==='operations')ops();
    else if(page==='roster')roster();
    else if(page==='staffCompliance')compliance();
    else if(page==='themes')themes();
    else if(page==='documents')documents();
  }
  global.BW31UX=Object.freeze({configure,groupedOptions,decorateNav,onPageRendered});
})(window);
