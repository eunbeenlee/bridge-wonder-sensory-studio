/* Bridge Wonder V30 · one-time credential issuance and self-service password change.
 * No private keys/passwords are ever persisted by this public GitHub script.
 * Roles and authentication are enforced by Google Apps Script on every RPC.
 */
(function (global) {
  'use strict';
  let context=null,dialog=null,configured=false;
  const $=id=>document.getElementById(id);
  const failure=e=>String(e&&e.message||e||'요청을 처리할 수 없습니다.');
  function requireCrypto(){
    if(!global.BW29KDF||!global.BW29KDF.available()||!global.crypto?.getRandomValues)
      throw Error('이 기능은 HTTPS와 최신 브라우저의 보안 암호화 기능이 필요합니다.');
  }
  function makeTemporaryPassword(){
    requireCrypto();
    // Rejection sampling avoids bias. No Math.random, storage, console or URL.
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const limit=256-(256%alphabet.length);
    let out='';
    while(out.length<20){
      const batch=new Uint8Array(32);
      global.crypto.getRandomValues(batch);
      for(const value of batch){
        if(value<limit)out+=alphabet[value%alphabet.length];
        if(out.length===20)break;
      }
    }
    return out;
  }
  function removeDialog(){
    if(dialog){dialog.remove();dialog=null;}
  }
  function makeDialog(title,description,forced){
    removeDialog();
    const overlay=document.createElement('div');
    overlay.className='bw30-shade';
    const card=document.createElement('section');
    card.className='bw30-dialog';card.setAttribute('role','dialog');
    card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);
    const heading=document.createElement('h2');
    heading.textContent=title;heading.className='bw30-title';card.appendChild(heading);
    const intro=document.createElement('p');
    intro.textContent=description;intro.className='bw30-help';card.appendChild(intro);
    overlay.appendChild(card);document.body.appendChild(overlay);
    dialog=overlay;
    if(!forced){
      overlay.addEventListener('click',e=>{if(e.target===overlay)removeDialog();});
      const onKey=e=>{if(e.key==='Escape'&&dialog===overlay){removeDialog();document.removeEventListener('keydown',onKey);}};
      document.addEventListener('keydown',onKey);
    }
    return card;
  }
  function field(form,label,type,autocomplete,minLength){
    const wrap=document.createElement('label');wrap.className='bw30-field';
    const caption=document.createElement('span');caption.textContent=label;
    const input=document.createElement('input');input.type=type;input.required=true;
    input.autocomplete=autocomplete||'off';input.maxLength=100;
    if(minLength)input.minLength=minLength;
    wrap.appendChild(caption);wrap.appendChild(input);form.appendChild(wrap);
    return input;
  }
  function message(form){const p=document.createElement('p');p.className='bw30-message';p.setAttribute('role','status');form.appendChild(p);return p;}
  function action(label,form,kind){
    const b=document.createElement('button');b.type=kind||'button';b.textContent=label;b.className='btn btn-'+(kind==='submit'?'primary':'outline');form.appendChild(b);return b;
  }
  function configure(options){
    if(configured)return;
    if(!options||typeof options.call!=='function'||!options.state||typeof options.logout!=='function')
      throw Error('계정 관리 연결을 초기화할 수 없습니다.');
    configured=true;context=options;
    const attach=(parentId,where)=>{
      const parent=$(parentId);if(!parent)return;
      const btn=document.createElement('button');
      btn.type='button';btn.textContent='비밀번호 변경';
      btn.className='btn btn-outline btn-small bw30-account-btn';
      btn.addEventListener('click',()=>openChange(false));
      if(where==='before')parent.parentNode.insertBefore(btn,parent);
      else parent.parentNode.insertBefore(btn,parent.nextSibling);
    };
    attach('logoutBtn','before');
    attach('logoutMobile','before');
    const style=document.createElement('style');
    style.textContent='.bw30-shade{position:fixed;z-index:3000;inset:0;display:grid;place-items:center;padding:15px;background:#17221cb8;overflow-y:auto}.bw30-dialog{width:min(100%,460px);border-radius:16px;border:1px solid #e4dece;background:#fffcf6;color:#40543a;box-shadow:0 20px 75px #10190b60;padding:24px;box-sizing:border-box}.bw30-title{font-size:21px;margin:0 0 10px}.bw30-help{font-size:13px;line-height:1.7;margin:0 0 19px}.bw30-field{display:block;margin:12px 0;font-size:13px;font-weight:600}.bw30-field span{display:block;margin-bottom:6px}.bw30-field input{width:100%;box-sizing:border-box;min-height:43px;padding:8px 12px;border-radius:8px;border:1px solid #c7d0c2;background:white;color:#263923;font:inherit}.bw30-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.bw30-message{font-size:12px;min-height:1.4em;color:#914630}.bw30-secret{display:block;border-radius:8px;margin:12px 0;padding:16px;background:#edf1e8;font:600 19px ui-monospace,monospace;letter-spacing:1px;overflow-wrap:anywhere;user-select:all}.bw30-account-btn{margin:5px 0}.bw30-issue{margin-left:5px}@media(max-width:600px){.bw30-dialog{padding:18px}.bw30-secret{font-size:16px}}';
    document.head.appendChild(style);
  }
  function openChange(forced){
    if(!context?.state?.token||!context.state.user)return;
    const email=context.state.user.email;
    const card=makeDialog(forced?'새 비밀번호 설정':'내 비밀번호 변경',
      forced?'임시 비밀번호로 로그인했습니다. 사용할 비밀번호를 새로 설정해 주세요.':'현재 비밀번호를 입력하고 새 비밀번호를 설정하세요. 변경 후에는 다시 로그인해야 합니다.',!!forced);
    const f=document.createElement('form');f.autocomplete='off';
    const current=field(f,'현재 비밀번호','password','current-password',12);
    const next=field(f,'새 비밀번호 (12자 이상)','password','new-password',12);
    const check=field(f,'새 비밀번호 확인','password','new-password',12);
    const status=message(f),controls=document.createElement('div');controls.className='bw30-actions';
    const save=action('비밀번호 변경',controls,'submit');
    const close=action(forced?'로그아웃':'취소',controls,'button');
    close.onclick=()=>{if(forced)context.logout();removeDialog();};
    f.appendChild(controls);
    f.onsubmit=async ev=>{
      ev.preventDefault();save.disabled=true;status.textContent='비밀번호를 변경하고 있습니다…';
      try{
        requireCrypto();
        if(next.value!==check.value)throw Error('새 비밀번호가 일치하지 않습니다.');
        if(next.value===current.value)throw Error('기존 비밀번호와 다른 비밀번호를 사용해 주세요.');
        const proofs=await Promise.all([global.BW29KDF.derive(email,current.value),global.BW29KDF.derive(email,next.value)]);
        const response=await context.call('staff30ChangeOwnPassword',context.state.token,{
          currentPassword:current.value,currentProof:proofs[0],newPassword:next.value,newProof:proofs[1]
        });
        current.value='';next.value='';check.value='';
        removeDialog();await context.logout();
        $('loginFeedback').textContent=response.message||'새 비밀번호로 다시 로그인해 주세요.';
      }catch(e){status.textContent=failure(e);save.disabled=false;}
    };
    card.appendChild(f);current.focus();
  }
  function showTemporary(email,password){
    const card=makeDialog('직원 임시 비밀번호 발급 완료',
      '임시 비밀번호는 이 화면에서 한 번만 확인할 수 있습니다. 직원에게 개별 전달하고 첫 로그인 시 변경하도록 안내해 주세요.',true);
    const id=document.createElement('p');id.textContent='로그인 이메일: '+email;card.appendChild(id);
    const secret=document.createElement('code');secret.className='bw30-secret';secret.textContent=password;card.appendChild(secret);
    const status=document.createElement('p');status.className='bw30-help';
    status.textContent='이 창을 닫으면 임시 비밀번호를 다시 볼 수 없습니다. 필요하면 새로 발급해 주세요.';card.appendChild(status);
    const controls=document.createElement('div');controls.className='bw30-actions';card.appendChild(controls);
    const copy=action('임시 비밀번호 복사',controls,'button');
    const done=action('확인하고 닫기',controls,'button');
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(password);status.textContent='클립보드에 복사했습니다. 사용 후 클립보드 내용을 지워 주세요.';}catch(_){status.textContent='복사가 차단되었습니다. 표시된 비밀번호를 직접 복사해 주세요.';}};
    done.onclick=removeDialog;
    copy.focus();
  }
  async function issue(email,button){
    if(!context?.state?.user||context.state.user.role!=='owner')return;
    if(!global.confirm(email+' 직원의 임시 비밀번호를 새로 발급할까요?\n기존 비밀번호와 모든 로그인 세션은 즉시 무효화됩니다.'))return;
    button.disabled=true;let password='';
    try{
      requireCrypto();password=makeTemporaryPassword();
      const proof=await global.BW29KDF.derive(email,password);
      await context.call('staff30IssueTemporaryPassword',context.state.token,{email,proof});
      showTemporary(email,password);
      password='';
    }catch(e){context.toast(failure(e),true);}
    finally{button.disabled=false;}
  }
  function mountUsers(){
    if(!context||context.state.user?.role!=='owner'||context.state.page!=='users')return;
    const root=$('pageBody');if(!root)return;
    root.querySelectorAll('[data-edit-user]').forEach(edit=>{
      if(edit.nextElementSibling?.classList.contains('bw30-issue'))return;
      const email=edit.dataset.editUser;
      const b=document.createElement('button');b.type='button';
      b.className='btn btn-outline btn-small bw30-issue';
      b.textContent='임시 비밀번호 발급';
      b.onclick=()=>issue(email,b);
      edit.after(b);
    });
    const form=$('userForm');
    if(form&&!$('bw30-user-note')){
      const note=document.createElement('p');note.id='bw30-user-note';note.className='help';
      note.textContent='계정을 저장한 후 직원 목록에서 임시 비밀번호를 발급하세요. 기존 직원의 비밀번호도 재발급할 수 있습니다.';
      form.appendChild(note);
    }
  }
  global.BW30Accounts=Object.freeze({configure,openChange,mountUsers});
})(window);
