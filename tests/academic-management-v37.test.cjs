'use strict';
/* V37 safe offline tests for preliminary registration, two weekly classes,
 * monthly public themes and consultation-first public form.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const from=path=>fs.readFileSync(__dirname+'/../'+path,'utf8');
const academic=from('server/apps-script/AcademicManagement.gs');
const server=from('server/apps-script/Code.gs');
const bridge=from('server/apps-script/StaffBridge.gs');
const app=from('assets/js/administration.js');
const admin=from('assets/js/staff-academic-v37.js');
const publicExperience=from('assets/js/public-experience-v37.js');
const publicInquiry=from('assets/js/inquiry-client.js');
let passed=0;
const check=(label,fn)=>{fn();passed++;console.log('PASS '+label);};
class Sheet{
  constructor(headers){this.rows=[headers.slice()];}
  getLastRow(){return this.rows.length;}
  getLastColumn(){return this.rows[0].length;}
  getRange(row,col,count=1,width=1){
    const sheet=this;
    return{
      getDisplayValues(){return Array.from({length:count},(_,i)=>Array.from({length:width},(_,j)=>String(sheet.rows[row-1+i]?.[col-1+j]??'')));},
      setValues(vals){vals.forEach((item,i)=>{const ix=row-1+i;sheet.rows[ix]??=Array(sheet.rows[0].length).fill('');item.forEach((v,j)=>sheet.rows[ix][col-1+j]=v);});return this;}
    };
  }
}
function fixture(){
  const tabs=new Map(),props=new Map(),cache=new Map(),logs=[];let locked=false;
  const inquiry=new Sheet(['접수시각','접수번호','이전 이름','연락처','월령','문의','희망 연락시간','메모','상태','비고','비고','연락방법','아이 이름']);
  inquiry.rows.push(['2026-03-01','BW-ABCDEF123456','','01012345678','18','정규 수업 문의','오후',
    '[보호자:김보호][희망횟수:주 2회] 평일 오후','신규','','','문자','가상아이']);
  tabs.set('상담접수',inquiry);
  tabs.set('수강등록',new Sheet(['접수번호','아동 이름','아동 생년월','연락처','운영자 최종 등록 상태']));
  let list=[];const user={role:'owner',email:'owner@example.invalid',name:'원장',classes:[],canContact:true};
  const lock={waitLock(){assert.equal(locked,false,'Nested write lock');locked=true;},releaseLock(){assert.equal(locked,true);locked=false;}};
  const ctx=vm.createContext({
    Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(date,tz,fmt)=>{
      const ymd=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(date);
      return fmt==='yyyyMMdd'?ymd.replace(/-/g,''):ymd;
    }},
    PropertiesService:{getScriptProperties:()=>({
      getProperty:k=>props.get(k)||null,
      setProperty:(k,v)=>props.set(k,v),
    })},
    CacheService:{getScriptCache:()=>({
      get:k=>cache.get(k)||null,
      put:(k,v)=>cache.set(k,v),
      remove:k=>cache.delete(k)
    })},
    LockService:{getScriptLock:()=>lock},
    ContentService:{
      MimeType:{JAVASCRIPT:'application/javascript'},
      createTextOutput:txt=>({getContent:()=>txt,setMimeType(){return this;}})
    }
  });
  new vm.Script(academic,{filename:'AcademicManagement.gs'}).runInContext(ctx);
  ctx.BW17={INQUIRIES:'상담접수',REGISTRATIONS:'수강등록'};
  ctx.BW20={DAYS:['일요일','월요일','화요일','수요일','목요일','금요일','토요일']};
  ctx.bw17Safe_=(s,max)=>String(s??'').trim().slice(0,max||200);
  ctx.bw17Email_=v=>String(v||'').includes('@')?v:'';
  ctx.bw18Date_=(value,optional)=>{
    const s=String(value||'');
    if(!s&&optional)return '';
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error('날짜');
    return s;
  };
  ctx.bw17Tab_=(name,headers,create)=>{
    if(!tabs.has(name)&&create)tabs.set(name,new Sheet(headers));
    return tabs.get(name)||null;
  };
  ctx.bw17Book_=()=>({getSheetByName:name=>tabs.get(name)||null});
  ctx.bw17Read_=(sheet,max)=>sheet?{headers:sheet.rows[0],rows:sheet.rows.slice(1)}:{headers:[],rows:[]};
  ctx.bw17Field_=(headers,row,key)=>row[headers.indexOf(key)]||'';
  ctx.bw17Roster_=()=>[];
  ctx.bw24Authorized_=(token,name,mode,roles)=>{
    if(token!=='owner'&&token!=='director')throw Error('Unauthorized');
    return {...user,role:token,email:token+'@example.invalid'};
  };
  ctx.bw17Audit_=(u,action,target)=>logs.push({u,action,target});
  ctx.bw20ClassData_=()=>[
    {id:'BW-MON',day:'월요일',time:'10:00'},
    {id:'BW-THU',day:'목요일',time:'10:00'}
  ];
  ctx.bw20Class_=id=>{
    const found=ctx.bw20ClassData_().find(c=>c.id===id);
    if(!found)throw Error('수업반');
    return found;
  };
  ctx.bw20Counts_=()=>({counts:Object.fromEntries(ctx.bw20ClassData_().map(c=>[c.id,
    ctx.bw37ManualActive_({role:'owner',classes:[]}).filter(s=>s.classIds.includes(c.id)).length]))});
  ctx.bw20Caps_=()=>({'BW-MON':4,'BW-THU':4});
  ctx.bw37SignedKeys_=()=>new Set();
  return {ctx,tabs,cache,props,logs};
}
check('methods require authenticated roles; no student fields returned from public endpoint',()=>{
  assert.match(bridge,/staff37ListStudents:\s*staff37ListStudents/);
  assert.match(bridge,/staff37SaveStudent:\s*staff37SaveStudent/);
  assert.match(bridge,/staff37SaveExperience:\s*staff37SaveExperience/);
  assert.match(server,/"students":\{"label":"학생 기본정보 관리"/);
  assert.match(server,/"experiences":\{"label":"홈페이지 체험 테마"/);
  assert.match(server,/view==='experience'/);
  assert.match(app,/renderStudents37/);
  assert.match(app,/renderExperiences37/);
  assert.doesNotMatch(publicExperience,/staff37ListStudents|staff37SaveStudent|\.guardian\b|\.phone\b|\.email\b/);
});
const {ctx,tabs,cache,props}=fixture();
const common={child:'가상아이',guardian:'김보호',relation:'모',phone:'01012345678',
  birth:'',email:'',classIds:[],joined:'2026-03-02',status:'임시등록',evidence:'',
  verifiedAt:'',weekly:'주 2회',inquiryReceipt:'BW-ABCDEF123456',note:'상담 중',revision:0};
check('consultation import provides only safe prefill values, without auto enrollment',()=>{
  const result=ctx.staff37ListStudents('owner');
  assert.equal(result.inquiries.length,1);
  assert.equal(result.inquiries[0].child,'가상아이');
  assert.equal(result.inquiries[0].guardian,'김보호');
  assert.equal(result.inquiries[0].weekly,'주 2회');
  assert.throws(()=>ctx.staff37ListStudents('teacher'),/Unauthorized/);
});
let id;
check('save basic profile without a scheduled day or birth date, not enrolled yet',()=>{
  const result=ctx.staff37SaveStudent('owner',common);
  assert.equal(result.ok,true);id=result.id;
  assert.match(id,/^BW-S-[A-F0-9]{12}$/);
  const list=ctx.staff37ListStudents('owner').manual;
  assert.equal(list.length,1);assert.equal(list[0].status,'임시등록');
  assert.deepEqual([...list[0].classIds],[]);
  assert.equal(ctx.bw37ManualRoster_({role:'owner',classes:[],canContact:true}).length,0);
});
check('no duplicate consultations or premature weekly enrollment; classrooms require capacity',()=>{
  assert.throws(()=>ctx.staff37SaveStudent('owner',{...common,revision:0}),/같은 이름|이미.*등록/);
  const base={...common,id,revision:1,status:'재원',birth:'2025-01-20',
    evidence:'private approved',verifiedAt:'2026-03-02'};
  assert.throws(()=>ctx.staff37SaveStudent('owner',{...base,classIds:['BW-MON']}),/수업횟수|두 수업반/);
  assert.throws(()=>ctx.staff37SaveStudent('owner',{...base,phone:'129-555-1111',classIds:['BW-MON','BW-THU']}),/휴대전화/);
  const caps=ctx.bw20Caps_;
  ctx.bw20Caps_=()=>({'BW-MON':0,'BW-THU':4});
  assert.throws(()=>ctx.staff37SaveStudent('owner',{...base,classIds:['BW-MON','BW-THU']}),/정원/);
  ctx.bw20Caps_=caps;
});
check('after guardian confirmation, two classes appear independently in attendance roster',()=>{
  const result=ctx.staff37SaveStudent('owner',{...common,id,revision:1,
    status:'재원',birth:'2025-01-20',classIds:['BW-MON','BW-THU'],
    evidence:'private approved file',verifiedAt:'2026-03-02'});
  assert.equal(result.revision,2);
  const roster=ctx.bw37ManualRoster_({role:'owner',classes:[],canContact:true});
  assert.equal(roster.length,2);
  assert.deepEqual(roster.map(x=>x.classId).sort(),['BW-MON','BW-THU']);
  const teacher=ctx.bw37ManualRoster_({role:'teacher',classes:['BW-THU'],canContact:false});
  assert.equal(teacher.length,1);assert.equal(teacher[0].classId,'BW-THU');
  assert.equal(teacher[0].guardian,'');assert.equal(teacher[0].phone,'');
  assert.equal(ctx.bw37ManualStudent_(id,'2026-03-05').classId,'BW-THU');
  assert.equal(ctx.bw37ManualStudent_(id,'2026-03-02').classId,'BW-MON');
});
check('monthly experience publication is owner-only and public payload contains no personal information',()=>{
  const cards=[
    {title:'봄의 촉감',description:'꽃잎과 새싹을 만나요',tags:'꽃 · 촉감',image:'welcome'},
    {title:'색이 피어나요',description:'다양한 색을 찾아요',tags:'색 · 선택',image:'colors'},
    {title:'봄비의 소리',description:'비 오는 날 소리를 들어요',tags:'소리 · 리듬',image:'story-book'}
  ];
  assert.throws(()=>ctx.staff37SaveExperience('teacher',{month:'2027-03',cards,status:'공개'}),/Unauthorized/);
  const saved=ctx.staff37SaveExperience('owner',{month:'2027-03',heading:'봄을 만나는 시간',
    intro:'색과 소리로 봄을 만나봐요',cards,status:'공개',revision:0});
  assert.equal(saved.published,true);
  assert.equal(props.get('BW37_PUBLIC_EXPERIENCE_MONTH'),'2027-03');
  assert.equal(ctx.bw37PublicExperience_().theme.cards.length,3);
  const publicJs=ctx.bw37PublicExperienceScript_().getContent();
  assert.match(publicJs,/BWPublicExperience\.receive/);
  assert.doesNotMatch(publicJs,/김보호|01012345678|가상아이|private approved file/);
  assert.throws(()=>ctx.staff37SaveExperience('owner',{month:'2027-03',heading:'덮어쓰기',
    intro:'변경',cards,status:'공개',revision:0}),/수정/);
});
check('public monthly theme keeps hero illustrations synchronized and private details out',()=>{
  const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body>'+
    '<section class="experience-hero"><div class="eyebrow"></div><h1>old</h1><p>old</p>'+
    '<div class="scene-welcome"><img src="welcome.webp"></div>'+
    '<div class="scene-snow"><img src="snowy.webp"></div>'+
    '<div class="scene-colors"><img src="colors.webp"></div></section>'+
    '<section class="experience-themes"><div class="eyebrow"></div>'+
    '<h2 class="section-title"></h2><div class="experience-cards"></div></section>'+
    '</body></html>',{url:'https://bridgewonder.bridgeacademy.co.kr/sensory-studio/experience/',runScripts:'outside-only'});
  const w=dom.window;
  w.eval(publicExperience);
  w.BWPublicExperience.receive({ok:true,theme:{
    month:'2027-03',heading:'봄과 만나는 원더',intro:'새싹을 만나봐요',
    cards:[
      {title:'봄의 촉감',description:'새싹',tags:'촉감',image:'teddy'},
      {title:'색 탐험',description:'색의 발견',tags:'색',image:'colors'},
      {title:'봄비',description:'봄비 소리',tags:'소리',image:'story-book'}
    ]
  }});
  assert.equal(w.document.querySelectorAll('.experience-cards article').length,3);
  assert.match(w.document.querySelector('.scene-welcome img').src,/teddy\.webp$/);
  assert.match(w.document.querySelector('.scene-colors img').src,/story-book\.webp$/);
  assert.equal(w.document.querySelector('.experience-hero h1').textContent,'봄과 만나는 원더');
  dom.window.close();
});
check('new public form collects guardian and weekly frequency without mandatory schedule',()=>{
  const publicForm=from('sensory-studio/visit/index.html');
  assert.match(publicForm,/name="guardian"/);
  assert.match(publicForm,/name="weeklyPreference"/);
  assert.match(publicForm,/상담 후 결정/);
  assert.doesNotMatch(publicForm,/id="bw16-day"/);
  assert.match(publicInquiry,/희망횟수/);
  assert.doesNotMatch(publicInquiry,/localStorage\.setItem\([^)]*child|sessionStorage\.setItem\([^)]*guardian/);
  for(const p of ['sensory-studio/index.html','sensory-studio/story/index.html',
    'sensory-studio/programs/index.html','sensory-studio/experience/index.html']){
    assert.match(from(p),/간편 등록 상담/);
  }
});
check('manager frontend and public experience renderer parse without syntax errors',()=>{
  new vm.Script(admin,{filename:'staff-academic-v37.js'});
  new vm.Script(publicExperience,{filename:'public-experience-v37.js'});
  new vm.Script(publicInquiry,{filename:'inquiry-client.js'});
  assert.match(from('sensory-studio/experience/index.html'),/public-experience-v37\.js/);
  assert.match(from('sensory-studio/index.html'),/public-experience-v37\.js/);
});
console.log(JSON.stringify({suite:'V37 consultation-first student & public experience',passed}));
