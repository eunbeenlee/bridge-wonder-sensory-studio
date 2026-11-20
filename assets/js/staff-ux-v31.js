/* Bridge Wonder V31: Progressive enhancement for existing staff app.
 * Grouped navigation, plain-language help, real-choice dropdowns and optional
 * advanced panels. No network calls, no PII persistence, no privilege changes.
 */
(function(global){
  'use strict';
  const GROUPS=[
    {key:'daily',title:'수업·출결',items:['home','classes','roster','attendance','handoff','safety','makeups','capacity','themes','experiences']},
    {key:'family',title:'상담·등록',items:['inquiries','waitlist','registrations','students','tuition','documents']},
    {key:'admin',title:'운영·직원 관리',items:['operations','compliance','courseSettings','staffCompliance','users','payroll','security']}
  ];
  const HELP={
    home:['오늘의 업무','확인이 필요한 업무부터 살펴보고, 상단 메뉴에서 원하는 업무로 이동하세요.'],
    classes:['수업반 등록','요일과 시간을 정하고 시작일과 교습 기간을 입력한 뒤 저장하세요. 홈페이지 공개 여부는 검토 후 변경할 수 있습니다.'],
    students:['학생 인적사항 등록','기본정보만 먼저 등록하고 상담 후 주간 수업 횟수와 실제 수업반을 정하세요.'],
    experiences:['홈페이지 체험 테마','적용할 달과 체험 세 가지를 작성한 뒤 공개 상태를 선택하면 홈페이지에 반영됩니다.'],
    roster:['수강생 명단 확인','담당 반의 학생을 확인할 수 있습니다. 보호자 연락처는 권한이 있는 직원에게만 표시됩니다.'],
    attendance:['출결 기록','수업반과 날짜를 선택하고 명단 불러오기를 누른 뒤 학생별 출결 상태를 저장하세요.'],
    handoff:['보호자 인계 확인','반과 날짜를 선택해 명단을 불러오고, 보호자 동반 여부와 수업 종료 후 인계 상태를 기록하세요.'],
    safety:['수업 전 안전 점검','수업반과 날짜를 확인하고, 재료 상태와 안전 항목을 점검한 뒤 저장하세요.'],
    makeups:['보강 일정 관리','학생을 선택해 요청을 등록하세요. 원장이나 관리자가 남은 자리와 일정을 확인한 뒤 확정합니다.'],
    capacity:['수업반 정원 관리','반별 등록 인원과 남은 자리를 확인하세요. 정원 변경은 권한이 있는 직원만 할 수 있습니다.'],
    themes:['월간 수업 주제','적용 월과 수업 주제를 입력하고, 월령별 진행 방법은 필요한 부분을 펼쳐 작성하세요.'],
    inquiries:['상담 접수 확인','이름이나 연락처로 상담 기록을 찾고, 연락 결과와 진행 상태를 확인하세요.'],
    waitlist:['대기자 관리','상담 기록과 희망 수업반을 선택하고 대기 상태를 저장하세요. 등록 확정은 수강 신청 화면에서 확인합니다.'],
    registrations:['수강 신청 확인','접수 내용을 검색해 등록 정보를 확인하세요. 계약이나 수납 처리는 해당 업무 메뉴에서 진행합니다.'],
    tuition:['수납·환불 기록','등록 접수번호를 선택하고 실제 처리한 금액과 증빙을 확인한 후 기록을 저장하세요.'],
    documents:['학부모 서류 발급','서류 종류와 대상 기록을 선택하고 미리보기로 내용을 확인하세요. PDF를 발급한 뒤 다운로드하거나 이메일로 보낼 수 있습니다.'],
    operations:['운영 점검','분야와 진행 상태로 항목을 찾고, 담당자·기한·증빙을 확인한 후 저장하세요.'],
    compliance:['학원 법정·행정 점검','교습비·장부·안전·개인정보 기록을 확인하고 관련 증빙을 정리하세요. 필요한 자료는 현장점검 준비 PDF로 내려받을 수 있습니다.'],
    courseSettings:['학원 기본 정보','과정명과 교습비, 등록 정보를 확인하고 변경할 항목만 수정한 뒤 저장하세요.'],
    staffCompliance:['직원 필수 확인','직원을 선택해 필요한 조회·교육의 완료 여부를 기록하세요. 실제 확인이 끝난 항목만 완료로 표시합니다.'],
    users:['직원 계정 관리','직원 이메일과 역할을 등록한 뒤 임시 비밀번호를 발급하세요. 직원은 첫 로그인 후 비밀번호를 직접 변경합니다.'],
    payroll:['직원 급여 관리','급여 귀속월과 직원을 선택하고 계산 내용을 확인하세요. 확정 후 실제 지급을 마치면 지급 완료로 기록합니다.'],
    security:['접속 기록·백업','직원 이용 기록을 확인하고 필요한 경우 자료를 백업하세요.']
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
      if(note)note.textContent='원장이 발급한 임시 비밀번호로 로그인할 수 있습니다. 비밀번호를 잊었다면 위 메뉴에서 다시 설정하세요.';
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
    const summary=document.createElement('summary');summary.textContent=heading;
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
    note.textContent='반 코드는 자동으로 제안됩니다. 수강 과정을 확인하고 홈페이지 공개 여부는 검토 후 설정하세요.';
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
      const heading=document.createElement('summary');heading.textContent='메뉴별 조회·수정 권한 설정';
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
    const summary=document.createElement('summary');summary.textContent='이전에 발급한 문서 보기';
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
