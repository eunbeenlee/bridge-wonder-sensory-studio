/* Bridge Wonder V8 · first-party consultation UI with Google Sheets-only storage.
 * No third-party embedded form. No personal data in status URLs or browser storage.
 * POST uses no-cors (response opaque), then confirms storage via read-only JSONP
 * containing only a random request ID and its receipt. Never assume POST success.
 */
(function () {
  'use strict';
  const root=document.querySelector('[data-inquiry-root]');
  if(!root) return;
  const form=root.querySelector('[data-wonder-inquiry]');
  const btn=root.querySelector('[data-wonder-submit]');
  const feedback=root.querySelector('[data-wonder-feedback]');
  const recheck=root.querySelector('[data-wonder-recheck]');
  const allInquiry=root.querySelector('#bw13-inquiry-all');
  const requiredInquiry=root.querySelector('#bw13-inquiry-required');
  const countInquiry=root.querySelector('#bw13-inquiry-count');
  const inquiryConsents=Array.from(form.querySelectorAll('input[data-bw13-inquiry]'));
  function syncInquiryConsent(){
    const n=inquiryConsents.filter(x=>x.checked).length;
    allInquiry.checked=n===inquiryConsents.length;
    allInquiry.indeterminate=n>0 && n<inquiryConsents.length;
    countInquiry.textContent='총 '+n+'/3개 선택';
  }
  allInquiry.addEventListener('change',()=>{inquiryConsents.forEach(x=>x.checked=allInquiry.checked);syncInquiryConsent();});
  requiredInquiry.addEventListener('click',()=>{inquiryConsents.forEach(x=>x.checked=x.dataset.consentType==='required');syncInquiryConsent();});
  inquiryConsents.forEach(x=>x.addEventListener('change',syncInquiryConsent));
  syncInquiryConsent();

  // Korean mobile numbers remain strings; never convert to Number.
  // +82 10 ... is normalized to 010..., while malformed values are rejected.
  function normalizeMobile(value){
    let digits=String(value||'').replace(/[^0-9]/g,'');
    if(/^8210[0-9]{8}$/.test(digits)) digits='0'+digits.slice(2);
    return /^01(?:0[0-9]{8}|[16789][0-9]{7,8})$/.test(digits)?digits:'';
  }
  function displayMobile(digits){
    if(!digits)return '';
    return digits.slice(0,3)+'-'+digits.slice(3,digits.length===11?7:6)+'-'+digits.slice(digits.length===11?7:6);
  }
  const phoneInput=form.querySelector('[name="phone"]');
  if(phoneInput){
    phoneInput.addEventListener('blur',()=>{
      const digits=normalizeMobile(phoneInput.value);
      if(digits)phoneInput.value=displayMobile(digits);
    });
  }
  const config=window.BRIDGE_WONDER_CONTACT_CONFIG || {};
  const api=String(config.webAppUrl||'').trim();
  const validEndpoint=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(api);
  let activeId='';
  let confirmed=false;
  let polling=false;
  let inFlight=false;
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

  function render(state,headline,description){
    feedback.hidden=false;
    feedback.dataset.state=state;
    feedback.replaceChildren();
    const heading=document.createElement('strong');heading.textContent=headline;
    const paragraph=document.createElement('div');paragraph.textContent=description;
    feedback.append(heading,paragraph);
  }
  function setBusy(busy){
    inFlight=busy;
    btn.disabled=busy;
    btn.setAttribute('aria-busy',String(busy));
    btn.textContent=busy?'접수 정보를 확인하고 있어요…':'상담 신청 접수하기 →';
  }
  function makeRequestId(){
    if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g,'');
    if(window.crypto && window.crypto.getRandomValues) {
      const bytes=window.crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    }
    throw Error('보안 연결이 필요합니다. https 주소로 접속해 주세요.');
  }
  function verified(data){
    if(!data || data.requestId!==activeId || data.state!=='saved' || !/^BW-[A-Z0-9]{12}$/.test(String(data.receipt||'')))return;
    confirmed=true;
    render('success','상담 신청이 정상 접수되었습니다.', '접수번호 '+data.receipt+' · 담당자가 확인 후 연락드립니다. 신청만으로 예약이 확정되는 것은 아닙니다.');
    setBusy(false);
    recheck.hidden=true;
    form.reset();
    syncInquiryConsent();
    if(window.sessionStorage) {
      try{sessionStorage.removeItem('bw_last_inquiry_id');}catch(_){}
    }
  }
  window.__BW_REGISTRY_ACK=window.__BW_REGISTRY_ACK||function(){};
  window.__BW_STORE_ACK=function(d){verified(d);window.__BW_REGISTRY_ACK(d);};

  function pollOnce(id){
    return new Promise(resolve=>{
      let done=false;
      const tag=document.createElement('script');
      const end=()=>{if(done)return;done=true;tag.remove();resolve();};
      tag.async=true;
      tag.referrerPolicy='no-referrer';
      tag.src=api+'?action=status&rid='+encodeURIComponent(id)+'&v='+Date.now();
      tag.onload=end;
      tag.onerror=end;
      document.head.appendChild(tag);
      setTimeout(end,3800);
    });
  }
  async function verifyStorage(id){
    if(polling)return;
    polling=true;
    recheck.hidden=true;
    try {
      for(let attempt=0;attempt<7;attempt++){
        if(activeId!==id || confirmed)break;
        await pollOnce(id);
        if(confirmed)break;
        if(attempt<6) await sleep(1200+attempt*150);
      }
      if(activeId===id&&!confirmed){
        render('uncertain','접수 여부를 아직 확인하지 못했습니다.', '전송이 완료되었을 수도 있습니다. 같은 내용을 바로 다시 보내지 마시고, 아래의 ‘접수 상태 다시 확인하기’를 누르거나 전화·Instagram으로 문의해 주세요.');
        recheck.hidden=false;
        setBusy(false);
      }
    } finally {polling=false;}
  }

  function payloadFromForm(){
    const data=new FormData(form);
    const childName=String(data.get('childName')||'').trim();
    const phone=normalizeMobile(data.get('phone'));
    const months=String(data.get('months')||'').trim();
    const topic=String(data.get('topic')||'');
    const contactTime=String(data.get('contactTime')||'상관없음');
    const note=String(data.get('note')||'').trim();
    const contactMethod=String(data.get('contactMethod')||'');
    const legalGuardian=Boolean(form.querySelector('[name=legalGuardian]')?.checked);
    const marketing=Boolean(form.querySelector('[name=marketing]')?.checked);
    const valid=childName.length>=1 && childName.length<=35 && Boolean(phone)
      && /^\d{1,2}$/.test(months) && Number(months)>=7 && Number(months)<=48
      && ['체험수업 상담','정규 수업 문의','기타 문의'].includes(topic)
      && ['상관없음','오전','오후','저녁'].includes(contactTime)
      && note.length<=400 && ['문자','전화'].includes(contactMethod) && legalGuardian && form.querySelector('[name="consent"]').checked;
    return {valid,childName,phone,months,topic,contactTime,note,contactMethod,legalGuardian,marketing,website:String(data.get('website')||'')};
  }
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(inFlight)return;
    if(!validEndpoint){render('error','상담 접수가 아직 연결되지 않았습니다.','전화 010-2693-2471 또는 Instagram DM으로 문의해 주세요.');return;}
    if(!form.reportValidity())return;
    const input=payloadFromForm();
    if(!input.valid){render('error','입력 내용을 다시 확인해 주세요.','아이 이름, 보호자 휴대전화(010-1234-5678), 아이 월령(7~48개월), 문의 종류와 개인정보 동의를 확인해 주세요.');return;}
    if(!window.fetch){render('error','이 브라우저에서는 온라인 신청을 지원하지 않습니다.','브라우저를 업데이트하거나 전화로 문의해 주세요.');return;}
    try {activeId=makeRequestId();} catch(err){render('error','안전한 접수를 시작할 수 없습니다.',err.message);return;}
    confirmed=false;
    setBusy(true);
    recheck.hidden=true;
    render('pending','상담 접수 정보를 전달하고 있습니다.','저장 확인까지 잠시 소요될 수 있습니다. 화면을 닫지 말아 주세요.');
    try{sessionStorage.setItem('bw_last_inquiry_id',activeId);}catch(_){}
    const payload=new URLSearchParams({
      source:'bridgewonder-v21-child-consultation',rid:activeId,childName:input.childName,phone:input.phone,
      months:input.months,topic:input.topic,contactTime:input.contactTime,note:input.note,
      consent:'yes',legalGuardian:input.legalGuardian?'yes':'no',marketing:input.marketing?'yes':'no',contactMethod:input.contactMethod,website:input.website
    });
    // A 'simple' POST avoids CORS preflight. Response is intentionally unreadable.
    // Status is confirmed by separate, non-sensitive JSONP polling.
    try {
      fetch(api,{method:'POST',mode:'no-cors',credentials:'omit',cache:'no-store',
        referrerPolicy:'no-referrer',body:payload,redirect:'follow'}).catch(()=>{});
    } catch(_) {/* server may still receive request: continue status check */}
    await sleep(800);
    await verifyStorage(activeId);
  });
  recheck.addEventListener('click',()=>{
    if(!activeId || polling) return;
    render('pending','접수 상태를 다시 확인하고 있습니다.','스프레드시트 저장 여부를 확인합니다.');
    setBusy(true);
    verifyStorage(activeId);
  });

  if(!validEndpoint){
    btn.disabled=true;
    btn.textContent='전화 또는 Instagram으로 문의해 주세요';
    render('error','온라인 신청서 연결을 확인하고 있습니다.','현재 접수 주소가 설정되지 않았습니다. 전화 또는 Instagram DM으로 문의해 주세요.');
  }
})();
