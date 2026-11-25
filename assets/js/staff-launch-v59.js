/* V59 launch plan: authenticated edits, independent draft, no local storage or background writes. */
(function(){
 'use strict';
 const M=window.BW59,$=id=>document.getElementById(id),won=v=>v===null?'미확정':Math.round(v).toLocaleString('ko-KR')+'원';
 if(!M)return;
 let token='',user=null,plan=null,loaded=false,busy=false,dirty=false,etag='new',pending=null,generation=0,lessonId='',taskId='';
 const rpc=(name,...args)=>window.BW27Bridge.request(name,args);
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const msg=(id,text,error=false)=>{const e=$(id);e.textContent=text;e.dataset.error=error?'1':'0';};
 function active(n,t){return n===generation&&t===token&&Boolean(t);}
 function valid(){try{return M.validate(plan);}catch(_){return null;}}
 function controls(){const good=Boolean(valid());$('bw59Fields').disabled=busy;$('bw59Year').disabled=busy;$('bw59Reload').disabled=busy;
  $('bw59Save').disabled=$('bw59SaveBottom').disabled=!loaded||busy||!good;$('bw59Export').disabled=busy||!good;}
 function totals(){
  try{
   const s=M.summarize(plan);
   $('bw59LessonKpi').textContent=s.lessonsDone+'/48회';$('bw59FirstKpi').textContent=s.first12Done+'/12회';$('bw59TaskKpi').textContent=s.tasksDone+'/'+s.taskCount+'개';
   $('bw59FoodKpi').textContent=won(s.foodCost);
   $('bw59Totals').textContent='식재료 단가 미확정 '+s.missingQuotes+'회 · 연간 예상 준비·정리 '+(s.minutes/60).toFixed(1)+'시간 · 입력한 홍보 예산 '+won(s.adBudget)+' / 집행 '+won(s.adActual)+' · 홍보 예산 미확정 '+s.adUnknown+'개. 미입력 비용은 합계에 포함하지 않습니다.';
  }catch(e){for(const id of ['bw59LessonKpi','bw59FirstKpi','bw59TaskKpi','bw59FoodKpi'])$(id).textContent='—';$('bw59Totals').textContent=e.message;}
  controls();
 }
 function changed(){dirty=true;totals();msg('bw59State','수정한 계획이 아직 저장되지 않았습니다.');}
 function field(root,label,obj,key,options={}){
  const wrapper=node('label',undefined,'bw59-field'+(options.wide?' bw59-wide':''));wrapper.appendChild(node('span',label));
  let el;
  if(options.choices){el=node('select');for(const val of options.choices){const o=node('option',val);o.value=val;el.appendChild(o);}}
  else if(options.area){el=node('textarea');el.rows=3;}
  else{el=node('input');el.type=options.type||'text';if(options.min!==undefined)el.min=options.min;if(options.max!==undefined)el.max=options.max;if(options.step!==undefined)el.step=options.step;}
  if(options.limit)el.maxLength=options.limit;
  el.value=obj[key]===null?'':String(obj[key]??'');
  const update=()=>{
   obj[key]=options.type==='number'?(el.value.trim()===''?(options.nullable?null:NaN):Number(el.value)):el.value;
   changed();if(options.after)options.after();
  };
  el.addEventListener('input',update);el.addEventListener('change',()=>{if(options.choices)update();});
  wrapper.appendChild(el);root.appendChild(wrapper);return el;
 }
 const textField=(r,label,o,k,max,wide=false)=>field(r,label,o,k,{limit:max,wide});
 const numField=(r,label,o,k,min,max,step=1,nullable=false,after)=>field(r,label,o,k,{type:'number',min,max,step,nullable,after});
 function item(root,heading,detail,state,callback){
  const div=node('article',undefined,'bw59-item'),text=node('div');text.append(node('b',heading),node('small',detail));const badge=node('span',state,'bw59-badge');badge.dataset.state=state;text.appendChild(badge);
  const edit=node('button','편집','btn btn-outline btn-small');edit.type='button';edit.addEventListener('click',callback);div.append(text,edit);root.appendChild(div);
 }
 function renderLessons(){
  const root=$('bw59LessonList');root.replaceChildren();
  const rows=plan.lessons.filter(r=>r.month===Number($('bw59Month').value)).sort((a,b)=>a.week-b.week);
  for(const r of rows){const d=M.order(r);item(root,r.week+'회 · '+r.theme,r.kind+' · '+r.material+(r.kind==='식재료'?' · 발주 '+d.grams+'g / '+won(d.cost):''),r.status,()=>editLesson(r.id));}
  $('bw59LessonEditor').hidden=true;lessonId='';
 }
 function editLesson(id){
  const r=plan.lessons.find(x=>x.id===id);if(!r)return;lessonId=id;
  const root=$('bw59LessonEditor');root.replaceChildren();root.hidden=false;root.appendChild(node('h3',r.month+'월 '+r.week+'회 · '+r.kind));
  const grid=node('div',undefined,'bw59-grid');root.appendChild(grid);
  textField(grid,'수업 테마',r,'theme',90,true);textField(grid,'주 재료',r,'material',90);textField(grid,'대체 재료',r,'alternative',100);
  textField(grid,'핵심 영어 표현',r,'english',150,true);field(grid,'검토 상태',r,'status',{choices:M.statuses});
  field(grid,'활동·대체활동·검토 메모',r,'note',{area:true,limit:250,wide:true});
  const box=node('div',undefined,'bw59-estimate');
  const estimate=()=>{box.replaceChildren();try{if(!valid())throw Error('입력값 확인 필요');const o=M.order(r);
   box.append(node('b','참여 '+o.people+'명 · '+r.ageGroups.reduce((a,b)=>a+b,0)+'개 반'),node('b','예상 준비·정리 '+o.minutes+'분'));
   if(r.kind==='식재료')box.append(node('b','순사용 '+o.net.toFixed(1)+'g'),node('b','필요 '+o.need.toFixed(1)+'g'),node('b','발주 '+o.grams+'g'),node('b','원물 원가 '+won(o.cost)));
  }catch(e){box.textContent=e.message;}};
  M.ages.forEach((age,i)=>{numField(grid,age+' 반 수',r.ageGroups,i,0,20,1,false,estimate);numField(grid,age+' 반당 참여 인원',r.counts,i,0,4,1,false,estimate);});
  if(r.kind==='식재료'){
   numField(grid,'25~35개월 1인 배정(g)',r,'grams25',0,1000,0.1,false,estimate);numField(grid,'36~48개월 1인 배정(g)',r,'grams36',0,1000,0.1,false,estimate);
   numField(grid,'반당 교사 시범분(g)',r,'demo',0,5000,0.1,false,estimate);numField(grid,'손실 여유율(%)',r,'loss',0,100,0.1,false,estimate);
   numField(grid,'구매 단위(g)',r,'pack',1,100000,1,false,estimate);numField(grid,'kg당 실제 단가(원, 미확정은 공란)',r,'price',0,1000000000,1,true,estimate);
  }
  numField(grid,'반당 준비(분)',r,'prep',0,240,1,false,estimate);numField(grid,'반당 정리(분)',r,'cleanup',0,240,1,false,estimate);numField(grid,'공동 발주·준비(분)',r,'shared',0,480,1,false,estimate);
  root.appendChild(box);estimate();
  const close=node('button','편집 닫기','btn btn-outline');close.type='button';close.addEventListener('click',renderLessons);root.appendChild(close);
 }
 function renderTasks(){
  const root=$('bw59TaskList');root.replaceChildren();
  const group=$('bw59Group').value,q=$('bw59Search').value.trim().toLowerCase();
  for(const r of plan.tasks.filter(t=>(group==='전체'||t.group===group)&&(!q||(t.title+' '+t.note).toLowerCase().includes(q)))){
   item(root,r.title,r.group+' · 예정 '+(r.due||'미정')+' · 예산 '+won(r.budget)+' · 실제 '+won(r.actual),r.status,()=>editTask(r.id));
  }
  if(!root.children.length)root.appendChild(node('p','해당 업무가 없습니다.','bw59-empty'));
  $('bw59TaskEditor').hidden=true;taskId='';
 }
 function editTask(id){
  const r=plan.tasks.find(x=>x.id===id);if(!r)return;taskId=id;
  const root=$('bw59TaskEditor');root.replaceChildren();root.hidden=false;root.appendChild(node('h3','업무 편집'));
  const grid=node('div',undefined,'bw59-grid');root.appendChild(grid);
  field(grid,'업무 구분',r,'group',{choices:M.groups});textField(grid,'업무명',r,'title',90,true);
  field(grid,'상태',r,'status',{choices:M.statuses});field(grid,'예정일',r,'due',{type:'date'});textField(grid,'담당(역할 또는 내부 담당자)',r,'assignee',60);
  numField(grid,'예산(원, 미확정 공란)',r,'budget',0,1000000000,1,true);numField(grid,'실제 집행(원, 미확정 공란)',r,'actual',0,1000000000,1,true);
  if(r.group==='홍보'){
   numField(grid,'문의(건)',r,'leads',0,1000000,1,true);numField(grid,'체험(건)',r,'trials',0,1000000,1,true);numField(grid,'유료 등록(건)',r,'registrations',0,1000000,1,true);
  }
  field(grid,'검토 메모(개인·건강정보 제외)',r,'note',{area:true,limit:250,wide:true});
  const actions=node('div',undefined,'bw59-actions'),close=node('button','편집 닫기','btn btn-outline'),remove=node('button','계획에서 제거','btn btn-outline');
  close.type=remove.type='button';close.addEventListener('click',renderTasks);
  remove.addEventListener('click',()=>{if(window.confirm('이 계획에서 항목을 제거할까요? 이미 저장된 이전 개정 기록은 유지됩니다.')){plan.tasks=plan.tasks.filter(x=>x.id!==id);changed();renderTasks();}});
  actions.append(close,remove);root.appendChild(actions);
 }
 function render(){ $('bw59Year').value=String(plan.year);renderLessons();renderTasks();totals(); }
 function accept(result){
  if(!result||result.version!=='59.0.0'||!result.plan)throw Error('계획 조회 응답 확인 필요');
  plan=result.plan.values?M.validate(result.plan.values):M.defaults();etag=result.plan.etag||'new';loaded=true;dirty=false;pending=null;render();
  msg('bw59State',result.plan.revision?'저장된 계획 v'+result.plan.revision+' · '+String(result.plan.updatedAt||''):'기본 템플릿입니다. 아직 Google 시트에 저장되지 않았습니다.');
 }
 async function reload(force=false){
  if(!token||busy)return;if(dirty&&!force&&!window.confirm('저장하지 않은 변경을 버리고 다시 조회할까요?'))return;
  const n=generation,t=token;busy=true;controls();
  try{const r=await rpc('staff59LaunchRead',t);if(active(n,t))accept(r);}
  catch(e){if(active(n,t)){loaded=false;msg('bw59State','V59 저장 서버를 확인하지 못했습니다. 현재 계획은 계산·CSV만 이용할 수 있습니다. '+String(e.message||''),true);}}
  finally{if(active(n,t)){busy=false;controls();}}
 }
 async function save(){
  if(!loaded||busy||!token)return;const values=valid();if(!values)return;
  if(!window.crypto?.randomUUID){msg('bw59State','보안 연결에서 다시 시도해 주세요.',true);return;}
  const key=JSON.stringify([etag,values]);if(pending&&pending.key!==key){msg('bw59State','이전 저장 결과가 불확실합니다. 최신 계획을 다시 조회한 후 수정해 주세요.',true);return;}
  if(!pending)pending={key,requestId:window.crypto.randomUUID()};
  const n=generation,t=token;busy=true;controls();msg('bw59State','저장하고 있어요.');
  try{const r=await rpc('staff59LaunchSave',t,{values,etag,requestId:pending.requestId});
   if(!active(n,t))return;if(r?.ok!==true)throw Error('저장 결과 확인 필요');accept(r);
   msg('bw59State',r.auditWarning?'저장 완료 · 감사 이력 확인 필요':'계획 v'+r.plan.revision+' 저장 완료',Boolean(r.auditWarning));
  }catch(e){if(active(n,t))msg('bw59State',String(e.message||'저장 확인 실패')+' 같은 내용으로 다시 시도하거나 최신 계획을 조회하세요.',true);}
  finally{if(active(n,t)){busy=false;controls();}}
 }
 function exportCSV(){
  const v=valid();if(!v)return;
  const rows=[['구분','월','회차','제목','재료','상태','예정일','담당','예상 발주(g)','원가/예산(원)','실제비용(원)','준비정리(분)','문의','체험','등록','메모']];
  for(const l of v.lessons){const o=M.order(l);rows.push(['수업',l.month,l.week,l.theme,l.material,l.status,'','',o.grams,o.cost??'','',o.minutes,'','','',l.note]);}
  for(const t of v.tasks)rows.push([t.group,'','',t.title,'',t.status,t.due,t.assignee,'',t.budget??'',t.actual??'','',t.leads??'',t.trials??'',t.registrations??'',t.note]);
  const safe=x=>{let s=String(x??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const csv='\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=node('a');a.href=url;a.download='BridgeWonder_개원교육홍보계획_'+v.year+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function tab(name){$('bw59Lessons').hidden=name!=='lessons';$('bw59Tasks').hidden=name!=='tasks';$('bw59LessonsTab').setAttribute('aria-selected',String(name==='lessons'));$('bw59TasksTab').setAttribute('aria-selected',String(name==='tasks'));if(name==='lessons')renderLessons();else renderTasks();}
 for(let n=1;n<=12;n++){const o=node('option',n+'월');o.value=String(n);$('bw59Month').appendChild(o);}
 $('bw59Year').addEventListener('input',()=>{plan.year=Number($('bw59Year').value);changed();});
 $('bw59Month').addEventListener('change',renderLessons);$('bw59Group').addEventListener('change',renderTasks);$('bw59Search').addEventListener('input',renderTasks);
 $('bw59LessonsTab').addEventListener('click',()=>tab('lessons'));$('bw59TasksTab').addEventListener('click',()=>tab('tasks'));
 $('bw59AddTask').addEventListener('click',()=>{if(plan.tasks.length>=80){msg('bw59State','업무는 최대 80개입니다.',true);return;}
  const id='X'+window.crypto.randomUUID().replace(/-/g,'').toUpperCase();const group=M.groups.includes($('bw59Group').value)?$('bw59Group').value:'교육·운영';
  plan.tasks.push({id,group,title:'새 업무',note:'',status:'미확인',due:'',assignee:'',budget:null,actual:null,leads:null,trials:null,registrations:null});changed();editTask(id);
 });
 $('bw59Reload').addEventListener('click',()=>reload());$('bw59Save').addEventListener('click',save);$('bw59SaveBottom').addEventListener('click',save);$('bw59Export').addEventListener('click',exportCSV);
 $('bw59Logout').addEventListener('click',()=>{if(window.BW57Workspace?.confirmLeave()===false)return;const previous=token;generation++;token='';user=null;plan=null;loaded=false;busy=false;dirty=false;pending=null;
  $('bw59Workspace').hidden=true;$('bw59Access').hidden=false;$('bw59Logout').hidden=true;
  for(const id of ['bw59LessonList','bw59LessonEditor','bw59TaskList','bw59TaskEditor'])$(id).replaceChildren();window.BW57Workspace?.clearUser();
  try{sessionStorage.removeItem('bw17_staff_session');}catch(_){}msg('bw59Access','로그아웃했습니다. 직원 홈에서 다시 로그인해 주세요.');if(previous)rpc('staffLogout',previous).catch(()=>{});
 });
 async function start(){
  try{token=sessionStorage.getItem('bw17_staff_session')||'';}catch(_){}
  if(!token){msg('bw59Access','직원 홈에서 원장 계정으로 로그인한 뒤 이용해 주세요.');return;}
  const n=generation,t=token;
  try{user=await rpc('staffCurrentUser',t);if(!active(n,t))return;
   if(user?.role!=='owner'||user.mustChange||user.permissions?.read?.operations!==true)throw Error('권한 확인 필요');
   $('bw59Access').hidden=true;$('bw59Workspace').hidden=false;$('bw59Logout').hidden=false;window.BW57Workspace?.setUser(user);window.BW57Workspace?.setGuard(()=>busy?'저장 결과 확인 중입니다. 이동할까요?':dirty||pending?'저장하지 않은 계획이 있습니다. 이동할까요?':'');
   plan=M.defaults();render();await reload(true);
  }catch(_){if(active(n,t))msg('bw59Access','원장 계정 또는 조회 권한을 확인해 주세요.',true);}
 }
 start();
})();
