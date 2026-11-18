/* Bridge Wonder V12 · verified enrollment and redundant document archive
 * Registration UI lives on GitHub Pages; Apps Script stores final terms,
 * guardian declarations, signature and private PDF. No iframe or client secrets.
 */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s),form=$('#bw11-enrollment-form'),codeField=$('#bw11-invite');
 if(!form)return;
 const config=window.BRIDGE_WONDER_CONTACT_CONFIG||{};
 const api=String(config.webAppUrl||'').trim();
 const endpoint=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(api);
 const offerMsg=$('#bw11-offer-feedback'),saveMsg=$('#bw11-save-feedback'),loadButton=$('#bw11-load'),submitButton=$('#bw11-submit'),recheck=$('#bw11-check'),printBtn=$('#bw11-print');
 const consentPanel=$('#bw11-form-panel'),termsPanel=$('#bw11-terms-panel');
 const canvas=$('#bw11-sign'),ctx=canvas.getContext('2d');
 const BW13_CONSENT_VERSION='BW-CONSENT-2026-11-18-V13';
 const agreementControls=Array.from(form.querySelectorAll('input[data-bw13-consent]'));
 const allConsent=$('#bw13-all-consent'),requiredOnly=$('#bw13-required-only'),consentCount=$('#bw13-consent-count');
 function syncConsentControls(){
   const n=agreementControls.filter(x=>x.checked).length;
   allConsent.checked=n===agreementControls.length;
   allConsent.indeterminate=n>0&&n<agreementControls.length;
   const nOptional=agreementControls.filter(x=>x.dataset.consentType==='optional'&&x.checked).length;
   consentCount.textContent='총 '+n+'/9개 선택 · 선택 동의 '+nOptional+'/5개';
 }
 allConsent.addEventListener('change',()=>{agreementControls.forEach(x=>{x.checked=allConsent.checked;});syncConsentControls();});
 requiredOnly.addEventListener('click',()=>{agreementControls.forEach(x=>{x.checked=x.dataset.consentType==='required';});syncConsentControls();});
 agreementControls.forEach(x=>x.addEventListener('change',syncConsentControls));
 syncConsentControls();
 let code='',terms=null,requestId='',receipt='',archiveState='',drawn=false,busy=false,checking=false,lastStatus=null,savedSnapshot=null;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 function show(node,type,title,message){
   node.hidden=false;node.dataset.state=type;node.replaceChildren();
   const h=document.createElement('strong');h.textContent=title;
   const p=document.createElement('div');p.textContent=message;
   node.append(h,p);
 }
 function busySet(value){busy=value;submitButton.disabled=value||Boolean(receipt);submitButton.setAttribute('aria-busy',String(value));submitButton.textContent=value?'등록 기록과 문서를 저장하고 있습니다…':'등록정보 확인 후 제출하기 →';}
 function secureId(){
   if(crypto.randomUUID)return crypto.randomUUID().replaceAll('-','');
   const out=new Uint8Array(16);crypto.getRandomValues(out);
   return Array.from(out,v=>v.toString(16).padStart(2,'0')).join('');
 }
 function jsonp(query,timeout=12000){
   return new Promise((resolve,reject)=>{
     const tag=document.createElement('script');let settled=false;
     const finish=err=>{if(settled)return;settled=true;tag.remove();clearTimeout(timer);err?reject(err):resolve();};
     const timer=setTimeout(()=>finish(Error('network-timeout')),timeout);
     tag.async=true;tag.referrerPolicy='no-referrer';
     tag.src=api+'?'+new URLSearchParams({...query,ts:String(Date.now())});
     tag.onerror=()=>finish(Error('network-error'));
     tag.onload=()=>finish();
     document.head.appendChild(tag);
   });
 }
 function line(label,value){
   const dl=$('#bw11-terms-grid'),dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=label;dd.textContent=value;dl.append(dt,dd);
 }
 function asWon(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('ko-KR').format(n)+'원':String(v)+'원';}
 function displayTerms(t){
   const grid=$('#bw11-terms-grid');grid.replaceChildren();
   line('교습기관',t.operator);line('등록번호',t.registrationNo);line('과정명',t.course);
   line('수업 시작일',t.starts);line('교습기간',t.period);line('수업요일·시간',t.schedule);
   line('교습비',asWon(t.fee));line('기타경비',asWon(t.extras));line('수업 장소',t.venue);line('결석·보강 기준',t.absence);line('보호자 동반',t.accompany);line('재료·준비물',t.materials);line('안전·사고 대응',t.safety);line('개인정보 보유기간',t.retention);
   $('#bw11-refund-text').textContent=t.refund;
   const clausesList=$('#bw12-terms-list');clausesList.replaceChildren();
   if(t.clausesVersion!=='BW-ENROLLMENT-TERMS-2026-11-18-V12'||!Array.isArray(t.clauses)||t.clauses.length!==10){
      throw Error('계약 조건 버전을 확인할 수 없습니다.');
   }
   if(t.consentVersion!==BW13_CONSENT_VERSION){throw Error('동의 정보 저장 버전이 최신이 아닙니다.');}
   t.clauses.forEach(item=>{const li=document.createElement('li');const title=document.createElement('strong');title.textContent=String(item[0])+'. ';li.append(title,document.createTextNode(String(item[1])));clausesList.append(li);});
   termsPanel.hidden=false;consentPanel.hidden=false;syncConsentControls();
   termsPanel.scrollIntoView({behavior:'smooth',block:'start'});
 }
 let preview=null;
 window.__BW_ENROLLMENT_OFFER=data=>{preview=data;};
 async function loadOffer(){
   if(!endpoint){show(offerMsg,'error','연결 설정을 확인해 주세요.','온라인 등록 연결을 확인하고 있습니다. 담당자에게 문의해 주세요.');return;}
   const candidate=codeField.value.trim().toLowerCase();
   if(!/^[0-9a-f]{40}$/.test(candidate)){show(offerMsg,'error','등록 코드를 확인해 주세요.','현장 상담 후 받은 등록 코드를 입력하시면 됩니다.');return;}
   code=candidate;terms=null;preview=null;loadButton.disabled=true;
   show(offerMsg,'pending','수강 조건을 확인하고 있습니다.','상담 담당자가 등록한 내용을 불러오고 있습니다.');
   try{
      await jsonp({action:'enrollmentPreview',code:code});
      if(!preview||preview.state!=='available'||!preview.terms){
        termsPanel.hidden=true;consentPanel.hidden=true;
        show(offerMsg,'error','등록 링크를 확인할 수 없습니다.','기한이 지났거나 이미 사용된 코드일 수 있습니다. 상담 담당자에게 새로운 링크를 요청해 주세요.');return;
      }
      terms=preview.terms;displayTerms(terms);
      show(offerMsg,'success','수강 조건을 불러왔습니다.','내용이 맞는지 확인하신 후 아래의 등록정보와 서명란을 작성해 주세요.');
   }catch(err){show(offerMsg,'error','등록 안내를 확인해 주세요.',String(err?.message||'').includes('동의 정보 저장 버전')?'기관의 등록 시스템 업데이트가 필요합니다. 담당자에게 알려 주세요.':'네트워크 상태를 확인한 후 다시 시도하거나 담당자에게 문의해 주세요.');}
   finally{loadButton.disabled=false;}
 }
 loadButton.addEventListener('click',loadOffer);
 codeField.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();loadOffer();}});
 // Remove invite token from the visible URL before any external resource loads.
 const params=new URLSearchParams(location.search),initial=params.get('code');
 if(initial){codeField.value=initial;try{history.replaceState(null,'',location.pathname+location.hash);}catch(_){}}
 if(initial && /^[0-9a-f]{40}$/.test(initial))setTimeout(loadOffer,0);

 // Signature canvas: drawing and typed signature options.
 const modes=Array.from(form.querySelectorAll('input[name="signatureMode"]'));
 const mode=()=>modes.find(el=>el.checked)?.value||'draw';
 const signTyped=$('#bw11-typed');
 const drawPanel=form.querySelector('[data-sign-draw]'),typedPanel=form.querySelector('[data-sign-typed]');
 function changeMode(){const draw=mode()==='draw';drawPanel.hidden=!draw;typedPanel.hidden=draw;signTyped.required=!draw;}
 modes.forEach(m=>m.addEventListener('change',changeMode));changeMode();
 ctx.strokeStyle='#385545';ctx.lineWidth=4.5;ctx.lineJoin='round';ctx.lineCap='round';let dragging=false;
 const point=ev=>{const r=canvas.getBoundingClientRect();return {x:(ev.clientX-r.left)*canvas.width/r.width,y:(ev.clientY-r.top)*canvas.height/r.height};};
 canvas.addEventListener('pointerdown',ev=>{
   if(mode()!=='draw'||busy||receipt)return;
   ev.preventDefault();dragging=true;drawn=true;
   try{canvas.setPointerCapture(ev.pointerId);}catch(_){}
   const p=point(ev);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.05,p.y+.05);ctx.stroke();
 });
 canvas.addEventListener('pointermove',ev=>{if(!dragging)return;ev.preventDefault();const p=point(ev);ctx.lineTo(p.x,p.y);ctx.stroke();});
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>{dragging=false;}));
 $('#bw11-clear').addEventListener('click',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);drawn=false;});
 function verifyAge(value){const m=/^(19|20)\d\d-(0[1-9]|1[0-2])$/.exec(value);if(!m)return false;const d=value.split('-').map(Number),kst=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).formatToParts(new Date()),y=Number(kst.find(x=>x.type==='year')?.value),mo=Number(kst.find(x=>x.type==='month')?.value),age=(y-d[0])*12+mo-d[1];return age>=7&&age<=48;}
 function collect(){
   const d=new FormData(form),guardian=String(d.get('guardian')||'').trim(),phone=String(d.get('phone')||'').replace(/\D/g,'');
   const child=String(d.get('childName')||'').trim(),email=String(d.get('email')||'').trim().toLowerCase(),birth=String(d.get('birthMonth')||'');
   const typed=String(d.get('typedSigner')||'').trim(),selected=mode();
   const childAddress=String(d.get('childAddress')||'').trim(),postcode=String(d.get('postcode')||'').trim();
   const valid=guardian.length>=2&&guardian.length<=35&&child.length>=1&&child.length<=35&&/^0[0-9]{8,10}$/.test(phone)
    &&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&verifyAge(birth)&&childAddress.length>=6&&childAddress.length<=180&&/^[0-9]{5}$/.test(postcode)
    &&['부','모','그 외 법정대리인'].includes(String(d.get('relation')))
    &&['문자','전화'].includes(String(d.get('contactMethod')))
    &&['processingConsent','guardianConsent','contractConsent','refundConsent','signatureConsent'].every(n=>form.elements.namedItem(n)?.checked)
    &&(selected==='draw'?drawn:typed.replace(/\s/g,'')===guardian.replace(/\s/g,''));
   return {d,valid,guardian,phone,child,email,birth,typed,selected,childAddress,postcode};
 }
 window.__BW_STORE_ACK=data=>{
   if(!data||data.requestId!==requestId||data.state!=='saved'||!/^BWR-[A-Z0-9]{12}$/.test(String(data.receipt||'')))return;
   receipt=String(data.receipt);archiveState=String(data.documentState||'');
   if(archiveState==='ready'){
      show(saveMsg,'success','등록 신청정보를 접수했습니다.','접수번호 '+receipt+' · 서명 PDF가 운영자의 비공개 문서함에 보관되었습니다. 보호자 이메일로 전달한 확인 안내에 회신해 주세요.');
      printBtn.disabled=false;recheck.hidden=true;busySet(false);
   }else{
      show(saveMsg,'uncertain','등록정보는 저장되었으며 별도 문서 백업을 확인 중입니다.','접수번호 '+receipt+' · 다시 제출하지 마시고 운영자에게 접수번호를 알려 주세요.');
      recheck.hidden=false;busySet(false);
   }
 };
 async function verifyReceipt(id){
   if(checking)return;checking=true;recheck.hidden=true;
   try{
      for(let i=0;i<15;i++){
        if(requestId!==id||archiveState==='ready')break;
        await jsonp({action:'status',type:'enrollment',rid:id},6500).catch(()=>{});
        if(receipt && archiveState==='ready')break;
        if(i<14)await sleep(1600);
      }
      if(requestId===id && archiveState!=='ready'){
        if(receipt)show(saveMsg,'uncertain','등록 접수는 확인되었습니다.','접수번호 '+receipt+' · 별도 백업 상태는 운영자가 추가로 확인하겠습니다. 같은 정보를 다시 제출하지 마세요.');
        else show(saveMsg,'uncertain','등록 접수 상태를 확인하지 못했습니다.','같은 내용을 다시 보내지 말고 상태를 다시 확인하거나 010-2693-2471로 문의해 주세요.');
        recheck.hidden=false;busySet(false);
      }
   }finally{checking=false;}
 }
 form.addEventListener('submit',async ev=>{
   ev.preventDefault();if(busy||receipt)return;
   if(!terms||!code){show(offerMsg,'error','등록 조건부터 확인해 주세요.','등록 코드를 확인하면 신청서를 작성하실 수 있습니다.');return;}
   if(!form.reportValidity())return;
   const v=collect();if(!v.valid){show(saveMsg,'error','입력 내용을 확인해 주세요.','아이 생년월(7~48개월), 연락처, 필수 동의와 서명을 다시 확인해 주세요.');return;}
   let signaturePng='';if(v.selected==='draw')signaturePng=canvas.toDataURL('image/png');
   if(signaturePng.length>150000){show(saveMsg,'error','서명을 간단히 다시 작성해 주세요.','서명 이미지를 처리하기 어려울 만큼 크게 작성하셨습니다.');return;}
   try{requestId=secureId();}catch(_){show(saveMsg,'error','보안 연결이 필요합니다.','HTTPS로 접속해 주세요.');return;}
   savedSnapshot=null;receipt='';archiveState='';busySet(true);recheck.hidden=true;printBtn.disabled=true;
   show(saveMsg,'pending','수강 등록정보와 서명 문서를 보관하고 있습니다.','전송과 PDF 저장 여부를 확인한 뒤 접수번호를 안내드립니다.');
   savedSnapshot={...v, consentStates:{
      promoSms:v.d.has('promoSms'),promoEmail:v.d.has('promoEmail'),classRecord:v.d.has('classRecord'),
      photoPublic:v.d.has('photoPublic'),videoPublic:v.d.has('videoPublic')},signaturePng:signaturePng};
   const payload=new URLSearchParams({source:'bridgewonder-v11-contract',rid:requestId,offerCode:code,termsVersion:terms.version,
     guardian:v.guardian,phone:v.phone,email:v.email,childName:v.child,birthMonth:v.birth,childAddress:v.childAddress,postcode:v.postcode,clausesVersion:'BW-ENROLLMENT-TERMS-2026-11-18-V12',
     relation:String(v.d.get('relation')),contactMethod:String(v.d.get('contactMethod')),
     processingConsent:'yes',guardianConsent:'yes',contractConsent:'yes',refundConsent:'yes',signatureConsent:'yes',
     consentVersion:BW13_CONSENT_VERSION,
     promoSms:v.d.has('promoSms')?'yes':'no',promoEmail:v.d.has('promoEmail')?'yes':'no',
     classRecord:v.d.has('classRecord')?'yes':'no',photoPublic:v.d.has('photoPublic')?'yes':'no',videoPublic:v.d.has('videoPublic')?'yes':'no',
     marketing:(v.d.has('promoSms')||v.d.has('promoEmail'))?'yes':'no',signatureMode:v.selected,typedSigner:v.selected==='typed'?v.typed:'',signaturePng:signaturePng,
     website:String(v.d.get('website')||'')});
   try{fetch(api,{method:'POST',mode:'no-cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',body:payload}).catch(()=>{});}catch(_){ }
   await sleep(1100);await verifyReceipt(requestId);
 });
 recheck.addEventListener('click',()=>{if(checking||!requestId)return;show(saveMsg,'pending','접수 상태를 다시 확인합니다.','기존 접수번호를 조회하므로 중복 등록되지 않습니다.');verifyReceipt(requestId);});
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 printBtn.addEventListener('click',()=>{
   if(!receipt||!terms)return;
   const v=savedSnapshot;if(!v)return;const out=window.open('','_blank','width=850,height=900');
   if(!out){show(saveMsg,'error','PDF 저장 창을 열 수 없습니다.','팝업 차단을 해제한 후 다시 시도해 주세요.');return;}
   try{out.opener=null;}catch(_){ }
   const consentRows=[
     ['새 프로그램·행사 소식 문자',v.consentStates.promoSms?'동의':'미동의'],
     ['새 프로그램·행사 소식 이메일',v.consentStates.promoEmail?'동의':'미동의'],
     ['수업 활동 기록 촬영·개별 공유',v.consentStates.classRecord?'동의':'미동의'],
     ['홍보용 사진 사용',v.consentStates.photoPublic?'동의':'미동의'],
     ['홍보용 영상 사용',v.consentStates.videoPublic?'동의':'미동의'],
     ['선택 동의 문구 버전',BW13_CONSENT_VERSION]
   ];
   const rows=[['접수번호',receipt],['보호자 성함',v.guardian],['연락처',v.phone],['이메일',v.email],['아이 이름',v.child],['아이 생년월',v.birth],['우편번호',v.postcode],['아동 주소',v.childAddress],
    ['과정명',terms.course],['수업 시작',terms.starts],['수업 일정',terms.schedule],['교습기간',terms.period],['교습비',asWon(terms.fee)],['기타경비',asWon(terms.extras)],['개인정보 보유기간',terms.retention],['서명 방식',v.selected==='draw'?'직접 서명':'이름 입력'],...consentRows];
   const sign=v.selected==='draw'?'<img style="width:220px;max-height:85px;object-fit:contain" alt="전자서명" src="'+v.signaturePng+'">':'이름 확인: '+escape(v.typed);
   out.document.open();out.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Bridge Wonder · 수강 등록정보 사본</title><style>body{font:14px/1.7 sans-serif;margin:40px;color:#23342a}h1{font-size:24px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #dfe5db;padding:10px}td:first-child{width:29%;font-weight:700}p{white-space:pre-wrap}.btn{border:1px solid #4b5b4b;padding:10px 18px;background:#fff;cursor:pointer}@media print{.btn{display:none}}</style></head><body><h1>BRIDGE WONDER · 온라인 수강 등록 확인서</h1><p>접수 시 확인한 정보를 보호자가 보관하기 위한 사본입니다. 운영자 보관 PDF·법정 영수증과는 구분됩니다.</p><table>'+rows.map(([k,val])=>'<tr><td>'+escape(k)+'</td><td>'+escape(val)+'</td></tr>').join('')+'</table><h2>교습비 반환 안내</h2><p>'+escape(terms.refund)+'</p><h2>전자서명</h2>'+sign+'<p>온라인 등록 접수번호 '+escape(receipt)+'</p><button class="btn" onclick="window.print()">PDF로 저장 / 인쇄</button></body></html>');out.document.close();out.focus();
 });
 if(!endpoint){loadButton.disabled=true;show(offerMsg,'error','온라인 등록 연결을 확인하고 있습니다.','담당자에게 문의해 주세요.');}
})();
