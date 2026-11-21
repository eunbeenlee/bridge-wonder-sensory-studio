/* Bridge Wonder V45 — lesson-plan library for existing authorized Themes page.
 * No fixed plan template, no browser storage, no public Drive links.
 * File bytes are sent only to the existing authenticated staff Apps Script backend.
 */
(function(global){
  'use strict';
  const MAX_BYTES=8*1024*1024;
  const AGE=['전체','7~12개월','13~18개월','19~24개월','25~35개월','36~48개월'];
  const ACCEPT='.pdf,.docx,.xlsx,.pptx,.hwp,.hwpx,.doc,.xls,.ppt,.txt,.png,.jpg,.jpeg,.webp';
  const $=(root,selector)=>root.querySelector(selector);
  const safe=x=>String(x==null?'':x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
  const errText=e=>String(e&&e.message||e||'작업을 완료하지 못했습니다.');
  const options=(values,selected)=>values.map(value=>'<option value="'+safe(value)+'"'+(value===selected?' selected':'')+'>'+safe(value)+'</option>').join('');
  const sizeText=bytes=>bytes>=1048576?(bytes/1048576).toFixed(1)+'MB':Math.max(1,Math.ceil(bytes/1024))+'KB';
  function fileChunk(file,start,end) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const raw=String(reader.result||'');
        const comma=raw.indexOf(',');
        if(comma<0||!/^data:/.test(raw))reject(Error('파일을 읽지 못했습니다.'));
        else resolve(raw.slice(comma+1));
      };
      reader.onerror=()=>reject(Error('파일을 읽는 중 오류가 발생했습니다.'));
      reader.readAsDataURL(file.slice(start,end));
    });
  }
  async function mount(host,context) {
    if(!host||!context||typeof context.call!=='function'||typeof context.isCurrent!=='function')return;
    if(host.dataset.bw45Mounted)return;
    host.dataset.bw45Mounted='1';
    const editable=Boolean(context.canEdit),email=String(context.email||'');
    let records=[],busy=false,cancelled=false,pendingId='',editId='',available=false;
    host.innerHTML=
      '<div class="bw45-head"><div><h3>수업안 자료실</h3><p>수업안 양식은 자유롭게 사용하셔도 됩니다. 파일을 올린 뒤 제목과 적용 월, 월령만 적어 관리하세요. 올린 자료는 먼저 비공개로 보관됩니다.</p></div><span class="bw45-badge">직원 전용</span></div>'+
      '<div class="bw45-error" id="bw45Notice" role="status" hidden></div>'+
      (editable?
        '<section class="bw45-upload"><h4>새 수업안 올리기</h4><p>PDF·워드·엑셀·PPT·한글·이미지·TXT 파일을 지원합니다. 8MB 이하 파일을 선택해 주세요.</p>'+
        '<form id="bw45UploadForm" class="bw45-grid">'+
        '<label class="bw45-field wide"><span>파일 선택</span><input id="bw45File" type="file" accept="'+ACCEPT+'" required></label>'+
        '<label class="bw45-field wide"><span>수업안 제목</span><input name="title" maxlength="100" required placeholder="예: 봄꽃 오감놀이"></label>'+
        '<label class="bw45-field"><span>적용 월 (선택)</span><input type="month" name="month"></label>'+
        '<label class="bw45-field"><span>대상 월령</span><select name="age">'+options(AGE,'전체')+'</select></label>'+
        '<label class="bw45-field wide"><span>메모 (선택)</span><textarea name="note" rows="2" maxlength="300" placeholder="필요한 재료나 준비사항만 간단히 적어 주세요."></textarea></label>'+
        '<div class="bw45-field wide"><div class="bw45-actions"><button class="btn btn-primary" id="bw45UploadButton" type="submit" disabled>수업안 업로드</button>'+
        '<button class="btn btn-outline" id="bw45CancelButton" type="button" disabled>업로드 중지</button><span class="bw45-feedback" id="bw45UploadFeedback" role="status"></span></div>'+
        '<progress id="bw45Progress" class="bw45-progress" max="100" value="0" aria-label="업로드 진행률" aria-busy="false"></progress>'+
        '<p class="bw45-note">아동 이름·보호자 연락처·건강정보가 포함된 파일은 올리지 마세요. 선생님에게 보여 주려면 업로드 후 공유 상태를 바꿔 주세요.</p></div>'+
        '</form></section>':
        '<p class="bw45-inline-guidance">담당자에게 공유받은 수업안만 표시됩니다. 파일을 보려면 다운로드를 선택하세요.</p>')+
      '<div class="bw45-controls"><input type="search" id="bw45Search" placeholder="제목·파일명·내용 메모 검색" aria-label="수업안 검색">'+
      '<select id="bw45AgeFilter" aria-label="월령별 보기"><option value="">모든 월령</option>'+options(AGE,'')+'</select>'+
      '<select id="bw45StatusFilter" aria-label="자료 공개 상태"><option value="">모든 자료</option>'+options(['비공개','공유','보관','업로드중'],'')+'</select>'+
      '<button class="btn btn-outline btn-small" id="bw45Reload" type="button">새로고침</button></div>'+
      '<div id="bw45Count" class="bw45-note" aria-live="polite"></div><div id="bw45Rows" class="bw45-docs" aria-live="polite">'+
      '<div class="bw45-empty">수업안 목록을 불러오는 중입니다.</div></div>';
    const show=(message,problem)=>{
      const el=$(host,'#bw45Notice');
      el.hidden=!message;
      el.textContent=message||'';
      el.style.borderColor=problem?'#e9d3bf':'#d9e5d2';
    };
    const good=()=>context.isCurrent()&&host.isConnected;
    const rowHTML=item=>{
      const privateState=item.visibility==='비공개';
      const statusClass=item.visibility==='보관'?'archived':privateState?'private':'';
      const actionable=editable&&item.visibility!=='보관'&&item.visibility!=='업로드중';
      const pending=item.visibility==='업로드중';
      const meta=[item.month||'월 미지정',item.age||'전체',sizeText(item.size),item.updated||''].filter(Boolean).map(safe).join(' · ');
      let inner='<article class="bw45-item"><div class="bw45-item-top"><h4>'+safe(item.title)+'</h4>'+
        '<span class="bw45-pill '+statusClass+'">'+safe(item.visibility)+'</span></div>'+
        '<div class="bw45-file">'+safe(item.fileName)+'</div><dl>'+meta+'</dl>'+
        (item.note?'<p class="bw45-note">'+safe(item.note)+'</p>':'')+
        '<div class="bw45-item-buttons">'+
        (!pending?'<button type="button" class="btn btn-outline btn-small" data-bw45-action="download" data-id="'+safe(item.id)+'">다운로드</button>':'')+
        (actionable?'<button type="button" class="btn btn-outline btn-small" data-bw45-action="edit" data-id="'+safe(item.id)+'">정보 수정</button>'+
          '<button type="button" class="btn btn-outline btn-small" data-bw45-action="archive" data-id="'+safe(item.id)+'">보관</button>':'')+
        (pending&&item.owner===email?'<button type="button" class="btn btn-outline btn-small" data-bw45-action="abort" data-id="'+safe(item.id)+'">미완료 정리</button>':'')+
        '</div>';
      if(editId===item.id&&actionable){
        inner+='<form class="bw45-edit" data-id="'+safe(item.id)+'"><div class="bw45-grid">'+
          '<label class="bw45-field wide"><span>제목</span><input name="title" maxlength="100" required value="'+safe(item.title)+'"></label>'+
          '<label class="bw45-field"><span>적용 월</span><input name="month" type="month" value="'+safe(item.month)+'"></label>'+
          '<label class="bw45-field"><span>대상 월령</span><select name="age">'+options(AGE,item.age)+'</select></label>'+
          '<label class="bw45-field"><span>공유 설정</span><select name="visibility">'+options(['비공개','공유'],item.visibility)+'</select></label>'+
          '<label class="bw45-field wide"><span>메모</span><textarea name="note" maxlength="300" rows="2">'+safe(item.note)+'</textarea></label></div>'+
          '<div class="bw45-actions"><button class="btn btn-primary btn-small" type="submit">변경 저장</button><button class="btn btn-outline btn-small" type="button" data-bw45-action="close" data-id="'+safe(item.id)+'">닫기</button></div></form>';
      }
      return inner+'</article>';
    };
    const draw=()=>{
      if(!good())return;
      const keyword=$(host,'#bw45Search').value.trim().toLowerCase();
      const age=$(host,'#bw45AgeFilter').value,status=$(host,'#bw45StatusFilter').value;
      const visible=records.filter(item=>
        (!keyword||[item.title,item.fileName,item.note,item.month].join(' ').toLowerCase().includes(keyword))&&
        (!age||item.age===age)&&(!status||item.visibility===status)
      );
      $(host,'#bw45Count').textContent='표시 '+visible.length+'건 / 전체 '+records.length+'건';
      $(host,'#bw45Rows').innerHTML=visible.length?visible.map(rowHTML).join(''):
        '<div class="bw45-empty">표시할 수업안이 없습니다. 검색 조건을 바꾸거나 새 수업안을 올려 주세요.</div>';
    };
    const refresh=async()=>{
      if(!good())return;
      try{
        const items=await context.call('staff45ListLessons',context.token);
        if(!good())return;
        if(!Array.isArray(items))throw Error('수업안 목록이 올바르지 않습니다.');
        records=items;available=true;show('');
        const uploadButton=$(host,'#bw45UploadButton');if(uploadButton&&!busy)uploadButton.disabled=false;
        draw();
      }catch(error){
        if(!good())return;
        const text=errText(error);available=false;
        const uploadButton=$(host,'#bw45UploadButton');if(uploadButton)uploadButton.disabled=true;
        show(/허용되지 않은 업무 요청|함수를 찾을 수|Script function not found|is not a function|unknown method/i.test(text)
          ?'수업안 자료실은 사이트에 준비돼 있습니다. 실제 업로드를 사용하려면 직원용 관리 서버를 한 번 업데이트해야 합니다. 기존 문서나 수업 기록은 그대로 유지됩니다.':text,true);
        $(host,'#bw45Rows').innerHTML='<div class="bw45-empty">수업안 목록을 불러오지 못했습니다.</div>';
      }
    };
    const uploadForm=$(host,'#bw45UploadForm');
    if(uploadForm){
      const fileInput=$(host,'#bw45File');
      fileInput.addEventListener('change',()=>{
        const file=fileInput.files&&fileInput.files[0],title=uploadForm.elements.namedItem('title');
        if(file&&!title.value.trim())title.value=file.name.replace(/\.[^.]+$/,'').slice(0,100);
      });
      $(host,'#bw45CancelButton').onclick=()=>{
        if(busy){cancelled=true;$(host,'#bw45UploadFeedback').textContent='현재 조각 전송이 끝나면 업로드를 중지합니다.';}
      };
      uploadForm.onsubmit=async event=>{
        event.preventDefault();
        if(busy||!available)return;
        const file=fileInput.files&&fileInput.files[0];
        if(!file){show('파일을 선택해 주세요.',true);return;}
        if(file.size<1||file.size>MAX_BYTES){show('8MB 이하 파일만 업로드할 수 있습니다.',true);return;}
        if(!ACCEPT.split(',').some(ext=>file.name.toLowerCase().endsWith(ext))){show('지원하는 파일 형식을 선택해 주세요.',true);return;}
        const payload={
          fileName:file.name,size:file.size,title:uploadForm.elements.namedItem('title').value.trim(),
          month:uploadForm.elements.namedItem('month').value,
          age:uploadForm.elements.namedItem('age').value,
          note:uploadForm.elements.namedItem('note').value.trim()
        };
        busy=true;cancelled=false;pendingId='';
        const submit=$(host,'#bw45UploadButton'),cancel=$(host,'#bw45CancelButton'),progress=$(host,'#bw45Progress');
        submit.disabled=true;cancel.disabled=false;progress.setAttribute('aria-busy','true');progress.value=0;
        show('');const info=$(host,'#bw45UploadFeedback');
        try{
          const started=await context.call('staff45BeginLesson',context.token,payload);
          pendingId=started.id;
          if(!Number.isInteger(started.partBytes)||started.partBytes<1000||started.partBytes>200000||
             !Number.isInteger(started.parts)||started.parts<1||started.parts>64)throw Error('서버의 업로드 설정을 확인해 주세요.');
          for(let index=0;index<started.parts;index++){
            if(cancelled)break;
            const begin=index*started.partBytes,end=Math.min(file.size,begin+started.partBytes);
            const data=await fileChunk(file,begin,end);
            if(cancelled)break;
            info.textContent='파일 올리는 중 · '+(index+1)+' / '+started.parts;
            await context.call('staff45UploadPart',context.token,pendingId,index,data);
            progress.value=Math.round((index+1)/started.parts*100);
          }
          if(cancelled){
            info.textContent='업로드를 중지했습니다.';
            await context.call('staff45AbortLesson',context.token,pendingId);
            pendingId='';
          }else{
            info.textContent='파일을 확인하고 저장하고 있습니다.';
            await context.call('staff45FinishLesson',context.token,pendingId);
            pendingId='';uploadForm.reset();info.textContent='수업안을 저장했습니다. 비공개 상태로 보관됩니다.';
            progress.value=100;
          }
          if(good())await refresh();
        }catch(error){
          if(good()){
            const message=errText(error)+(pendingId?' 전송이 중단됐다면 아래 목록에서 ‘미완료 정리’를 선택해 주세요.':'');
            info.textContent='업로드를 완료하지 못했습니다.';
            await refresh();
            if(good())show(message,true);
          }
        }finally{
          busy=false;cancelled=false;if(good()){submit.disabled=!available;cancel.disabled=true;progress.setAttribute('aria-busy','false');}
        }
      };
    }
    host.addEventListener('input',event=>{
      if(event.target.id==='bw45Search'||event.target.id==='bw45AgeFilter'||event.target.id==='bw45StatusFilter')draw();
    });
    host.addEventListener('change',event=>{
      if(event.target.id==='bw45AgeFilter'||event.target.id==='bw45StatusFilter')draw();
    });
    $(host,'#bw45Reload').onclick=()=>refresh();
    host.addEventListener('submit',async event=>{
      const form=event.target.closest('form.bw45-edit');
      if(!form)return;
      event.preventDefault();if(busy)return;
      const item=records.find(x=>x.id===form.dataset.id);
      if(!item)return;
      busy=true;const button=form.querySelector('[type=submit]');button.disabled=true;
      try{
        await context.call('staff45SaveLesson',context.token,{
          id:item.id,revision:item.revision,title:form.elements.namedItem('title').value,
          month:form.elements.namedItem('month').value,age:form.elements.namedItem('age').value,
          note:form.elements.namedItem('note').value,visibility:form.elements.namedItem('visibility').value
        });
        editId='';await refresh();
      }catch(error){if(good())show(errText(error),true);}
      finally{busy=false;if(button.isConnected)button.disabled=false;}
    });
    host.addEventListener('click',event=>{
      const button=event.target.closest('button[data-bw45-action]');
      if(!button||!host.contains(button)||busy)return;
      const action=button.dataset.bw45Action,id=button.dataset.id,item=records.find(x=>x.id===id);
      if(!item)return;
      if(action==='edit'){editId=editId===id?'':id;draw();return;}
      if(action==='close'){editId='';draw();return;}
      const job=async()=>{
        busy=true;button.disabled=true;show('');
        try{
          if(action==='download'){
            const result=await context.call('staff45DownloadLesson',context.token,id);
            if(!good())return;
            if(typeof result.base64!=='string'||result.base64.length>12000000)throw Error('다운로드 파일을 확인해 주세요.');
            const binary=atob(result.base64),arr=new Uint8Array(binary.length);
            for(let i=0;i<binary.length;i++)arr[i]=binary.charCodeAt(i);
            const url=URL.createObjectURL(new Blob([arr],{type:'application/octet-stream'}));
            try{
              const a=document.createElement('a');a.href=url;a.download=result.fileName;
              a.hidden=true;document.body.appendChild(a);a.click();a.remove();
            }finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
          }else if(action==='archive'){
            if(!editable||!global.confirm('이 자료를 보관 목록으로 옮길까요? 파일 자체는 삭제되지 않습니다.'))return;
            await context.call('staff45ArchiveLesson',context.token,{id,revision:item.revision});
            editId='';await refresh();
          }else if(action==='abort'){
            if(!editable||item.owner!==email||!global.confirm('미완료 업로드를 정리할까요?'))return;
            await context.call('staff45AbortLesson',context.token,id);
            await refresh();
          }
        }catch(error){if(good())show(errText(error),true);}
        finally{busy=false;if(button.isConnected)button.disabled=false;}
      };
      job();
    });
    await refresh();
  }
  global.BW45LessonLibrary=Object.freeze({mount,version:'45.0.0'});
})(window);
