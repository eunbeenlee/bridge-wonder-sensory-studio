'use strict';
/* V44 — staff-only parent-participation model. Fictional accounts and classes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const src=read('assets/js/administration.js'),compliance=read('assets/js/staff-compliance-v32.js');
const index=read('staff/index.html'),standalone=read('staff/standalone.html');
const caps=JSON.parse(src.match(/const BW24_CAPS=(\{[^\n]+\});/)[1]);
const settle=async()=>{for(let i=0;i<22;i++)await Promise.resolve();await new Promise(r=>setImmediate(r));};
const fakeUser={email:'fixture-owner@example.invalid',name:'가상 운영자',role:'owner',status:'사용',classes:['BW-MON'],
  permissions:{read:Object.fromEntries(Object.entries(caps).map(([k,v])=>[k,v.read.includes('owner')])),
    write:Object.fromEntries(Object.entries(caps).map(([k,v])=>[k,v.write.includes('owner')]))}};
const rows=[
  {id:'BW-MON',day:'월요일',time:'10:00',status:'운영',enrolled:2,free:4,waiting:0,capacity:6},
  {id:'BW-TUE',day:'화요일',time:'11:00',status:'운영',enrolled:3,free:1,waiting:0,capacity:4}
];
const virtual=new VirtualConsole(),jsErrors=[];virtual.on('jsdomError',e=>jsErrors.push(e.message));
const dom=new JSDOM(read('staff/administration.html'),{
  url:'https://fixture.example.invalid/staff/administration.html',
  runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:virtual
});
const w=dom.window,d=w.document,called=[];
w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=function(){};
const api=(resolve,reject)=>new Proxy({}, {get(_target,name){
  if(name==='withSuccessHandler')return callback=>api(callback,reject);
  if(name==='withFailureHandler')return callback=>api(resolve,callback);
  return(...args)=>{called.push({name,args});
    Promise.resolve().then(()=>{
      if(name==='staff23PasswordLogin')return {ok:true,token:'fixture-token',user:fakeUser};
      if(name==='staffCurrentUser')return fakeUser;
      if(name==='staffDashboard')return {classCount:2,newInquiries:0,pendingEnrollments:0,updatedAt:'fixture time'};
      if(name==='staff20ActionCenter')return {items:[]};
      if(name==='staff20Capacity')return {rows,legacyNotice:0};
      if(name==='staff20SetCapacity')return {ok:true};
      if(name==='staffLogout')return {ok:true};
      if(name==='staffListClasses')return {rows:[],templates:[]};
      if(name==='staffListDailyChecks')return [];
      if(name==='staffListHandoffs')return [];
      throw Error('Unexpected mock RPC '+name);
    }).then(v=>resolve?.(JSON.parse(JSON.stringify(v))),e=>reject?.({message:e.message}));
  };
}});
w.google={script:{run:api()}};
w.eval(src+'\n;window.__v44={state,showPage};');
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
  const login=d.getElementById('passwordLoginForm');
  d.getElementById('passwordEmail').value=fakeUser.email;
  d.getElementById('passwordInput').value='Fixture-Password-1234';
  login.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await settle();
  await test('home states 7–48 months, 4 children, 4 guardians and 50-minute sessions',async()=>{
    const text=d.getElementById('pageBody').textContent;
    for(const phrase of ['7~48개월','아이 4명','보호자 4명','50분','돌봄은 운영하지 않습니다'])assert.ok(text.includes(phrase),phrase);
  });
  await w.__v44.showPage('capacity');await settle();
  await test('capacity screen warns when legacy classes exceed four without rewriting old data',async()=>{
    assert.match(d.getElementById('pageBody').textContent,/BW-MON.*기존 등록 인원과 정원을 확인/s);
    assert.equal(d.getElementById('bw20cap-BW-MON').max,'4');
    assert.equal(d.getElementById('bw20cap-BW-MON').value,'6');
    assert.equal(called.filter(c=>c.name==='staff20SetCapacity').length,0);
  });
  await test('UI refuses an over-four capacity even when input is changed by a script',async()=>{
    const input=d.getElementById('bw20cap-BW-MON');
    input.value='5';d.querySelector('[data-cap-save="BW-MON"]').click();await settle();
    assert.equal(called.filter(c=>c.name==='staff20SetCapacity').length,0);
  });
  await test('cannot set capacity below already enrolled student count',async()=>{
    const input=d.getElementById('bw20cap-BW-TUE');
    input.value='2';d.querySelector('[data-cap-save="BW-TUE"]').click();await settle();
    assert.equal(called.filter(c=>c.name==='staff20SetCapacity').length,0);
  });
  await test('valid four-child capacity reuses existing staff RPC without a new endpoint',async()=>{
    d.getElementById('bw20cap-BW-MON').value='4';d.querySelector('[data-cap-save="BW-MON"]').click();await settle();
    const saves=called.filter(c=>c.name==='staff20SetCapacity');
    assert.equal(saves.length,1);
    assert.equal(saves[0].args[1].classId,'BW-MON');assert.equal(saves[0].args[1].capacity,4);
  });
  await w.__v44.showPage('handoff');await settle();
  await test('handoff screen requires caregiver participation throughout the activity',async()=>{
    assert.match(d.getElementById('pageBody').textContent,/보호자 1명이 아이 1명과 수업 내내/);
    assert.match(d.getElementById('pageBody').textContent,/아이만 남겨 두는 경우/);
  });
  await test('legal checklist recognizes 9-or-fewer interpretation but does not invent an exemption',async()=>{
    w.eval(compliance);
    const items=Array.from(w.BW32Compliance.catalog);
    const regulation=items.find(x=>x.code==='REG02');
    assert.match(regulation.help,/법제처 25-0736/);
    assert.match(regulation.help,/교습소·다른 신고 의무/);
    assert.match(regulation.url,/moleg\.kr/);
    assert.equal(items.length,26);
    assert.doesNotMatch(compliance,/학원 등록 면제 확정|신고 불필요 확정/);
  });
  await test('only staff HTML and staff scripts are versioned; existing public page remains independent',async()=>{
    for(const html of [index,standalone])assert.match(html,/administration\.js\?v=44\.0\.0/);
    assert.match(src,/staff-compliance-v32\.js\?v=44\.0\.0/);
    const publicSite=read('sensory-studio/index.html');
    assert.doesNotMatch(publicSite,/BW44_POLICY|staff-compliance-v32|staff-parent-v44/);
    assert.doesNotMatch(src,/staff44Save|staff44Create|staff44SetCapacity/);
  });
  assert.deepEqual(jsErrors,[]);
  dom.window.close();
  console.log(JSON.stringify({suite:'V44 four-child parent-participation staff',passed}));
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
