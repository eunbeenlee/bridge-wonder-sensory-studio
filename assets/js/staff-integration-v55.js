/* V55 owner-only integration UI; no credentials or child data are retained here. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=new Intl.NumberFormat('ko-KR');
  const labels={core:'기본 운영 대장',academic:'학사·체험',lesson:'수업안 파일',finance:'재무',payroll:'급여',pricing:'정규 과정 요금',content:'운영 자료'};
  const statuses={ready:'정상',present:'존재 확인',missing:'미설치',mismatch:'구조 확인 필요'};
  let token='',authorized=false,loaded=false,draft=null,published=null,busy=false,diagnosing=false,dirty=false,pending=null;
  const rpc=(name,...args)=>window.BW27Bridge.request(name,args);
  function message(id,text,error=false){const el=$(id);el.textContent=text;el.dataset.error=error?'1':'0';}
  function numbers(){
    const weeks=Number($('bw55Weeks').value),total=Number($('bw55Total').value);
    if(!Number.isSafeInteger(weeks)||weeks<1||weeks>52||!Number.isSafeInteger(total)||total<1||total>100000000)return null;
    return {weeks,total};
  }
  function isDraftCurrent(){
    const val=numbers();
    return Boolean(loaded&&draft&&draft.saved&&val&&draft.values.weeks===val.weeks&&draft.values.total===val.total);
  }
  function controls(){
    const value=numbers();
    $('bw55PerVisit').textContent=value?fmt.format(Math.round(value.total/value.weeks))+'원':'—';
    $('bw55Max').textContent=value?fmt.format(value.total*4)+'원':'—';
    $('bw55Published').textContent=published?published.weeks+'주 · '+fmt.format(published.total)+'원':loaded?'미승인':'확인 전';
    $('bw55Save').disabled=!authorized||!loaded||busy||!value;
    $('bw55Publish').disabled=!authorized||busy||!isDraftCurrent()||Boolean(published&&value&&published.weeks===value.weeks&&published.total===value.total);
    $('bw55ReloadPrice').disabled=busy;
    $('bw55Weeks').disabled=busy;
    $('bw55Total').disabled=busy;
  }
  function applyState(res){
    if(!res||res.version!=='55.0.0'||!res.draft||!res.draft.values)throw Error('요금 서버 응답을 확인해 주세요.');
    draft=res.draft;published=res.published||null;
    $('bw55Weeks').value=String(draft.values.weeks);
    $('bw55Total').value=String(draft.values.total);
    loaded=true;dirty=false;pending=null;
    controls();
  }
  function renderStatus(data){
    if(!data||data.version!=='55.0.0'||!Array.isArray(data.tabs))throw Error('연결 진단 응답을 확인해 주세요.');
    const root=$('bw55Tables');root.replaceChildren();
    for(const [group,label] of Object.entries(labels)){
      const rows=data.tabs.filter(t=>t.group===group);
      if(!rows.length)continue;
      const block=document.createElement('section');block.className='bw55-group';
      const title=document.createElement('h3');title.textContent=label;block.appendChild(title);
      for(const item of rows){
        const line=document.createElement('div');line.className='bw55-row';
        const name=document.createElement('span');name.textContent=String(item.name);
        const state=document.createElement('span');state.className='bw55-state';state.dataset.status=item.state;
        state.textContent=statuses[item.state]||'확인 필요';
        line.append(name,state);block.appendChild(line);
      }
      root.appendChild(block);
    }
    const ready=data.tabs.filter(t=>t.state==='ready'||t.state==='present').length;
    message('bw55Status','서버 V'+data.version+' · '+ready+'/'+data.tabs.length+'개 대장 확인 · '+(data.checkedAt||'방금')+
      (data.ready?' · 대장 구조 확인 완료':' · 미설치 또는 구조 확인이 필요한 대장이 있습니다.'),!data.ready);
  }
  async function diagnose(){
    if(!authorized||diagnosing)return;
    diagnosing=true;$('bw55Refresh').disabled=true;
    message('bw55Status','연결 상태를 확인하고 있어요.');
    try{renderStatus(await rpc('staff55SystemStatus',token));}
    catch(error){
      $('bw55Tables').replaceChildren();
      message('bw55Status','현재 서버에서 V55 진단을 확인하지 못했습니다. 통합 설치 후 기존 직원 웹앱을 새 버전으로 배포해 주세요. '+String(error.message||''),true);
    }finally{diagnosing=false;$('bw55Refresh').disabled=false;}
  }
  async function readPrice(force=false){
    if(!authorized||busy)return;
    if(dirty&&!force&&!window.confirm('아직 저장하지 않은 요금이 있습니다. 다시 불러올까요?'))return;
    busy=true;controls();
    try{
      const response=await rpc('staff55ReadPricing',token);
      applyState(response);
      message('bw55PriceState',draft.saved?(response.pending?'저장된 초안과 현재 공개 승인값이 다릅니다. 공개하려면 승인해 주세요.':'현재 저장값과 공개 승인값이 일치합니다.'):'기본 요금 예시입니다. 아직 서버에 저장하지 않았습니다.');
    }catch(e){loaded=false;message('bw55PriceState','요금 저장 서버에 연결되지 않았습니다. 현재 화면은 계산 참고용입니다. '+String(e.message||''),true);}
    finally{busy=false;controls();}
  }
  async function save(event){
    event.preventDefault();
    if(!authorized||!loaded||busy)return;
    const values=numbers();if(!values)return;
    if(!window.crypto?.randomUUID){message('bw55PriceState','보안 연결에서 다시 시도해 주세요.',true);return;}
    busy=true;controls();message('bw55PriceState','초안을 저장하고 있어요.');
    try{
      const key=JSON.stringify([draft.etag,values]);
      if(!pending||pending.key!==key)pending={key,requestId:window.crypto.randomUUID()};
      const res=await rpc('staff55SavePricing',token,{values,etag:draft.etag,requestId:pending.requestId});
      if(res?.ok!==true)throw Error('저장 결과를 확인하지 못했습니다.');
      applyState(res);
      message('bw55PriceState',res.auditWarning?'초안은 저장됐지만 변경 이력 기록에 문제가 있었습니다. 백업·이용 기록을 확인해 주세요.':'초안을 저장했습니다. 홈페이지에는 아직 변경되지 않았습니다.',Boolean(res.auditWarning));
    }catch(e){message('bw55PriceState',String(e.message||'저장하지 못했습니다.')+' 저장 결과가 불확실하면 다시 조회해 주세요.',true);}
    finally{busy=false;controls();}
  }
  async function publish(){
    if(!authorized||busy||!isDraftCurrent())return;
    const value=draft.values;
    if(!window.confirm('정규 과정 '+value.weeks+'주 · '+fmt.format(value.total)+'원을 공개 홈페이지에 반영할까요? 기존 계약과 결제 기록은 변경되지 않습니다.'))return;
    busy=true;controls();message('bw55PriceState','공개 승인 중입니다.');
    try{
      const res=await rpc('staff55PublishPricing',token,{etag:draft.etag,confirm:true});
      if(res?.ok!==true||!res.published)throw Error('공개 승인 결과를 확인하지 못했습니다.');
      applyState(res);
      message('bw55PriceState',res.auditWarning?'공개 승인값은 저장됐지만 변경 이력 기록에 문제가 있습니다. 공개 페이지와 이용 기록을 확인해 주세요.':'공개 승인값을 저장했습니다. 홈페이지 새로고침으로 실제 표시를 확인해 주세요.',Boolean(res.auditWarning));
    }catch(e){message('bw55PriceState',String(e.message||'공개하지 못했습니다.')+' 최신 초안을 다시 확인해 주세요.',true);}
    finally{busy=false;controls();}
  }
  $('bw55PriceForm').addEventListener('submit',save);
  $('bw55PriceForm').addEventListener('input',()=>{dirty=true;controls();});
  $('bw55Publish').addEventListener('click',publish);
  $('bw55Refresh').addEventListener('click',diagnose);
  $('bw55ReloadPrice').addEventListener('click',()=>readPrice());
  async function start(){
    try{token=sessionStorage.getItem('bw17_staff_session')||'';}catch(_){}
    if(!token){message('bw55Access','직원 홈에서 원장 계정으로 로그인한 뒤 이 화면을 열어 주세요.');return;}
    try{
      const user=await rpc('staffCurrentUser',token);
      if(user?.role!=='owner'||user.mustChange){message('bw55Access','원장 계정으로 로그인해야 연동·요금 관리 화면을 이용할 수 있습니다.',true);return;}
      authorized=true;$('bw55Workspace').hidden=false;$('bw55Access').hidden=true;
      await Promise.all([diagnose(),readPrice(true)]);
    }catch(error){message('bw55Access','로그인 상태를 확인하지 못했습니다. 직원 홈에서 다시 로그인해 주세요.',true);}
  }
  controls();start();
})();
