/* Bridge Wonder V50 — same-origin staff workspaces.
 * One authentication session, five distinct URLs, existing Sheets / Apps Script backend.
 * No credentials, student records, token or private data are written to URL/history.
 * Not a DNS or subdomain provisioning system.
 */
(function(global){
  'use strict';
  const ORIGIN_PATH='/staff/';
  const WORKSPACES=Object.freeze([
    Object.freeze({id:'consult',slug:'consult',label:'상담·등록',defaultPage:'inquiries',
      pages:Object.freeze(['inquiries','waitlist','students','registrations'])}),
    Object.freeze({id:'class',slug:'classes',label:'클래스 운영',defaultPage:'classes',
      pages:Object.freeze(['classes','capacity','roster','attendance','makeups','handoff'])}),
    Object.freeze({id:'sensory',slug:'sensory',label:'오감놀이 준비',defaultPage:'themes',
      pages:Object.freeze(['themes','experiences','safety'])}),
    Object.freeze({id:'service',slug:'fees-documents',label:'이용료·문서',defaultPage:'documents',
      pages:Object.freeze(['documents','tuition'])}),
    Object.freeze({id:'admin',slug:'management',label:'스튜디오 관리',defaultPage:'operations',
      pages:Object.freeze(['operations','courseSettings','compliance','staffCompliance','users','payroll','finance','security'])})
  ]);
  const GROUP_BY_PAGE=new Map(WORKSPACES.flatMap(g=>g.pages.map(p=>[p,g])));
  const GROUP_BY_ID=new Map(WORKSPACES.map(g=>[g.id,g]));
  const GROUP_BY_SLUG=new Map(WORKSPACES.map(g=>[g.slug,g]));
  const validPage=(p)=>p==='home'||GROUP_BY_PAGE.has(p);
  const pathFor=page=>{
    if(page==='home'||!GROUP_BY_PAGE.has(page))return ORIGIN_PATH;
    return ORIGIN_PATH+GROUP_BY_PAGE.get(page).slug+'/';
  };
  const urlForPage=page=>{
    if(page==='home'||!GROUP_BY_PAGE.has(page))return ORIGIN_PATH;
    const group=GROUP_BY_PAGE.get(page);
    return pathFor(page)+(group.defaultPage===page?'':'?view='+encodeURIComponent(page));
  };
  const groupFor=page=>GROUP_BY_PAGE.get(page)||null;
  function allowedPageInGroup(id,can){
    const group=GROUP_BY_ID.get(id);
    if(!group)return null;
    const authorized=typeof can==='function'?can:()=>true;
    if(authorized(group.defaultPage))return group.defaultPage;
    return group.pages.find(authorized)||null;
  }
  function urlForGroup(id,can){
    const target=allowedPageInGroup(id,can);
    return target?urlForPage(target):null;
  }
  function requestedPage(can,rawLocation){
    const current=rawLocation||global.location;
    if(!current)return 'home';
    const pathname=String(current.pathname||'');
    if(pathname===ORIGIN_PATH||pathname==='/staff'||pathname==='/staff/index.html')return 'home';
    const match=/^\/staff\/([a-z-]+)\/(?:index\.html)?$/.exec(pathname);
    if(!match)return 'home';
    const group=GROUP_BY_SLUG.get(match[1]);
    if(!group)return 'home';
    let queryPage='';
    try{
      const query=new URLSearchParams(String(current.search||''));
      queryPage=String(query.get('view')||'');
    }catch(_){queryPage='';}
    const permitted=typeof can==='function'?can:()=>true;
    if(queryPage&&group.pages.includes(queryPage)&&permitted(queryPage))return queryPage;
    return allowedPageInGroup(group.id,permitted)||'home';
  }
  function commit(page,mode){
    if(!validPage(page)||!global.history||!global.location)return;
    if(mode==='none')return;
    const target=urlForPage(page);
    const current=global.location.pathname+global.location.search;
    if(current===target)return;
    const fn=mode==='replace'?'replaceState':'pushState';
    try{global.history[fn]({bwStaffView:page},'',target);}catch(_){}
  }
  global.BW50Workspaces=Object.freeze({
    version:'50.0.0',groups:WORKSPACES,urlForPage,urlForGroup,allowedPageInGroup,groupFor,requestedPage,commit,pathFor
  });
})(window);
