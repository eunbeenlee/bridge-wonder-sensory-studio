/**
 * V59 private launch and annual curriculum plan. No public endpoint or PII collection.
 * Owner-only; existing operations permission. Separate versioned planning sheet.
 */
const BW59_SERVER=Object.freeze({VERSION:'59.0.0',TAB:'BW59_개원교육홍보계획',HEADERS:['개정번호','수정시각','수정자','계획JSON','요청키']});
function bw59Spec_(){return {group:'content',name:BW59_SERVER.TAB,headers:BW59_SERVER.HEADERS,create:true};}
function bw59Validate_(raw){
 const statuses=['미확인','진행중','검토완료','보류'],groups=['시설·공사','안전·보험·동의','교육·운영','홍보'];
 const integer=(v,lo,hi,name)=>{if(!Number.isSafeInteger(v)||v<lo||v>hi)throw Error(name+' 범위를 확인해 주세요.');return v;};
 const finite=(v,lo,hi,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error(name+' 범위를 확인해 주세요.');return v;};
 const string=(v,max,name)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error(name+' 입력값을 확인해 주세요.');return v.trim();};
 const date=v=>{if(v==='')return '';if(typeof v!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(v))throw Error('예정일을 확인해 주세요.');const d=new Date(v+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('예정일을 확인해 주세요.');return v;};
 const nullableWon=(v,name)=>v===null?null:integer(v,0,1000000000,name);

 function validate(raw){
   if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('계획 형식을 확인해 주세요.');
   const year=integer(raw.year,2026,2099,'연도');
   if(!Array.isArray(raw.lessons)||raw.lessons.length!==48||!Array.isArray(raw.tasks)||raw.tasks.length>80)throw Error('48회 수업안과 업무 항목 수를 확인해 주세요.');
   const ids=new Set(),slots=new Set();
   const unique=v=>{const id=string(v,40,'관리 ID');if(!/^[A-Z0-9-]+$/.test(id)||ids.has(id))throw Error('중복 또는 잘못된 관리 ID');ids.add(id);return id;};
   const state=v=>{if(!statuses.includes(v))throw Error('상태를 확인해 주세요.');return v;};
   const lessons=raw.lessons.map(r=>{
     if(!r||typeof r!=='object'||Array.isArray(r))throw Error('수업안 형식');
     const month=integer(r.month,1,12,'월'),week=integer(r.week,1,4,'회차'),key=month+'-'+week;
     if(slots.has(key))throw Error('중복 회차');slots.add(key);
     const kind=week%2?'식재료':'자연소재';
     if(r.kind!==kind)throw Error('월 1·3회 식재료, 2·4회 자연소재 기준을 유지해 주세요.');
     if(!Array.isArray(r.counts)||r.counts.length!==5)throw Error('월령별 인원 확인');
     const theme=string(r.theme,90,'테마'),material=string(r.material,90,'재료');
     if(!theme||!material)throw Error('테마와 재료를 입력해 주세요.');
     const counts=r.counts.map(v=>integer(v,0,4,'반별 참여 인원'));
     if(!Array.isArray(r.ageGroups)||r.ageGroups.length!==5)throw Error('월령별 반 수를 확인해 주세요.');
     const ageGroups=r.ageGroups.map(v=>integer(v,0,20,'월령별 운영 반 수')),classes=ageGroups.reduce((n,v)=>n+v,0);
     return {id:unique(r.id),month,week,theme,kind,material,alternative:string(r.alternative,100,'대체 재료'),english:string(r.english,150,'영어 표현'),
       status:state(r.status),note:string(r.note,250,'수업 메모'),counts,ageGroups,classes,grams25:finite(r.grams25,0,1000,'25~35개월 배정량'),grams36:finite(r.grams36,0,1000,'36~48개월 배정량'),
       demo:finite(r.demo,0,5000,'교사 시범량'),loss:finite(r.loss,0,100,'여유율'),pack:integer(r.pack,1,100000,'구매 단위'),price:nullableWon(r.price,'kg당 단가'),
       prep:integer(r.prep,0,240,'준비시간'),cleanup:integer(r.cleanup,0,240,'정리시간'),shared:integer(r.shared,0,480,'공동 준비시간')};
   });
   const tasks=raw.tasks.map(t=>{
     if(!t||typeof t!=='object'||Array.isArray(t)||!groups.includes(t.group))throw Error('업무 구분을 확인해 주세요.');
     const title=string(t.title,90,'업무명');if(!title)throw Error('업무명을 입력해 주세요.');
     const kpi=(v,n)=>v===null?null:integer(v,0,1000000,n);
     return {id:unique(t.id),group:t.group,title,note:string(t.note,250,'업무 메모'),status:state(t.status),due:date(t.due),assignee:string(t.assignee,60,'담당'),budget:nullableWon(t.budget,'예산'),actual:nullableWon(t.actual,'실제비용'),leads:kpi(t.leads,'문의'),trials:kpi(t.trials,'체험'),registrations:kpi(t.registrations,'등록')};
   });
   const result={year,lessons,tasks};
   if(JSON.stringify(result).length>45000)throw Error('계획 분량이 너무 큽니다. 메모를 줄여 주세요.');
   return result;
 }

 return validate(raw);
}
function bw59Saved_(sheet){
 if(!sheet||sheet.getLastRow()<2)return {revision:0,values:null,etag:'new',requestId:'',updatedAt:''};
 const r=sheet.getRange(sheet.getLastRow(),1,1,5).getValues()[0];
 if(!Number.isSafeInteger(r[0])||r[0]<1||r[0]>=1000000000)throw Error('개정번호를 확인해 주세요.');
 return {revision:r[0],values:bw59Validate_(JSON.parse(String(r[3]))),etag:bw17Hash_(JSON.stringify(r)).slice(0,32),requestId:String(r[4]||''),updatedAt:String(r[1]||'')};
}
function bw59Sheet_(book,create){
 const spec=bw59Spec_(),state=bw55TabState_(book,spec);
 if(state==='mismatch')throw Error('계획 대장의 열 구성이 변경되었습니다. 기존 자료는 수정하지 않습니다.');
 return state==='missing'?(create?bw55CreateTab_(book,spec):null):book.getSheetByName(spec.name);
}
function bw59View_(s){return {revision:s.revision,values:s.values,etag:s.etag,updatedAt:s.updatedAt};}
function staff59LaunchRead(token){
 bw24Authorized_(token,'operations','read',['owner']);
 return {version:BW59_SERVER.VERSION,plan:bw59View_(bw59Saved_(bw59Sheet_(bw17Book_(),false)))};
}
function staff59LaunchSave(token,p){
 const user=bw24Authorized_(token,'operations','write',['owner']),values=bw59Validate_(p&&p.values);
 const requestId=String(p&&p.requestId||''),etag=String(p&&p.etag||'');
 if(!/^[a-f0-9-]{36}$/i.test(requestId)||!(/^(new|[a-f0-9]{32})$/.test(etag)))throw Error('최신 계획 조회 후 저장해 주세요.');
 const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  const book=bw17Book_(),sheet=bw59Sheet_(book,false),saved=bw59Saved_(sheet);
  if(saved.requestId===requestId){
   if(JSON.stringify(saved.values)!==JSON.stringify(values))throw Error('같은 저장 요청에 다른 계획이 입력되었습니다.');
   return {ok:true,duplicate:true,version:BW59_SERVER.VERSION,plan:bw59View_(saved)};
  }
  if(saved.etag!==etag)throw Error('다른 화면 또는 시트에서 수정되었습니다. 최신 계획을 다시 조회해 주세요.');
  const rev=saved.revision+1;if(rev>=1000000000)throw Error('개정번호 한도를 확인해 주세요.');
  const target=sheet||bw59Sheet_(book,true);
  target.appendRow([rev,bw17Now_(),user.email,JSON.stringify(values),requestId]);
  const committed=bw59Saved_(target);let auditWarning=false;
  try{bw17Audit_(user,'개원·교육·홍보 계획 저장','BW59 계획','성공','v'+rev);}catch(_){auditWarning=true;}
  return {ok:true,version:BW59_SERVER.VERSION,plan:bw59View_(committed),auditWarning};
 }finally{lock.releaseLock();}
}
