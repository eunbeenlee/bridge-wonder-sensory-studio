/* Bridge Wonder V37 — private student register and monthly public theme editor.
 * Loaded on demand; never writes students/guardian data to browser storage.
 */
(function (global) {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  const failure=e=>String(e?.message||e||'작업을 완료하지 못했습니다.');
  const opts=(list,selected)=>list.map(x=>'<option value="'+esc(x.value)+'"'+(x.value===selected?' selected':'')+'>'+esc(x.label)+'</option>').join('');
  const classOptions=(classes,selected)=>'<option value="">반 배정은 상담 후 선택</option>'+opts((classes||[]).map(x=>({value:x.id,label:x.id+' · '+x.day+' '+x.time})),selected);
  const imageChoices=[['welcome','감각 탐색 바구니'],['snowy','겨울 눈사람'],['colors','알록달록 색채'],['teddy','곰 인형'],['story-book','그림책']];
  let savedForms={};
  function noHealthText(){
    return '건강·알레르기·진단 정보와 주민등록번호는 이 화면에 입력하지 마세요. 보호자 서명 원본은 별도로 보관합니다.';
  }
  function studentEditor(classes){
    return '<details id="bw37StudentEditor" class="bw37-editor" open><summary>학생 정보 등록·수정</summary>'+
      '<div class="bw37-editor-content"><p class="bw37-help">먼저 기본정보만 저장할 수 있습니다. 주 1회·2회와 실제 수업반은 상담 후 정하세요.</p>'+
      '<form id="bw37StudentForm" class="stack" autocomplete="off">'+
      '<input type="hidden" id="bw37StudentId"><input type="hidden" id="bw37StudentRevision" value="0">'+
      '<input type="hidden" id="bw37InquiryReceipt">'+
      '<div class="bw37-fields">'+
      '<label>아이 이름 <input id="bw37Child" maxlength="45" required placeholder="아이 이름"></label>'+
      '<label>생년월일 <span class="bw37-optional">재원 확정 시 필수</span><input id="bw37Birth" type="date"></label>'+
      '<label>보호자 성함 <input id="bw37Guardian" maxlength="45" required placeholder="보호자 성함"></label>'+
      '<label>보호자 관계 <select id="bw37Relation">'+opts(['미확인','모','부','조부모','법정대리인','기타 보호자'].map(x=>({value:x,label:x})),'미확인')+'</select></label>'+
      '<label>보호자 연락처 <input id="bw37Phone" type="tel" maxlength="18" required placeholder="01012345678"></label>'+
      '<label>보호자 이메일 <span class="bw37-optional">선택</span><input id="bw37Email" type="email" maxlength="180"></label>'+
      '<label>최초 접수일 <input id="bw37Joined" type="date" required></label>'+
      '<label>희망 주간 수업횟수 <select id="bw37Weekly">'+
        opts(['미정','주 1회','주 2회'].map(x=>({value:x,label:x==='미정'?'상담 후 결정':x})),'미정')+'</select></label>'+
      '<label>운영 상태 <select id="bw37Status">'+opts(['임시등록','재원','휴원','퇴원'].map(x=>({value:x,label:x})),'임시등록')+'</select></label>'+
      '</div>'+
      '<details class="bw37-assignment"><summary>수업반 배정 · 상담 후 입력</summary>'+
        '<div class="bw37-fields"><label>첫 번째 수업반 <select id="bw37Class1">'+classOptions(classes,'')+'</select></label>'+
        '<label>두 번째 수업반 <span class="bw37-optional">주 2회 수강 시</span><select id="bw37Class2">'+classOptions(classes,'')+'</select></label>'+
        '<label>보호자 확인일 <input id="bw37Verified" type="date"></label>'+
        '<label>보호자 확인 증빙 <input id="bw37Evidence" maxlength="160" placeholder="비공개 Drive 파일명·보관처"></label></div>'+
        '<p class="bw37-help">재원 상태로 변경하려면 생년월일, 반 배정 및 보호자 확인 증빙을 입력해 주세요. 주 2회는 두 반을 모두 배정합니다.</p>'+
      '</details>'+
      '<label>운영 메모 <span class="bw37-optional">선택</span><textarea id="bw37Note" rows="2" maxlength="240" placeholder="상담 일정·반 배정 관련 내용만 입력하세요."></textarea></label>'+
      '<p class="bw37-help">'+noHealthText()+'</p>'+
      '<div class="bw37-actions"><button class="btn btn-primary" type="submit">학생 정보 저장</button>'+
      '<button class="btn btn-outline" type="button" id="bw37NewStudent">새 학생 입력</button>'+
      '<span id="bw37StudentFeedback" role="status" class="bw37-help"></span></div></form></div></details>';
  }
  function studentRows(records){
    if(!records.length)return '<tr><td colspan="6" class="bw37-empty">조건에 맞는 학생이 없습니다.</td></tr>';
    return records.map(s=>{
      const label=(s.classIds?.length?s.classIds.join(' · '):s.classId)||'협의 전';
      return '<tr><td><strong>'+esc(s.child)+'</strong><small>'+esc(s.birth||'생년월일 확인 전')+'</small></td>'+
        '<td>'+esc(label)+'</td><td>'+esc(s.guardian||'—')+'</td>'+
        '<td>'+esc(s.phone||'—')+'</td>'+
        '<td><span class="bw37-pill">'+esc(s.status)+'</span></td><td>'+
        (s.source==='직접 등록'?'<button type="button" class="btn btn-outline btn-small" data-bw37-edit="'+esc(s.id)+'">수정</button>':
          '<span class="bw37-origin">온라인 계약 원본</span>')+'</td></tr>';
    }).join('');
  }
  async function renderStudents(root,context){
    root.innerHTML='<h2 class="page-title">학생 기본정보 관리</h2>'+
      '<p class="page-description">아이와 보호자 기본정보를 먼저 등록하고, 상담 후 주간 횟수와 수업반을 배정하세요.</p>'+
      '<div class="bw37-notice">온라인 전자서명 계약서는 변경하지 않습니다. 직접 등록 학생은 보호자 확인 후 재원 처리해야 출결과 정원에 반영됩니다.</div>'+
      '<div id="bw37StudentApp" class="bw37-loading">학생 정보를 불러오고 있습니다…</div>';
    const response=await context.call('staff37ListStudents',context.token);
    if(!context.isCurrent())return;
    let manual=response.manual||[],online=response.online||[],inquiries=response.inquiries||[];
    const classes=response.classes||[],host=$('bw37StudentApp');
    host.innerHTML='<section class="panel bw37-inquiry-import">'+
      '<h3>상담 접수에서 시작하기</h3><p class="bw37-help">홈페이지에서 접수한 상담 정보를 선택하면 학생 이름과 연락처를 자동으로 채웁니다. 부족한 정보는 상담 후 입력하세요.</p>'+
      '<div class="bw37-actions"><select id="bw37ConsultSelect" aria-label="상담 접수 선택"><option value="">최근 상담 접수 선택</option>'+
       inquiries.map(x=>'<option value="'+esc(x.receipt)+'">'+esc(x.child+' · '+x.phone+' · '+x.receipt)+'</option>').join('')+
      '</select><button type="button" id="bw37ImportInquiry" class="btn btn-outline">학생 초안으로 옮기기</button></div></section>'+
      studentEditor(classes)+
      '<section class="panel bw37-student-list"><div class="bw37-title-row"><div><h3>전체 학생 명단</h3><p class="bw37-help">온라인 확정 학생과 관리자 직접 등록 학생을 함께 확인합니다.</p></div>'+
      '<span id="bw37StudentCount" class="bw37-pill"></span></div>'+
      '<div class="bw37-fields"><label>학생 검색 <input type="search" id="bw37StudentSearch" placeholder="아이·보호자 이름, 학생번호"></label>'+
      '<label>반별 보기 <select id="bw37StudentClass"><option value="">전체 수업반</option>'+
      opts(classes.map(x=>({value:x.id,label:x.id})),'')+'</select></label>'+
      '<label>운영 상태 <select id="bw37StudentState"><option value="">전체 상태</option>'+
      opts(['임시등록','재원','휴원','퇴원','온라인 등록확정'].map(x=>({value:x,label:x})),'')+'</select></label></div>'+
      '<div class="table-scroll"><table class="data-table"><thead><tr>'+
      '<th>아이 이름</th><th>수업반</th><th>보호자</th><th>연락처</th><th>상태</th><th>관리</th>'+
      '</tr></thead><tbody id="bw37StudentRows"></tbody></table></div></section>';

    const fieldMap={
      id:'bw37StudentId',revision:'bw37StudentRevision',inquiryReceipt:'bw37InquiryReceipt',
      child:'bw37Child',birth:'bw37Birth',guardian:'bw37Guardian',relation:'bw37Relation',
      phone:'bw37Phone',email:'bw37Email',joined:'bw37Joined',weekly:'bw37Weekly',
      status:'bw37Status',verifiedAt:'bw37Verified',evidence:'bw37Evidence',note:'bw37Note'
    };
    function reset(){
      $('bw37StudentForm').reset();$('bw37StudentId').value='';$('bw37StudentRevision').value='0';
      $('bw37InquiryReceipt').value='';$('bw37Joined').value=today();
      $('bw37Status').value='임시등록';$('bw37Weekly').value='미정';$('bw37Relation').value='미확인';
      $('bw37Class1').value='';$('bw37Class2').value='';
      $('bw37StudentFeedback').textContent='';$('bw37StudentEditor').open=true;
    }
    function setStudent(p){
      reset();
      for(const [key,id] of Object.entries(fieldMap)){
        if(key==='revision'&&p.revision!==undefined)$(id).value=String(p.revision);
        else if(p[key]!==undefined && p[key]!==null)$(id).value=String(p[key]);
      }
      const assigned=p.classIds||[];
      $('bw37Class1').value=assigned[0]||p.classId||'';
      $('bw37Class2').value=assigned[1]||'';
      if(assigned.length)$('bw37Class1').closest('details').open=true;
      $('bw37StudentEditor').scrollIntoView({behavior:'smooth',block:'start'});
    }
    function list(){
      const q=$('bw37StudentSearch').value.trim().toLowerCase(),
        classId=$('bw37StudentClass').value,status=$('bw37StudentState').value;
      const records=manual.concat(online).filter(s=>
        (!q||[s.id,s.child,s.guardian,s.phone].some(x=>String(x||'').toLowerCase().includes(q)))&&
        (!status||s.status===status)&&
        (!classId||s.classIds?.includes(classId)||s.classId===classId));
      $('bw37StudentRows').innerHTML=studentRows(records);
      $('bw37StudentCount').textContent=records.length+'명';
      $('bw37StudentRows').querySelectorAll('[data-bw37-edit]').forEach(button=>{
        button.onclick=()=>{
          const target=manual.find(s=>s.id===button.dataset.bw37Edit);
          if(target)setStudent(target);
        };
      });
    }
    ['bw37StudentSearch','bw37StudentClass','bw37StudentState'].forEach(id=>{
      $(id).addEventListener(id==='bw37StudentSearch'?'input':'change',list);
    });
    $('bw37NewStudent').onclick=reset;
    $('bw37ImportInquiry').onclick=()=>{
      const receipt=$('bw37ConsultSelect').value;
      const source=inquiries.find(x=>x.receipt===receipt);
      if(!source)return context.toast('상담 접수번호를 선택해 주세요.',true);
      if(manual.some(s=>s.inquiryReceipt===receipt))
        return context.toast('이미 학생 기본정보에 등록된 상담 접수입니다.',true);
      reset();
      $('bw37InquiryReceipt').value=receipt;
      $('bw37Child').value=source.child||'';
      $('bw37Guardian').value=source.guardian||'';
      $('bw37Phone').value=String(source.phone||'').replace(/[^0-9]/g,'');
      $('bw37Weekly').value=['주 1회','주 2회'].includes(source.weekly)?source.weekly:'미정';
      $('bw37StudentFeedback').textContent='상담 정보를 채웠습니다. 내용을 확인한 후 임시등록으로 저장하세요.';
      $('bw37StudentEditor').scrollIntoView({behavior:'smooth',block:'start'});
    };
    $('bw37StudentForm').onsubmit=async e=>{
      e.preventDefault();
      const form=$('bw37StudentForm'),button=form.querySelector('button[type=submit]');
      const payload={};
      for(const [name,id] of Object.entries(fieldMap))payload[name]=name==='revision'?Number($(id).value||0):$(id).value.trim();
      payload.classIds=[$('bw37Class1').value,$('bw37Class2').value].filter(Boolean);
      if(payload.status==='재원'){
        if(!payload.birth||!payload.evidence||!payload.verifiedAt||!payload.classIds.length){
          $('bw37StudentFeedback').textContent='재원 처리에는 생년월일·수업반·보호자 확인 증빙이 필요합니다.';
          $('bw37Class1').closest('details').open=true;return;
        }
      }
      button.disabled=true;$('bw37StudentFeedback').textContent='학생 정보를 저장 중입니다…';
      try{
        const result=await context.call('staff37SaveStudent',context.token,payload);
        if(!context.isCurrent())return;
        const updated=await context.call('staff37ListStudents',context.token);
        if(!context.isCurrent())return;
        manual=updated.manual||[];online=updated.online||[];
        context.toast('학생 기본정보를 저장했습니다.');
        reset();list();
      }catch(err){
        $('bw37StudentFeedback').textContent=failure(err);context.toast(failure(err),true);
      }finally{button.disabled=false;}
    };
    reset();list();
    if(context.prefillReceipt){
      const match=inquiries.find(x=>x.receipt===context.prefillReceipt);
      if(match){
        $('bw37ConsultSelect').value=match.receipt;
        $('bw37ImportInquiry').click();
      }
    }
  }
  const imageOptions=value=>opts(imageChoices.map(x=>({value:x[0],label:x[1]})),value);
  function themeEditor(){
    return '<section class="panel bw37-theme-editor"><h3>월별 체험 테마 편집</h3>'+
      '<p class="bw37-help">체험 테마 세 가지를 작성하고 ‘공개’를 선택하면 홈페이지와 체험 테마 페이지에 반영됩니다.</p>'+
      '<form id="bw37ExperienceForm" class="stack"><div class="bw37-fields">'+
      '<label>적용 월 <input id="bw37ExperienceMonth" type="month" required></label>'+
      '<label>공개 상태 <select id="bw37ExperienceStatus">'+opts(['초안','공개','보관'].map(x=>({value:x,label:x})),'초안')+'</select></label>'+
      '</div><label>월간 제목 <input id="bw37ExperienceHeading" maxlength="85" placeholder="예: 2월, 상상 속 색과 소리를 만나요."></label>'+
      '<label>월간 소개 <textarea id="bw37ExperienceIntro" maxlength="250" rows="2" placeholder="학부모에게 보여 줄 소개 문장을 적어 주세요."></textarea></label>'+
      '<div id="bw37ExperienceCards"></div>'+
      '<div class="bw37-actions"><button type="submit" class="btn btn-primary">체험 테마 저장</button>'+
      '<button type="button" class="btn btn-outline" id="bw37ExperienceNew">다른 월 작성</button>'+
      '<button type="button" class="btn btn-outline" id="bw37UseShared">내부 수업 주제 가져오기</button>'+
      '<span id="bw37ExperienceFeedback" class="bw37-help" role="status"></span></div>'+
      '<input id="bw37ExperienceRevision" type="hidden" value="0"></form></section>';
  }
  function cardsEditor(cards){
    return cards.map((card,i)=>'<fieldset class="bw37-theme-card"><legend>체험 테마 '+(i+1)+'</legend>'+
      '<div class="bw37-fields"><label>테마 이름 <input id="bw37Title'+i+'" maxlength="65" value="'+esc(card.title)+'" placeholder="테마 제목"></label>'+
      '<label>일러스트 선택 <select id="bw37Image'+i+'">'+imageOptions(card.image)+'</select></label></div>'+
      '<label>소개 문장 <textarea id="bw37Description'+i+'" maxlength="195" rows="2">'+esc(card.description)+'</textarea></label>'+
      '<label>키워드 <input id="bw37Tags'+i+'" maxlength="90" value="'+esc(card.tags)+'" placeholder="예: 자연 · 호기심 · 발견"></label>'+
      '<div class="bw37-image-preview"><img src="/assets/img/'+(card.image==='story-book'?'story-book.webp':esc(card.image)+'.webp')+
      '" alt="선택한 수업 테마 일러스트" data-bw37-preview="'+i+'" loading="lazy"></div></fieldset>').join('');
  }
  async function renderExperiences(root,context){
    root.innerHTML='<h2 class="page-title">홈페이지 체험 테마</h2>'+
      '<p class="page-description">매달 소개할 체험 주제를 작성하고 공개할 월을 선택하세요.</p>'+
      '<div class="bw37-notice">내부 월간 수업 계획은 기존 ‘이달의 수업 주제’ 메뉴에서 계속 관리합니다. 홈페이지에는 공개 승인한 내용만 표시됩니다.</div>'+
      '<div id="bw37ExperienceApp" class="bw37-loading">월간 테마 정보를 불러오고 있습니다…</div>';
    const result=await Promise.all([context.call('staff37ListExperiences',context.token),
      context.call('staff20Themes',context.token)]);
    if(!context.isCurrent())return;
    let current=result[0],shared=result[1]||[];
    const host=$('bw37ExperienceApp');
    host.innerHTML=themeEditor()+'<section class="panel"><h3>작성한 월별 테마</h3>'+
      '<p class="bw37-help">수정할 월을 선택하세요. 홈페이지에 표시 중인 월은 ‘공개 중’으로 표시됩니다.</p>'+
      '<div id="bw37ExperienceList"></div></section>';
    let rows=current.rows||[];
    function newMonth(){
      const month=today().slice(0,7);
      $('bw37ExperienceForm').reset();$('bw37ExperienceMonth').value=month;
      $('bw37ExperienceStatus').value='초안';$('bw37ExperienceRevision').value='0';
      $('bw37ExperienceCards').innerHTML=cardsEditor([0,1,2].map((_,i)=>({
        title:'',description:'',tags:'',image:['welcome','snowy','colors'][i]})));
      bindImages();
    }
    function setExperience(item){
      newMonth();
      $('bw37ExperienceMonth').value=item.month;
      $('bw37ExperienceStatus').value=item.status;
      $('bw37ExperienceHeading').value=item.heading;
      $('bw37ExperienceIntro').value=item.intro;
      $('bw37ExperienceRevision').value=String(item.revision);
      $('bw37ExperienceCards').innerHTML=cardsEditor(item.cards);
      bindImages();
      $('bw37ExperienceForm').scrollIntoView({behavior:'smooth',block:'start'});
    }
    function bindImages(){
      host.querySelectorAll('[id^=bw37Image]').forEach(el=>{
        el.onchange=()=>{
          const index=el.id.replace('bw37Image','');
          const img=host.querySelector('[data-bw37-preview="'+index+'"]');
          if(img)img.src='/assets/img/'+(el.value==='story-book'?'story-book.webp':el.value+'.webp');
        };
      });
    }
    function draw(){
      $('bw37ExperienceList').innerHTML=rows.length?rows.map(r=>
        '<div class="bw37-month-row"><div><strong>'+esc(r.month)+' · '+esc(r.heading||'미작성')+'</strong>'+
        '<span>'+esc(r.month===current.published?'홈페이지 공개 중':r.status)+'</span></div>'+
        '<button type="button" class="btn btn-outline btn-small" data-bw37-month="'+esc(r.month)+'">수정</button></div>').join(''):
        '<div class="bw37-empty">작성한 테마가 없습니다. 위에서 첫 달을 등록해 주세요.</div>';
      host.querySelectorAll('[data-bw37-month]').forEach(b=>b.onclick=()=>{
        const item=rows.find(r=>r.month===b.dataset.bw37Month);
        if(item)setExperience(item);
      });
    }
    $('bw37ExperienceNew').onclick=newMonth;
    $('bw37UseShared').onclick=()=>{
      const month=$('bw37ExperienceMonth').value,
        topic=shared.find(x=>x.month===month&&x.status==='확정');
      if(!topic)return context.toast('선택한 달에 확정된 내부 공통 주제가 없습니다.',true);
      $('bw37ExperienceHeading').value=topic.theme||'';
      $('bw37ExperienceIntro').value=topic.activity||'';
      context.toast('내부 공통 주제의 제목과 활동 소개를 가져왔습니다. 세 가지 체험 내용을 확인해 주세요.');
    };
    $('bw37ExperienceForm').onsubmit=async e=>{
      e.preventDefault();
      const form=$('bw37ExperienceForm'),submit=form.querySelector('button[type=submit]');
      const payload={month:$('bw37ExperienceMonth').value,
        status:$('bw37ExperienceStatus').value,heading:$('bw37ExperienceHeading').value,
        intro:$('bw37ExperienceIntro').value,revision:Number($('bw37ExperienceRevision').value||0),
        cards:[0,1,2].map(i=>({title:$('bw37Title'+i).value,
          description:$('bw37Description'+i).value,
          tags:$('bw37Tags'+i).value,image:$('bw37Image'+i).value}))};
      submit.disabled=true;$('bw37ExperienceFeedback').textContent='테마를 저장하고 있습니다…';
      try{
        await context.call('staff37SaveExperience',context.token,payload);
        current=await context.call('staff37ListExperiences',context.token);
        if(!context.isCurrent())return;
        rows=current.rows||[];const item=rows.find(r=>r.month===payload.month);
        if(item)setExperience(item);draw();
        context.toast(payload.status==='공개'?'홈페이지 공개 월을 변경했습니다.':'체험 테마를 저장했습니다.');
        $('bw37ExperienceFeedback').textContent=payload.status==='공개'?
          '공개 자료가 업데이트되었습니다. 홈페이지에서는 연결된 캐시 시간이 지나면 반영됩니다.':'저장했습니다.';
      }catch(err){$('bw37ExperienceFeedback').textContent=failure(err);context.toast(failure(err),true);}
      finally{submit.disabled=false;}
    };
    newMonth();draw();
  }
  global.BW37Academic=Object.freeze({renderStudents,renderExperiences});
})(window);
