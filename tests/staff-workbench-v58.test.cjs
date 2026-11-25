'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const names={inquiries:'inq',registrations:'reg',classes:'classes',caps:'caps',wait:'wait',makeup:'makeup',tasks:'tasks',safety:'safety'};
const headers={
 inq:['시각','접수번호','보호자','연락처','월령','유형','시간','메모','처리상태'],
 reg:['접수번호','운영자 최종 등록 상태','보호자'],
 classes:['등록반 코드','수강조건 코드','수업 시작일','수업 요일','수업 시간','교습 기간','공개 상태','운영자 검토'],
 caps:['수업반 코드','기준 정원','확인자','수정시각'],
 wait:['대기번호','접수시각','상담 접수번호','희망 수업반','희망 시작일','처리 상태','업무 메모','수정자','수정시각'],
 makeup:['보강번호','접수시각','수강등록 접수번호','원래 수업반','원래 수업일','요청 구분','보강 수업반','보강 날짜','처리 상태','담당자','업무 메모','수정자','수정시각'],
 tasks:['점검코드','분야','확인할 일','구분','처리상태','확인 예정일','담당자','증빙 참조(비공개)','최종 수정자','수정시각'],
 safety:['수업일','반 코드','공통 주제','재료 유형','재료 상태','실내 안전','소형 교구','위생·정리','보호자 사전안내','조치사항(민감정보 제외)','기록자','수정시각']
};
class Sheet{
 constructor(key,rows){this.key=key;this.rows=[headers[key],...rows];this.override=null;}
 getLastRow(){return this.override??this.rows.length;}
 getLastColumn(){return this.rows[0].length;}
 getRange(r,c,n,m){calls.push(this.key);return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>this.rows[r+i-1]?.[c+j-1]??''))};}
}
let calls=[],opens=0,readAccess={},role='owner';
const tabs=new Map([
 ['inq',new Sheet('inq',[['','I1','private name','010-1111-2222','','','','private note','신규'],['','I2','','','','','','','연락중'],['','I3','','','','','','','종결'],['','I4','','','','','','','unknown']])],
 ['reg',new Sheet('reg',[['R1','등록확정','secret name'],['R2','취소'],['R3','확인전']])],
 ['classes',new Sheet('classes',[['A'],['B'],['C'],['D']])],
 ['caps',new Sheet('caps',[['A',4],['B',3],['B',4],['C',5]])],
 ['wait',new Sheet('wait',[['W1','','I1','A','','대기'],['W2','','I2','B','','안내완료']])],
 ['makeup',new Sheet('makeup',[['M1','','R1','A','','','','','접수'],['M2','','R2','B','','','','','검토중'],['M3','','R3','A','','','','','확정']])],
 ['tasks',new Sheet('tasks',[['SAFE01','시설','do not reveal edit','','완료','2026-11-24','secret person'],['OPS01','','private title','','진행중','2026-11-24','secret person','private evidence'],['OPS02','','','','보완필요','2026. 12. 2.'],['UNKNOWN','','','','미확인','invalid']])],
 ['safety',new Sheet('safety',[['2026-11-25','A','','','확인완료','확인완료','확인완료','확인완료','확인완료','secret action'],['2026-11-25','B','','','조치필요','확인완료','확인완료','확인완료','확인완료'],['2026-11-24','A','','','조치필요']])]
]);
const all={home:true,inquiries:true,registrations:true,waitlist:true,makeups:true,capacity:true,operations:true,safety:true,courseSettings:true,finance:true,classes:true,themes:true,documents:true};
readAccess={...all};
const c=vm.createContext({
 BW17:{INQUIRIES:'inq',REGISTRATIONS:'reg',CLASSES:'classes',CLASS_HEADERS:headers.classes},
 BW20:{WAIT:'wait',WAIT_HEAD:headers.wait,MAKEUP:'makeup',MAKEUP_HEAD:headers.makeup,CAPS:'caps',CAP_HEAD:headers.caps,WAIT_STATUSES:['대기','연락중','안내완료','철회'],MAKEUP_STATUSES:['접수','검토중','확정','거절','취소']},
 BW18:{TASKS:'tasks',TASK_HEADERS:headers.tasks,TASKS_DEFAULT:[['OPS01','','수업 운영 준비'],['OPS02','','교실 정리']],TASK_STATUSES:['미확인','진행중','완료','보완필요'],SAFETY:'safety',SAFETY_HEADERS:headers.safety,SAFETY_STATUSES:['확인완료','조치필요','해당없음']},
 bw24Authorized_:(token,mod,mode)=>{if(token!=='valid'||mod!=='home'||mode!=='read'||!readAccess.home)throw Error('권한 없음');return {role,classes:['A']};},
 bw24Permissions_:()=>({read:readAccess}),
 bw17Book_:()=>{opens++;return {getSheetByName:n=>tabs.get(n)||null};},
 Utilities:{formatDate:()=> '2026-11-25'},
 bw17Now_:()=> '2026-11-25 13:42:00',
 bw55Published_:()=>({weeks:10,total:320000}),bw56Sheet_:()=>null,bw56Saved_:()=>({values:null})
});
vm.runInContext(read('server/apps-script/StudioWorkbenchV58.gs'),c);
assert.throws(()=>c.staff58WorkspaceSnapshot('bad'),/권한/);assert.equal(opens,0);
const owner=c.staff58WorkspaceSnapshot('valid');
const by=(r,key)=>r.blocks.find(b=>b.key===key);
assert.equal(opens,1);assert.equal(owner.version,'58.0.0');
assert.equal(by(owner,'inquiries').metrics.pending,2);assert.equal(by(owner,'inquiries').metrics.unknown,1);
assert.equal(by(owner,'registrations').metrics.confirmed,1);assert.equal(by(owner,'registrations').metrics.review,2);
assert.equal(by(owner,'capacity').metrics.configured,1);assert.equal(by(owner,'capacity').metrics.invalid,2);assert.equal(by(owner,'capacity').metrics.missing,1);
assert.equal(by(owner,'operations').metrics.done,1);assert.equal(by(owner,'operations').metrics.overdue,1);assert.equal(by(owner,'operations').metrics.upcoming,1);assert.equal(by(owner,'operations').metrics.undated,1);
assert.equal(by(owner,'operations').due[0].title,'수업 운영 준비');
assert.equal(by(owner,'safety').metrics.recorded,2);assert.equal(by(owner,'safety').metrics.attention,1);
assert.equal(by(owner,'pricing').metrics.approved,true);assert.equal(by(owner,'planning').metrics.saved,false);
assert.doesNotMatch(JSON.stringify(owner),/private|secret|010-1111|R1|I1|M1|320000/);
role='teacher';readAccess={home:true,makeups:true,capacity:true,safety:true};calls=[];
const teacher=c.staff58WorkspaceSnapshot('valid');
assert.equal(teacher.blocks.length,3);
assert.equal(by(teacher,'makeups').metrics.pending,1);
assert.equal(by(teacher,'capacity').metrics.total,1);
assert.equal(by(teacher,'safety').metrics.recorded,1);assert.equal(by(teacher,'safety').metrics.attention,0);
assert.ok(!calls.includes('inq')&&!calls.includes('tasks')&&!calls.includes('reg'));
role='owner';readAccess={...all};
tabs.get('inq').override=5002;tabs.delete('wait');tabs.get('caps').rows[0]=['bad header'];
const errors=c.staff58WorkspaceSnapshot('valid');
assert.equal(by(errors,'inquiries').state,'oversize');
assert.equal(by(errors,'waitlist').state,'missing');assert.equal(by(errors,'waitlist').metrics,null);
assert.equal(by(errors,'capacity').state,'schema');assert.equal(by(errors,'capacity').metrics,null);
assert.equal(by(errors,'operations').state,'ready','one missing sheet must not stop other modules');
console.log('PASS V58 permission filtering, source states, no raw records, scoped counts, readiness deadlines');
assert.match(read('server/apps-script/StaffBridge.gs'),/staff58WorkspaceSnapshot:/);
assert.match(read('tools/build-integrated-install-v58.py'),/StudioWorkbenchV58\.gs/);
const shell=read('assets/js/staff-workspace-v57.js'),script=read('assets/js/staff-workbench-v58.js'),html=read('staff/workbench/index.html');
const user={role:'owner',permissions:{read:all}};
(async()=>{
 const dom=new JSDOM(html,{url:'https://bridgewonder.bridgeacademy.co.kr/staff/workbench/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,12));
 w.sessionStorage.setItem('bw17_staff_session','valid');
 let n=0,hold=false,release=null;
 w.BW27Bridge={request:async(name,args)=>{
   if(name==='staffCurrentUser')return user;
   if(name==='staff58WorkspaceSnapshot'){n++;if(hold)return new Promise(r=>release=r);return owner;}
   if(name==='staffLogout')return {ok:true};
   throw Error('unexpected '+name);
 }};
 w.eval(shell);w.eval(script);await tick();
 assert.equal($('bw58Workspace').hidden,false);assert.equal(n,1);
 assert.equal($('bw58Cards').querySelectorAll('.bw58-card').length,9);
 assert.match($('bw58ProgressValue').textContent,/1 \/ 4개 완료 · 25%/);
 assert.equal($('bw58Due').children.length,2);
 assert.ok($('bw58Links').querySelector('a[href="/staff/?area=consult&page=waitlist"]'));
 $('bw58Search').value='수업안';$('bw58Search').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.ok($('bw58Links').querySelector('a[href="/staff/curriculum/"]'));
 assert.equal($('bw58Links').querySelector('a[href="/staff/planning/"]'),null);
 hold=true;$('bw58Refresh').click();await tick();assert.equal($('bw58Cards').children.length,0);
 $('bw58Logout').click();release(owner);await tick();assert.equal($('bw58Workspace').hidden,true);
 assert.equal($('bw58Cards').children.length,0);assert.equal(w.sessionStorage.getItem('bw17_staff_session'),null);
 dom.window.close();
 const fallback=new JSDOM(html,{url:'https://bridgewonder.bridgeacademy.co.kr/staff/workbench/',runScripts:'outside-only',pretendToBeVisual:true});
 const f=fallback.window;f.sessionStorage.setItem('bw17_staff_session','valid');f.BW27Bridge={request:async name=>{if(name==='staffCurrentUser')return user;throw Error('허용되지 않은 업무 요청입니다.');}};
 f.eval(shell);f.eval(script);await tick();
 assert.match(f.document.getElementById('bw58State').textContent,/V58 Google 서버 설치/);
 assert.ok(f.document.getElementById('bw58Links').querySelector('a[href="/staff/planning/"]'));
 assert.equal(f.document.getElementById('bw58Cards').children.length,0);
 fallback.window.close();
 console.log('PASS V58 UI summary, navigation search, logout isolation and older-server fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
