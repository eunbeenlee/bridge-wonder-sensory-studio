/* V58 daily workbench. Role-aware summary, no personal records or browser cache. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const rpc=(name,...args)=>window.BW27Bridge.request(name,args);
 const definitions={
  inquiries:{title:'상담 연락',module:'inquiries',url:'?area=consult&page=inquiries'},
  registrations:{title:'등록 상태 확인',module:'registrations',url:'?area=consult&page=registrations'},
  waitlist:{title:'대기 안내',module:'waitlist',url:'?area=consult&page=waitlist'},
  makeups:{title:'보강 요청',module:'makeups',url:'?area=class&page=makeups'},
  capacity:{title:'모집 정원 확인',module:'capacity',url:'?area=class&page=capacity'},
  operations:{title:'개원·운영 점검',module:'operations',url:'?area=admin&page=operations'},
  safety:{title:'오늘 안전 점검 기록',module:'safety',url:'?area=sensory&page=safety'},
  pricing:{title:'정규 요금 공개 승인',module:'courseSettings',url:'integration/',roles:['owner']},
  planning:{title:'운영 손익 계획',module:'finance',url:'planning/',roles:['owner']}
 };
 const states={missing:'대장 미설치',schema:'열 구성 확인',oversize:'집계 범위 초과',error:'조회 확인 필요',empty:'아직 점검 항목 없음'};
 let token='',user=null,loading=false,generation=0;
 function node(tag,text,klass){
   const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(klass)el.className=klass;return el;
 }
 function notice(id,text,error=false){const el=$(id);el.textContent=text;el.dataset.error=error?'1':'0';}
 const can=def=>Boolean(user&&user.permissions?.read?.[def.module]===true&&(!def.roles||def.roles.includes(user.role)));
 const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
 const show=value=>count(value)===null?'—':String(value);
 function describe(key,m){
   if(key==='inquiries'||key==='waitlist'||key==='makeups'){
     const pending=count(m.pending),unknown=count(m.unknown);
     if(pending===null||unknown===null||count(m.total)===null)return null;
     return {main:show(pending)+'건',detail:'전체 '+show(m.total)+'건 · 상태 미확인 '+show(unknown)+'건',warning:pending>0||unknown>0};
   }
   if(key==='registrations'){
     if([m.total,m.confirmed,m.review].some(x=>count(x)===null))return null;
     return {main:show(m.review)+'건',detail:'등록확정 '+show(m.confirmed)+'건 · 확정 외 기록 '+show(m.review)+'건 (취소 등 포함)',warning:m.review>0};
   }
   if(key==='capacity'){
     if([m.total,m.configured,m.missing,m.invalid].some(x=>count(x)===null))return null;
     return {main:show(m.missing+m.invalid)+'개 반',detail:'등록된 반 '+show(m.total)+'개 · 정원 설정 '+show(m.configured)+'개 · 미설정 '+show(m.missing)+'개 · 값 확인 '+show(m.invalid)+'개',warning:m.missing+m.invalid>0};
   }
   if(key==='operations'){
     if([m.pending,m.total,m.overdue,m.upcoming,m.undated,m.invalid,m.done].some(x=>count(x)===null))return null;
     return {main:show(m.pending)+'건',detail:'기한 경과 '+show(m.overdue)+'건 · 7일 이내 '+show(m.upcoming)+'건 · 날짜 확인 '+show(m.undated)+'건',warning:m.pending>0||m.invalid>0};
   }
   if(key==='safety'){
     if([m.recorded,m.attention].some(x=>count(x)===null))return null;
     return {main:show(m.recorded)+'개 반',detail:'조치·입력 확인 '+show(m.attention)+'개 반 · 오늘 작성된 기록만 집계',warning:m.attention>0};
   }
   if(key==='pricing'){
     if(typeof m.approved!=='boolean')return null;
     return {main:m.approved?'승인값 있음':'승인 전',detail:m.approved?'저장된 공개 승인값을 확인할 수 있어요.':'정적 기본 요금과 별도로 공개 승인 여부를 확인하세요.',warning:!m.approved};
   }
   if(key==='planning'){
     if(typeof m.saved!=='boolean')return null;
     return {main:m.saved?'저장 완료':'작성 필요',detail:'실제 거래가 아닌 별도 운영계획의 저장 여부입니다.',warning:!m.saved};
   }
   return null;
 }
 function card(key,block){
   const def=definitions[key],el=node('article',undefined,'bw58-card');
   const data=block?.state==='ready'&&block.metrics?describe(key,block.metrics):null;
   el.dataset.warning=data?.warning||!data?'1':'0';
   el.append(node('h3',def.title),node('strong',data?data.main:'—'),node('p',data?data.detail:(states[block?.state]||'연결 또는 권한 확인이 필요합니다.')));
   const link=node('a','업무 열기');link.href='/staff/'+def.url;el.appendChild(link);
   return el;
 }
 function readiness(block){
   const panel=$('bw58Readiness');panel.hidden=!(user&&can(definitions.operations)&&block?.state==='ready'&&block.metrics);
   const stats=$('bw58ReadinessStats'),due=$('bw58Due');stats.replaceChildren();due.replaceChildren();
   if(panel.hidden)return;
   const m=block.metrics;if(!describe('operations',m)){panel.hidden=true;return;}
   const pct=m.total>0?Math.max(0,Math.min(100,Math.round(100*m.done/m.total))):0;
   $('bw58ProgressValue').textContent=show(m.done)+' / '+show(m.total)+'개 완료 · '+pct+'%';
   $('bw58Progress').setAttribute('aria-valuenow',String(pct));$('bw58Progress').firstElementChild.style.width=pct+'%';
   for(const [label,n] of [['기한 경과',m.overdue],['7일 이내',m.upcoming],['날짜 확인',m.undated],['상태 확인',m.invalid]])stats.appendChild(node('span',label+' '+show(n)+'건'));
   const items=Array.isArray(block.due)?block.due.slice(0,8):[];
   for(const task of items){
     if(typeof task.title!=='string'||typeof task.date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(task.date))continue;
     const row=node('div',undefined,'bw58-due');row.dataset.overdue=task.overdue===true?'1':'0';
     const time=node('time',(task.overdue?'기한 경과 · ':'')+task.date);time.dateTime=task.date;
     row.append(node('span',task.title.slice(0,130)),time);due.appendChild(row);
   }
   if(!due.children.length)due.appendChild(node('p','기한이 지난 항목이나 7일 이내로 등록된 항목이 없습니다.'));
 }
 function draw(result){
   const root=$('bw58Cards');root.replaceChildren();
   const blocks=new Map((Array.isArray(result?.blocks)?result.blocks:[]).filter(b=>b&&Object.prototype.hasOwnProperty.call(definitions,b.key)).map(b=>[b.key,b]));
   for(const [key,def] of Object.entries(definitions))if(can(def)&&blocks.has(key))root.appendChild(card(key,blocks.get(key)));
   if(!root.children.length)root.appendChild(node('p','현재 권한으로 집계할 수 있는 업무가 없습니다. 아래 업무 찾기를 이용하세요.'));
   readiness(blocks.get('operations'));
 }
 function drawLinks(){
   const root=$('bw58Links'),q=$('bw58Search').value.trim().toLowerCase();root.replaceChildren();
   const links=window.BW57Workspace?.links?.()||[];
   const groups=new Map();
   for(const entry of links){
     if(entry.href==='/staff/workbench/'||q&&!(entry.label+' '+entry.group+' '+(entry.keywords||'')).toLowerCase().includes(q))continue;
     if(!groups.has(entry.group))groups.set(entry.group,[]);
     groups.get(entry.group).push(entry);
   }
   for(const [group,items] of groups){
     const el=node('section',undefined,'bw58-link-group');el.appendChild(node('h3',group));
     for(const item of items){const a=node('a',item.label);a.href=item.href;el.appendChild(a);}
     root.appendChild(el);
   }
   if(!root.children.length)root.appendChild(node('p',q?'검색 결과가 없습니다. 다른 업무 이름으로 찾아보세요.':'현재 권한으로 이용할 수 있는 바로가기가 없습니다.'));
 }
 function clear(){
   generation++;token='';user=null;loading=false;
   $('bw58Workspace').hidden=true;$('bw58Access').hidden=false;$('bw58Logout').hidden=true;
   $('bw58Cards').replaceChildren();$('bw58Due').replaceChildren();$('bw58ReadinessStats').replaceChildren();
   $('bw58Links').replaceChildren();$('bw58Date').textContent='확인 전';
   window.BW57Workspace?.clearUser();
 }
 async function refresh(initial=false){
   if(!token||loading)return;
   const epoch=++generation,currentToken=token;
   loading=true;$('bw58Refresh').disabled=true;
   // Remove prior metrics before every read, so failed/revoked requests cannot show stale counts.
   $('bw58Cards').replaceChildren();readiness(null);$('bw58Date').textContent='확인 중';
   notice('bw58State','현재 권한과 업무 기록을 확인하고 있어요.');
   const active=()=>epoch===generation&&currentToken===token;
   try{
     if(!initial){
       const fresh=await rpc('staffCurrentUser',currentToken);
       if(!active())return;
       if(fresh?.mustChange||fresh?.permissions?.read?.home!==true)throw Error('업무 권한을 다시 확인해 주세요.');
       user=fresh;window.BW57Workspace?.setUser(user);drawLinks();
     }
     const result=await rpc('staff58WorkspaceSnapshot',currentToken);
     if(!active())return;
     if(result?.version!=='58.0.0'||!Array.isArray(result.blocks))throw Error('업무 집계 응답을 확인해 주세요.');
     $('bw58Date').textContent=String(result.date||'확인 전');
     draw(result);
     const unavailable=result.blocks.filter(b=>b?.state!=='ready').length;
     notice('bw58State','최근 조회: '+String(result.checkedAt||'방금')+(unavailable?' · 확인할 대장 '+unavailable+'개':' · 조회 완료'),unavailable>0);
   }catch(e){
     if(!active())return;
     if(/로그인|접속 시간이 만료|사용 권한이 중지|비밀번호를 먼저|권한을 다시 확인/.test(String(e.message||''))){
       clear();notice('bw58Access','로그인 또는 권한을 다시 확인해 주세요. 직원 홈에서 로그인할 수 있습니다.',true);return;
     }
     $('bw58Date').textContent='조회하지 못함';
     notice('bw58State','업무 집계 서버를 확인하지 못했어요. V58 Google 서버 설치 및 연결 상태를 확인해 주세요. 기존 업무 바로가기는 사용할 수 있습니다.',true);
   }finally{if(active()){loading=false;$('bw58Refresh').disabled=false;}}
 }
 $('bw58Refresh').addEventListener('click',()=>refresh());
 $('bw58Search').addEventListener('input',drawLinks);
 $('bw58Clear').addEventListener('click',()=>{$('bw58Search').value='';drawLinks();$('bw58Search').focus();});
 $('bw58Logout').addEventListener('click',()=>{
   const previous=token;clear();
   try{sessionStorage.removeItem('bw17_staff_session');}catch(_){}
   notice('bw58Access','로그아웃했습니다. 직원 홈에서 다시 로그인할 수 있어요.');
   if(previous)rpc('staffLogout',previous).catch(()=>{});
 });
 async function start(){
   try{token=sessionStorage.getItem('bw17_staff_session')||'';}catch(_){}
   if(!token){notice('bw58Access','직원 홈에서 로그인한 뒤 오늘의 업무를 확인해 주세요.');return;}
   const epoch=generation,currentToken=token;
   try{
     const result=await rpc('staffCurrentUser',currentToken);
     if(epoch!==generation||currentToken!==token)return;
     if(result?.mustChange||result?.permissions?.read?.home!==true)throw Error('업무 권한을 확인해 주세요.');
     user=result;window.BW57Workspace?.setUser(user);
     $('bw58Access').hidden=true;$('bw58Workspace').hidden=false;$('bw58Logout').hidden=false;
     drawLinks();await refresh(true);
   }catch(_){clear();notice('bw58Access','직원 로그인 상태를 확인하지 못했어요. 직원 홈에서 다시 로그인해 주세요.',true);}
 }
 start();
})();
