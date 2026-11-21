/* Bridge Wonder V45 · 수업안 파일 자료실
 * Staff-only progressive module. No public storage, Drive URLs, extra APIs or PII.
 * Existing 'themes' route and its server permission are retained.
 */
(function(global){
  'use strict';
  const AGE=['전체(7~48개월)','7~12개월','13~18개월','19~24개월','25~35개월','36~48개월'];
  const MAX=5*1024*1024;
  const ACCEPT='.pdf,.docx,.xlsx,.pptx,.hwp,.hwpx,.png,.jpg,.jpeg,.txt,.csv';
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
  const byId=id=>document.getElementById(id);
  const formatSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(n/1024))+' KB';
  let runId=0;
  function style(){
    if(byId('bw45Style'))return;
    const sheet=document.createElement('style');sheet.id='bw45Style';
    sheet.textContent=[
      '#workspace .bw45-library{border:1px solid #dfe6da;background:#fffdfa;border-radius:12px;padding:clamp(14px,2vw,22px);margin:0 0 22px;}',
      '#workspace .bw45-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:13px;}',
      '#workspace .bw45-header h3{margin:0;font-size:17px;letter-spacing:-.035em;color:#40543a;}',
      '#workspace .bw45-header p{font-size:12px;color:#72806d;margin:6px 0 0;line-height:1.7;}',
      '#workspace .bw45-upload{padding:14px;background:#fbf8f2;border:1px solid #e5e6dc;border-radius:9px;margin-bottom:15px;}',
      '#workspace .bw45-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
      '#workspace .bw45-grid label{min-width:0;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#435d43;}',
      '#workspace .bw45-grid label.bw45-full{grid-column:1/-1;}',
      '#workspace .bw45-grid input,#workspace .bw45-grid select,#workspace .bw45-grid textarea{width:100%;min-width:0;border:1px solid #d7ddcf;background:#fff;border-radius:7px;padding:9px;color:#40543a;font:inherit;}',
      '#workspace .bw45-grid input[type=file]{background:#fff;padding:10px;}',
      '#workspace .bw45-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px;}',
      '#workspace .bw45-actions button{min-height:34px;}',
      '#workspace .bw45-msg{margin-top:8px;font-size:12px;line-height:1.65;color:#596d55;}',
      '#workspace .bw45-message-error{color:#995337;}',
      '#workspace .bw45-progress{height:6px;border-radius:5px;background:#e6ebe0;overflow:hidden;margin:12px 0 3px;}',
      '#workspace .bw45-progress-fill{height:100%;width:0;background:#99a682;transition:width .16s;}',
      '#workspace .bw45-toolbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:12px 0;}',
      '#workspace .bw45-toolbar input{flex:1 1 200px;min-width:0;}',
      '#workspace .bw45-toolbar select{min-width:115px;}',
      '#workspace .bw45-toolbar input,#workspace .bw45-toolbar select{border:1px solid #d7ddcf;border-radius:7px;padding:9px;font-size:12px;background:#fff;}',
      '#workspace .bw45-items{display:grid;gap:9px;}',
      '#workspace .bw45-item{border:1px solid #e5e9e1;border-radius:9px;padding:13px 14px;background:#fff;}',
      '#workspace .bw45-item-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;}',
      '#workspace .bw45-item-head strong{font-size:13px;color:#40543a;overflow-wrap:anywhere;}',
      '#workspace .bw45-meta{font-size:11px;color:#728071;line-height:1.7;margin-top:5px;overflow-wrap:anywhere;}',
      '#workspace .bw45-tag{display:inline-flex;background:#eff3e9;color:#526b4c;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;}',
      '#workspace .bw45-tag-archived{background:#f4f0ea;color:#846c5f;}',
      '#workspace .bw45-empty{padding:24px;text-align:center;background:#fbfaf7;border:1px dashed #d9dfd3;border-radius:8px;font-size:12px;color:#728071;}',
      '#workspace .bw45-note{font-size:11px;color:#74816f;line-height:1.75;margin:9px 0 0;word-break:keep-all;}',
      '#workspace .bw45-file{font-size:11px;color:#657864;line-height:1.6;word-break:break-all;}',
      '#workspace .bw45-edit{padding:11px;background:#fbf8f2;border-radius:9px;margin-top:11px;}',
      '#workspace .bw45-edit .bw45-grid{gap:10px;}',
      '#workspace .bw45-progress[hidden],#workspace .bw45-edit[hidden],#workspace .bw45-upload[hidden]{display:none!important;}',
      '@media(max-width:620px){#workspace .bw45-grid{grid-template-columns:minmax(0,1fr);}#workspace .bw45-grid label.bw45-full{grid-column:1;}#workspace .bw45-library{margin-bottom:16px;}#workspace .bw45-toolbar input{flex:1 1 100%;}}'
    ].join('\n');
    document.head.appendChild(sheet);
  }
  function toBase64(buffer){
    const b=new Uint8Array(buffer);let binary='';
    for(let i=0;i<b.length;i+=8192)binary+=String.fromCharCode(...b.subarray(i,i+8192));
    return btoa(binary);
  }
  function fromBase64(src){
    const binary=atob(src),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }
  function newRequestId(){
    if(global.crypto?.randomUUID)return global.crypto.randomUUID();
    const b=new Uint8Array(16);global.crypto.getRandomValues(b);
    b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;
    const s=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);
  }
  function safeTitle(file){return String(file?.name||'').replace(/\.[^.]+$/,'').slice(0,90);}
  function ageOptions(value){
    return AGE.map(x=>'<option value="'+escapeHTML(x)+'"'+(x===value?' selected':'')+'>'+escapeHTML(x)+'</option>').join('');
  }
  function renderItems(root,items,versions,ctx){
    const q=(byId('bw45Search')?.value||'').trim().toLowerCase(),status=byId('bw45Status')?.value||'사용';
    const visible=items.filter(item=>(status==='전체'||item.status===status)&&
      [item.title,item.filename,item.month,item.age,item.note].join(' ').toLowerCase().includes(q));
    root.innerHTML=visible.length?visible.map(item=>{
      const all=versions.filter(x=>x.id===item.id).sort((a,b)=>b.version-a.version);
      const versionChoices=all.map(v=>'<option value="'+v.version+'">v'+v.version+' · '+escapeHTML(v.filename)+'</option>').join('');
      return '<article class="bw45-item" data-bw45item="'+escapeHTML(item.id)+'">'+
        '<div class="bw45-item-head"><div><strong>'+escapeHTML(item.title)+'</strong>'+
        '<div class="bw45-meta">'+escapeHTML(item.age||'전체(7~48개월)')+(item.month?' · '+escapeHTML(item.month):'')+' · v'+item.version+' · '+formatSize(item.size)+'</div></div>'+
        '<span class="bw45-tag'+(item.status==='보관'?' bw45-tag-archived':'')+'">'+escapeHTML(item.status)+'</span></div>'+
        '<div class="bw45-file">'+escapeHTML(item.filename)+'</div>'+
        (item.note?'<p class="bw45-note">'+escapeHTML(item.note)+'</p>':'')+
        '<div class="bw45-actions"><label style="font-size:11px;color:#60755d;">버전 <select aria-label="다운로드 버전" data-bw45version="'+escapeHTML(item.id)+'">'+versionChoices+'</select></label>'+
        '<button type="button" class="btn btn-outline btn-small" data-bw45download="'+escapeHTML(item.id)+'">다운로드</button>'+
        (ctx.canEdit?'<button type="button" class="btn btn-outline btn-small" data-bw45revise="'+escapeHTML(item.id)+'">수정본 등록</button>'+
        '<button type="button" class="btn btn-outline btn-small" data-bw45edit="'+escapeHTML(item.id)+'">정보 수정</button>'+
        '<button type="button" class="btn btn-outline btn-small" data-bw45archive="'+escapeHTML(item.id)+'">'+(item.status==='보관'?'다시 사용':'보관하기')+'</button>':'')+'</div>'+
        (ctx.canEdit?'<form class="bw45-edit" data-bw45editform="'+escapeHTML(item.id)+'" hidden><div class="bw45-grid">'+
          '<label>제목<input name="title" required maxlength="90" value="'+escapeHTML(item.title)+'"></label>'+
          '<label>적용 월 (선택)<input name="month" type="month" value="'+escapeHTML(item.month)+'"></label>'+
          '<label>대상 월령<select name="age">'+ageOptions(item.age)+'</select></label>'+
          '<label>관리 메모 (선택)<input name="note" maxlength="300" value="'+escapeHTML(item.note)+'"></label>'+
          '</div><div class="bw45-actions"><button type="submit" class="btn btn-primary btn-small">수정 내용 저장</button><button type="button" class="btn btn-outline btn-small" data-bw45editcancel>취소</button></div></form>':'')+'</article>';
    }).join(''):'<div class="bw45-empty">조건에 맞는 수업안이 없습니다.</div>';
    root.querySelectorAll('[data-bw45download]').forEach(btn=>btn.onclick=()=>ctx.download(btn.dataset.bw45download,Number(root.querySelector('[data-bw45version="'+btn.dataset.bw45download+'"]')?.value||1),btn));
    root.querySelectorAll('[data-bw45revise]').forEach(btn=>btn.onclick=()=>{
      const x=items.find(t=>t.id===btn.dataset.bw45revise);if(!x)return;
      byId('bw45Replace').value=x.id;byId('bw45Title').value=x.title;byId('bw45Month').value=x.month||'';
      byId('bw45Age').value=x.age||AGE[0];byId('bw45Note').value=x.note||'';
      byId('bw45File').value='';byId('bw45Upload')?.scrollIntoView?.({behavior:'smooth',block:'center'});
      byId('bw45File').focus();
      byId('bw45Message').textContent='수정할 파일을 선택해 주세요. 이전 버전도 계속 보관됩니다.';
    });
    root.querySelectorAll('[data-bw45edit]').forEach(btn=>btn.onclick=()=>{
      const form=root.querySelector('[data-bw45editform="'+btn.dataset.bw45edit+'"]');if(form){form.hidden=false;form.querySelector('input')?.focus();}
    });
    root.querySelectorAll('[data-bw45editcancel]').forEach(btn=>btn.onclick=btn.closest('form').hidden=true);
    root.querySelectorAll('[data-bw45editform]').forEach(form=>form.onsubmit=e=>{
      e.preventDefault();ctx.update(form.dataset.bw45editform,{title:form.elements.title.value,month:form.elements.month.value,
        age:form.elements.age.value,note:form.elements.note.value},form.querySelector('button[type=submit]'));
    });
    root.querySelectorAll('[data-bw45archive]').forEach(btn=>btn.onclick=()=>ctx.archive(btn.dataset.bw45archive,btn));
  }
  function mount(options){
    const area=options?.root,token=options?.token,call=options?.call,isCurrent=options?.isCurrent;
    if(!area||typeof token!=='string'||typeof call!=='function'||typeof isCurrent!=='function'||!isCurrent())return;
    const instance=++runId;style();
    const canEdit=options.canEdit===true;
    const host=document.createElement('section');host.className='bw45-library';host.id='bw45LessonPlans';
    host.innerHTML='<div class="bw45-header"><div><h3>수업안 파일</h3>'+
      '<p>양식을 정하지 않아도 파일을 올려 둘 수 있습니다. 나중에 수정본을 올리면 이전 파일도 남습니다.</p></div>'+
      '<button type="button" class="btn btn-outline btn-small" id="bw45Reload">새로고침</button></div>'+
      (canEdit?'<form class="bw45-upload" id="bw45Upload" autocomplete="off"><div class="bw45-grid">'+
        '<label class="bw45-full">수업안 파일 <input type="file" id="bw45File" accept="'+ACCEPT+'" required></label>'+
        '<label>기존 파일의 수정본 (선택)<select id="bw45Replace"><option value="">새 수업안</option></select></label>'+
        '<label>제목 (선택)<input id="bw45Title" maxlength="90" placeholder="비워 두면 파일 이름을 사용합니다"></label>'+
        '<label>적용 월 (선택)<input type="month" id="bw45Month"></label>'+
        '<label>대상 월령<select id="bw45Age">'+ageOptions(AGE[0])+'</select></label>'+
        '<label class="bw45-full">관리 메모 (선택)<textarea id="bw45Note" rows="2" maxlength="300" placeholder="활동 주제나 준비사항을 짧게 적어 주세요"></textarea></label>'+
        '</div><div class="bw45-actions"><button type="submit" class="btn btn-primary" id="bw45Save">파일 올리기</button>'+
        '<small>PDF·워드·엑셀·PPT·한글·이미지·텍스트 / 최대 5MB</small></div>'+
        '<div class="bw45-progress" id="bw45Progress" hidden><div class="bw45-progress-fill" id="bw45Bar"></div></div>'+
        '<div class="bw45-msg" id="bw45Message" role="status" aria-live="polite"></div></form>':'')+
      '<div class="bw45-toolbar"><input type="search" id="bw45Search" aria-label="수업안 검색" placeholder="제목·파일명·월령 검색">'+
      '<select id="bw45Status" aria-label="보관 상태"><option value="사용">사용 중</option><option value="보관">보관됨</option><option value="전체">전체</option></select>'+
      '<span class="bw45-msg" id="bw45Count"></span></div><div id="bw45List" class="bw45-items"><div class="bw45-empty">수업안 목록을 불러오는 중입니다.</div></div>'+
      '<p class="bw45-note">직원용 수업 자료만 올려 주세요. 아이 이름·보호자 연락처·건강정보가 포함된 파일은 등록하지 않습니다. 파일은 비공개 자료실에 저장되며 외부에 공개되지 않습니다.</p>';
    const firstMonthly=area.querySelector('.panel');
    if(firstMonthly)firstMonthly.before(host);else area.appendChild(host);
    const valid=()=>isCurrent()&&instance===runId&&host.isConnected;
    let items=[],versions=[],loading=false,uploading=false;
    const message=(s,error=false)=>{
      const elem=byId('bw45Message');if(elem){elem.textContent=s;elem.classList.toggle('bw45-message-error',error);}
      if(error)options.toast?.(s,true);
    };
    async function load(){
      if(loading)return;loading=true;
      const reload=byId('bw45Reload');if(reload)reload.disabled=true;
      try{
        const response=await call('staff45ListLessonPlans',token);
        if(!valid())return;
        items=Array.isArray(response.items)?response.items:[];versions=Array.isArray(response.versions)?response.versions:[];
        byId('bw45Count').textContent=items.length+'개 수업안';
        if(canEdit){
          const old=byId('bw45Replace').value;
          byId('bw45Replace').innerHTML='<option value="">새 수업안</option>'+
            items.filter(x=>x.status==='사용').map(x=>'<option value="'+escapeHTML(x.id)+'">'+escapeHTML(x.title)+' · v'+x.version+'</option>').join('');
          if(items.some(x=>x.id===old&&x.status==='사용'))byId('bw45Replace').value=old;
        }
        draw();
      }catch(e){
        if(!valid())return;
        const txt=String(e?.message||e);
        byId('bw45List').innerHTML='<div class="bw45-empty">'+
          (/허용되지 않은 업무 요청|지원하지 않는 업무 요청|Script function not found|is not a function|unknown method/i.test(txt)
            ?'수업안 자료실을 사용하려면 직원용 관리 서버를 업데이트해야 합니다. 기존 수업 계획은 그대로 이용할 수 있습니다.'
            :'목록을 불러오지 못했습니다. 새로고침해서 다시 확인해 주세요.')+'</div>';
        byId('bw45Count').textContent='목록 확인 필요';
      }finally{loading=false;if(valid()&&reload)reload.disabled=false;}
    }
    function draw(){
      if(!valid())return;
      renderItems(byId('bw45List'),items,versions,{
        canEdit,
        download:async(id,version,btn)=>{
          btn.disabled=true;
          try{
            const result=await call('staff45DownloadLessonPlan',token,{planId:id,version});
            if(!valid())return;
            const bytes=fromBase64(result.base64),blob=new Blob([bytes],{type:result.mime||'application/octet-stream'});
            const url=URL.createObjectURL(blob),a=document.createElement('a');
            a.href=url;a.download=result.filename||'lesson-plan';document.body.appendChild(a);a.click();a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),30000);
          }catch(e){if(valid())message(e.message||'다운로드하지 못했습니다.',true);}
          finally{if(btn.isConnected)btn.disabled=false;}
        },
        archive:async(id,btn)=>{
          if(!canEdit)return;
          const current=items.find(x=>x.id===id);
          if(!current)return;
          const archived=current.status!=='보관';
          if(!global.confirm((archived?'수업안을 보관할까요?':'수업안을 다시 사용할까요?')+'\n기존 파일은 삭제되지 않습니다.'))return;
          btn.disabled=true;
          try{await call('staff45ArchiveLessonPlan',token,{planId:id,archived});if(valid())await load();}
          catch(e){if(valid())message(e.message||'상태를 바꾸지 못했습니다.',true);}
          finally{if(btn.isConnected)btn.disabled=false;}
        },
        update:async(id,data,btn)=>{
          if(!canEdit)return;btn.disabled=true;
          try{await call('staff45UpdateLessonPlan',token,{planId:id,...data});if(valid())await load();}
          catch(e){if(valid())message(e.message||'수정 내용을 저장하지 못했습니다.',true);}
          finally{if(btn.isConnected)btn.disabled=false;}
        }
      });
    }
    byId('bw45Reload').onclick=load;
    byId('bw45Search').oninput=draw;byId('bw45Status').onchange=draw;
    if(canEdit){
      byId('bw45File').onchange=()=>{
        const file=byId('bw45File').files[0];if(file&&!byId('bw45Title').value.trim())byId('bw45Title').value=safeTitle(file);
      };
      byId('bw45Replace').onchange=()=>{
        const id=byId('bw45Replace').value,x=items.find(item=>item.id===id);
        if(!x)return;
        byId('bw45Title').value=x.title;byId('bw45Month').value=x.month||'';byId('bw45Age').value=x.age||AGE[0];byId('bw45Note').value=x.note||'';
      };
      byId('bw45Upload').onsubmit=async event=>{
        event.preventDefault();
        if(uploading)return;
        const file=byId('bw45File').files[0];
        if(!file)return message('올릴 파일을 선택해 주세요.',true);
        const extension=file.name.split('.').pop().toLowerCase();
        if(!ACCEPT.split(',').includes('.'+extension))return message('지원하지 않는 파일 형식입니다.',true);
        if(file.size<1||file.size>MAX)return message('파일은 5MB 이하로 올려 주세요.',true);
        const btn=byId('bw45Save'),bar=byId('bw45Bar'),progress=byId('bw45Progress'),form=byId('bw45Upload');
        const meta={filename:file.name,size:file.size,title:byId('bw45Title').value.trim(),
          month:byId('bw45Month').value,age:byId('bw45Age').value,
          note:byId('bw45Note').value,planId:byId('bw45Replace').value,requestId:newRequestId()};
        uploading=true;btn.disabled=true;form.querySelectorAll('input,select,textarea').forEach(n=>n.disabled=true);
        progress.hidden=false;bar.style.width='0%';message('파일 업로드를 시작합니다.');
        try{
          const started=await call('staff45BeginLessonPlan',token,meta);
          if(!valid())throw Error('화면을 벗어나 업로드를 중단했습니다.');
          const CHUNK=started.chunkBytes||180*1024,count=Math.ceil(file.size/CHUNK);
          for(let index=started.nextIndex||0;index<count;index++){
            if(!valid())throw Error('화면이 변경되어 업로드를 중단했습니다.');
            const b=await file.slice(index*CHUNK,Math.min((index+1)*CHUNK,file.size)).arrayBuffer();
            const params={uploadId:started.uploadId,index,base64:toBase64(b)};
            let result;
            try{result=await call('staff45AppendLessonPlanChunk',token,params);}
            catch(e){
              if(!/응답이 늦|internet|연결하지 못|NetworkError|Failed to fetch/i.test(e?.message||''))throw e;
              result=await call('staff45AppendLessonPlanChunk',token,params);
            }
            if(!valid())throw Error('화면이 변경되어 업로드를 중단했습니다.');
            const percent=Math.round(100*(result.uploaded||0)/file.size);
            bar.style.width=percent+'%';message('파일을 올리는 중입니다. '+percent+'%');
          }
          const finished=await call('staff45FinishLessonPlan',token,started.uploadId);
          if(!valid())return;
          message('수업안을 저장했습니다. '+(finished.plan?.title||''));
          form.reset();byId('bw45Replace').value='';bar.style.width='100%';await load();
        }catch(e){if(valid())message(e?.message||'업로드를 마치지 못했습니다.',true);}
        finally{
          uploading=false;
          if(valid()){
            btn.disabled=false;form.querySelectorAll('input,select,textarea').forEach(n=>n.disabled=false);
            setTimeout(()=>{if(valid())progress.hidden=true;},2500);
          }
        }
      };
    }
    load();
    return {reload:load};
  }
  global.BW45LessonPlans=Object.freeze({mount});
})(window);
