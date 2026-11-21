/* Bridge Wonder V31: Progressive enhancement for existing staff app.
 * Grouped navigation, plain-language help, real-choice dropdowns and optional
 * advanced panels. No network calls, no PII persistence, no privilege changes.
 */
(function(global){
  'use strict';
  const GROUPS=[
    {key:'consult',title:'상담·등록',items:['inquiries','waitlist','students','registrations']},
    {key:'class',title:'클래스 운영',items:['home','classes','capacity','roster','attendance','makeups','handoff']},
    {key:'sensory',title:'오감놀이 준비',items:['experiences','themes','safety']},
    {key:'service',title:'보호자·정산',items:['tuition','documents']},
    {key:'admin',title:'스튜디오 관리',items:['operations','courseSettings','compliance','staffCompliance','users','payroll','security']}
  ];
  const HELP={
    home:['스튜디오 운영','새로 들어온 상담과 필요한 업무를 확인해 주세요.'],
    classes:['클래스 일정','요일과 시간을 정하고 시작일과 운영 기간을 확인해 저장해 주세요. 홈페이지에 공개할 일정은 검토 후 공개해 주세요.'],
    students:['아이 기본정보','아이와 보호자의 기본정보를 먼저 저장해 주세요. 수업 횟수와 시간은 상담 후 정하면 됩니다.'],
    experiences:['월간 체험 테마','매달 체험 주제 세 가지를 작성하고 내용을 확인한 뒤 홈페이지에 공개해 주세요.'],
    roster:['아이 명단','담당 클래스의 아이 명단을 확인해 주세요. 연락처는 권한이 있는 직원에게만 보입니다.'],
    attendance:['클래스 출결','클래스와 날짜를 선택하고 아이 명단을 불러온 뒤 출결을 기록하세요.'],
    handoff:['보호자 인계','날짜와 클래스를 선택하고 보호자 동반 여부와 수업 후 인계 상태를 기록해 주세요.'],
    safety:['재료·안전 점검','수업 전에 재료 위생, 작은 교구, 바닥과 출입문 상태를 확인해 주세요.'],
    makeups:['보강 일정','보강이 필요한 아이와 희망 날짜를 선택해 주세요. 빈자리와 일정을 확인한 뒤 확정합니다.'],
    capacity:['클래스 정원','클래스별 인원과 남은 자리를 확인해 주세요. 정원은 담당 권한이 있는 직원만 변경할 수 있습니다.'],
    themes:['월간 오감놀이 계획','월별 그림책·노래·감각놀이 주제를 적고, 월령에 따른 진행 방법을 정리해 주세요.'],
    inquiries:['체험·클래스 상담','접수된 내용을 확인하고 상담 결과와 다음 연락 일정을 기록해 주세요.'],
    waitlist:['대기·일정 협의','대기 중인 아이와 희망 일정을 확인해 주세요. 실제 등록은 상담 후 확정합니다.'],
    registrations:['등록 서류 확인','제출된 신청서와 서명 기록을 확인해 주세요. 상담 신청과 최종 등록 계약은 구분해 관리합니다.'],
    tuition:['수업비·환불','실제로 받은 금액과 환불 내역을 확인해 기록해 주세요. 영수증 발급 여부는 별도로 확인합니다.'],
    documents:['보호자 문서 발급','발급할 문서와 대상 기록을 고른 뒤 내용을 확인해 주세요. PDF로 저장하거나 이메일로 보낼 수 있습니다.'],
    operations:['시설·운영 점검','시설과 준비 사항을 점검하고 담당자, 완료 기한, 증빙 위치를 기록해 주세요.'],
    compliance:['운영 기준·법정 확인','실제 운영 형태에 적용되는 규정을 확인하고 시설·안전·개인정보 관련 서류를 정리해 주세요.'],
    courseSettings:['스튜디오 운영정보','서비스 내용과 가격, 신고·등록 정보를 확인하고 필요한 내용만 바꿔 주세요.'],
    staffCompliance:['직원 필수 확인','직원별로 필요한 교육과 서류를 확인한 뒤, 실제 완료한 항목만 기록해 주세요.'],
    users:['직원 계정 관리','직원 이메일과 권한을 설정하고 임시 비밀번호를 발급해 주세요. 첫 로그인 때 비밀번호를 바꾸도록 안내합니다.'],
    payroll:['직원 급여 관리','직원과 급여 계산 기간을 선택해 주세요. 금액과 공제 내역을 확인한 뒤 확정하고, 실제 지급한 내역을 기록합니다.'],
    security:['접속 기록·백업','직원 접속 기록을 확인하거나 필요한 자료를 백업해 주세요.']
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
    details.open=false;
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
    addPreset($('classPeriod'),Array.from(form.querySelectorAll('[data-bw241-period]')).map(el=>el.dataset.bw241Period),'수업 기간 선택');
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
    note.textContent='반 코드는 자동으로 제안됩니다. 수업 내용을 확인한 뒤 홈페이지에 공개할지 선택해 주세요.';
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
