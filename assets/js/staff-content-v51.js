/* Bridge Wonder V51 | independent, lightweight operational content screen.
 * Only the private Staff Apps Script service may read/write sheets; no browser secrets.
 * Static shell first, one section fetched at a time, foreground sync every 45 seconds.
 */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const sections={
    settings:{title:'운영 설정',module:'courseSettings',note:'운영 시간과 정원 등 기준을 정리하세요. 기존 수강계약이나 공개 사이트 가격은 자동으로 변경하지 않습니다.'},
    copy:{title:'안내 문구',module:'courseSettings',note:'상담 안내와 직원용 문구를 여기서 관리하세요. 저장한 문구는 이 운영 관리 화면에 반영됩니다.'},
    lessons:{title:'회차별 수업안',module:'themes',note:'활동 내용, 월령, 재료, 안전 사항을 한곳에 정리하세요. 기존 수업안 파일 보관함은 그대로 유지됩니다.'},
    materials:{title:'준비물·재료',module:'themes',note:'수업 재료와 수량, 예상 비용을 정리하세요. 아이의 알레르기나 건강정보는 입력하지 마세요.'},
    costs:{title:'비용 항목',module:'finance',note:'운영 비용을 정리하는 공간입니다. 기존 수납·회계 장부와 결제액에는 자동 반영하지 않습니다.'},
    templates:{title:'서식 문구',module:'documents',note:'안내문과 서식 초안을 관리하세요. 기존 발급 PDF와 동의서는 자동 변경되지 않습니다.'}
  };
  const section=document.body.dataset.section||'lessons';
  if(!sections[section])return;
  const storageKey='bw17_staff_session';
  const state={token:'',user:null,items:[],signature:'',canWrite:false,busy:false,selected:null,dirty:false,loading:false,ready:false,stale:false,generation:0,pending:null,visible:50};
  let searchTimer=null;
  const safe=x=>String(x==null?'':x);
  const rpc=(name,...args)=>window.BW27Bridge.request(name,args);
  const field=name=>document.querySelector('[name="'+name+'"]');
  const feedback=(message,error)=>{const el=$('systemMessage');if(!el)return;el.textContent=message;el.dataset.error=error?'1':'0';};
  const canSee=(code)=>Boolean(state.user?.permissions?.read?.[sections[code].module]) && (code==='lessons'||code==='materials'||['owner','director'].includes(state.user?.role)) && (code!=='costs'||state.user?.role==='owner');
  function startScreen(){
    state.ready=false;state.stale=false;state.pending=null;
    $('auth').hidden=true;$('app').hidden=false;
    window.BW57Workspace?.setUser(state.user);
    window.BW57Workspace?.setGuard(()=>state.busy?'저장 결과가 아직 확인되지 않았습니다. 화면을 이동할까요?':state.dirty||state.pending?'저장하지 않은 운영 자료가 있습니다. 화면을 이동할까요?':'');
    $('userLabel').textContent=(state.user.name||state.user.email)+' · '+({owner:'원장',director:'관리자',teacher:'선생님',frontdesk:'상담 담당자'}[state.user.role]||'직원');
    const nav=$('sectionNav');nav.replaceChildren();
    for(const [id,entry] of Object.entries(sections)){
      if(!canSee(id))continue;
      const a=document.createElement('a');a.href=({lessons:'../curriculum/',settings:'../settings/',copy:'../content/',materials:'../materials/',costs:'../costs/',templates:'../templates/'}[id]);
      a.textContent=entry.title;a.className=id===section?'active':'';if(id===section)a.setAttribute('aria-current','page');nav.appendChild(a);
    }
    $('pageTitle').textContent=sections[section].title;
    $('pageNote').textContent=sections[section].note;
    $('editorTitle').textContent='새 내용 작성';
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
    updateButtons();
  }
  function clearForm(){
    $('entryForm').reset();state.selected=null;state.dirty=false;state.stale=false;state.pending=null;
    $('entryId').value='';$('entryEtag').value='';$('editorTitle').textContent='새 내용 작성';
    $('archiveBtn').hidden=true;
    field('status').value='초안';
    feedback('새 내용을 작성하고 저장해 보세요.',false);
  }
  function discardOkay(){return !state.busy&&(!(state.dirty||state.pending)||window.confirm('저장되지 않았거나 저장 결과를 확인하지 못한 내용이 있습니다. 목록을 확인하고 입력 내용을 바꿀까요?'));}
  function openItem(item){
    if(!state.canWrite||!discardOkay())return;
    state.selected=item;state.dirty=false;state.stale=false;state.pending=null;
    $('entryId').value=item.id;$('entryEtag').value=item.etag;
    for(const k of ['category','title','content','unit','effectiveDate','status'])field(k).value=item[k]||'';
    field('amount').value=item.amount==null?'':item.amount;
    for(const k of ['ageGroup','durationMinutes','preparation','safety','quantity','taxType'])field(k).value=item.extra?.[k]||'';
    $('editorTitle').textContent='내용 수정';$('archiveBtn').hidden=item.status==='보관';
    feedback('내용을 수정한 뒤 저장해 주세요.',false);
    updateButtons();$('editor').scrollIntoView?.({behavior:'smooth',block:'start'});
  }
  function renderList(){
    const list=$('items');list.replaceChildren();
    let more=$('bw57More');
    if(!more){more=document.createElement('button');more.id='bw57More';more.type='button';more.className='btn btn-outline bw57-list-more';more.addEventListener('click',()=>{state.visible+=50;renderList();});list.after(more);}
    const term=$('search').value.trim().toLowerCase();
    const mode=$('filter').value;
    const data=state.items.filter(v=>(mode==='전체'||v.status===mode)&&(!term||[v.title,v.category,v.content].some(s=>safe(s).toLowerCase().includes(term))));
    const shown=data.slice(0,state.visible);
    $('count').textContent=data.length+'개 항목';
    more.hidden=shown.length>=data.length;more.textContent='더 보기 · '+shown.length+'/'+data.length;
    if(!data.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='검색 결과가 없어요. 다른 단어로 찾아보세요.';list.appendChild(empty);return;}
    const frag=document.createDocumentFragment();
    for(const item of shown){
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
  function updateButtons(){
    const disabled=!state.canWrite||!state.ready||state.busy||state.loading||state.stale;
    $('saveBtn').disabled=disabled;$('archiveBtn').disabled=disabled||Boolean(state.pending);
    $('newBtn').disabled=state.busy;
    $('saveBtn').textContent=state.busy?'저장 중…':state.pending?'같은 내용 다시 확인·저장':'스프레드시트에 저장';
    $('refreshBtn').disabled=state.busy||state.loading;
    for(const el of $('entryForm').querySelectorAll('input:not([type=hidden]),textarea,select'))el.disabled=state.busy||!state.canWrite;
  }
  const current=(generation,token)=>state.generation===generation&&state.token===token&&Boolean(token);
  async function load(force){
    if(!state.token||state.loading||state.busy||document.visibilityState==='hidden')return;
    const generation=state.generation,token=state.token;state.loading=true;updateButtons();
    try{
      const response=await rpc('staff51ListContent',token,section,force?'':state.signature);
      if(!current(generation,token))return;
      if(!response||response.section!==section||typeof response.canWrite!=='boolean')throw Error('목록 응답을 확인해 주세요.');
      const permissionChanged=state.canWrite!==response.canWrite;
      state.canWrite=response.canWrite;
      $('editor').hidden=!state.canWrite;$('newBtn').hidden=!state.canWrite;
      state.ready=true;
      if(response.unchanged){$('updated').textContent='최신 정보 확인 · '+(response.checkedAt||'');if(permissionChanged)renderList();return;}
      if(!Array.isArray(response.items))throw Error('목록 응답을 확인해 주세요.');
      state.items=response.items;state.signature=response.signature||'';
      if(state.selected){
        const selected=state.items.find(x=>x.id===state.selected.id);
        if(!selected||selected.etag!==state.selected.etag){
          state.stale=true;
          feedback('다른 화면에서 이 항목이 변경되었습니다. 최신 항목을 다시 연 뒤 저장해 주세요.',true);
        }
      }
      $('updated').textContent='동기화 · '+(response.checkedAt||'');
      renderList();
    }catch(error){
      if(!current(generation,token))return;
      state.ready=false;feedback(error.message||'데이터를 불러오지 못했습니다.',true);
      if(/로그인|접속 시간이 만료|사용 권한이 중지/.test(error.message||'')){showLogin();$('authFeedback').textContent='로그인 상태를 다시 확인해 주세요.';}
    }finally{if(current(generation,token)){state.loading=false;updateButtons();}}
  }
  function setSaving(flag){state.busy=flag;updateButtons();}
  async function save(event){
    event.preventDefault();if(!state.canWrite||!state.ready||state.busy||state.loading||state.stale)return;
    if(!window.crypto?.randomUUID){feedback('보안 연결에서 다시 시도해 주세요.',true);return;}
    const generation=state.generation,token=state.token;
    const data={section,id:$('entryId').value,etag:$('entryEtag').value,
      category:field('category').value,title:field('title').value,content:field('content').value,
      amount:field('amount').value,unit:field('unit').value,effectiveDate:field('effectiveDate').value,
      status:field('status').value,extra:{}};
    for(const key of ['ageGroup','durationMinutes','preparation','safety','quantity','taxType']){
      const value=field(key).value.trim();if(value)data.extra[key]=value;
    }
    const key=JSON.stringify(data);
    if(state.pending&&state.pending.key!==key){feedback('이전 저장 결과가 확실하지 않습니다. 목록을 먼저 확인하고 항목을 다시 열거나 새 내용을 작성해 주세요.',true);return;}
    if(!state.pending)state.pending={key,requestId:window.crypto.randomUUID()};
    data.requestId=state.pending.requestId;setSaving(true);feedback('저장하고 있어요. 완료될 때까지 버튼을 다시 누르지 마세요.',false);
    try{
      const response=await rpc('staff51SaveContent',token,data);
      if(!current(generation,token))return;
      if(!response?.ok||!response.item)throw Error('저장 결과를 확인하지 못했어요. 목록을 새로고침해 주세요.');
      state.selected=response.item;state.dirty=false;state.pending=null;state.stale=false;
      $('entryId').value=response.item.id;$('entryEtag').value=response.item.etag;
      $('editorTitle').textContent='내용 수정';$('archiveBtn').hidden=response.item.status==='보관';
      state.items=[response.item,...state.items.filter(x=>x.id!==response.item.id)];state.signature='';renderList();
      feedback(response.auditWarning?'저장했지만 변경 이력 기록을 확인해 주세요.':'저장했어요. 다른 직원 화면에는 다음 동기화 때 반영됩니다.',Boolean(response.auditWarning));
    }catch(error){if(current(generation,token))feedback(String(error.message||'저장하지 못했습니다.')+' 목록을 확인하거나 같은 내용으로 다시 시도하세요.',true);}
    finally{if(current(generation,token))setSaving(false);}
  }
  async function archive(){
    if(!state.canWrite||!state.ready||state.busy||state.loading||state.stale||state.pending||!$('entryId').value)return;
    if(state.dirty&&!window.confirm('수정한 내용은 저장하지 않고 기존 항목을 보관할까요?'))return;
    const generation=state.generation,token=state.token;
    if(!window.confirm('이 항목을 보관 상태로 변경하시겠습니까? 기존 기록은 삭제하지 않습니다.'))return;
    setSaving(true);
    try{
      const response=await rpc('staff51ArchiveContent',token,{section,id:$('entryId').value,etag:$('entryEtag').value});
      if(!current(generation,token))return;
      if(!response?.ok)throw Error('보관 결과를 확인하지 못했습니다.');
      if(response.item)state.items=[response.item,...state.items.filter(x=>x.id!==response.item.id)];
      clearForm();state.signature='';renderList();feedback(response.auditWarning?'보관했지만 변경 이력 기록을 확인해 주세요.':'보관함으로 옮겼어요.',Boolean(response.auditWarning));
    }catch(error){if(current(generation,token))feedback(error.message||'보관하지 못했습니다.',true);}
    finally{if(current(generation,token))setSaving(false);}
  }
  function showLogin(){
    $('app').hidden=true;$('auth').hidden=false;
    state.generation++;state.token='';state.user=null;state.items=[];state.signature='';state.ready=false;state.canWrite=false;state.loading=false;state.busy=false;state.pending=null;state.stale=false;state.visible=50;
    window.BW57Workspace?.clearUser();clearForm();$('items').replaceChildren();$('userLabel').textContent='';$('sectionNav').replaceChildren();
    try{sessionStorage.removeItem(storageKey);}catch(_){}
  }
  async function restore(){
    try{state.token=sessionStorage.getItem(storageKey)||'';}catch(_){}
    if(!state.token)return showLogin();
    const generation=state.generation,token=state.token;
    try{const user=await rpc('staffCurrentUser',token);if(!current(generation,token))return;state.user=user;}catch(_){if(current(generation,token))showLogin();return;}
    if(state.user?.mustChange||!canSee(section)){
      showLogin();$('authFeedback').textContent='권한 또는 비밀번호 설정을 확인해 주세요. 직원 홈에서 다시 로그인할 수 있습니다.';return;
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
      state.generation++;state.token=response.token;state.user=response.user;
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
  $('newBtn').addEventListener('click',()=>{if(!discardOkay())return;clearForm();updateButtons();$('editor').scrollIntoView?.({behavior:'smooth',block:'start'});});
  $('refreshBtn').addEventListener('click',()=>load(true));
  $('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.visible=50;renderList();},120);});
  $('filter').addEventListener('change',()=>{state.visible=50;renderList();});
  $('logout').addEventListener('click',async()=>{
    if(window.BW57Workspace?.confirmLeave()===false)return;
    const token=state.token;showLogin();$('authFeedback').textContent='로그아웃했습니다.';
    if(token)rpc('staffLogout',token).catch(()=>{});
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.token)load(true);});
  window.setInterval(()=>{if(state.token&&document.visibilityState==='visible')load(false);},45000);
  restore();
})();
