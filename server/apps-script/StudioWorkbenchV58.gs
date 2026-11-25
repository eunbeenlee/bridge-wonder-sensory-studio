/**
 * V58 daily workbench. Read-only, role-filtered aggregate summary.
 * No initialization, business writes, or raw personal records returned.
 */
const BW58=Object.freeze({VERSION:'58.0.0',MAX_ROWS:5000});
function bw58Day_(value){
  if(value instanceof Date&&Number.isFinite(value.getTime()))return Utilities.formatDate(value,'Asia/Seoul','yyyy-MM-dd');
  const m=/^(20\d{2})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})\.?$/.exec(String(value||'').trim());
  if(!m)return '';
  const iso=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  const d=new Date(iso+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:'';
}
function bw58Read_(book,name,required){
  const sheet=book.getSheetByName(name);
  if(!sheet)return {state:'missing',rows:[],headers:[]};
  const count=sheet.getLastRow(),width=sheet.getLastColumn();
  if(count<1||width<1||width>100)return {state:'schema',rows:[],headers:[]};
  if(count>BW58.MAX_ROWS+1)return {state:'oversize',rows:[],headers:[]};
  const values=sheet.getRange(1,1,count,width).getValues();
  const headers=values[0].map(v=>String(v||'').trim());
  if(!required(headers))return {state:'schema',rows:[],headers:[]};
  return {state:'ready',headers,rows:values.slice(1).filter(r=>r.some(v=>v!==''&&v!==null&&v!==undefined))};
}
function bw58Prefix_(expected){return headers=>expected.every((v,i)=>headers[i]===v);}
function bw58Block_(key,reader){
  try{
    const data=reader();
    if(data&&data.state)return {key,...data};
    return {key,state:'error',metrics:null};
  }catch(_){return {key,state:'error',metrics:null};}
}
function bw58Unavailable_(read){return {state:read.state,metrics:null};}
function bw58CountStates_(rows,index,valid,active){
  let pending=0,unknown=0;
  for(const row of rows){
    const state=String(row[index]||'').trim();
    if(active.includes(state))pending++;
    else if(!valid.includes(state))unknown++;
  }
  return {total:rows.length,pending,unknown};
}
function bw58ClassScope_(user,id){
  return user.role!=='teacher'||(Array.isArray(user.classes)&&user.classes.includes(String(id||'').trim().toUpperCase()));
}
function staff58WorkspaceSnapshot(token){
  const user=bw24Authorized_(token,'home','read');
  const permissions=bw24Permissions_(user).read;
  const book=bw17Book_(),today=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');
  const weekEnd=new Date(today+'T00:00:00Z');weekEnd.setUTCDate(weekEnd.getUTCDate()+7);
  const deadline=weekEnd.toISOString().slice(0,10);
  const blocks=[];
  const add=(module,key,fn)=>{if(permissions[module]===true)blocks.push(bw58Block_(key,fn));};
  add('inquiries','inquiries',()=>{
    const d=bw58Read_(book,BW17.INQUIRIES,h=>h[1]==='접수번호'&&/상태/.test(h[8]||''));
    if(d.state!=='ready')return bw58Unavailable_(d);
    return {state:'ready',metrics:bw58CountStates_(d.rows.filter(r=>String(r[1]||'').trim()),8,['신규','연락중','방문예약','상담완료','종결'],['신규','연락중'])};
  });
  add('registrations','registrations',()=>{
    const d=bw58Read_(book,BW17.REGISTRATIONS,h=>h.includes('접수번호')&&h.includes('운영자 최종 등록 상태'));
    if(d.state!=='ready')return bw58Unavailable_(d);
    const ix=d.headers.indexOf('운영자 최종 등록 상태'),id=d.headers.indexOf('접수번호');
    const rows=d.rows.filter(r=>String(r[id]||'').trim());
    // All non-confirmed rows are shown as status-check records, not unpaid or pending students.
    const confirmed=rows.filter(r=>String(r[ix]||'').trim()==='등록확정').length;
    return {state:'ready',metrics:{total:rows.length,confirmed,review:rows.length-confirmed}};
  });
  add('waitlist','waitlist',()=>{
    const d=bw58Read_(book,BW20.WAIT,bw58Prefix_(BW20.WAIT_HEAD));
    if(d.state!=='ready')return bw58Unavailable_(d);
    return {state:'ready',metrics:bw58CountStates_(d.rows.filter(r=>String(r[0]||'').trim()),5,BW20.WAIT_STATUSES,['대기','연락중'])};
  });
  add('makeups','makeups',()=>{
    const d=bw58Read_(book,BW20.MAKEUP,bw58Prefix_(BW20.MAKEUP_HEAD));
    if(d.state!=='ready')return bw58Unavailable_(d);
    const rows=d.rows.filter(r=>String(r[0]||'').trim()&&bw58ClassScope_(user,r[3]));
    return {state:'ready',metrics:bw58CountStates_(rows,8,BW20.MAKEUP_STATUSES,['접수','검토중'])};
  });
  add('capacity','capacity',()=>{
    const classes=bw58Read_(book,BW17.CLASSES,bw58Prefix_(BW17.CLASS_HEADERS));
    if(classes.state!=='ready')return bw58Unavailable_(classes);
    const caps=bw58Read_(book,BW20.CAPS,bw58Prefix_(BW20.CAP_HEAD));
    if(caps.state!=='ready')return bw58Unavailable_(caps);
    const ids=[...new Set(classes.rows.map(r=>String(r[0]||'').trim().toUpperCase()).filter(id=>id&&bw58ClassScope_(user,id)))];
    const limits=new Map(),duplicates=new Set();
    for(const r of caps.rows){
      const id=String(r[0]||'').trim().toUpperCase();
      if(!id)continue;
      if(limits.has(id))duplicates.add(id);
      limits.set(id,Number(r[1]));
    }
    let configured=0,missing=0,invalid=0;
    for(const id of ids){
      const n=limits.get(id);
      if(n===undefined||n===0&&!duplicates.has(id))missing++;
      else if(duplicates.has(id)||!Number.isSafeInteger(n)||n<1||n>4)invalid++;
      else configured++;
    }
    return {state:'ready',metrics:{total:ids.length,configured,missing,invalid}};
  });
  add('operations','operations',()=>{
    const d=bw58Read_(book,BW18.TASKS,bw58Prefix_(BW18.TASK_HEADERS));
    if(d.state!=='ready')return bw58Unavailable_(d);
    const rows=d.rows.filter(r=>String(r[0]||'').trim());
    if(!rows.length)return {state:'empty',metrics:null};
    let done=0,overdue=0,upcoming=0,undated=0,invalid=0;
    const due=[];
    // Only predetermined checklist titles are returned, never user-entered notes,
    // responsible-person names, private evidence or sheet IDs.
    const defaults=new Map(BW18.TASKS_DEFAULT.map(r=>[r[0],r[2]]));
    for(const r of rows){
      const code=String(r[0]||'').trim(),state=String(r[4]||'').trim();
      if(state==='완료'){done++;continue;}
      if(!BW18.TASK_STATUSES.includes(state))invalid++;
      const day=bw58Day_(r[5]);
      if(!day){undated++;continue;}
      if(day<today)overdue++;
      else if(day<=deadline)upcoming++;
      if(day<=deadline)due.push({title:defaults.get(code)||'운영 점검 항목',date:day,overdue:day<today});
    }
    due.sort((a,b)=>a.date.localeCompare(b.date));
    return {state:'ready',metrics:{total:rows.length,done,pending:rows.length-done,overdue,upcoming,undated,invalid},due:due.slice(0,8)};
  });
  add('safety','safety',()=>{
    const d=bw58Read_(book,BW18.SAFETY,bw58Prefix_(BW18.SAFETY_HEADERS));
    if(d.state!=='ready')return bw58Unavailable_(d);
    const rows=d.rows.filter(r=>bw58Day_(r[0])===today&&String(r[1]||'').trim()&&bw58ClassScope_(user,r[1]));
    const seen=new Map();
    for(const r of rows){
      const id=String(r[1]||'').trim().toUpperCase(),flags=r.slice(4,9).map(v=>String(v||'').trim());
      const issue=flags.includes('조치필요')||flags.some(x=>!BW18.SAFETY_STATUSES.includes(x));
      seen.set(id,Boolean(seen.get(id)||issue));
    }
    return {state:'ready',metrics:{recorded:seen.size,attention:[...seen.values()].filter(Boolean).length}};
  });
  if(user.role==='owner'){
    add('courseSettings','pricing',()=>{
      if(typeof bw55Published_!=='function')return {state:'missing',metrics:null};
      const price=bw55Published_();
      return {state:'ready',metrics:{approved:Boolean(price)}};
    });
    add('finance','planning',()=>{
      if(typeof bw56Saved_!=='function')return {state:'missing',metrics:null};
      const saved=bw56Saved_(bw56Sheet_(book,false));
      return {state:'ready',metrics:{saved:Boolean(saved.values)}};
    });
  }
  return {version:BW58.VERSION,date:today,checkedAt:bw17Now_(),blocks};
}
