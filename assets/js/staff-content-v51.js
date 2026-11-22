/* Bridge Wonder V51 | independent, lightweight operational content screen.
 * Only the private Staff Apps Script service may read/write sheets; no browser secrets.
 * Static shell first, one section fetched at a time, foreground sync every 45 seconds.
 */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const sections={
    settings:{title:'운영 설정',module:'courseSettings',note:'정원·운영시간 등 관리용 기준값을 정리합니다. 기존 수강계약이나 공개 사이트 가격은 자동으로 변경하지 않습니다.'},
    copy:{title:'안내 문구',module:'courseSettings',note:'상담 안내와 직원용 문구를 정리합니다. 저장한 문구는 이 운영 관리 화면에 반영됩니다.'},
    lessons:{title:'회차별 수업안',module:'themes',note:'교사의 활동 구성, 연령대, 재료, 안전 주의사항을 기록합니다. 기존 수업안 파일 보관함은 그대로 유지됩니다.'},
    materials:{title:'준비물·재료',module:'themes',note:'수업 재료와 수량·원가를 관리합니다. 아이의 알레르기나 건강정보는 입력하지 마세요.'},
    costs:{title:'비용 항목',module:'finance',note:'계획용 비용 항목입니다. 기존 수납·회계 장부와 결제액에는 자동 반영하지 않습니다.'},
    templates:{title:'서식 문구',module:'documents',note:'내부 문서 안내와 서식 초안을 정리합니다. 기존 발급 PDF와 동의서는 자동 변경되지 않습니다.'}
  };
  const section=document.body.dataset.section||'lessons';
  if(!sections[section])return;
  const storageKey='bw17_staff_session';
  const state={token:'',user:null,items:[],signature:'',canWrite:false,busy:false,selected:null,dirty:false,loading:false};
  const safe=x=>String(x==null?'':x);
  const rpc=(name,...args)=>window.BW27Bridge.request(name,args);
  const field=name=>document.querySelector('[name="'+name+'"]');
  const feedback=(message,error)=>{const el=$('status');if(!el)return;el.textContent=message;el.dataset.error=error?'1':'0';};
  const canSee=(code)=>Boolean(state.user?.permissions?.read?.[sections[code].module]);
  function startScreen(){
    $('auth').hidden=true;$('app').hidden=false;
    $('userLabel').textContent=(state.user.name||state.user.email)+' · '+({owner:'원장',director:'관리자',teacher:'선생님',frontdesk:'상담 담당자'}[state.user.role]||'직원');
    const nav=$('sectionNav');nav.replaceChildren();
    for(const [id,entry] of Object.entries(sections)){
      if(!canSee(id))continue;
      const a=document.createElement('a');a.href=({lessons:'../curriculum/',settings:'../settings/',copy:'../content/',materials:'../materials/',costs:'../costs/',templates:'../templates/'}[id]);
      a.textContent=entry.title;a.className=id===section?'active':'';if(id===section)a.setAttribute('aria-current','page');nav.appendChild(a);
    }
    $('pageTitle').textContent=sections[section].title;
    $('pageNote').textContent=sections[section].note;
    $('editorTitle').textContent='새 항목 등록';
    const write=Boolean(state.user?.permissions?.write?.[sections[section].module])&&(['owner','director'].includes(state.user.role));
    state.canWrite=write;
    $('editor').hidden=!write;$('newBtn').hidden=!write;
    for(const node of document.querySelectorAll('[data-sections]')){
      node.hidden=!node.dataset.sections.split(',').includes(section);
    }
    $('bodyLabel').textContent=({settings:'설정값',copy:'안내 문구',lessons:'수업 진행 내용',materials:'재료·사용 안내',costs:'비용 설명',templates:'서식 문구'}[section]);
    $('categoryLabel').textContent=({settings:'설정 코드 / 구분',copy:'표시 위치 / 구분',lessons:'수업 월 / 구분',materials:'재료 분류',costs:'비용 분류',templates:'서식 코드 / 구분'}[section]);
    $('titleLabel').textContent=({settings:'설정 이름',copy:'문구 제목',lessons:'수업 주제',materials:'재료명',costs:'비용 항목',templates:'서식 제목'}[section]);
    if(write)clearForm();
  }
  function clearForm(){
    $('entryForm').reset();state.selected=null;state.dirty=false;
    $('entryId').value='';$('entryEtag').value='';$('editorTitle').textContent='새 항목 등록';
    $('archiveBtn').hidden=true;
    field('status').value='초안';
    feedback('새 항목을 입력하고 저장할 수 있습니다.',false);
  }
  function openItem(item){
    if(!state.canWrite)return;
    state.selected=item;state.dirty=false;
    $('entryId').value=item.id;$('entryEtag').value=item.etag;
    for(const k of ['category','title','content','unit','effectiveDate','status'])field(k).value=item[k]||'';
    field('amount').value=item.amount==null?'':item.amount;
    for(const k of ['ageGroup','durationMinutes','preparation','safety','quantity','taxType'])field(k).value=item.extra?.[k]||'';
    $('editorTitle').textContent='항목 수정';$('archiveBtn').hidden=item.status==='보관';
    feedback('기존 내용을 수정할 수 있습니다.',false);
    $('editor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderList(){
    const list=$('items');list.replaceChildren();
    const term=$('search').value.trim().toLowerCase();
    const mode=$('filter').value;
    const data=state.items.filter(v=>(mode==='전체'||v.status===mode)&&(!term||[v.title,v.category,v.content].some(s=>safe(s).toLowerCase().includes(term))));
    $('count').textContent=data.length+'개 항목';
    if(!data.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='조건에 맞는 항목이 없습니다.';list.appendChild(empty);return;}
    const frag=document.createDocumentFragment();
    for(const item of data){
      const article=document.createElement('article');article.className='entry-card';
      const heading=document.createElement('div');heading.className='entry-heading';
      const info=document.createElement('div');const name=document.createElement('h3');name.textContent=item.title;
      const meta=document.createElement('p');meta.className='muted';meta.textContent=[item.category,item.effectiveDate,item.unit].filter(Boolean).join(' · ');
      info.append(name,meta);
      const tag=document.createElement('span');tag.className='status-tag';tag.dataset.state=item.status;tag.textContent=item.status;
      heading.append(info,tag);article.appendChild(heading);
      if(item.content){const desc=document.createElement('p');desc.className='excerpt';desc.textContent=item.content;article.appendChild(desc);}
      if(item.amount!=null){const amount=document.createElement('p');amount.className='amount';amount.textContent=new Intl.NumberFormat('ko-KR').format(item.amount)+'원';article.appendChild(amount);}
      const foot=document.createElement('div');foot.className='entry-foot';
      const date=document.createElement('span');date.textContent='수정 '+(item.updatedAt||'미기록');foot.appendChild(date);
      if(state.canWrite){const btn=document.createElement('button');btn.type='button';btn.className='mini-btn';btn.textContent='편집';btn.addEventListener('click',()=>openItem(item));foot.appendChild(btn);}
      article.appendChild(foot);frag.appendChild(article);
    }
    list.appendChild(frag);
  }
  async function load(force){
    if(!state.token||state.loading||document.visibilityState==='hidden')return;
    state.loading=true;
    try{
      const response=await rpc('staff51ListContent',state.token,section,force?'':state.signature);
      if(response.unchanged){$('updated').textContent='최신 정보 확인 · '+(response.checkedAt||'');return;}
      if(!Array.isArray(response.items))throw Error('목록 응답을 확인해 주세요.');
      state.items=response.items;state.signature=response.signature||'';
      state.canWrite=Boolean(response.canWrite);
      $('editor').hidden=!state.canWrite;$('newBtn').hidden=!state.canWrite;
      if(!state.dirty&&state.selected){
        const current=state.items.find(x=>x.id===state.selected.id);
        if(current&&current.etag!==state.selected.etag){
          feedback('스프레드시트에서 이 항목이 변경되었습니다. 수정하기 전에 목록에서 다시 열어 주세요.',true);
        }
      }
      $('updated').textContent='동기화 · '+(response.checkedAt||'');
      renderList();
    }catch(error){feedback(error.message||'데이터를 불러오지 못했습니다.',true);if(/로그인|접속 시간이 만료|사용 권한이 중지/.test(error.message||''))showLogin();}
    finally{state.loading=false;}
  }
  function setSaving(flag){
    state.busy=flag;$('saveBtn').disabled=flag;$('archiveBtn').disabled=flag;$('newBtn').disabled=flag;
    $('saveBtn').textContent=flag?'저장 중…':'스프레드시트에 저장';
  }
  async function save(event){
    event.preventDefault();if(!state.canWrite||state.busy)return;
    setSaving(true);feedback('스프레드시트에 저장하고 있습니다. 저장 중에는 다시 누르지 마세요.',false);
    const data={section,id:$('entryId').value,etag:$('entryEtag').value,requestId:window.crypto.randomUUID(),
      category:field('category').value,title:field('title').value,content:field('content').value,
      amount:field('amount').value,unit:field('unit').value,effectiveDate:field('effectiveDate').value,
      status:field('status').value,extra:{}};
    for(const key of ['ageGroup','durationMinutes','preparation','safety','quantity','taxType']){
      const value=field(key).value.trim();if(value)data.extra[key]=value;
    }
    try{
      const response=await rpc('staff51SaveContent',state.token,data);
      if(!response?.ok||!response.item)throw Error('저장 결과를 확인할 수 없습니다. 목록을 새로고침해 주세요.');
      state.selected=response.item;state.dirty=false;
      $('entryId').value=response.item.id;$('entryEtag').value=response.item.etag;
      $('editorTitle').textContent='항목 수정';$('archiveBtn').hidden=response.item.status==='보관';
      state.signature='';await load(true);
      feedback('스프레드시트에 저장했습니다. 다른 직원 화면에도 새로고침 또는 자동 동기화 시 반영됩니다.',false);
    }catch(error){feedback(error.message||'저장하지 못했습니다. 처리 결과를 확인해 주세요.',true);}
    finally{setSaving(false);}
  }
  async function archive(){
    if(!state.canWrite||state.busy||!$('entryId').value)return;
    if(!window.confirm('이 항목을 보관 상태로 변경하시겠습니까? 기존 기록은 삭제하지 않습니다.'))return;
    setSaving(true);
    try{
      const response=await rpc('staff51ArchiveContent',state.token,{section,id:$('entryId').value,etag:$('entryEtag').value});
      if(!response?.ok)throw Error('보관 결과를 확인하지 못했습니다.');
      clearForm();state.signature='';await load(true);feedback('항목을 보관했습니다.',false);
    }catch(error){feedback(error.message||'보관하지 못했습니다.',true);}
    finally{setSaving(false);}
  }
  function showLogin(){
    $('app').hidden=true;$('auth').hidden=false;
    state.token='';state.user=null;state.items=[];state.signature='';
    try{sessionStorage.removeItem(storageKey);}catch(_){}
  }
  async function restore(){
    try{state.token=sessionStorage.getItem(storageKey)||'';}catch(_){}
    if(!state.token)return showLogin();
    try{state.user=await rpc('staffCurrentUser',state.token);}catch(_){return showLogin();}
    if(!canSee(section)){
      showLogin();feedback('이 화면에 접근할 권한이 없습니다. 기존 직원 운영 화면을 이용해 주세요.',true);return;
    }
    startScreen();await load(true);
  }
  $('authForm').addEventListener('submit',async event=>{
    event.preventDefault();const btn=$('authSubmit');btn.disabled=true;btn.textContent='로그인 확인 중…';
    $('authFeedback').textContent='계정을 확인하고 있습니다.';
    try{
      const email=$('authEmail').value.trim().toLowerCase(),password=$('authPassword').value;
      const proof=window.BW29KDF?await window.BW29KDF.derive(email,password):null;
      const response=await rpc('staff23PasswordLogin',{email,password,proof});
      if(!response?.token||!response?.user)throw Error('로그인 결과를 확인하지 못했습니다.');
      state.token=response.token;state.user=response.user;
      if(state.user.mustChange){showLogin();throw Error('임시 비밀번호를 먼저 변경해 주세요. 직원 로그인에서 비밀번호를 설정할 수 있습니다.');}
      if(!canSee(section)){showLogin();throw Error('이 업무에 접근할 권한이 없습니다.');}
      try{sessionStorage.setItem(storageKey,state.token);}catch(_){}
      $('authPassword').value='';startScreen();await load(true);
    }catch(error){$('authFeedback').textContent=error.message||'로그인에 실패했습니다.';}
    finally{btn.disabled=false;btn.textContent='로그인';}
  });
  $('entryForm').addEventListener('submit',save);
  $('entryForm').addEventListener('input',()=>{state.dirty=true;});
  $('archiveBtn').addEventListener('click',archive);
  $('newBtn').addEventListener('click',()=>{clearForm();$('editor').scrollIntoView({behavior:'smooth',block:'start'});});
  $('refreshBtn').addEventListener('click',()=>load(true));
  $('search').addEventListener('input',renderList);
  $('filter').addEventListener('change',renderList);
  $('logout').addEventListener('click',async()=>{
    const token=state.token;showLogin();$('authFeedback').textContent='로그아웃했습니다.';
    if(token)rpc('staffLogout',token).catch(()=>{});
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.token)load(true);});
  window.setInterval(()=>{if(state.token&&document.visibilityState==='visible')load(false);},45000);
  restore();
})();
