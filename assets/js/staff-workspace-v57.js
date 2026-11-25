/* V57 shared workspace: permission-aware navigation and unsaved-change protection.
 * No network calls, credentials, business data or persistent browser storage.
 */
(function(){
 'use strict';
 const base='/staff/';
 const roles=['owner','director','teacher','frontdesk'];
 const pageGroups=[
  {label:'상담·등록',items:[['상담 접수','?area=consult&page=inquiries','inquiries'],['대기 상담','?area=consult&page=waitlist','waitlist'],['등록 확인','?area=consult&page=registrations','registrations'],['아이 정보','?area=consult&page=students','students']]},
  {label:'클래스',items:[['시간표','?area=class&page=classes','classes'],['반별 정원','?area=class&page=capacity','capacity'],['아이 명단','?area=class&page=roster','roster'],['출결','?area=class&page=attendance','attendance'],['결석·보강','?area=class&page=makeups','makeups'],['보호자 동반·인계','?area=class&page=handoff','handoff']]},
  {label:'오감놀이·운영 자료',items:[['월간 체험 테마','?area=sensory&page=experiences','experiences'],['월간 수업 주제·수업안 파일','?area=sensory&page=themes','themes'],['재료·안전 점검','?area=sensory&page=safety','safety'],['회차별 수업안','curriculum/','themes',['owner','director','teacher']],['재료 목록','materials/','themes',['owner','director','teacher']],['운영 설정','settings/','courseSettings',['owner','director']],['안내 문구','content/','courseSettings',['owner','director']],['서식 문구','templates/','documents',['owner','director']]]},
  {label:'수납·문서',items:[['수납·환불','?area=service&page=tuition','tuition'],['보호자 문서','?area=service&page=documents','documents']]},
  {label:'스튜디오 관리',items:[['시설·운영 점검','?area=admin&page=operations','operations'],['개원·교육·홍보 계획','launch/','operations',['owner']],['이용 조건','?area=admin&page=courseSettings','courseSettings'],['법정·행정 관리','?area=admin&page=compliance','compliance'],['직원 준수 사항','?area=admin&page=staffCompliance','staffCompliance',['owner']],['직원 계정·권한','?area=admin&page=users','users',['owner']],['급여','?area=admin&page=payroll','payroll',['owner']],['운영 손익','?area=admin&page=finance','finance',['owner']],['손익 계획','planning/','finance',['owner']],['비용','costs/','finance',['owner']],['연동·요금','integration/','courseSettings',['owner']],['접속기록·백업','?area=admin&page=security','security']]}
 ];
 let guard=null,user=null,allowUnloadUntil=0;
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const can=(item)=>Boolean(user&&(!item[3]||item[3].includes(user.role))&&user.permissions?.read?.[item[2]]===true);
 function links(){
   if(!user)return [];
   return pageGroups.flatMap(group=>group.items.filter(can).map(item=>({label:item[0],href:base+item[1],group:group.label,keywords:item[2]})));
 }
 function isCurrent(href){
   const target=new URL(href,location.origin),here=new URL(location.href);
   if(target.pathname.replace(/index\.html$/,'')!==here.pathname.replace(/index\.html$/,''))return false;
   return target.searchParams.get('page')===here.searchParams.get('page');
 }
 function render(){
   const mount=document.getElementById('bw57WorkspaceNav');if(!mount)return;
   mount.replaceChildren();mount.hidden=!user;
   document.querySelectorAll('.bw57-direct-link').forEach(a=>{a.hidden=Boolean(user);});
   if(!user)return;
   const main=Boolean(document.getElementById('workspace')&&document.getElementById('loginScreen'));
   if(!main){const home=node('a','업무 홈');home.href=base;home.className='bw57-nav-home';mount.appendChild(home);}
   if(user.permissions?.read?.home===true){const hub=node('a','오늘의 업무');hub.href=base+'workbench/';hub.className='bw57-nav-home bw58-nav-hub';if(isCurrent(hub.href))hub.setAttribute('aria-current','page');mount.appendChild(hub);}
   for(const group of pageGroups){
     const visible=group.items.filter(item=>can(item)&&(!main||!item[1].startsWith('?')));if(!visible.length)continue;
     const box=node('details');box.className='bw57-nav-group';
     const summary=node('summary',group.label);box.appendChild(summary);
     const list=node('div');list.className='bw57-nav-list';
     for(const item of visible){
       const a=node('a',item[0]);a.href=base+item[1];
       if(isCurrent(a.href))a.setAttribute('aria-current','page');
       list.appendChild(a);
     }
     box.appendChild(list);mount.appendChild(box);
   }
   mount.hidden=!mount.children.length;
   if(!mount.hidden){const close=node('span',main?'독립 업무 화면':'업무 바로가기');close.className='bw57-nav-label';mount.appendChild(close);}
 }
 function setUser(value){user=value&&roles.includes(value.role)&&!value.mustChange?value:null;render();}
 function clearUser(){guard=null;setUser(null);}
 function setGuard(fn){guard=typeof fn==='function'?fn:null;}
 function clearGuard(){guard=null;}
 function needsGuard(){try{return guard?guard()||'':'';}catch(_){return '';}}
 function confirmLeave(){const message=needsGuard();return !message||window.confirm(message);}
 // Covers external workflow links and browser navigation without trapping the user.
 // Main SPA navigation calls confirmLeave explicitly.
 document.addEventListener('click',event=>{
   const a=event.target.closest?.('a[href]');
   if(!a||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
   let next;try{next=new URL(a.href,location.href);}catch(_){return;}
   if(!/^https?:$/.test(next.protocol))return;
   const current=new URL(location.href);
   if(next.origin===current.origin&&next.pathname===current.pathname&&next.search===current.search&&next.hash!==current.hash)return;
   if(needsGuard()){
     if(!confirmLeave()){event.preventDefault();event.stopImmediatePropagation();return;}
     allowUnloadUntil=Date.now()+2000;
   }
 },true);
 window.addEventListener('beforeunload',event=>{if(Date.now()>allowUnloadUntil&&needsGuard()){event.preventDefault();event.returnValue='';}});
 document.addEventListener('toggle',event=>{
   if(!event.target.matches?.('#bw57WorkspaceNav details')||!event.target.open)return;
   document.querySelectorAll('#bw57WorkspaceNav details[open]').forEach(d=>{if(d!==event.target)d.open=false;});
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('#bw57WorkspaceNav details[open]').forEach(d=>{d.open=false;d.querySelector('summary')?.focus();});});
 document.addEventListener('click',event=>{if(!event.target.closest?.('#bw57WorkspaceNav'))document.querySelectorAll('#bw57WorkspaceNav details[open]').forEach(d=>{d.open=false;});});
 // Restore from back/forward cache only with a fresh authorization check.
 // Reload rather than displaying a retained private workspace after a logout.
 window.addEventListener('pageshow',event=>{if(event.persisted&&user)location.reload();});
 window.BW57Workspace=Object.freeze({setUser,clearUser,setGuard,clearGuard,confirmLeave,render,links});
})();
