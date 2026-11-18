/* Bridge Wonder · first-party registration request UI (V10). No on-device storage of PII. */
(function(){
'use strict';
const form=document.querySelector('[data-wonder-registration]');if(!form)return;
const cfg=window.BRIDGE_WONDER_CONTACT_CONFIG||{},api=String(cfg.webAppUrl||'');
const validEndpoint=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(api);
const status=form.querySelector('[data-reg-feedback]'),submit=form.querySelector('[data-reg-submit]'),recheck=form.querySelector('[data-reg-recheck]');
let rid='',receipt='',busy=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function message(kind,title,detail){status.hidden=false;status.dataset.state=kind;status.replaceChildren();let b=document.createElement('strong');b.textContent=title;let p=document.createElement('div');p.textContent=detail;status.append(b,p);}
function loading(v){busy=v;submit.disabled=v;submit.textContent=v?'저장 상태를 확인하고 있습니다…':'등록 신청서 제출하기 →';}
function makeRid(){if(crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');const a=crypto.getRandomValues(new Uint8Array(16));return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');}
function acknowledge(d){if(!d||d.requestId!==rid||d.state!=='saved'||!/^BW-[A-Z0-9]{12}$/.test(d.receipt||''))return;receipt=d.receipt;message('success','등록 신청서를 받았습니다.','신청번호: '+receipt+' · 담당자가 일정과 수강 조건을 안내해 드립니다. 이 접수만으로 등록이 확정되지는 않습니다.');loading(false);recheck.hidden=true;}
window.__BW_REGISTRY_ACK=acknowledge;
function poll(){return new Promise(resolve=>{const e=document.createElement('script');let finished=false;function end(){if(finished)return;finished=true;e.remove();resolve();}e.src=api+'?action=status&type=registration&rid='+encodeURIComponent(rid)+'&t='+Date.now();e.onload=end;e.onerror=end;document.head.append(e);setTimeout(end,4000);});}
async function verify(){recheck.hidden=true;for(let k=0;k<7&&!receipt;k++){await poll();if(!receipt)await sleep(1300);}if(!receipt){message('uncertain','저장 여부를 확인하고 있습니다.','중복 신청을 피하기 위해 새로 제출하지 마시고, 아래 버튼으로 확인하거나 전화로 문의해 주세요.');recheck.hidden=false;loading(false);}}
form.addEventListener('submit',async ev=>{ev.preventDefault();if(busy)return;if(!validEndpoint){message('error','접수 연결을 확인해 주세요.','전화로 먼저 문의해 주세요.');return;}if(!form.reportValidity())return;
 const f=new FormData(form),g=String(f.get('guardian')||'').trim(),child=String(f.get('childName')||'').trim(),phone=String(f.get('phone')||'').replace(/\D/g,''),months=Number(f.get('months')),method=String(f.get('contactMethod')||'');
 if(g.length<2||!child||!/^0[0-9]{8,10}$/.test(phone)||months<7||months>48||!Number.isInteger(months)||!['문자','전화'].includes(method)){message('error','입력한 내용을 확인해 주세요.','성함·연락처·월령·연락 방법을 다시 확인해 주세요.');return;}
 rid=makeRid();receipt='';loading(true);message('pending','신청서를 전달하고 있습니다.','스프레드시트 저장 여부를 확인한 뒤 결과를 안내해 드립니다.');
 const data=new URLSearchParams({source:'bridgewonder-v10-registration',rid,guardian:g,phone,childName:child,months:String(months),program:String(f.get('program')||''),startPreference:String(f.get('startPreference')||''),contactMethod:method,consent:'yes',legalGuardian:'yes',notice:'yes',marketing:f.get('marketing')?'yes':'no',website:String(f.get('website')||'')});
 fetch(api,{method:'POST',mode:'no-cors',credentials:'omit',referrerPolicy:'no-referrer',body:data}).catch(()=>{});await sleep(800);await verify();
});
recheck.addEventListener('click',()=>{if(!rid||busy)return;loading(true);verify();});
// Browser-native print-to-PDF. Do not send personal information to a PDF vendor.
form.querySelector('#reg-print').addEventListener('click',()=>{
 const f=new FormData(form),escape=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fields=[['보호자 성함',f.get('guardian')],['연락처',f.get('phone')],['아이 이름',f.get('childName')],['아이 월령',f.get('months')?f.get('months')+'개월':''],['희망 과정',f.get('program')],['시작 희망 시기',f.get('startPreference')],['연락 방법',f.get('contactMethod')]];
 const win=window.open('','_blank','width=820,height=850');if(!win){message('error','팝업 차단을 해제해 주세요.','PDF 저장/인쇄를 위해 이 사이트의 새 창을 허용해 주세요.');return;}
 try{win.opener=null;}catch(_){}
 const rows=fields.map(([k,v])=>'<tr><th>'+escape(k)+'</th><td>'+escape(v)+'</td></tr>').join('');
 const html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Bridge Wonder 신청 내용</title><style>body{font-family:Arial,"Malgun Gothic",sans-serif;padding:36px;color:#34432f}h1{font-size:26px}small{color:#64715e}table{border-collapse:collapse;width:100%;margin:22px 0}th,td{text-align:left;border-bottom:1px solid #d9dfd0;padding:13px}th{width:31%;background:#f4f5ed}p{line-height:1.8}@media print{button{display:none}body{padding:0}}</style></head><body><h1>Bridge Wonder · 등록 신청 내용</h1><small>개인 보관용 · 신청 확인서(수강 확정증 및 결제 영수증이 아닙니다)</small><table>'+rows+'</table><p>접수번호: '+escape(receipt||'접수번호 미확인 — 제출 후 확인해 주세요')+'</p><p>신청 내용은 담당자 검토 후 확정됩니다. 실제 수강료, 환불 조건, 안전 안내는 별도 확인이 필요합니다.</p><button onclick="window.print()">PDF로 저장 / 인쇄</button></body></html>';
 win.document.open();win.document.write(html);win.document.close();win.focus();
});
if(!validEndpoint){submit.disabled=true;message('error','온라인 접수 준비 중','전화 010-2693-2471로 문의해 주세요.');}
})();
