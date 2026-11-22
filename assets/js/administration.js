/* Bridge Wonder V26 · GitHub staff app · no secrets */
'use strict';
    const $=id=>document.getElementById(id), h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ROLE_NAMES={owner:'원장',director:'관리자',teacher:'선생님',frontdesk:'상담 담당자'};
    // V44: internal studio operating plan, not a statutory capacity determination.
    const BW44_POLICY=Object.freeze({minMonths:7,maxMonths:48,maxChildren:4,guardianPerChild:1,sessionMinutes:50});
    const MENU=[['home','⌂','스튜디오 홈',['owner','director','teacher','frontdesk']],['classes','▦','클래스 시간표',['owner','director','teacher','frontdesk']],['roster','♧','아이 명단',['owner','director','teacher']],['students','▤','아이 기본정보',['owner','director']],['experiences','♧','월간 체험 테마',['owner','director']],['attendance','✓','출결 체크',['owner','director','teacher']],['makeups','▤','결석·보강',['owner','director','teacher']],['safety','♧','재료·안전 점검',['owner','director','teacher']],['handoff','✓','보호자 인계',['owner','director','teacher']],['themes','♧','월간 오감놀이 계획',['owner','director','teacher','frontdesk']],['capacity','▣','클래스 정원',['owner','director','teacher','frontdesk']],['inquiries','◷','체험·클래스 상담',['owner','director','frontdesk']],['waitlist','◷','대기·일정 협의',['owner','director','frontdesk']],['registrations','▤','등록 서류 확인',['owner','director']],['tuition','₩','수업비·환불 기록',['owner','director']],['documents','▣','보호자 문서·PDF',['owner','director','teacher','frontdesk']],['operations','☷','시설·운영 점검',['owner','director']],['compliance','▤','운영 기준·법정 확인',['owner','director']],['courseSettings','◈','스튜디오 운영정보',['owner','director']],['staffCompliance','◈','직원 필수 확인',['owner']],['users','♙','직원 계정·권한',['owner']],['payroll','₩','직원 급여',['owner']],['security','⌘','이용 기록·백업',['owner']],['finance','₩','운영 손익·현금흐름',['owner']]];
    const BW24_CAPS={"home":{"label":"스튜디오 홈","read":["owner","director","teacher","frontdesk"],"write":[]},"inquiries":{"label":"체험·클래스 상담","read":["owner","director","frontdesk"],"write":["owner","director","frontdesk"]},"registrations":{"label":"등록 서류 확인","read":["owner","director"],"write":[]},"classes":{"label":"클래스 시간표","read":["owner","director","teacher","frontdesk"],"write":["owner","director"]},"courseSettings":{"label":"스튜디오 운영정보","read":["owner","director"],"write":["owner","director"]},"roster":{"label":"아이 명단","read":["owner","director","teacher"],"write":[]},"students":{"label":"아이 기본정보","read":["owner","director"],"write":["owner","director"]},"experiences":{"label":"월간 체험 테마","read":["owner","director"],"write":["owner","director"]},"attendance":{"label":"출결 체크","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"operations":{"label":"시설·운영 점검","read":["owner","director"],"write":["owner","director"]},"compliance":{"label":"운영 기준·법정 확인","read":["owner","director"],"write":["owner","director"]},"tuition":{"label":"수업비·환불 기록","read":["owner","director"],"write":["owner","director"]},"safety":{"label":"재료·안전 점검","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"handoff":{"label":"보호자 인계","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"staffCompliance":{"label":"직원 필수 확인","read":["owner"],"write":["owner"]},"users":{"label":"직원 계정·권한","read":["owner"],"write":["owner"]},"documents":{"label":"보호자 문서·PDF","read":["owner","director","teacher","frontdesk"],"write":["owner","director","teacher","frontdesk"]},"capacity":{"label":"클래스 정원","read":["owner","director","teacher","frontdesk"],"write":["owner","director"]},"waitlist":{"label":"대기·일정 협의","read":["owner","director","frontdesk"],"write":["owner","director","frontdesk"]},"makeups":{"label":"결석·보강","read":["owner","director","teacher"],"write":["owner","director","teacher"]},"themes":{"label":"월간 오감놀이 계획","read":["owner","director","teacher","frontdesk"],"write":["owner","director"]},"security":{"label":"이용 기록·백업","read":["owner"],"write":["owner"]},"payroll":{"label":"직원 급여","read":["owner"],"write":["owner"]},"finance":{"label":"운영 손익·현금흐름","read":["owner"],"write":["owner"]}};
    function bw24Can(page,mode='read'){
      if(!state.user||!BW24_CAPS[page])return false;
      if(!BW24_CAPS[page][mode==='write'?'write':'read'].includes(state.user.role))return false;
      const userPolicy=state.user.permissions;
      return !userPolicy || userPolicy[mode==='write'?'write':'read']?.[page]===true;
    }
    const state={token:'',user:null,page:'home',classes:[],templates:[],inquiries:[],registrations:[],roster:[],staff:[],attendance:[],busy:false,navigationSeq:0};
    // V50: URL routes for each staff business area; the same authenticated GAS is retained.
    // URL contains only the public module/page ID, never a session token or child data.
    const BW50_AREAS=Object.freeze({
      consult:['inquiries','waitlist','students','registrations'],
      class:['classes','capacity','roster','attendance','makeups','handoff'],
      sensory:['experiences','themes','safety'],
      service:['tuition','documents'],
      admin:['operations','courseSettings','compliance','staffCompliance','users','payroll','finance','security']
    });
    const bw50AreaOf=page=>Object.keys(BW50_AREAS).find(key=>BW50_AREAS[key].includes(page))||'home';
    const bw50FromURL=()=>{
      try{
        const url=new URL(window.location.href),page=url.searchParams.get('page'),area=url.searchParams.get('area');
        if(page==='home')return 'home';
        if(!page||!Object.prototype.hasOwnProperty.call(BW24_CAPS,page))return 'home';
        if(area&&area!==bw50AreaOf(page))return 'home';
        return page;
      }catch(_){return 'home';}
    };
    const bw50SyncURL=(page,replace)=>{
      try{
        const url=new URL(window.location.href);
        url.searchParams.delete('page');url.searchParams.delete('area');
        if(page!=='home'){url.searchParams.set('area',bw50AreaOf(page));url.searchParams.set('page',page);}
        const target=url.pathname+url.search+url.hash;
        if(target!==window.location.pathname+window.location.search+window.location.hash){
          window.history[replace?'replaceState':'pushState']({bw50StaffPage:page},'',target);
        }
      }catch(_){/* URL routing must never block a staff task */}
    };

    let toastTimer;
    const toast=(message,error=false)=>{if(message==='BW24_STALE_VIEW')return;const el=$('toast');el.textContent=message;el.style.background=error?'#92513e':'#354f33';el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',3900);};
    // V25.1: requests are optimized in the separate GitHub acceleration module.
    const bw24Timings=[];
    const bw25Accel=window.BW25Acceleration?.create({
      concurrency:4,readTimeoutMs:30000,writeTimeoutMs:45000,
      invoke:(name,args)=>new Promise((resolve,reject)=>{try{
        google.script.run.withSuccessHandler(resolve).withFailureHandler(e=>reject(new Error(e?.message||String(e))))[name](...args);
      }catch(e){reject(e);}}),
      onTiming:(name,ms)=>{bw24Timings.push({name,ms});if(bw24Timings.length>60)bw24Timings.shift();},
      onSlow:(name,ms)=>{if(ms>5000)console.info('[Bridge Wonder] delayed '+name+' ('+ms+'ms)');}
    });
    function bw24ClearCache(){bw25Accel?.invalidate();}
    function call(name,...args){
      const token=state.token,nav=state.navigationSeq;
      const result=bw25Accel?bw25Accel.request(name,args,{session:token,nav}):
        new Promise((resolve,reject)=>{try{
          google.script.run.withSuccessHandler(resolve).withFailureHandler(e=>reject(new Error(e?.message||String(e))))[name](...args);
        }catch(e){reject(e);}});
      return result.then(value=>{if(token!==state.token||nav!==state.navigationSeq)throw Error('BW24_STALE_VIEW');return value;});
    }
    window.BW30Accounts?.configure({state,call,logout,toast});
    window.BW31UX?.configure({state,MENU,can:bw24Can,navigate:showPage});
    window.BW33Enterprise?.configure({state,MENU,can:bw24Can,navigate:showPage,toast});
    const bw25DisabledSnapshot=new WeakMap();
    function setBusy(form,busy){
      if(!form)return;
      form.querySelectorAll('button,select,input,textarea').forEach(el=>{
        if(busy){if(!bw25DisabledSnapshot.has(el))bw25DisabledSnapshot.set(el,el.disabled);el.disabled=true;}
        else if(bw25DisabledSnapshot.has(el)){el.disabled=bw25DisabledSnapshot.get(el);bw25DisabledSnapshot.delete(el);}
      });
    }
    function loginError(err){const text=String(err?.message||err||'처리 중 문제가 발생했습니다.');$('loginFeedback').textContent=text;}
    // BW23: password by default. OTP only during initial setup and explicit recovery.
    let bw23EnrollMode='setup';
    function bw23ShowPassword(message=''){
      $('loginStepPassword').hidden=false;
      $('loginStepEmail').hidden=true;
      $('loginStepOtp').hidden=true;
      $('loginFeedback').textContent=message;
    }
    function bw23ShowEnrollment(mode){
      bw23EnrollMode=mode;
      $('loginStepPassword').hidden=true;
      $('loginStepEmail').hidden=false;
      $('loginStepOtp').hidden=true;
      $('loginEmail').value=$('passwordEmail').value.trim();
      $('loginFeedback').textContent='';
      $('loginEmail').focus();
    }
    $('bw23FirstTime').onclick=()=>bw23ShowEnrollment('setup');
    $('bw23Reset').onclick=()=>bw23ShowEnrollment('reset');
    $('passwordLoginForm').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget;setBusy(form,true);
      $('loginFeedback').textContent='로그인 정보를 확인하고 있습니다…';
      try{
        const authStarted=performance.now();
        const email=$('passwordEmail').value.trim(),password=$('passwordInput').value;
        // WebCrypto runs in the browser's native engine. Do not store or log this proof.
        const proof=window.BW29KDF?await window.BW29KDF.derive(email,password):null;
        const nativeKdfMs=Math.max(0,Math.round(performance.now()-authStarted));
        $('loginFeedback').textContent='로그인 중입니다…';
        const serverStarted=performance.now();
        const r=await call('staff23PasswordLogin',{email,password,proof});
        // Timing-only diagnostics: do not expose the password, native proof or session token.
        window.BW29LastLoginTiming=Object.freeze({
          nativeKdfMs,googleAuthMs:Math.max(0,Math.round(performance.now()-serverStarted)),
          totalMs:Math.max(0,Math.round(performance.now()-authStarted))
        });
        state.token=r.token;state.user=r.user;
        $('passwordInput').value='';
        try{sessionStorage.setItem('bw17_staff_session',state.token);}catch(_){}
        $('loginFeedback').textContent='';await startApp();
      }catch(err){loginError(err);}finally{setBusy(form,false);}
    });
    $('emailForm').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget;setBusy(form,true);
      $('loginFeedback').textContent='인증번호를 보내고 있습니다.';
      try{
        const email=$('loginEmail').value.trim();
        const result=await call('staff23PasswordStartEnrollment',email);
        $('sentTo').textContent=email+' 주소로 발송한 인증번호를 확인하고 비밀번호를 설정하세요.';
        $('loginStepEmail').hidden=true;$('loginStepOtp').hidden=false;
        $('loginFeedback').textContent=result.message||'메일함을 확인해 주세요.';
        $('loginOtp').focus();
      }catch(err){loginError(err);}finally{setBusy(form,false);}
    });
    $('otpForm').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.currentTarget;setBusy(form,true);
      $('loginFeedback').textContent='인증번호와 새 비밀번호를 확인하고 있습니다…';
      try{
        const pw=$('bw23NewPass').value;
        if(pw!==$('bw23ConfirmPass').value)throw Error('새 비밀번호가 일치하지 않습니다.');
        const email=$('loginEmail').value.trim();
        const proof=window.BW29KDF?await window.BW29KDF.derive(email,pw):null;
        const r=await call('staff23PasswordCompleteEnrollment',{email,code:$('loginOtp').value.trim(),password:pw,proof,mode:bw23EnrollMode});
        $('passwordEmail').value=$('loginEmail').value.trim();
        $('loginOtp').value='';$('bw23NewPass').value='';$('bw23ConfirmPass').value='';
        bw23ShowPassword(r.message||'비밀번호를 설정했습니다. 새 비밀번호로 로그인해 주세요.');
        $('passwordInput').focus();
      }catch(err){loginError(err);}finally{setBusy(form,false);}
    });
    $('backToEmail').addEventListener('click',()=>bw23ShowPassword(''));
    async function logout(){
      const token=state.token;state.token='';state.user=null;bw37QueuedInquiry='';state.navigationSeq++;bw25Accel?.clear();window.BWPayroll?.dispose();$('pageBody').replaceChildren();for(const key of ['classes','templates','inquiries','registrations','roster','staff','attendance'])state[key]=[];
      try{sessionStorage.removeItem('bw17_staff_session');}catch(_){}
      $('workspace').hidden=true;$('loginScreen').hidden=false;
      $('passwordInput').value='';bw23ShowPassword('로그아웃했습니다.');
      if(token)call('staffLogout',token).catch(()=>{});
    }
    $('logoutBtn').onclick=logout;$('logoutMobile').onclick=logout;
    async function startApp(){if(!state.user){try{state.user=await call('staffCurrentUser',state.token);}catch(e){await logout();return;}}$('loginScreen').hidden=true;$('workspace').hidden=false;$('staffName').textContent=state.user.name||'선생님';$('staffEmail').textContent=state.user.email||'';$('roleBadge').textContent=ROLE_NAMES[state.user.role]||'직원';renderNav();window.BW31UX?.decorateNav();window.BW33Enterprise?.sync();if(state.user.mustChange){if(!window.BW30Accounts)throw Error('비밀번호 변경 화면을 불러오지 못했습니다.');window.BW30Accounts.openChange(true);return;}await showPage(bw24Can(bw50FromURL())?bw50FromURL():'home',true);bw29WarmOwnerPayrollAssets();}
    window.addEventListener('popstate',()=>{
      if(!state.user)return;
      const page=bw50FromURL();
      if(page!==state.page)showPage(bw24Can(page)?page:'home',true);
    });
    function bw29WarmOwnerPayrollAssets(){
      // Non-sensitive assets only, off the login critical path. No payroll data is fetched.
      const token=state.token;
      if(!token||state.user?.role!=='owner')return;
      const network=navigator.connection;
      if(network?.saveData||/2g/i.test(network?.effectiveType||''))return;
      const warm=()=>{if(state.token!==token||state.user?.role!=='owner')return;bw26LoadPayroll().catch(()=>{});};
      if(typeof requestIdleCallback==='function')requestIdleCallback(warm,{timeout:4000});
      else setTimeout(warm,3000);
    }
    function renderNav(){const allowed=MENU.filter(m=>bw24Can(m[0]));const signature=state.page+'|'+allowed.map(m=>m[0]).join(',');for(const id of ['sideNav','mobileNav']){const el=$(id);if(el.dataset.bw25NavSignature===signature)continue;el.innerHTML=allowed.map(m=>`<button type="button" data-page="${m[0]}" class="nav-btn ${m[0]===state.page?'active':''}"><i aria-hidden="true">${m[1]}</i>${m[2]}</button>`).join('');el.dataset.bw25NavSignature=signature;el.querySelectorAll('button[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));}}

    function bw24ApplyReadonly(page){
      if(bw24Can(page,'write')||!bw24Can(page,'read')||['home','registrations','roster','security'].includes(page))return;
      const root=$('pageBody');if(!root)return;
      if(root.querySelector('.bw24-viewonly'))return;
      root.insertAdjacentHTML('afterbegin','<div class="bw24-viewonly" role="note">조회 전용 화면입니다. 입력·수정이 필요하면 원장에게 권한을 요청해 주세요.</div>');
      root.querySelectorAll('form button[type="submit"], [data-save-att], [data-op-save]').forEach(b=>b.disabled=true);
      root.querySelectorAll('button').forEach(b=>{
        if(/저장|신규 발급|PDF 생성|이메일 보내기|수정|승인|계정 추가|반영/.test(b.textContent||''))b.disabled=true;
      });
    }
    function head(title,description){return `<h2 class="page-title">${h(title)}</h2><p class="page-description">${h(description)}</p>`;}
    function panel(title,description,inner){return `<section class="panel"><h3>${title}</h3>${description?`<p class="panel-desc">${description}</p>`:''}${inner}</section>`;}
    function table(columns,rows){if(!rows.length)return `<div class="empty">표시할 기록이 없습니다.</div>`;return `<div class="table-scroll"><table class="data-table"><thead><tr>${columns.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
    function tag(s){return `<span class="tag ${/실패|중지|결석/.test(s)?'off':/대기|신규|확인전/.test(s)?'waiting':''}">${h(s||'미확인')}</span>`;}
    function loading(){return `<div class="panel bw24-loading"><span class="bw24-pulse" aria-hidden="true"></span><p class="muted" role="status">자료를 불러오고 있습니다.</p></div>`;}
    async function showPage(page,fromHistory=false){if(!state.user||!bw24Can(page))return;if(state.page==='payroll'&&window.BWPayroll?.beforeLeave()===false)return;window.BWPayroll?.dispose();state.page=page;bw50SyncURL(page,fromHistory);const seq=++state.navigationSeq;bw25Accel?.setNavigation(seq);renderNav();window.BW31UX?.decorateNav();window.BW33Enterprise?.sync();const m=MENU.find(x=>x[0]===page);$('topTitle').textContent=m[2];$('pageBody').innerHTML=loading();try{document.scrollingElement?.scrollTo({top:0,behavior:'auto'});if(page==='home')await renderHome();if(page==='inquiries')await renderInquiries();if(page==='registrations')await renderRegistrations();if(page==='classes')await renderClasses();if(page==='courseSettings')await renderCourseSettings();if(page==='roster')await renderRoster();if(page==='students')await renderStudents37();if(page==='experiences')await renderExperiences37();if(page==='attendance')await renderAttendance();if(page==='operations')await renderOperations();if(page==='compliance')await renderCompliance32();if(page==='tuition')await renderTuition();if(page==='safety')await renderSafety();if(page==='handoff')await renderHandoff();if(page==='staffCompliance')await renderStaffCompliance();if(page==='users')await renderUsers();if(page==='security')await renderSecurity();if(page==='documents')await renderDocuments();if(page==='capacity')await renderCapacity();if(page==='waitlist')await renderWaitlist();if(page==='makeups')await renderMakeups();if(page==='themes')await renderThemes();if(page==='payroll')await renderPayroll();if(page==='finance')await renderFinance49();if(seq===state.navigationSeq){bw24ApplyReadonly(page);window.BW31UX?.onPageRendered(page);window.BW33Enterprise?.pageReady(page);}}catch(e){if(seq!==state.navigationSeq||e.message==='BW24_STALE_VIEW')return;if(/로그인이 필요|접속 시간이 만료|사용 권한이 중지/.test(e.message)){await logout();toast('로그인 상태를 다시 확인해 주세요.',true);}else {
      const needsServer=['students','experiences','compliance'].includes(page) &&
        /허용되지 않은 업무 요청|지원하지 않는 업무 요청|함수를 찾을 수|Script function not found|is not a function|unknown method/i.test(String(e?.message||''));
      if(needsServer){
        $('pageBody').innerHTML=head(m[2],'')+panel('관리 시스템 업데이트가 필요합니다',
          '이 기능을 사용하려면 관리 시스템 업데이트가 필요합니다. 기존 운영 기록에는 영향을 주지 않습니다.',
          '<p>상담·수업·수납·급여 등 기존 메뉴는 그대로 이용할 수 있습니다. 업데이트는 운영 담당자에게 문의해 주세요.</p>'+
          '<button id="retryPage" class="btn btn-outline spaced">연동 다시 확인</button>');
      }else{
        $('pageBody').innerHTML=head(m[2],'')+panel('자료를 불러오지 못했습니다. 다시 시도해 주세요.','',
          `<p class="danger">${h(e.message)}</p><button id="retryPage" class="btn btn-outline spaced">다시 시도</button>`);
      }
      $('retryPage').onclick=()=>showPage(page);
    }}}
    // V27.1: paint safe quick links immediately; live counts arrive asynchronously.
    // V28.2: static-first paint; metrics are updated asynchronously without blocking navigation.
    let bw282HomeEpoch=0;
    function renderHome(){
      const epoch=++bw282HomeEpoch;
      const nav=state.navigationSeq,token=state.token;
      const isCurrent=()=>state.page==='home'&&nav===state.navigationSeq&&token===state.token&&epoch===bw282HomeEpoch;
      const defaults=window.BWStaffDefaults||{};
      const order=defaults.home?.quickOrder||[];
      const shortcuts=MENU.filter(x=>bw24Can(x[0])&&!['home','security'].includes(x[0]))
        .sort((a,b)=>((order.indexOf(a[0])<0?999:order.indexOf(a[0]))-(order.indexOf(b[0])<0?999:order.indexOf(b[0]))));
      const streams=[
        {title:'상담·등록',desc:'체험 문의부터 아이 기본정보까지',pages:['inquiries','waitlist','students','registrations']},
        {title:'클래스 운영',desc:'일정, 출결, 결석·보강과 인계',pages:['classes','capacity','roster','attendance','makeups','handoff']},
        {title:'오감놀이 준비',desc:'월간 테마와 재료·안전 확인',pages:['experiences','themes','safety']},
        {title:'보호자·운영 지원',desc:'수납과 문서, 시설·직원 관리',pages:['tuition','documents','operations','courseSettings','compliance','staffCompliance','users','payroll','finance']}
      ].map(group=>({...group,items:group.pages.map(id=>shortcuts.find(m=>m[0]===id)).filter(Boolean)}))
        .filter(group=>group.items.length);
      const metrics=[['classCount',state.user?.role==='teacher'?'담당 클래스':'운영 중인 클래스']];
      if(bw24Can('inquiries'))metrics.push(['newInquiries','새 체험·수업 문의']);
      if(bw24Can('registrations'))metrics.push(['pendingEnrollments','확인할 등록 서류']);
      $('pageBody').innerHTML=head('센서리 스튜디오 운영','오늘 처리할 일을 확인해 주세요.')+
        `<div class="metric-grid">${metrics.map(([key,title])=>`<article class="metric"><div class="metric-name">${h(title)}</div><div class="metric-value" id="bw271Metric_${key}" aria-live="polite">—</div></article>`).join('')}</div>`+
        panel('현재 수업 운영 기준','부모참여형 오감놀이 · 한 타임 기준',
          '<div class="row" style="gap:8px;flex-wrap:wrap"><span class="pill">생후 7~48개월</span><span class="pill">아이 4명</span><span class="pill">보호자 4명 동반</span><span class="pill">50분</span></div><p class="footnote">보호자는 수업 내내 아이와 함께 참여합니다. 아이만 맡기는 돌봄은 운영하지 않습니다. 다른 공간에서 동시에 활동하는 인원도 확인하세요.</p>'+
          (bw24Can('themes')&&['owner','director','teacher'].includes(state.user?.role)?'<div class="row spaced"><button type="button" class="btn btn-outline btn-small" data-goto="themes">수업안 파일 관리</button></div>':'') )+
        panel('자주 쓰는 업무','필요한 메뉴를 선택해 주세요. 사용 권한이 있는 메뉴만 표시됩니다.',
          `<div class="bw39-workstreams">${streams.map(group=>`
            <section class="bw39-workstream">
              <div class="bw39-stream-head"><h4>${h(group.title)}</h4><p>${h(group.desc)}</p></div>
              <div class="cards-list">${group.items.map(x=>`<button type="button" data-goto="${x[0]}" class="btn btn-outline">${h(x[2])}</button>`).join('')}</div>
            </section>`).join('')}</div>`)+
        panel('운영 현황','상담과 클래스 기록을 바탕으로 현황을 보여드립니다.',
          `<div class="row" style="align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><span class="inline-status" id="bw271HomeStatus" role="status" aria-live="polite">오늘의 운영 현황을 불러오고 있습니다…</span><button type="button" id="bw271RefreshHome" class="btn btn-outline btn-small">현황 새로고침</button></div>`);
      $('pageBody').querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>showPage(b.dataset.goto));
      $('bw271RefreshHome').onclick=()=>{bw24ClearCache();renderHome();};
      // Private details stay on Google. Missing metrics remain unknown (—), never an invented zero.
      call('staffDashboard',token).then(r=>{
        if(!isCurrent())return;
        for(const [key] of metrics){const el=$('bw271Metric_'+key);if(el)el.textContent=r[key]===null||r[key]===undefined?'—':String(r[key]);}
        const status=$('bw271HomeStatus');if(status)status.textContent='최근 조회: '+String(r.updatedAt||'방금');
      }).catch(e=>{
        if(!isCurrent()||e?.message==='BW24_STALE_VIEW')return;
        const status=$('bw271HomeStatus');if(status)status.textContent='현황 조회가 지연되고 있습니다. 새로고침으로 다시 확인할 수 있습니다.';
      });
    }
    function bw37InquiryNote(raw){
      const value=String(raw||'').trim();
      const guardian=/\[보호자:([^\]]{1,45})\]/.exec(value);
      const weekly=/\[희망횟수:(미정|주 1회|주 2회)\]/.exec(value);
      if(!guardian||!weekly)return value;
      const remaining=value.replace(/\[보호자:[^\]]+\]\[희망횟수:[^\]]+\]/,'').trim();
      return ['보호자 '+guardian[1],weekly[1]==='미정'?'수업 횟수 상담 예정':weekly[1]+' 희망',remaining].filter(Boolean).join(' · ');
    }
    async function renderInquiries(){state.inquiries=await call('staffListInquiries',state.token);if(state.page!=='inquiries')return;
      const canCreateStudent=bw24Can('students','write');
      $('pageBody').innerHTML=head('체험·클래스 상담','상담 신청을 확인하고 연락한 내용과 다음 일정을 기록해 주세요.')+
      panel('상담 접수 내역','상담 진행 상황을 확인하고 필요할 때 상태를 바꿔 주세요.',`<div class="toolbar"><input id="inqSearch" type="search" placeholder="이름·연락처·접수번호 검색" aria-label="상담 내역 검색"><span class="pill">최근 ${state.inquiries.length}건</span></div><div id="inquiryRows"></div>`);
      const draw=()=>{const q=$('inqSearch').value.trim().toLowerCase(),items=state.inquiries.filter(x=>[x.child,x.guardian,x.phone,x.receipt,x.type,x.note].join(' ').toLowerCase().includes(q));$('inquiryRows').innerHTML=table(['접수','아이 이름 / 보호자 연락처','문의','연락 방식','진행 상태',...(canCreateStudent?['학생 등록']:[])],items.map(x=>`<tr><td><div>${h(x.at)}</div><small>${h(x.receipt)}</small></td><td><strong>${h(x.displayName)}</strong>${x.legacyName?'<br><small>과거 접수: 보호자 성함</small>':''}<br>${x.phoneValid?`<a href="tel:${h(x.phone.replace(/[^0-9]/g,''))}">${h(x.phone)}</a>`:`<span class="danger">${h(x.phone||'번호 미기재')} · 번호 확인 필요</span>`}<br><small>아이 ${h(x.months)}개월</small></td><td>${h(x.type)}<div class="note-cell muted">${h(bw37InquiryNote(x.note))}</div></td><td>${h(x.contactMethod)}<br><small>${h(x.preferredTime)}</small></td><td><select class="inline-select" data-inq="${h(x.receipt)}" aria-label="${h(x.displayName)} 상담 상태">${['신규','연락중','방문예약','상담완료','종결'].map(s=>`<option value="${s}" ${x.status===s?'selected':''}>${s}</option>`).join('')}</select></td>${canCreateStudent?`<td><button type="button" class="btn btn-outline btn-small" data-bw37inquiry="${h(x.receipt)}">아이 정보 등록</button></td>`:''}</tr>`));$('inquiryRows').querySelectorAll('select[data-inq]').forEach(el=>el.onchange=async()=>{const receipt=el.dataset.inq,old=state.inquiries.find(x=>x.receipt===receipt);el.disabled=true;try{await call('staffUpdateInquiry',state.token,{receipt,status:el.value});old.status=el.value;toast('상담 상태를 저장했습니다.');}catch(e){toast(e.message,true);el.value=old.status;}finally{el.disabled=false;}});
        $('inquiryRows').querySelectorAll('[data-bw37inquiry]').forEach(button=>{
          button.onclick=()=>{bw37QueuedInquiry=button.dataset.bw37inquiry;showPage('students');};
        });
      };
      $('inqSearch').addEventListener('input',draw);draw();
    }
    async function renderRegistrations(){state.registrations=await call('staffListRegistrations',state.token);if(state.page!=='registrations')return;
      $('pageBody').innerHTML=head('등록 서류 확인','신청 내역과 보호자가 확인한 문서를 살펴보세요. 기존 서명 계약은 별도로 보관됩니다.')+
      panel('등록 접수 내역','보호자가 보낸 신청 내용과 기존 서명 문서를 확인해 주세요. 결제 내역과 영수증은 별도입니다.',`<div class="toolbar"><input id="regSearch" type="search" placeholder="아이·보호자·접수번호 검색" aria-label="등록 내역 검색"><span class="pill">최근 ${state.registrations.length}건</span></div><div id="registrationRows"></div>`);
      const draw=()=>{const q=$('regSearch').value.toLowerCase().trim();const items=state.registrations.filter(x=>[x.child,x.guardian,x.receipt].join(' ').toLowerCase().includes(q));$('registrationRows').innerHTML=table(['접수 / 아이','보호자','과정 · 시작','확정 상태','계약 PDF · 백업'],items.map(x=>`<tr><td><b>${h(x.child)}</b><br><small>${h(x.receipt)}</small></td><td>${h(x.guardian)}<br>${h(x.phone)}</td><td>${h(x.course)}<br><small>${h(x.starts)}</small></td><td>${tag(x.status)}</td><td>${tag(x.pdf)} / ${tag(x.backup)}</td></tr>`));};
      $('regSearch').oninput=draw;draw();
    }
    async function getClasses(){const r=await call('staffListClasses',state.token);state.classes=r.rows||[];state.templates=r.templates||[];return r;}
    async function renderCourseSettings(){
      const d=await call('staff22GetCourseSettings',state.token);
      const v=(d.rows||[]).find(x=>x.code==='BW-SENSORY')||{code:'BW-SENSORY',name:'Bridge Wonder Sensory Play Studio',fee:'',extras:'0',refund:'',business:'',license:'',retention:'',location:'',makeup:'',accompaniment:'',materials:'',safety:'',status:'중지'};
      const labels=[['name','과정 이름','text'],['fee','기존 계약용 수업비 (원)','number'],['extras','기존 계약용 기타 비용 (원)','number'],['business','법정 상호','text'],['license','기존 계약용 학원 등록번호 (해당 시)','text'],['location','수업 장소','text'],['retention','개인정보 보유 기간','text'],['refund','기존 계약용 환불 기준','textarea'],['makeup','결석·보강 기준','textarea'],['accompaniment','보호자 동반 기준','textarea'],['materials','재료·준비물 안내','textarea'],['safety','수업 안전 안내','textarea']];
      const fields=labels.map(([key,label,type])=>`<div class="form-item"><label for="bw23Course_${key}">${label}</label>${type==='textarea'?`<textarea id="bw23Course_${key}" rows="3">${h(v[key]||'')}</textarea>`:`<input id="bw23Course_${key}" type="${type}" value="${h(v[key]||'')}" ${type==='number'?'min="0" max="100000000" step="1"':''}>`}</div>`).join('');
      $('pageBody').innerHTML=head('스튜디오 이용 조건','정규 50분 30,000원, 체험 50분 25,000원 기준입니다. 실제 결제·세금 적용 조건을 확인하세요.')+panel('Bridge Wonder · Sensory Play Studio','이 화면은 기존 수강계약 시스템에 연결되어 있습니다. 학원 등록번호가 필요한 기존 양식이므로 신규 스튜디오 이용계약에 적용하기 전에 확인해 주세요. 금액을 바꾸면 기존 계약 기능에도 영향을 줄 수 있습니다.',`<form id="bw23CourseForm"><div class="cols">${fields}</div><div class="form-item spaced"><label for="bw23Course_status">운영 상태</label><select id="bw23Course_status"><option value="중지" ${v.status==='중지'?'selected':''}>중지</option><option value="활성" ${v.status==='활성'?'selected':''}>활성</option></select></div><div class="row spaced"><button type="submit" class="btn btn-primary">기존 수강조건 저장</button><span id="bw23CourseStatus" class="inline-status"></span></div></form>
      <div class="form-item spaced" role="group" aria-label="정규 수업 회차별 교습비 계산">
        <strong>회차별 이용료 계산 (기존 계약용)</strong>
        <p class="help">정규 수업은 50분 1회 30,000원이며, 체험은 프로모션으로 50분 1회 25,000원입니다.</p>
        <label for="bw38SessionCount">상담 후 확정할 정규 수업 회차</label>
        <input type="number" id="bw38SessionCount" min="1" max="60" step="1" placeholder="예: 6" inputmode="numeric" style="max-width:190px">
        <output id="bw38SessionFee" for="bw38SessionCount" aria-live="polite">회차를 입력하면 참고 금액이 나옵니다.</output>
        <p class="help">상담할 때 참고하는 예상 금액입니다. 계약 금액은 자동으로 바뀌지 않으니 실제 수업 횟수와 기간, 할인 조건을 확인해 따로 저장해 주세요.</p>
      </div>`);
      const feeCount=$('bw38SessionCount'),feeOutput=$('bw38SessionFee');
      if(feeCount&&feeOutput)feeCount.addEventListener('input',()=>{
        const n=Number(feeCount.value);
        feeOutput.textContent=feeCount.value&&Number.isSafeInteger(n)&&n>=1&&n<=60
          ?'정규 수업 '+n+'회 × 30,000원 = '+(n*30000).toLocaleString('ko-KR')+'원 (참고)'
          :'정규 수업 회차를 1~60회에서 입력해 주세요.';
      });
      const f=$('bw23CourseForm');
      f.onsubmit=async e=>{e.preventDefault();setBusy(f,true);
        const p={code:'BW-SENSORY'};
        for(const [key] of labels)p[key]=$('bw23Course_'+key).value;
        p.status=$('bw23Course_status').value;
        try{await call('staff22SaveCourseSettings',state.token,p);$('bw23CourseStatus').textContent='저장 완료';toast('수강조건을 저장했습니다.');}
        catch(err){$('bw23CourseStatus').textContent=err.message;toast(err.message,true);}
        finally{setBusy(f,false);}
      };
    }
    // V24.1: faster class scheduling. Only owner can directly type controlled values;
    // all saves continue through staffSaveClass, which checks role, course approval and publish policy.
    async function renderClasses(){
      await getClasses();
      if(state.page!=='classes')return;
      const editable=bw24Can('classes','write');
      const principal=state.user.role==='owner';
      const weekday=window.BWStaffDefaults?.classEditor?.weekdays||['월요일','화요일','수요일','목요일','금요일','토요일','일요일'];
      const dayCodes={월요일:'MON',화요일:'TUE',수요일:'WED',목요일:'THU',금요일:'FRI',토요일:'SAT',일요일:'SUN'};
      const option=(value,label,selected=false)=>`<option value="${h(value)}" ${selected?'selected':''}>${h(label)}</option>`;
      const courses=(state.templates||[]).filter(x=>x.id);
      const commonCourse=courses.find(x=>x.id===(window.BWStaffDefaults?.classEditor?.courseCode||'BW-SENSORY'))||courses[0]||null;
      const courseOptions=courses.map(t=>option(t.id,`${t.course} (${t.id})`)).join('');
      // V31 — controlled business values always use dropdowns (owner included).
      const dayField=`<select id="classDay" required><option value="">수업 요일 선택</option>${weekday.map(d=>option(d,d)).join('')}</select>`;
      const courseField=`<select id="classTemplate" required><option value="">수강 과정 선택</option>${courseOptions}</select>`;
      const publishField=`<select id="classPublic"><option value="비공개">비공개 (기본)</option><option value="공개">공개 (홈페이지 표시)</option></select>`;
      const reviewField=`<select id="classReview"><option value="확인전">확인 전</option><option value="검토완료">검토 완료</option></select>`;
      const times=[...new Set(state.classes.map(c=>String(c.time||'').trim()).filter(Boolean))].slice(0,5);
      const form=editable?panel('클래스 일정 만들기','요일과 시간을 정한 뒤 시작일과 운영 기간을 확인해 저장하세요.',`
        <form id="classForm" class="bw241-class-form" novalidate>
          <div class="bw241-form-intro"><div><strong id="bw241Mode">새 수업반 등록</strong><br><small>${principal?'수업 정보를 순서대로 입력하고, 공개 여부를 마지막에 확인하세요.':'수업 요일과 시간을 정한 뒤 등록된 과정을 선택하세요.'}</small></div><span class="bw241-badge">수업반 관리</span></div>
          <div class="bw241-step"><b>1</b>요일과 수업 시간</div>
          <div class="bw241-grid">
            <div class="form-item"><label for="classDay">수업 요일</label>${dayField}<small class="bw241-help">수업할 요일을 선택하세요.</small></div>
            <div class="form-item"><label for="classTime">수업 시간</label><input id="classTime" class="bw241-selectable-time" type="text" placeholder="예: 11:30 또는 11:30–12:20" maxlength="50" inputmode="text" required><small class="bw241-help">예: 오전 11시 30분은 11:30으로 입력하세요.</small>${times.length?`<div class="bw241-chip-row" aria-label="기존 수업 시간 추천">${times.map(t=>`<button class="bw241-chip" type="button" data-bw241-time="${h(t)}">${h(t)}</button>`).join('')}</div>`:''}</div>
          </div>
          <div class="bw241-step"><b>2</b>수업 상세 정보</div>
          <div class="bw241-grid bw241-grid--three">
            <div class="form-item"><label for="classDate">수업 시작일</label><input id="classDate" type="date" required><small class="bw241-help">첫 수업 날짜를 선택하세요.</small></div>
            <div class="form-item"><label for="classPeriod">운영 기간</label><input id="classPeriod" type="text" placeholder="예: 1개월 / 2027.01.02~01.31" maxlength="160" required>${principal?`<div class="bw241-chip-row">${(window.BWStaffDefaults?.classEditor?.durationChoices||['1개월','3개월','6개월']).map(x=>`<button type="button" class="bw241-chip" data-bw241-period="${x}">${x}</button>`).join('')}</div>`:''}</div>
            <div class="form-item"><label for="classId">반 코드</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input id="classId" type="text" placeholder="요일·시간 입력 시 자동 제안" maxlength="32" autocomplete="off" required>${principal?'<button type="button" id="bw241GenerateCode" class="btn btn-outline btn-small" style="flex:none">자동 제안</button>':''}</div><small class="bw241-help">새 반의 코드는 자동 제안됩니다. 등록한 반의 코드는 변경할 수 없습니다.</small></div>
          </div>
          <div class="bw241-grid bw241-grid--three" style="margin-top:15px">
            <div class="form-item"><label for="classTemplate">수강 과정</label>${courseField}<small class="bw241-help">${commonCourse?`기본 과정: ${h(commonCourse.course)} (${h(commonCourse.id)})`:'먼저 스튜디오 운영정보에서 과정을 활성화해 주세요.'}</small></div>
            <div class="form-item"><label for="classPublic">홈페이지 공개</label>${publishField}<small class="bw241-help">검토가 끝날 때까지 홈페이지에 표시되지 않습니다.</small></div>
            <div class="form-item"><label for="classReview">운영자 검토</label>${reviewField}<small class="bw241-help">홈페이지 공개 전에 검토 완료로 바꿔 주세요.</small></div>
          </div>
          <div class="bw241-preview" aria-live="polite"><small>홈페이지 시간표 미리보기</small><b id="bw241PreviewTime">요일과 시간을 입력하세요.</b><small id="bw241PreviewMeta">저장한 반은 공개 설정에 따라 홈페이지 시간표에 표시됩니다.</small></div>
          <div id="bw241Feedback" class="bw241-feedback" role="alert" aria-live="polite"></div>
          <div class="bw241-footer"><button class="btn btn-primary" id="bw241Save" type="submit">새 수업반 저장</button><button class="btn btn-outline" type="button" id="resetClass">새 반 입력</button><small class="bw241-help">저장하면 수업반 목록에 바로 반영됩니다.</small></div>
        </form>`):'';
      const items=state.classes.slice().sort((a,b)=>{
        const d=weekday.indexOf(a.day)-weekday.indexOf(b.day);
        return d || String(a.time).localeCompare(String(b.time),'ko') || String(a.id).localeCompare(String(b.id),'ko');
      });
      const list=panel('등록된 수업반','수정할 반을 선택하거나 기존 반을 복제해 새 반을 빠르게 만들 수 있습니다.',`
        <div class="bw241-class-heading"><span class="bw241-count">${state.classes.length}개 수업반</span>${editable?'<button id="bw241NewTop" type="button" class="btn btn-primary btn-small">+ 새 시간표 만들기</button>':''}</div>
        <div class="bw241-table-top"><input id="bw241ClassSearch" type="search" aria-label="수업반 검색" placeholder="요일 · 시간 · 반 코드 검색"><small class="muted">검색 결과 <span id="bw241ResultCount">${items.length}</span>건</small></div>
        <div id="bw241Rows"></div>`);
      $('pageBody').innerHTML=head('수업 시간표','요일과 시간을 정하고 반별 운영 상황을 확인하세요.')+
        '<div class="subtle" role="note">수업은 생후 7~48개월 아이 4명과 보호자 4명이 함께 참여하는 50분 활동을 기준으로 준비합니다. 같은 시간에 반을 겹쳐 운영하지 않도록 확인해 주세요. 실제 정원은 ‘정원 현황’에서 설정합니다.</div>'+form+list;
      const listEl=$('bw241Rows');
      const renderRows=()=>{
        const q=$('bw241ClassSearch').value.toLocaleLowerCase('ko').trim();
        const rows=items.filter(c=>[c.id,c.day,c.time,c.period,c.template,c.starts].join(' ').toLocaleLowerCase('ko').includes(q));
        $('bw241ResultCount').textContent=String(rows.length);
        listEl.innerHTML=table(['요일 · 시간','수업 시작일','반 코드','과정','공개 상태','관리'],rows.map(c=>`<tr><td><b>${h(c.day)} ${h(c.time)}</b><br><small>${h(c.period)}</small></td><td>${h(c.starts)}</td><td>${h(c.id)}</td><td>${h(c.template)}</td><td>${tag(c.publicStatus)} / ${tag(c.review)}</td><td>${editable?`<div class="bw241-row-actions"><button class="btn btn-outline btn-small" data-class="${h(c.id)}" type="button">수정</button><button class="btn btn-outline btn-small" data-bw241-clone="${h(c.id)}" type="button">복제</button></div>`:'조회 전용'}</td></tr>`));
        if(editable){listEl.querySelectorAll('[data-class]').forEach(btn=>btn.onclick=()=>editRow(btn.dataset.class,false));listEl.querySelectorAll('[data-bw241-clone]').forEach(btn=>btn.onclick=()=>editRow(btn.dataset.bw241Clone,true));}
      };
      $('bw241ClassSearch').addEventListener('input',renderRows);renderRows();
      if(!editable)return;
      const formEl=$('classForm');
      const field=id=>$(id);
      let editingId='';
      let autoCode=true;
      const shortDays={월:'월요일',화:'화요일',수:'수요일',목:'목요일',금:'금요일',토:'토요일',일:'일요일'};
      const cleanDay=raw=>{
        const s=String(raw||'').trim().replace(/\s+/g,'');return shortDays[s]||shortDays[s.replace(/요일$/,'')]||s;
      };
      const fmtTime=raw=>{
        const s=String(raw||'').trim().replace(/[〜～~—−-]/g,'–').replace(/\s+/g,'');
        const parts=s.split('–');if(parts.length>2||parts.some(x=>!/^\d{1,2}:\d{2}$/.test(x)))return null;
        const normalized=parts.map(x=>{
          const [hour,min]=x.split(':').map(Number);return hour<24&&min<60?String(hour).padStart(2,'0')+':'+String(min).padStart(2,'0'):null;
        });if(normalized.some(x=>!x))return null;
        if(normalized.length===2&&normalized[0]>=normalized[1])return null;
        return normalized.join('–');
      };
      const codeSuggestion=()=>{
        const day=dayCodes[cleanDay(field('classDay').value)];const time=fmtTime(field('classTime').value);
        if(!day||!time)return '';
        const first=time.split('–')[0].replace(':','');const base='BW-'+day+'-'+first;
        if(!state.classes.some(x=>x.id.toUpperCase()===base))return base;
        for(let i=2;i<100;i++){const candidate=base+'-'+String(i).padStart(2,'0');if(!state.classes.some(x=>x.id.toUpperCase()===candidate))return candidate;}
        return '';
      };
      function updatePreview(){
        const day=cleanDay(field('classDay').value),time=fmtTime(field('classTime').value);
        if(autoCode&&!editingId)field('classId').value=codeSuggestion();
        field('bw241PreviewTime').textContent=day&&time?`${day} · ${time}`:'요일과 시간을 입력하세요.';
        const visible=field('classPublic').value==='공개'&&field('classReview').value==='검토완료';
        field('bw241PreviewMeta').textContent=`${field('classDate').value||'시작일 미정'} / ${field('classPeriod').value||'운영 기간 미정'} / ${visible?'공개 조건 충족':'비공개 또는 검토 대기'}`;
      }
      function resetForm(scroll){
        formEl.reset();editingId='';autoCode=true;
        field('classId').readOnly=false;
        field('classTemplate').value=commonCourse?.id||'';
        field('classPublic').value='비공개';field('classReview').value='확인전';
        field('bw241Mode').textContent='새 수업반 등록';field('bw241Save').textContent='새 수업반 저장';
        field('bw241Feedback').textContent='';updatePreview();
        if(scroll)formEl.scrollIntoView({behavior:'smooth',block:'start'});
      }
      function editRow(id,clone){
        const c=state.classes.find(x=>x.id===id);if(!c)return;
        resetForm(false);
        const values={classDay:c.day,classTime:c.time,classDate:c.starts,classPeriod:c.period,classTemplate:c.template,classPublic:clone?'비공개':c.publicStatus,classReview:clone?'확인전':c.review};
        Object.entries(values).forEach(([k,v])=>{if(field(k))field(k).value=v||'';});
        if(!clone){editingId=c.id;autoCode=false;field('classId').value=c.id;field('classId').readOnly=true;field('bw241Mode').textContent=`${c.day} ${c.time} · 수정 중`;field('bw241Save').textContent='변경사항 저장';}
        else{editingId='';autoCode=true;field('bw241Mode').textContent='기존 반을 복제하여 새 반 만들기';field('bw241Save').textContent='복제한 반 저장';}
        updatePreview();formEl.scrollIntoView({behavior:'smooth',block:'start'});
        field('classDay').focus({preventScroll:true});
      }
      resetForm(false);
      $('resetClass').onclick=()=>{resetForm(true);field('classDay').focus({preventScroll:true});};
      if($('bw241NewTop'))$('bw241NewTop').onclick=()=>{resetForm(true);field('classDay').focus({preventScroll:true});};
      if($('bw241GenerateCode'))$('bw241GenerateCode').onclick=()=>{if(editingId)return;autoCode=true;field('classId').value=codeSuggestion();updatePreview();};
      for(const id of ['classDay','classTime','classDate','classPeriod','classTemplate','classPublic','classReview']){
        field(id).addEventListener('input',updatePreview);field(id).addEventListener('change',updatePreview);
      }
      field('classDay').addEventListener('blur',()=>{const d=cleanDay(field('classDay').value);if(weekday.includes(d))field('classDay').value=d;updatePreview();});
      field('classTime').addEventListener('blur',()=>{const t=fmtTime(field('classTime').value);if(t)field('classTime').value=t;updatePreview();});
      field('classId').addEventListener('input',()=>{if(!editingId)autoCode=false;});
      formEl.querySelectorAll('[data-bw241-time]').forEach(btn=>btn.onclick=()=>{field('classTime').value=btn.dataset.bw241Time;updatePreview();});
      formEl.querySelectorAll('[data-bw241-period]').forEach(btn=>btn.onclick=()=>{field('classPeriod').value=btn.dataset.bw241Period;updatePreview();});
      formEl.onsubmit=async e=>{
        e.preventDefault();
        const feedback=field('bw241Feedback');feedback.textContent='';
        const normalizedDay=cleanDay(field('classDay').value), normalizedTime=fmtTime(field('classTime').value);
        const id=String(field('classId').value||'').trim().toUpperCase();
        const template=String(field('classTemplate').value||'').trim().toUpperCase();
        const starts=field('classDate').value,period=field('classPeriod').value.trim();
        const publicStatus=field('classPublic').value.trim(),review=field('classReview').value.trim();
        const fail=msg=>{feedback.textContent=msg;toast(msg,true);};
        if(!weekday.includes(normalizedDay))return fail('수업 요일을 목록에서 선택해 주세요.');
        if(!normalizedTime)return fail('시간은 11:30 또는 11:30–12:20 형식으로 입력해 주세요.');
        if(!/^20\d{2}-\d{2}-\d{2}$/.test(starts))return fail('수업 시작일을 선택해 주세요.');
        if(!period)return fail('운영 기간을 입력해 주세요.');
        if(!/^[A-Z0-9_-]{3,32}$/.test(id))return fail('반 코드는 영어 대문자·숫자·하이픈으로 3~32자 입력해 주세요.');
        if(!courses.some(x=>x.id.toUpperCase()===template))return fail('운영 중인 수강 과정을 목록에서 선택해 주세요.');
        if(!['공개','비공개'].includes(publicStatus)||!['확인전','검토완료'].includes(review))return fail('홈페이지 공개·검토 항목에서 값을 선택해 주세요.');
        if(publicStatus==='공개'&&review!=='검토완료')return fail('홈페이지에 공개하려면 운영자 검토를 완료해 주세요.');
        if(publicStatus==='공개'&&!confirm('이 시간표를 보호자 등록 화면에 공개할까요? 이용료와 환불 기준을 먼저 확인해 주세요.'))return;
        const payload={id,template,starts,day:normalizedDay,time:normalizedTime,period,publicStatus,review};
        setBusy(formEl,true);formEl.classList.add('bw241-busy');
        try{
          await call('staffSaveClass',state.token,payload);
          toast(editingId?'수업반 변경사항을 저장했습니다.':'새 수업반을 저장했습니다.');
          await renderClasses();
        }catch(err){feedback.textContent=err.message||'저장하지 못했습니다.';toast(feedback.textContent,true);}
        finally{formEl.classList.remove('bw241-busy');setBusy(formEl,false);}
      };
    }
    async function renderRoster(){state.roster=await call('staffListRoster',state.token);if(state.page!=='roster')return;
      $('pageBody').innerHTML=head('아이 명단','등록을 마치고 클래스에 배정된 아이만 표시됩니다.')+
      panel('담당 클래스의 아이들','담당 클래스로 배정된 아이만 확인할 수 있습니다.',table(['수업반','아이 이름','생년월','과정','보호자 연락'],state.roster.map(s=>`<tr><td>${h(s.classId)}</td><td><b>${h(s.child)}</b></td><td>${h(s.birth)}</td><td>${h(s.course)}</td><td>${s.phone?`<div>${h(s.guardian)}</div><a href="tel:${h(s.phone)}">${h(s.phone)}</a>`:'<span class="muted">권한 제한</span>'}</td></tr>`)))+
      `<p class="footnote">건강 관련 정보와 서명 계약서는 별도로 보관됩니다. 이전에 접수한 학생은 반 배정 여부를 확인해 주세요.</p>`;
    }
    async function renderAttendance(){await getClasses();if(state.page!=='attendance')return;const today=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})();
      $('pageBody').innerHTML=head('출결 관리','담당 수업반을 선택해 아이들의 출석 여부를 기록하세요.')+
      panel('수업 선택','수강 확정된 학생만 조회됩니다.',`<div class="fields"><div class="form-item"><label for="attendanceClass">수업반</label><select id="attendanceClass"><option value="">반을 선택해 주세요</option>${state.classes.map(x=>`<option value="${h(x.id)}">${h(x.id)} · ${h(x.day)} ${h(x.time)}</option>`).join('')}</select></div><div class="form-item"><label for="attendanceDate">수업일</label><input id="attendanceDate" type="date" value="${today}"></div></div><div class="spaced"><button id="loadAttendance" class="btn btn-outline">출결 조회</button></div>`)+panel('출결 목록','아이의 출결만 기록합니다. 건강·민감정보는 이 메모에 입력하지 마세요.',`<div id="attendanceRows" class="empty">수업반과 날짜를 선택해 주세요.</div>`);
      $('loadAttendance').onclick=async()=>{if(!$('attendanceClass').value){toast('수업반을 선택해 주세요.',true);return;}const btn=$('loadAttendance');btn.disabled=true;try{const id=$('attendanceClass').value,date=$('attendanceDate').value;state.attendance=await call('staffListAttendance',state.token,{classId:id,date});const items=state.attendance;const rows=items.map((x,i)=>`<tr><td><b>${h(x.child)}</b><br><small>${h(x.birth)}</small></td><td><select class="inline-select" id="att-status-${i}" aria-label="${h(x.child)} 출결">${['미확인','출석','결석','보강'].map(s=>`<option ${x.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td><input class="inline-input" id="att-note-${i}" maxlength="140" placeholder="간단한 운영 메모" value="${h(x.note||'')}"></td><td><button data-save-att="${i}" class="btn btn-outline btn-small">저장</button></td></tr>`);$('attendanceRows').innerHTML=table(['수강생','출결','메모','저장'],rows);$('attendanceRows').querySelectorAll('[data-save-att]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.saveAtt),x=items[i];b.disabled=true;try{await call('staffSaveAttendance',state.token,{classId:id,date,receipt:x.receipt,status:$('att-status-'+i).value,note:$('att-note-'+i).value});toast(x.child+' 출결을 저장했습니다.');}catch(e){toast(e.message,true);}finally{b.disabled=false;}});}catch(e){toast(e.message,true);}finally{btn.disabled=false;}};
    }
    async function renderUsers(){const [people,cls]=await Promise.all([call('staffListUsers',state.token),getClasses()]);state.staff=people;if(state.page!=='users')return;
      $('pageBody').innerHTML=head('선생님 계정·권한','선생님별로 담당 반과 열람·수정 권한을 관리해요.')+
      panel('등록된 계정','담당 수업이나 업무가 바뀌면 권한을 조정하고, 퇴사 시 계정 사용을 중지해 주세요.',table(['이메일 · 이름','역할','담당 반','연락처 열람','상태','관리'],state.staff.map(x=>`<tr><td><b>${h(x.name)}</b><br><small>${h(x.email)}</small></td><td>${h(ROLE_NAMES[x.role])}</td><td>${h(x.classes.join(', ')||'—')}</td><td>${x.canContact?'허용':'차단'}</td><td>${tag(x.status)}</td><td>${x.locked?'원장 계정':`<button class="btn btn-outline btn-small" data-edit-user="${h(x.email)}">수정</button>`}</td></tr>`)))+
      panel('직원 계정 등록·수정','직원 이메일과 권한을 등록해 주세요. 임시 비밀번호를 발급했다면 첫 로그인 때 변경하도록 안내합니다.',`<form id="userForm" class="stack"><div class="fields"><div class="form-item"><label for="userEmail">직원 이메일</label><input type="email" id="userEmail" placeholder="teacher@example.com" required></div><div class="form-item"><label for="userName">이름</label><input id="userName" maxlength="40" required></div><div class="form-item"><label for="userRole">역할</label><select id="userRole"><option value="teacher">선생님</option><option value="director">관리자</option><option value="frontdesk">상담 담당자</option></select></div><div class="form-item"><label for="userStatus">사용 상태</label><select id="userStatus"><option value="사용">사용</option><option value="중지">중지</option></select></div></div><div><label>담당 수업반</label><div class="cols" id="userClasses">${state.classes.length?state.classes.map(c=>`<label class="admin-check"><input type="checkbox" value="${h(c.id)}"> ${h(c.id)} · ${h(c.day)} ${h(c.time)}</label>`).join(''):'<p class="help">등록된 수업반이 없습니다. 먼저 시간표를 만들어 주세요.</p>'}</div></div><label class="admin-check"><input type="checkbox" id="userContact"> 담당 반 보호자 연락처 열람 허용</label><p class="help">보호자 연락처는 기본적으로 공개되지 않습니다. 업무에 필요한 직원에게만 열람 권한을 주세요.</p><div class="row"><button type="submit" class="btn btn-primary">계정 저장</button><button type="button" id="resetUser" class="btn btn-outline">새 직원 입력</button></div></form>`);
      bw24MountPermissions();
      window.BW30Accounts?.mountUsers();
      $('resetUser').onclick=()=>$('userForm').reset();$('pageBody').querySelectorAll('[data-edit-user]').forEach(el=>el.onclick=()=>{const x=state.staff.find(a=>a.email===el.dataset.editUser);if(!x)return;$('userEmail').value=x.email;$('userName').value=x.name;$('userRole').value=x.role;$('userStatus').value=x.status;$('userContact').checked=x.canContact;$('userClasses').querySelectorAll('input').forEach(i=>i.checked=x.classes.includes(i.value));$('userEmail').scrollIntoView({behavior:'smooth',block:'center'});});
      $('userForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;setBusy(f,true);try{await call('staffSaveUser',state.token,{email:$('userEmail').value,name:$('userName').value,role:$('userRole').value,status:$('userStatus').value,canContact:$('userContact').checked,classes:[...$('userClasses').querySelectorAll('input:checked')].map(x=>x.value)});toast('계정을 저장했습니다. 임시 비밀번호가 필요한 경우 직원 목록에서 발급하세요.');await renderUsers();}catch(e){toast(e.message,true);}finally{setBusy(f,false);}};
    }

    function bw24MountPermissions(){
      const eligible=state.staff.filter(x=>!x.locked && BW24_CAPS.home.read.includes(x.role));
      const body=panel('선생님별 접근 권한','담당 업무의 조회와 수정 권한을 선생님마다 설정합니다. 역할이 허용하는 범위를 넘어서는 권한은 부여할 수 없어요.',
        `<div class="fields"><div class="form-item"><label for="bw24Person">권한을 설정할 선생님</label><select id="bw24Person"><option value="">선생님을 선택해 주세요</option>${eligible.map(x=>`<option value="${h(x.email)}">${h(x.name)} · ${h(ROLE_NAMES[x.role])}</option>`).join('')}</select></div></div>
        <div id="bw24PolicyTable" class="bw24-policy-area empty">선생님을 선택하면 접근 가능한 메뉴를 설정할 수 있어요.</div>
        <div class="row spaced"><button type="button" class="btn btn-primary" id="bw24SavePolicy" disabled>선택한 권한 저장</button><button type="button" class="btn btn-outline" id="bw24DefaultPolicy" disabled>역할 기본값으로 복원</button></div>`);
      $('pageBody').insertAdjacentHTML('beforeend',body);
      const select=$('bw24Person'),save=$('bw24SavePolicy'),restore=$('bw24DefaultPolicy');
      const draw=()=>{
        const p=eligible.find(x=>x.email===select.value);save.disabled=!p;restore.disabled=!p;
        if(!p){$('bw24PolicyTable').textContent='선생님을 선택해 주세요.';return;}
        const available=Object.entries(BW24_CAPS).filter(([_,d])=>d.read.includes(p.role)&&!['home','users','security','staffCompliance'].includes(_));
        $('bw24PolicyTable').className='bw24-policy-area';
        $('bw24PolicyTable').innerHTML=`<div class="bw24-policy-head"><span>업무 메뉴</span><span>보기</span><span>입력·수정</span></div>`+
          available.map(([key,mod])=>{
            const read=p.permissions?.read?.[key]!==false,canWrite=mod.write.includes(p.role);
            const write=canWrite && p.permissions?.write?.[key]!==false;
            return `<div class="bw24-policy-row"><strong>${h(mod.label)}</strong><label><input type="checkbox" data-bw24view="${h(key)}" ${read?'checked':''} aria-label="${h(mod.label)} 보기"></label><label><input type="checkbox" data-bw24write="${h(key)}" ${write?'checked':''} ${canWrite&&read?'':'disabled'} aria-label="${h(mod.label)} 수정"></label></div>`;
          }).join('');
        $('bw24PolicyTable').querySelectorAll('[data-bw24view]').forEach(el=>el.addEventListener('change',()=>{
          const write=$('bw24PolicyTable').querySelector('[data-bw24write="'+el.dataset.bw24view+'"]');
          if(write){write.disabled=!el.checked||!BW24_CAPS[el.dataset.bw24view].write.includes(p.role);if(write.disabled)write.checked=false;}
        }));
      };
      select.onchange=draw;
      save.onclick=async()=>{
        const p=eligible.find(x=>x.email===select.value);if(!p)return;
        const read=['home',...Array.from($('bw24PolicyTable').querySelectorAll('[data-bw24view]:checked')).map(x=>x.dataset.bw24view)];
        const write=Array.from($('bw24PolicyTable').querySelectorAll('[data-bw24write]:checked')).map(x=>x.dataset.bw24write);
        save.disabled=true;
        try{await call('staff24SavePermissions',state.token,{email:p.email,read,write});toast(p.name+' 선생님의 접근 권한을 저장했습니다.');await renderUsers();}
        catch(e){toast(e.message,true);save.disabled=false;}
      };
      restore.onclick=async()=>{
        const p=eligible.find(x=>x.email===select.value);if(!p)return;
        if(!confirm(p.name+' 선생님의 접근 권한을 역할 기본값으로 되돌릴까요?'))return;
        restore.disabled=true;
        try{await call('staff24ResetPermissions',state.token,p.email);toast('역할 기본 권한으로 복원했습니다.');await renderUsers();}
        catch(e){toast(e.message,true);restore.disabled=false;}
      };
    }

    async function renderSecurity(){const audit=await call('staffListAudit',state.token);if(state.page!=='security')return;
      $('pageBody').innerHTML=head('접속기록·백업','직원 계정과 개인정보 취급 이력을 정기적으로 확인하세요.')+
      panel('수동 백업','현재 스프레드시트의 비공개 사본을 생성합니다. 서명 PDF 백업은 기존 등록 시스템에서 별도로 관리합니다.',`<div class="row"><button id="backupNow" class="btn btn-primary">스프레드시트 지금 백업</button><span class="help">독립 계정 백업은 별도로 운영해야 합니다.</span></div>`)+
      panel('최근 접속·작업 이력','로그인은 계정으로 식별하며, 읽기·수정·권한 변경 등이 기록됩니다.',table(['시각','계정','업무','대상','결과'],audit.map(a=>`<tr><td>${h(a.at)}</td><td>${h(a.user)}</td><td>${h(a.action)}</td><td>${h(a.target)}</td><td>${tag(a.result)}</td></tr>`)))+
      `<div class="warning">현재 접속 기록에는 IP 주소가 포함되지 않습니다. 개인정보 보호 점검 시 다른 보안 기록도 함께 확인해 주세요.</div>`;
      const last=bw24Timings.slice(-15),avg=last.length?Math.round(last.reduce((n,x)=>n+x.ms,0)/last.length):0;
      const perf=bw25Accel?.metrics();
      $('pageBody').insertAdjacentHTML('beforeend',panel('화면 속도 확인','최근 업무 요청에 걸린 시간을 보여드립니다. 인터넷 연결과 시스템 상태에 따라 속도가 달라질 수 있습니다.',
        `<div class="row"><span class="pill">최근 ${last.length}건</span><strong>평균 ${avg}ms</strong>${perf?`<span class="pill">중복 조회 ${perf.coalesced}건 방지</span><span class="pill">캐시 ${perf.cacheHits}건 사용</span><span class="pill">95% ${perf.p95Ms}ms</span>`:''}</div>`+
        (last.length?'<div class="table-scroll spaced"><table class="data-table"><thead><tr><th>요청</th><th>소요시간</th></tr></thead><tbody>'+last.slice().reverse().map(x=>`<tr><td>${h(x.name)}</td><td>${h(x.ms)}ms</td></tr>`).join('')+'</tbody></table></div>':'<p class="help">메뉴를 이용하면 처리 시간이 이곳에 표시됩니다.</p>')));
      $('backupNow').onclick=async()=>{if(!confirm('현재 스프레드시트의 비공개 사본을 만들까요?'))return;const b=$('backupNow');b.disabled=true;try{const r=await call('staffBackupNow',state.token);toast('백업 완료: '+r.filename);}catch(e){toast(e.message,true);}finally{b.disabled=false;}};
    }
    // V18 operating modules. All API endpoints enforce role permissions again on the server.
    async function renderOperations(){
      const rows=await call('staffListOperations',state.token);if(state.page!=='operations')return;
      const groups=[...new Set(rows.map(x=>x.category))];
      const statusOptions=['미확인','진행중','완료','보완필요'];
      const completed=rows.filter(x=>x.status==='완료').length;
      $('pageBody').innerHTML=head('시설·운영 점검','개원 준비 사항과 시설 점검 내역을 확인하세요. 기관마다 확인할 사항이 다를 수 있습니다.')+
      `<div class="metric-grid"><article class="metric"><div class="metric-name">점검 항목</div><div class="metric-value">${rows.length}</div></article><article class="metric"><div class="metric-name">완료</div><div class="metric-value">${completed}</div></article><article class="metric"><div class="metric-name">확인 필요</div><div class="metric-value">${rows.length-completed}</div></article></div>`+
      panel('항목별 진행 상태','관련 서류는 전용 문서함에 보관하고, 이곳에는 파일명이나 보관 위치만 기록해 주세요.',`<div class="toolbar"><select id="opsCategory" aria-label="운영 점검 분야"><option value="">전체 분야</option>${groups.map(c=>`<option>${h(c)}</option>`).join('')}</select><span class="pill">이 목록에는 기존 학원용 항목도 포함되어 있습니다.</span></div><div id="opsRows"></div>`)+
      `<p class="footnote">기존 학원용 항목은 적용 여부를 먼저 확인하세요. 관계기관의 답변이나 증빙이 있는 항목만 완료로 표시합니다.</p>`;
      const draw=()=>{
        const selected=$('opsCategory').value,arr=rows.filter(x=>!selected||x.category===selected);
        $('opsRows').innerHTML=`<div class="ops-card-grid">${arr.map(x=>`<article class="ops-task-card"><div class="row space-between"><small class="pill">${h(x.category)} · ${h(x.kind)}</small><small class="muted">${h(x.code)}</small></div><h4>${h(x.title)}</h4><div class="fields"><div class="form-item"><label for="op-status-${h(x.code)}">진행 상태</label><select id="op-status-${h(x.code)}" data-op-status="${h(x.code)}">${statusOptions.map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></div><div class="form-item"><label for="op-due-${h(x.code)}">확인 예정일</label><input id="op-due-${h(x.code)}" type="date" data-op-due="${h(x.code)}" value="${h(x.due||'')}"></div><div class="form-item"><label for="op-person-${h(x.code)}">담당자</label><input id="op-person-${h(x.code)}" data-op-person="${h(x.code)}" maxlength="60" placeholder="담당자" value="${h(x.person||'')}"></div><div class="form-item"><label for="op-evidence-${h(x.code)}">증빙 참조</label><input id="op-evidence-${h(x.code)}" data-op-evidence="${h(x.code)}" maxlength="180" placeholder="비공개 Drive 자료 위치" value="${h(x.evidence||'')}"></div></div><div class="row space-between"><small class="muted">${x.updated?'최종 수정 '+h(x.updated):'아직 수정 이력이 없습니다.'}</small><button class="btn btn-outline btn-small" data-op-save="${h(x.code)}">저장</button></div></article>`).join('')}</div>`;
        $('opsRows').querySelectorAll('[data-op-save]').forEach(btn=>btn.onclick=async()=>{
          const code=btn.dataset.opSave;btn.disabled=true;try{
            await call('staffSaveOperation',state.token,{code,status:field(`[data-op-status="${code}"]`).value,due:field(`[data-op-due="${code}"]`).value,person:field(`[data-op-person="${code}"]`).value,evidence:field(`[data-op-evidence="${code}"]`).value});
            toast('점검 상태를 저장했습니다.');
          }catch(e){toast(e.message,true);}finally{btn.disabled=false;}
        });
      };
      // CSS selector helper is local and does not collide with id-oriented $().
      function field(selector){return document.querySelector(selector)}
      document.getElementById('opsCategory').onchange=draw;draw();
    }
    async function renderTuition(){
      const d=await call('staffListTuition',state.token);if(state.page!=='tuition')return;
      const kinds=['납부확인','영수증발급확인','환불요청','환불완료'];
      $('pageBody').innerHTML=head('이용료·환불 기록','결제와 환불 내역을 확인하고 기록하세요.')+
      panel('처리 내역 추가','결제가 완료된 건만 수납으로 기록하세요. 카드전표·현금영수증은 결제 방식에 맞게 따로 발급합니다.',`<form id="tuitionForm" class="stack"><div class="fields"><div class="form-item"><label for="payReceipt">수강등록 접수번호</label><select id="payReceipt" required><option value="">접수번호를 선택해 주세요</option>${d.students.map(x=>`<option value="${h(x.receipt)}">${h(x.name)} · ${h(x.receipt)}</option>`).join('')}</select></div><div class="form-item"><label for="payKind">기록할 업무</label><select id="payKind">${kinds.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="form-item"><label for="payAmount">금액 (원)</label><input id="payAmount" type="number" min="0" max="100000000" step="1" inputmode="numeric" value="0" required></div><div class="form-item"><label for="payReference">영수증·결제·환불 증빙번호</label><input id="payReference" maxlength="85" placeholder="민감한 결제정보는 입력하지 마세요"></div></div><div class="form-item"><label for="payNote">간단한 운영 메모</label><textarea id="payNote" maxlength="120" placeholder="예: 카드 매출전표 발급 확인. 카드번호나 계좌번호는 적지 않습니다."></textarea></div><div class="row"><button type="submit" class="btn btn-primary">처리 이력 추가</button><small>저장한 수납 기록은 수정하거나 삭제할 수 없으니 내용을 확인해 주세요.</small></div></form>`)+
      panel('최근 수납 기록',`최근 ${d.records.length}건을 표시합니다.`,table(['기록시각','등록 접수번호','처리 종류','금액(원)','증빙참조','담당자'],d.records.map(x=>`<tr><td>${h(x.at)}</td><td>${h(x.receipt)}</td><td>${tag(x.kind)}</td><td>${h(x.amount)}</td><td>${h(x.reference)}</td><td>${h(x.operator)}</td></tr>`)))+
      `<div class="warning">실제로 환불한 건만 ‘환불완료’로 표시하세요. 환불액은 이용 조건과 적용 법령에 따라 확인해야 합니다.</div>`;
      let pendingTuition=null;
      $('tuitionForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;
        const payload={receipt:$('payReceipt').value,kind:$('payKind').value,amount:Number($('payAmount').value),reference:$('payReference').value,note:$('payNote').value};
        const fingerprint=JSON.stringify(payload);
        if(pendingTuition&&pendingTuition.fingerprint!==fingerprint){toast('이전 요청의 저장 결과를 먼저 조회해 주세요. 같은 내용으로 재시도하면 중복 저장을 방지합니다.',true);return;}
        if(!pendingTuition){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);pendingTuition={fingerprint,operationId:Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')};}
        payload.operationId=pendingTuition.operationId;setBusy(f,true);
        try{const result=await call('staffAppendTuition',state.token,payload);pendingTuition=null;toast(result.auditWarning?'수납 기록을 저장했습니다. 감사 이력은 별도로 확인해 주세요.':result.replayed?'이미 저장된 수납 기록을 확인했습니다.':'수납 관리 기록을 추가했습니다.');if(state.page==='tuition')await renderTuition();}
        catch(err){toast(err.message,true);}finally{setBusy(f,false);}
      };
      // Separate refund deadline ledger. Existing tuition transactions stay intact.
      const navigation=state.navigationSeq,token=state.token;
      bw32LoadModule().then(()=>{
        if(navigation!==state.navigationSeq||token!==state.token||state.page!=='tuition')return;
        window.BW32Compliance?.appendRefunds($('pageBody'),{
          token,call,isCurrent:()=>state.page==='tuition'&&navigation===state.navigationSeq&&token===state.token,
          toast
        },d.students||[]);
      }).catch(err=>{console.info('[Bridge Wonder] refund register unavailable:',String(err?.message||err));});
    }
    async function renderSafety(){
      const cls=await getClasses();const d=await call('staffListDailyChecks',state.token,{});if(state.page!=='safety')return;
      const statuses=['','확인완료','조치필요','해당없음'];const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
      const opts=statuses.map(v=>`<option value="${v}">${v||'확인 결과 선택'}</option>`).join('');
      $('pageBody').innerHTML=head('재료·안전 점검','활동에 사용할 재료와 공간을 확인하세요. 7~48개월 아이가 보호자와 함께 참여합니다.')+
      panel('수업 전 확인','아이 4명과 동반 보호자 4명이 참여할 공간인지 확인하세요. 삼킴 위험이나 재료·시설 문제가 있으면 활동을 시작하지 마세요.',`<form id="safetyForm" class="stack"><div class="fields"><div class="form-item"><label for="safeClass">수업반</label><select id="safeClass" required><option value="">반 선택</option>${state.classes.map(c=>`<option value="${h(c.id)}">${h(c.id)} · ${h(c.day)} ${h(c.time)}</option>`).join('')}</select></div><div class="form-item"><label for="safeDate">수업일</label><input id="safeDate" type="date" value="${today}" required></div><div class="form-item"><label for="safeTheme">월간 공통 주제</label><input id="safeTheme" maxlength="70" placeholder="예: Little Color Explorers" required></div><div class="form-item"><label for="safeMaterial">재료 유형</label><select id="safeMaterial"><option>식재료</option><option>자연소재</option><option>교구</option><option>복합</option><option>재료 없음</option></select></div></div><div class="fields">${[['fresh','재료·유통 상태'],['room','바닥·출입문 등'],['smallParts','삼킴 위험·작은 교구'],['hygiene','손 씻기·세척·정리'],['notice','보호자 사전안내']].map(([id,label])=>`<div class="form-item"><label for="safe-${id}">${label}</label><select id="safe-${id}" required>${opts}</select></div>`).join('')}</div><div class="form-item"><label for="safeAction">조치가 필요한 사항</label><textarea id="safeAction" maxlength="120" placeholder="재료 교체·사용 중지 등 운영 조치만 적어 주세요. 아동의 질병·알레르기 등 민감정보는 적지 않습니다."></textarea></div><div class="row"><button type="submit" class="btn btn-primary">점검 결과 저장</button><small>같은 반과 날짜의 점검 기록을 다시 저장하면 내용이 갱신됩니다.</small></div></form>`)+
      panel('최근 점검 결과','담당 반 이외의 기록은 선생님 계정에서 보이지 않습니다.',table(['수업일·반','주제·재료','재료·위생·안전','조치사항','기록자'],d.map(x=>`<tr><td>${h(x.date)}<br>${h(x.classId)}</td><td>${h(x.theme)}<br><small>${h(x.material)}</small></td><td>${tag(x.fresh)} / ${tag(x.room)} / ${tag(x.smallParts)}<br>${tag(x.hygiene)} / ${tag(x.notice)}</td><td class="note-cell">${h(x.action||'—')}</td><td>${h(x.operator)}</td></tr>`)))+
      `<div class="subtle">응급 상황에서는 점검표 작성보다 현장 대응과 보호자 연락을 우선해 주세요.</div>`;
      $('safetyForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;setBusy(f,true);try{const p={classId:$('safeClass').value,date:$('safeDate').value,theme:$('safeTheme').value,material:$('safeMaterial').value,action:$('safeAction').value};for(const k of ['fresh','room','smallParts','hygiene','notice'])p[k]=$('safe-'+k).value;await call('staffSaveDailyCheck',state.token,p);toast('수업 안전 점검을 저장했습니다.');await renderSafety();}catch(err){toast(err.message,true);}finally{setBusy(f,false);}};
    }
    async function renderHandoff(){
      await getClasses();if(state.page!=='handoff')return;
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
      $('pageBody').innerHTML=head('보호자 동반·인계','보호자 1명이 아이 1명과 수업 내내 함께하는지 확인해 주세요.')+
      panel('수업 선택','선생님 계정은 담당 반의 확정 수강생만 확인할 수 있습니다.',`<div class="fields"><div class="form-item"><label for="handoffClass">수업반</label><select id="handoffClass"><option value="">수업반 선택</option>${state.classes.map(c=>`<option value="${h(c.id)}">${h(c.id)} · ${h(c.day)} ${h(c.time)}</option>`).join('')}</select></div><div class="form-item"><label for="handoffDate">수업일</label><input id="handoffDate" type="date" value="${today}"></div></div><div class="spaced"><button id="handoffLoad" class="btn btn-outline">명단 불러오기</button></div>`)+
      panel('아동별 확인','미확인 또는 확인 필요로 표시된 경우에는 운영자에게 확인을 요청하세요.',`<div id="handoffRows" class="empty">수업반과 날짜를 선택해 주세요.</div>`)+
      `<p class="footnote">보호자는 수업이 끝날 때까지 함께합니다. 아이만 남겨 두는 경우에는 수업을 진행하지 말고 운영자에게 확인하세요. 동반·인계 결과만 기록하며 건강정보는 입력하지 않습니다.</p>`;
      $('handoffLoad').onclick=async()=>{const id=$('handoffClass').value,date=$('handoffDate').value;if(!id)return toast('수업반을 선택해 주세요.',true);const b=$('handoffLoad');b.disabled=true;try{
        const items=await call('staffListHandoffs',state.token,{classId:id,date});
        $('handoffRows').innerHTML=table(['아동','보호자 동반','종료 인계','저장'],items.map((x,i)=>`<tr><td><b>${h(x.child)}</b></td><td><select class="inline-select" id="arrive-${i}">${['미확인','동반 확인','확인 필요'].map(s=>`<option ${s===x.arrival?'selected':''}>${s}</option>`).join('')}</select></td><td><select class="inline-select" id="leave-${i}">${['미확인','인계 확인','확인 필요'].map(s=>`<option ${s===x.departure?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn btn-outline btn-small" data-save-handoff="${i}">저장</button></td></tr>`));
        $('handoffRows').querySelectorAll('[data-save-handoff]').forEach(btn=>btn.onclick=async()=>{const i=Number(btn.dataset.saveHandoff);btn.disabled=true;try{await call('staffSaveHandoff',state.token,{classId:id,date,receipt:items[i].receipt,arrival:$('arrive-'+i).value,departure:$('leave-'+i).value});toast('동반·인계 상태를 저장했습니다.');}catch(err){toast(err.message,true);}finally{btn.disabled=false;}});
      }catch(err){toast(err.message,true);}finally{b.disabled=false;}};
    }

    async function renderStaffCompliance(){
      const people=await call('staffListStaffCompliance',state.token);if(state.page!=='staffCompliance')return;
      const statuses=['미확인','확인완료','해당없음','재점검필요'];
      const fields=[['criminal','성범죄 관련 법정 조회'],['child','아동학대 관련 전력 조회'],['report','채용·해임 신고'],['abuse','아동학대 신고의무 교육'],['welfare','긴급복지 신고의무 교육'],['disability','장애인학대 신고의무 교육']];
      $('pageBody').innerHTML=head('직원 확인 사항','직원별로 필요한 조회·교육·서류를 확인해 주세요. 해당 여부는 실제 사업 형태에 따라 달라질 수 있습니다.')+
      `<div class="alert">해당 업무에 법정 조회·교육 의무가 있는지 먼저 확인하세요. 실제 완료한 항목만 기록하고 관련 서류는 별도로 보관합니다.</div>`+
      `<div class="ops-card-grid spaced">${people.map((u,i)=>`<article class="ops-task-card"><div><h4>${h(u.name)} <span class="pill">${h(ROLE_NAMES[u.role]||u.role)}</span></h4><small class="muted">${h(u.email)}</small></div><div class="fields">${fields.map(([k,label])=>`<div class="form-item"><label for="staff-${i}-${k}">${h(label)}</label><select id="staff-${i}-${k}">${statuses.map(v=>`<option ${u[k]===v?'selected':''}>${v}</option>`).join('')}</select></div>`).join('')}</div><div class="form-item"><label for="staff-evidence-${i}">증빙 자료 내부 참조</label><input id="staff-evidence-${i}" maxlength="180" value="${h(u.evidence)}" placeholder="비공개 Drive 문서 위치"></div><div class="row space-between"><small class="muted">${u.updated?'최종 수정 '+h(u.updated):'아직 점검 이력이 없습니다.'}</small><button class="btn btn-outline btn-small" data-staff-compliance="${i}">확인 내용 저장</button></div></article>`).join('')}</div>`;
      $('pageBody').querySelectorAll('[data-staff-compliance]').forEach(btn=>btn.onclick=async()=>{
        const i=Number(btn.dataset.staffCompliance),p={email:people[i].email,evidence:$('staff-evidence-'+i).value};
        for(const [k] of fields)p[k]=$('staff-'+i+'-'+k).value;
        btn.disabled=true;try{await call('staffSaveStaffCompliance',state.token,p);toast('직원 확인 상태를 저장했습니다.');}catch(err){toast(err.message,true);}finally{btn.disabled=false;}
      });
    }

    // V19 · Private document generation center. All source checks take place server-side.
    async function renderDocuments(){
      const [types,history]=await Promise.all([call('staffDocTypes',state.token),call('staffDocHistory',state.token)]);
      if(state.page!=='documents')return;
      
      $('pageBody').innerHTML=head('보호자 문서·PDF','문서를 골라 내용을 확인한 다음 PDF로 저장하거나 이메일로 보낼 수 있습니다.')+
      `<div class="warning">기존 계약서 사본은 원본 내용 그대로 발급됩니다. 새 스튜디오 이용동의서로 쓸 수 없으며 납부 안내서는 영수증이 아닙니다.</div>`+
      panel('1. 발급 문서 선택','필요한 문서를 고르고 관련 기록을 선택하세요.',
      `<div class="stack" id="docStepForm"><div class="fields"><div class="form-item"><label for="docType">문서 종류</label><select id="docType">${types.map(t=>`<option value="${h(t.id)}">${h(t.label)}</option>`).join('')}</select></div><div class="form-item"><label for="docSource">기록 선택</label><select id="docSource"><option value="">자료를 불러오는 중입니다.</option></select></div></div><div class="form-item hidden" id="docCustomTitleBox"><label for="docCustomTitle">안내문 제목</label><input id="docCustomTitle" maxlength="95" placeholder="예: 3월 수업 준비물 안내"></div><div class="form-item hidden" id="docCustomNoteBox"><label for="docCustomNote">추가 안내 내용</label><textarea id="docCustomNote" maxlength="1600" rows="4" placeholder="보호자에게 전달할 내용을 간단히 적어 주세요."></textarea></div><div class="row"><button type="button" class="btn btn-outline" id="docPreviewBtn">내용 미리보기</button><small>내용을 확인한 후 PDF를 생성하세요.</small></div></div>`)+
      panel('2. 문서 확인','이름과 날짜, 안내 내용을 확인하세요.',`<div id="docPreview" class="empty">문서를 선택하고 미리보기를 눌러 주세요.</div><div class="row spaced"><button id="docGenerateBtn" type="button" class="btn btn-primary hidden">확인한 내용으로 PDF 생성</button></div>`)+
      panel('3. PDF 다운로드·메일 발송','PDF를 만든 후 내려받거나 이메일로 보낼 수 있습니다.',
      `<div id="docResult" class="empty">발급한 문서가 없습니다.</div><div id="docSendArea" class="hidden stack spaced"><div class="row"><button id="docDownloadBtn" type="button" class="btn btn-outline">PDF 내려받기</button><small>발급한 PDF는 스튜디오 전용 문서함에 보관됩니다.</small></div><div class="fields"><div class="form-item"><label for="docRecipient">받는 사람 이메일</label><input type="email" id="docRecipient" autocomplete="off" placeholder="받는 분의 이메일 주소" maxlength="180"></div><div class="form-item"><label for="docConfirmEmail">이메일 다시 입력</label><input type="email" id="docConfirmEmail" autocomplete="off" placeholder="주소를 다시 입력해 주세요" maxlength="180"></div></div><div class="form-item"><label for="docMailNote">이메일에 덧붙일 안내 (선택)</label><textarea id="docMailNote" rows="2" maxlength="350" placeholder="예: 요청하신 안내서를 보내드립니다."></textarea></div><label class="row" style="font-size:12px;align-items:flex-start;gap:10px"><input id="docMailConfirm" type="checkbox" style="width:19px;min-height:19px;margin-top:2px;flex:none"><span>받는 분의 주소와 첨부 문서를 확인했습니다. 개인정보가 포함된 문서는 수신자에게 교부할 수 있는지 확인한 후 발송합니다.</span></label><div class="row"><button id="docSendBtn" type="button" class="btn btn-primary">PDF 이메일 보내기</button><small>발송 후에는 수신자에게 메일 도착 여부를 확인해 주세요.</small></div></div>`)+
      panel('최근 발급 기록','기존 문서는 다시 생성하지 않고 내려받을 수 있습니다.',
      `<div id="docHistory">${docHistoryTable(history)}</div>`)+
      `<div class="footnote">결제 증빙은 카드·현금 등 실제 결제수단에 맞게 따로 발급하세요. 계약서 원본과 사본은 구분해 보관합니다.</div>`;
      let preview=null,generated=null;
      function req(){return {type:$('docType').value,sourceId:$('docSource').value,title:$('docCustomTitle').value.trim(),note:$('docCustomNote').value.trim()};}
      function resetPreview(){preview=null;generated=null;$('docPreview').className='empty';$('docPreview').textContent='내용을 선택하고 미리보기를 확인해 주세요.';$('docGenerateBtn').classList.add('hidden');$('docResult').className='empty';$('docResult').textContent='발급한 문서가 없습니다.';$('docSendArea').classList.add('hidden');$('docMailConfirm').checked=false;}
      async function loadSources(){
        resetPreview();const type=$('docType').value;
        $('docCustomTitleBox').classList.toggle('hidden',type!=='notice');
        $('docCustomNoteBox').classList.toggle('hidden',!['notice','class'].includes(type));
        const select=$('docSource');select.innerHTML='<option value="">목록을 불러오고 있습니다.</option>';select.disabled=true;
        try{const sources=await call('staffDocSources',state.token,type);if(type!==$('docType').value)return;
          select.innerHTML='<option value="">발급할 대상을 선택하세요</option>'+sources.map(x=>`<option value="${h(x.id)}">${h(x.label)}</option>`).join('');
          if(type==='notice')select.value='GENERAL';
          if(!sources.length)select.innerHTML='<option value="">발급 가능한 기록이 없습니다.</option>';
        }catch(e){select.innerHTML='<option value="">불러오기 실패</option>';toast(e.message,true);}finally{select.disabled=false;}
      }
      $('docType').onchange=loadSources;
      $('docSource').onchange=resetPreview;
      $('docCustomTitle').oninput=resetPreview;
      $('docCustomNote').oninput=resetPreview;
      $('docPreviewBtn').onclick=async()=>{
        if(!$('docSource').value)return toast('자료를 먼저 선택해 주세요.',true);
        const b=$('docPreviewBtn');b.disabled=true;
        try{const v=await call('staffDocPreview',state.token,req());preview=v;generated=null;
          $('docPreview').className='';
          $('docPreview').innerHTML=`<div class="doc-preview"><div class="doc-preview-brand"><img class="bw21-doc-preview-logo" src="${document.querySelector('.sidebar-logo').getAttribute('src')}" alt="Bridge Wonder · Sensory Play Studio"><small>발급 내용을 확인해 주세요</small></div><h3>${h(v.title)}</h3><div class="table-scroll"><table class="data-table"><tbody>${v.items.map(x=>`<tr><th scope="row">${h(x[0])}</th><td style="white-space:normal;word-break:break-word">${h(x[1])}</td></tr>`).join('')}</tbody></table></div>${v.paragraphs.map(x=>`<p style="margin-top:15px;white-space:pre-wrap">${h(x)}</p>`).join('')}<div class="footnote">문서 내용과 수신자 정보를 한 번 더 확인해 주세요.</div></div>`;
          $('docGenerateBtn').classList.remove('hidden');$('docSendArea').classList.add('hidden');$('docResult').className='empty';$('docResult').textContent='PDF 생성을 진행해 주세요.';
          $('docRecipient').value=v.recipient||'';$('docConfirmEmail').value='';$('docMailConfirm').checked=false;
        }catch(e){toast(e.message,true);}finally{b.disabled=false;}
      };
      $('docGenerateBtn').onclick=async()=>{
        if(!preview)return toast('내용 미리보기를 먼저 확인해 주세요.',true);
        const b=$('docGenerateBtn');b.disabled=true;
        try{const r=await call('staffDocGenerate',state.token,{...req(),fingerprint:preview.fingerprint});generated=r.document;
          $('docResult').className=r.backupReady?'subtle':'warning';
          $('docResult').textContent='문서번호 '+generated.id+' · '+(r.backupReady?'비공개 보관과 사본 생성이 완료되었습니다.':'백업 확인이 필요합니다. 이메일 발송은 보류됩니다.');
          $('docSendArea').classList.remove('hidden');$('docSendBtn').disabled=!r.backupReady;
          $('docGenerateBtn').classList.add('hidden');await refreshHistory();
          toast('PDF 문서를 생성했습니다.');
        }catch(e){toast(e.message,true);b.disabled=false;}
      };
      async function download(docId){
        try{const r=await call('staffDocDownload',state.token,docId),binary=atob(r.base64),data=new Uint8Array(binary.length);
          for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);
          const url=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));
          const a=document.createElement('a');a.href=url;a.download=r.filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('PDF 파일을 내려받고 있습니다.');
        }catch(e){toast(e.message||'PDF 다운로드에 실패했습니다.',true);}
      }
      $('docDownloadBtn').onclick=()=>{if(generated)download(generated.id);};
      $('docSendBtn').onclick=async()=>{
        if(!generated)return toast('먼저 PDF를 생성해 주세요.',true);
        if(!$('docMailConfirm').checked)return toast('수신자 확인 항목에 체크해 주세요.',true);
        const b=$('docSendBtn');b.disabled=true;
        try{const r=await call('staffDocSend',state.token,{docId:generated.id,recipient:$('docRecipient').value.trim(),confirmRecipient:$('docConfirmEmail').value.trim(),confirm:$('docMailConfirm').checked,message:$('docMailNote').value.trim()});toast(r.message||'메일 전송을 요청했습니다.');await refreshHistory();}
        catch(e){toast(e.message,true);}finally{b.disabled=false;}
      };
      async function refreshHistory(){try{$('docHistory').innerHTML=docHistoryTable(await call('staffDocHistory',state.token));bindHistory();}catch(e){toast(e.message,true);}}
      function bindHistory(){$('docHistory').querySelectorAll('[data-doc-id]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await download(b.dataset.docId);}finally{b.disabled=false;}});}
      function docHistoryTable(rows){return table(['발급일','문서','기록·원본','보관','메일 상태','PDF'],rows.map(x=>`<tr><td>${h(x.at)}</td><td><b>${h(x.title)}</b><br><small>${h(x.id)}</small></td><td>${h(x.source)}</td><td>${tag(x.backup)}</td><td>${tag(x.mailStatus)}<br><small>${h(x.recipient||'')}</small></td><td><button class="btn btn-outline btn-small" data-doc-id="${h(x.id)}">받기</button></td></tr>`));}
      bindHistory();await loadSources();
    }

    (async()=>{try{state.token=sessionStorage.getItem('bw17_staff_session')||'';}catch(_){}if(state.token){try{state.user=await call('staffCurrentUser',state.token);await startApp();}catch(_){try{sessionStorage.removeItem('bw17_staff_session');}catch(e){}}}})();
/* V20: shared monthly theme, capacity/waitlist and teacher-managed makeup requests. */
const bw20CanEdit=()=>['owner','director'].includes(state.user.role);
const bw20Fmt=x=>h(x===null||x===undefined?'—':String(x));
function bw20ClassOptions(list,empty){return `<option value="">${h(empty||'수업반을 선택해 주세요')}</option>`+list.map(x=>`<option value="${h(x.id)}">${h(x.id)} · ${h(x.day)} ${h(x.time)}</option>`).join('');}
async function renderCapacity(){
 const d=await call('staff20Capacity',state.token);if(state.page!=='capacity')return;
 const edit=bw20CanEdit();
 const overLimit=d.rows.filter(x=>Number(x.capacity)>BW44_POLICY.maxChildren||Number(x.enrolled)>BW44_POLICY.maxChildren);
 const cards=d.rows.map(x=>`<article class="bw20-cap-card"><div class="bw20-cap-top"><div><b>${h(x.id)}</b><p>${h(x.day)} · ${h(x.time)}</p></div>${tag(x.status)}</div><dl class="bw20-cap-stats"><div><dt>확정 등록</dt><dd>${bw20Fmt(x.enrolled)}명</dd></div><div><dt>남은 자리</dt><dd>${x.free===null?'—':bw20Fmt(x.free)+'명'}</dd></div><div><dt>대기</dt><dd>${bw20Fmt(x.waiting)}건</dd></div></dl>${edit?`<div class="bw20-cap-edit"><label for="bw20cap-${h(x.id)}">기준 정원</label><div class="row"><input id="bw20cap-${h(x.id)}" type="number" min="1" max="4" value="${x.capacity||''}" placeholder="아이 1~4명"  aria-label="${h(x.id)} 기준 정원" data-cap-value="${h(x.id)}"><button type="button" class="btn btn-outline btn-small" data-cap-save="${h(x.id)}">저장</button></div></div>`:`<p class="footnote">등록된 정원 ${x.capacity?bw20Fmt(x.capacity)+'명':'미설정'}</p>`}</article>`).join('');
 $('pageBody').innerHTML=head('정원 현황','한 타임 아이 정원은 최대 4명입니다. 보호자는 아이마다 1명씩 함께 참여합니다.')+
 (overLimit.length?'<div class="warning" role="alert">기준을 초과한 기존 반이 있습니다: '+overLimit.map(x=>h(x.id)).join(', ')+' · 기존 등록 인원과 정원을 확인해 주세요. 이 안내는 데이터를 자동으로 변경하지 않습니다.</div>':'')+
 panel('반별 운영 인원','한 반의 아이 정원은 1~4명으로 설정하세요. 보호자와 교사 인원은 정원 숫자에 포함하지 않습니다.',`<div class="bw20-cap-grid">${cards||'<div class="empty">등록된 수업반이 없습니다.</div>'}</div>`)+
 (d.legacyNotice?`<p class="footnote">이전 링크로 접수한 ${bw20Fmt(d.legacyNotice)}건은 정원 집계에서 빠져 있을 수 있습니다. 반 배정을 확인해 주세요.</p>`:'')+
 `<p class="footnote">4명은 스튜디오에서 정한 운영 기준이지 법적 인허가 기준이 아닙니다. 기존 신청·다른 운영 화면의 정원 초과 여부는 별도로 확인해 주세요.</p>`;
 if(edit)$('pageBody').querySelectorAll('[data-cap-save]').forEach(b=>b.onclick=async()=>{
   const classId=b.dataset.capSave;
   const raw=$('pageBody').querySelector(`[data-cap-value="${classId}"]`)?.value||'';
   const capacity=Number(raw);
   if(!raw||!Number.isInteger(capacity)||capacity<1||capacity>BW44_POLICY.maxChildren){toast('아이 정원은 1~4명으로 입력해 주세요.',true);return;}
   const current=d.rows.find(x=>x.id===classId);
   if(current&&Number(current.enrolled)>capacity){toast('현재 등록된 아이보다 정원을 적게 설정할 수 없습니다. 배정 현황부터 확인해 주세요.',true);return;}
   b.disabled=true;
   try{await call('staff20SetCapacity',state.token,{classId,capacity});toast('아이 정원을 저장했습니다.');await renderCapacity();}
   catch(e){toast(e.message,true);}finally{b.disabled=false;}
 });
}
async function renderWaitlist(){
 const [classes,waits,inqs]=await Promise.all([getClasses(),call('staff20Waitlist',state.token),call('staffListInquiries',state.token)]);if(state.page!=='waitlist')return;
 const info=(inqs||[]).map(x=>({id:x.receipt,label:x.displayName+' · '+x.receipt}));
 $('pageBody').innerHTML=head('대기자 관리','상담을 마친 가정의 대기 상태를 기록하고, 빈자리가 생겼을 때 안내할 순서를 확인하세요.')+
   panel('대기 접수·수정','수강 확정은 정식 온라인 등록과 결제 확인 후 별도로 처리합니다.',`<form id="bw20WaitForm" class="stack"><input id="bw20WaitId" type="hidden"><div class="fields"><div class="form-item"><label for="bw20WaitReceipt">상담 접수</label><select id="bw20WaitReceipt" required><option value="">상담 기록 선택</option>${info.map(x=>`<option value="${h(x.id)}">${h(x.label)}</option>`).join('')}</select></div><div class="form-item"><label for="bw20WaitClass">희망 수업반</label><select id="bw20WaitClass" required>${bw20ClassOptions(state.classes)}</select></div><div class="form-item"><label for="bw20WaitDate">희망 시작일 (선택)</label><input id="bw20WaitDate" type="date"></div><div class="form-item"><label for="bw20WaitStatus">처리 상태</label><select id="bw20WaitStatus">${['대기','연락중','안내완료','철회'].map(x=>`<option>${x}</option>`).join('')}</select></div></div><div class="form-item"><label for="bw20WaitNote">업무 메모 (민감정보 입력 금지)</label><input id="bw20WaitNote" maxlength="180" placeholder="예: 다음 달 빈자리 발생 시 안내"></div><div class="row"><button class="btn btn-primary" type="submit">대기 기록 저장</button><button class="btn btn-outline" type="button" id="bw20WaitReset">새 대기 접수</button></div></form>`)+
   panel('대기 현황','등록 진행 상황에 따라 상태를 변경하세요.',table(['접수번호 · 아이 이름','희망 반','희망일','상태','관리'],waits.map(x=>`<tr><td><b>${h(x.child||x.guardian||'—')}</b><br><small>${h(x.receipt)}</small></td><td>${h(x.classId)}</td><td>${h(x.starts||'—')}</td><td>${tag(x.status)}</td><td><button class="btn btn-outline btn-small" data-bw20wait="${h(x.id)}">수정</button></td></tr>`)));
 $('bw20WaitReset').onclick=()=>{$('bw20WaitForm').reset();$('bw20WaitId').value='';};
 $('pageBody').querySelectorAll('[data-bw20wait]').forEach(b=>b.onclick=()=>{const x=waits.find(v=>v.id===b.dataset.bw20wait);if(!x)return;const map={bw20WaitId:x.id,bw20WaitReceipt:x.receipt,bw20WaitClass:x.classId,bw20WaitDate:x.starts,bw20WaitStatus:x.status,bw20WaitNote:x.note||''};for(const [id,val] of Object.entries(map))$(id).value=val||'';$('bw20WaitReceipt').scrollIntoView({behavior:'smooth',block:'center'});});
 $('bw20WaitForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;setBusy(f,true);try{await call('staff20SaveWaitlist',state.token,{id:$('bw20WaitId').value,receipt:$('bw20WaitReceipt').value,classId:$('bw20WaitClass').value,starts:$('bw20WaitDate').value,status:$('bw20WaitStatus').value,note:$('bw20WaitNote').value});toast('대기 상태를 저장했습니다.');await renderWaitlist();}catch(e){toast(e.message,true);}finally{setBusy(f,false);}};
}
async function renderMakeups(){
 const [cls,roster,items]=await Promise.all([getClasses(),call('staffListRoster',state.token),call('staff20Makeups',state.token)]);if(state.page!=='makeups')return;
 const manager=bw20CanEdit();
 $('pageBody').innerHTML=head('결석·보강 일정','선생님은 담당 반의 요청을 남기고, 원장·관리자가 정원과 수업요일을 확인한 뒤 확정합니다.')+
   panel(manager?'보강 요청·승인':'보강 요청 접수','건강상태나 질병명은 일반 운영 메모에 적지 마세요.',`<form id="bw20MakeupForm" class="stack"><input id="bw20MakeupId" type="hidden"><div class="fields"><div class="form-item"><label for="bw20MakeupReceipt">수강생</label><select id="bw20MakeupReceipt" required><option value="">학생 선택</option>${roster.map(x=>`<option value="${h(x.receipt)}">${h(x.child)} · ${h(x.classId)}</option>`).join('')}</select></div><div class="form-item"><label for="bw20MakeupDate">원래 수업일</label><input id="bw20MakeupDate" type="date" required></div><div class="form-item"><label for="bw20MakeupReason">요청 구분</label><select id="bw20MakeupReason">${['결석','일정변경','기타'].map(x=>`<option>${x}</option>`).join('')}</select></div>${manager?`<div class="form-item"><label for="bw20MakeupTarget">보강 수업반</label><select id="bw20MakeupTarget">${bw20ClassOptions(state.classes,'미배정')}</select></div><div class="form-item"><label for="bw20MakeupTargetDate">보강 날짜</label><input id="bw20MakeupTargetDate" type="date"></div><div class="form-item"><label for="bw20MakeupStatus">처리 상태</label><select id="bw20MakeupStatus">${['접수','검토중','확정','거절','취소'].map(x=>`<option>${x}</option>`).join('')}</select></div>`:''}</div><div class="form-item"><label for="bw20MakeupNote">운영 메모 (선택)</label><input id="bw20MakeupNote" maxlength="180" placeholder="일정 관련 메모만 입력해 주세요"></div><div class="row"><button class="btn btn-primary" type="submit">${manager?'보강 기록 저장':'보강 요청 남기기'}</button>${manager?'<button type="button" class="btn btn-outline" id="bw20MakeupReset">새 요청</button>':''}</div></form>`)+
   panel('보강 진행 현황','보강은 담당자의 확인을 거쳐 확정됩니다. 보호자에게는 일정을 따로 안내해 주세요.',table(['수강생 · 요청일','원래 반','보강 예정','상태','관리'],items.map(x=>{const st=roster.find(a=>a.receipt===x.receipt);return `<tr><td><b>${h(st?st.child:x.receipt)}</b><br><small>${h(x.date)} · ${h(x.reason)}</small></td><td>${h(x.classId)}</td><td>${h(x.targetClass||'미배정')}<br><small>${h(x.targetDate||'')}</small></td><td>${tag(x.status)}</td><td>${manager?`<button type="button" data-bw20makeup="${h(x.id)}" class="btn btn-outline btn-small">수정</button>`:'조회'}</td></tr>`;})));
 if(manager){$('bw20MakeupReset').onclick=()=>{$('bw20MakeupForm').reset();$('bw20MakeupId').value='';};$('pageBody').querySelectorAll('[data-bw20makeup]').forEach(b=>b.onclick=()=>{const x=items.find(v=>v.id===b.dataset.bw20makeup);if(!x)return;const map={bw20MakeupId:x.id,bw20MakeupReceipt:x.receipt,bw20MakeupDate:x.date,bw20MakeupReason:x.reason,bw20MakeupTarget:x.targetClass,bw20MakeupTargetDate:x.targetDate,bw20MakeupStatus:x.status,bw20MakeupNote:x.note};Object.entries(map).forEach(([k,v])=>$(k).value=v||'');$('bw20MakeupReceipt').scrollIntoView({behavior:'smooth',block:'center'});});}
 $('bw20MakeupForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;setBusy(f,true);const data={id:$('bw20MakeupId').value,receipt:$('bw20MakeupReceipt').value,date:$('bw20MakeupDate').value,reason:$('bw20MakeupReason').value,note:$('bw20MakeupNote').value};if(manager){data.targetClass=$('bw20MakeupTarget').value;data.targetDate=$('bw20MakeupTargetDate').value;data.status=$('bw20MakeupStatus').value;}else data.status='접수';try{await call('staff20SaveMakeup',state.token,data);toast('보강 요청·처리 내용을 저장했습니다.');await renderMakeups();}catch(e){toast(e.message,true);}finally{setBusy(f,false);}};
}
async function renderThemes(){
 const rows=await call('staff20Themes',state.token);if(state.page!=='themes')return;const edit=bw20CanEdit();
 const labels=['7~12개월','13~18개월','19~24개월','25~35개월','36~48개월'];
 $('pageBody').innerHTML=head('월간 오감놀이 계획','그림책·노래·재료를 정하고 같은 주제 안에서 아이의 월령에 맞게 진행 방법을 조정하세요.')+
 (edit?panel('교사용 월간 놀이 기획','아이의 월령별 진행 방법과 재료를 정리하고, 수업 전에 담당자가 확인하세요.',`<form id="bw20ThemeForm" class="stack"><div class="fields"><div class="form-item"><label for="bw20ThemeMonth">적용 월</label><input id="bw20ThemeMonth" type="month" required></div><div class="form-item"><label for="bw20ThemeStatus">검토 상태</label><select id="bw20ThemeStatus"><option>초안</option><option>확정</option></select></div></div><div class="form-item"><label for="bw20ThemeName">공통 주제</label><input id="bw20ThemeName" maxlength="80" required placeholder="예: 색을 만나는 하루"></div><div class="fields"><div class="form-item"><label for="bw20ThemeBook">연계 그림책</label><input id="bw20ThemeBook" maxlength="140"></div><div class="form-item"><label for="bw20ThemeSong">노래·리듬</label><input id="bw20ThemeSong" maxlength="140"></div></div><div class="form-item"><label for="bw20ThemeActivity">공통 감각 활동</label><textarea id="bw20ThemeActivity" maxlength="250" rows="2" placeholder="실제 재료·안전 기준에 따라 조정합니다."></textarea></div>${labels.map((x,i)=>`<div class="form-item"><label for="bw20ThemeMethod${i}">${x} · 교사 진행 방식</label><textarea id="bw20ThemeMethod${i}" rows="2" maxlength="270" placeholder="같은 주제 안에서 교사의 언어와 활동 난이도를 어떻게 달리할지"></textarea></div>`).join('')}<div class="row"><button class="btn btn-primary" type="submit">월간 주제 저장</button><button class="btn btn-outline" type="button" id="bw20ThemeReset">새 월 입력</button></div></form>`):'')+
 panel('월별 놀이 계획',edit?'작성 중인 내용과 확정된 내용을 함께 확인할 수 있습니다.':'확정된 월간 주제만 표시됩니다.',rows.length?rows.map(x=>`<details class="bw20-theme-detail"><summary><b>${h(x.month)} · ${h(x.theme)}</b><span class="pill">${h(x.status)}</span></summary><p><b>그림책</b> ${h(x.book||'미입력')}　<b>노래</b> ${h(x.song||'미입력')}</p><p><b>공통 활동</b> ${h(x.activity||'미입력')}</p>${labels.map((l,i)=>`<p class="bw20-method"><strong>${l}</strong> ${h(x.methods[i]||'미입력')}</p>`).join('')}${edit?`<button data-bw20theme="${h(x.month)}" class="btn btn-outline btn-small">이 달 수정</button>`:''}</details>`).join(''):'<div class="empty">아직 월간 공통 주제가 없습니다.</div>');
 if(edit){$('bw20ThemeReset').onclick=()=>{$('bw20ThemeForm').reset();};$('pageBody').querySelectorAll('[data-bw20theme]').forEach(b=>b.onclick=()=>{const x=rows.find(v=>v.month===b.dataset.bw20theme);if(!x)return;const vals={bw20ThemeMonth:x.month,bw20ThemeStatus:x.status,bw20ThemeName:x.theme,bw20ThemeBook:x.book,bw20ThemeSong:x.song,bw20ThemeActivity:x.activity};Object.entries(vals).forEach(([k,v])=>$(k).value=v||'');x.methods.forEach((v,i)=>$('bw20ThemeMethod'+i).value=v||'');$('bw20ThemeForm').scrollIntoView({behavior:'smooth',block:'start'});});$('bw20ThemeForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;setBusy(f,true);try{await call('staff20SaveTheme',state.token,{month:$('bw20ThemeMonth').value,status:$('bw20ThemeStatus').value,theme:$('bw20ThemeName').value,book:$('bw20ThemeBook').value,song:$('bw20ThemeSong').value,activity:$('bw20ThemeActivity').value,methods:labels.map((_,i)=>$('bw20ThemeMethod'+i).value)});toast('월간 주제를 저장했습니다.');await renderThemes();}catch(e){toast(e.message,true);}finally{setBusy(f,false);}};}
  // V45: file library is optional until the existing STAFF server is upgraded.
  // A missing module or server method must not block monthly sensory planning.
  if(window.BW45LessonPlans&&['owner','director','teacher'].includes(state.user?.role)){
    const routeToken=state.token,routeSeq=state.navigationSeq;
    window.BW45LessonPlans.mount({
      root:$('pageBody'),token:routeToken,call,
      canEdit:bw24Can('themes','write')&&['owner','director'].includes(state.user?.role),
      isCurrent:()=>state.page==='themes'&&state.token===routeToken&&state.navigationSeq===routeSeq,
      toast
    });
  }
}
const bw20PreviousRenderHome=renderHome;
renderHome=function(){
  bw20PreviousRenderHome();
  if(state.page!=='home')return;
  const nav=state.navigationSeq,token=state.token,epoch=bw282HomeEpoch;
  call('staff20ActionCenter',token).then(r=>{
    if(state.page!=='home'||nav!==state.navigationSeq||token!==state.token||epoch!==bw282HomeEpoch)return;
    const host=document.createElement('section');host.className='panel';
    host.innerHTML='<h3>오늘 확인할 업무</h3><p class="panel-desc">개인정보를 표시하지 않고, 확인이 필요한 건수만 모았습니다.</p><div class="bw20-quick">'+(r.items||[]).filter(x=>bw24Can(x.page)).map(x=>`<button class="bw20-quick-card" data-bw20goto="${h(x.page)}"><strong>${h(x.count)}</strong><span>${h(x.label)}</span></button>`).join('')+'</div>';
    const tgt=$('pageBody');if(!tgt)return;
    tgt.insertBefore(host,tgt.querySelector('.metric-grid')||tgt.children[2]||null);
    host.querySelectorAll('[data-bw20goto]').forEach(b=>b.onclick=()=>showPage(b.dataset.bw20goto));
  }).catch(()=>{/* Optional summary cannot block static work menu. */});
};

const bw20OldRenderNav=renderNav;
renderNav=function(){bw20OldRenderNav();const el=$('bw20PageSelect');if(!el)return;const allowed=MENU.filter(m=>bw24Can(m[0]));const signature=allowed.map(m=>m[0]).join('|');if(el.dataset.bw282Menu!==signature){el.innerHTML=window.BW31UX?.groupedOptions(allowed)||allowed.map(m=>`<option value="${h(m[0])}">${h(m[2])}</option>`).join('');el.dataset.bw282Menu=signature;}el.value=state.page;el.onchange=()=>showPage(el.value);};

// Payroll assets are loaded only when the owner opens the module.


 // V32 legal readiness module: loaded only on first authorized use.
 let bw32ModulePromise=null;
 function bw32LoadModule(){
   if(window.BW32Compliance)return Promise.resolve(window.BW32Compliance);
   if(bw32ModulePromise)return bw32ModulePromise;
   const base='https://bridgewonder.bridgeacademy.co.kr/assets/';
   const load=(tag,url,id)=>{
     const previous=document.getElementById(id);
     if(previous){if(previous.dataset.ready==='true')return Promise.resolve();previous.remove();}
     return new Promise((resolve,reject)=>{
       const element=document.createElement(tag);element.id=id;let done=false;
       const finish=error=>{if(done)return;done=true;clearTimeout(timer);element.onload=null;element.onerror=null;
         if(error){element.remove();reject(error);}
         else{element.dataset.ready='true';resolve();}
       };
       const timer=setTimeout(()=>finish(Error('법정 관리 화면을 불러오지 못했습니다. 새로고침해 주세요.')),20000);
       element.onload=()=>finish();
       element.onerror=()=>finish(Error('법정 관리 파일 로딩에 실패했습니다.'));
       if(tag==='link'){element.rel='stylesheet';element.href=url;document.head.appendChild(element);}
       else{element.src=url;element.async=false;document.body.appendChild(element);}
     });
   };
   bw32ModulePromise=Promise.all([
     load('link',base+'css/staff-compliance-v32.css?v=39.0.0','bw32ComplianceStyle'),
     load('script',base+'js/staff-compliance-v32.js?v=44.0.0','bw32ComplianceScript')
   ]).then(()=>{
     if(!window.BW32Compliance)throw Error('법정 관리 화면 초기화에 실패했습니다.');
     return window.BW32Compliance;
   }).catch(error=>{bw32ModulePromise=null;throw error;});
   return bw32ModulePromise;
 }
 async function renderCompliance32(){
   const token=state.token,nav=state.navigationSeq;
   await bw32LoadModule();
   if(token!==state.token||nav!==state.navigationSeq||state.page!=='compliance')return;
   await window.BW32Compliance.render($('pageBody'),{
     token,call,toast,navigate:showPage,
     isCurrent:()=>token===state.token&&nav===state.navigationSeq&&state.page==='compliance'
   });
 }
 // V37 new pages are lazy-loaded to avoid impacting staff login.
 let bw37AssetsPromise=null;
 let bw37QueuedInquiry='';
 function bw37LoadAssets(){
   if(window.BW37Academic)return Promise.resolve(window.BW37Academic);
   if(bw37AssetsPromise)return bw37AssetsPromise;
   const base='https://bridgewonder.bridgeacademy.co.kr/assets/';
   const include=(tag,url,id)=>new Promise((resolve,reject)=>{
     const exists=document.getElementById(id);
     if(exists){if(exists.dataset.ready==='yes'){resolve();return;}exists.remove();}
     const element=document.createElement(tag);element.id=id;
     const timer=setTimeout(()=>{element.remove();reject(Error('관리 화면을 불러오지 못했습니다. 새로고침해 주세요.'));},22000);
     element.onload=()=>{clearTimeout(timer);element.dataset.ready='yes';resolve();};
     element.onerror=()=>{clearTimeout(timer);element.remove();reject(Error('학생·테마 관리 화면을 불러오지 못했습니다.'));};
     if(tag==='link'){element.rel='stylesheet';element.href=url;document.head.appendChild(element);}
     else{element.src=url;element.async=false;document.body.appendChild(element);}
   });
   bw37AssetsPromise=Promise.all([
     include('link',base+'css/staff-academic-v37.css?v=39.0.0','bw37AcademicStyle'),
     include('script',base+'js/staff-academic-v37.js?v=41.0.0','bw37AcademicScript')
   ]).then(()=>{
     if(!window.BW37Academic)throw Error('학생·테마 관리 화면을 초기화할 수 없습니다.');
     return window.BW37Academic;
   }).catch(err=>{bw37AssetsPromise=null;throw err;});
   return bw37AssetsPromise;
 }
 async function renderStudents37(){
   const nav=state.navigationSeq,token=state.token;
   await bw37LoadAssets();
   if(nav!==state.navigationSeq||token!==state.token||state.page!=='students')return;
   const prefillReceipt=bw37QueuedInquiry;
   await window.BW37Academic.renderStudents($('pageBody'),{
     token,call,toast,prefillReceipt,
     isCurrent:()=>nav===state.navigationSeq&&token===state.token&&state.page==='students'
   });
   if(prefillReceipt===bw37QueuedInquiry)bw37QueuedInquiry='';
 }
 async function renderExperiences37(){
   const nav=state.navigationSeq,token=state.token;
   await bw37LoadAssets();
   if(nav!==state.navigationSeq||token!==state.token||state.page!=='experiences')return;
   await window.BW37Academic.renderExperiences($('pageBody'),{
     token,call,toast,
     isCurrent:()=>nav===state.navigationSeq&&token===state.token&&state.page==='experiences'
   });
 }
let bw26PayrollAssets=null;
const bw26PayrollLoads={};
function bw26LoadPayroll(){
  if(bw26PayrollAssets)return bw26PayrollAssets;
  const base='https://bridgewonder.bridgeacademy.co.kr/assets/';
  function asset(id,tag,url,label){
    if(tag==='script'&&window.BWPayroll)return Promise.resolve();
    if(bw26PayrollLoads[id])return bw26PayrollLoads[id];
    const existing=document.getElementById(id);
    if(existing?.dataset.bw26Ready==='true')return Promise.resolve();
    bw26PayrollLoads[id]=new Promise((resolve,reject)=>{
      const element=existing||document.createElement(tag);element.id=id;
      let settled=false;
      const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);element.onload=null;element.onerror=null;if(error){element.remove();reject(error);}else{element.dataset.bw26Ready='true';resolve();}};
      const timer=setTimeout(()=>finish(Error(label+'을 불러오는 시간이 길어지고 있습니다. 다시 시도해 주세요.')),20000);
      element.onload=()=>finish(tag==='script'&&!window.BWPayroll?Error('급여 화면 초기화에 실패했습니다. 다시 시도해 주세요.'):null);
      element.onerror=()=>finish(Error(label+'을 불러오지 못했습니다. 다시 시도해 주세요.'));
      if(!existing){if(tag==='link'){element.rel='stylesheet';element.href=url;document.head.append(element);}else{element.src=url;document.body.append(element);}}
    }).catch(error=>{delete bw26PayrollLoads[id];throw error;});
    return bw26PayrollLoads[id];
  }
  bw26PayrollAssets=Promise.all([
    asset('bw26PayrollCSS','link',base+'css/administration-payroll.css?v=39.0.0','급여 화면 스타일'),
    asset('bw26PayrollJS','script',base+'js/administration-payroll.js?v=39.0.0','급여 화면')
  ]).catch(e=>{bw26PayrollAssets=null;throw e;});
  return bw26PayrollAssets;
}
async function renderPayroll(){
  const nav=state.navigationSeq,token=state.token,user=state.user;
  if(user?.role!=='owner')throw Error('급여관리는 원장 계정에서만 이용할 수 있습니다.');
  await bw26LoadPayroll();
  if(nav!==state.navigationSeq||token!==state.token||state.page!=='payroll')return;
  await window.BWPayroll.mount($('pageBody'),{token,user,call,isCurrent:()=>nav===state.navigationSeq&&token===state.token&&state.page==='payroll'&&state.user?.role==='owner'});
}

 // V49: owner-only finance UI; assets are loaded only when the finance page opens.
 let bw49Assets=null;
 function bw49LoadAssets(){
   if(window.BW49FinanceModel&&window.BW49FinanceUI)return Promise.resolve();
   if(bw49Assets)return bw49Assets;
   const base='https://bridgewonder.bridgeacademy.co.kr/assets/';
   const asset=(tag,id,url)=>new Promise((resolve,reject)=>{
     const old=document.getElementById(id);
     if(old?.dataset.loaded==='yes'){resolve();return;}
     if(old)old.remove();
     const element=document.createElement(tag);element.id=id;
     let settled=false;
     const finish=err=>{if(settled)return;settled=true;clearTimeout(timer);element.onload=null;element.onerror=null;
       if(err){element.remove();reject(err);}else{element.dataset.loaded='yes';resolve();}
     };
     const timer=setTimeout(()=>finish(Error('운영 손익 화면을 불러오는 시간이 길어지고 있습니다. 다시 시도해 주세요.')),22000);
     element.onload=()=>finish();
     element.onerror=()=>finish(Error('재무 관리 화면을 불러오지 못했습니다.'));
     if(tag==='link'){element.rel='stylesheet';element.href=url;document.head.appendChild(element);}
     else{element.src=url;element.async=false;document.body.appendChild(element);}
   });
   bw49Assets=Promise.all([
     asset('link','bw49Style',base+'css/staff-finance-v49.css?v=49.0.0'),
     asset('script','bw49Model',base+'js/staff-finance-model-v49.js?v=49.0.0')
   ]).then(()=>asset('script','bw49Interface',base+'js/staff-finance-v49.js?v=49.0.0'))
     .then(()=>{if(!window.BW49FinanceModel||!window.BW49FinanceUI)throw Error('재무 관리 화면 초기화에 실패했습니다.');})
     .catch(err=>{bw49Assets=null;throw err;});
   return bw49Assets;
 }
 async function renderFinance49(){
   const token=state.token,nav=state.navigationSeq,user=state.user;
   if(user?.role!=='owner'||!bw24Can('finance'))throw Error('운영 손익은 원장 계정에서만 이용할 수 있습니다.');
   await bw49LoadAssets();
   if(token!==state.token||nav!==state.navigationSeq||state.page!=='finance')return;
   await window.BW49FinanceUI.mount($('pageBody'),{
     token,user,call,navigation:nav,
     isCurrent:()=>state.page==='finance'&&state.token===token&&state.navigationSeq===nav&&state.user?.role==='owner'
   });
 }
