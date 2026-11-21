'use strict';
/* V41 — Four brand colors, top-first navigation and natural Korean staff copy.
 * Uses only fictional role data, never requests external/Google services.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=path=>fs.readFileSync(__dirname+'/../'+path,'utf8');
const css=read('assets/css/staff-enterprise-v40.css');
const page=read('staff/index.html');
const alt=read('staff/standalone.html');
const script=read('assets/js/staff-enterprise-v33.js');
const app=read('assets/js/administration.js');
const help=read('assets/js/staff-ux-v31.js');
const bridge=read('assets/js/staff-google-bridge.js');
const raw=app.match(/const MENU=(\[[^\n]+\]);/);
assert.ok(raw,'existing menu contract must be intact');
const MENU=Array.from(vm.runInNewContext('('+raw[1]+')'),x=>Array.from(x));
const final=css.slice(css.indexOf('/* 10 — V41'));
if(!final)throw Error('V41 top-navigation CSS layer is missing');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
function fixture(role='owner') {
  const dom=new JSDOM('<!doctype html><html lang="ko"><body>'+
    '<div id="workspace" class="app"><aside class="sidebar"><nav id="sideNav"></nav></aside>'+
    '<main class="main"><header class="topbar"><div class="bw21-topbar-lockup">'+
    '<h1 id="topTitle">스튜디오 운영</h1></div><div class="row"></div></header>'+
    '<nav id="mobileNav"></nav><div id="pageBody"></div></main></div></body></html>',{
      url:'https://bridgewonder.bridgeacademy.co.kr/staff/',
      runScripts:'outside-only',pretendToBeVisual:true
    });
  const w=dom.window,d=w.document;w.eval(script);
  const allowed=new Set(MENU.filter(x=>x[3].includes(role)).map(x=>x[0]));
  const state={user:{email:role+'@example.invalid',role},page:'home'};
  const navigations=[];
  w.BW33Enterprise.configure({state,MENU,can:id=>allowed.has(id),
    navigate:id=>{navigations.push(id);state.page=id;},toast:()=>{}});
  w.BW33Enterprise.sync();
  return {dom,w,d,state,allowed,navigations};
}
check('forest, sage, cream and terracotta are the four staff brand accents',()=>{
  for(const [key,value]of [['forest','#40543a'],['sage','#99a682'],
    ['cream','#fbf8f2'],['orange','#d1693b']]){
    assert.ok(final.includes('--bw41-'+key+':'+value+';'),key);
  }
  assert.match(final,/\.bw33-group-trigger\[aria-expanded=true\]::after\s*\{[^}]*var\(--bw41-orange\)/s);
  assert.match(final,/\.bw41-guide|\.bw31-guide/);
  assert.doesNotMatch(final,/--forest\s*:|--sage\s*:|--cream\s*:|--orange\s*:/);
});
check('V41 overrides the obsolete desktop sidebar and restores every top category',()=>{
  assert.match(final,/@media\(min-width:1080px\)\s*\{[^]*?#workspace\.bw33-ready>\.sidebar\s*\{display:none!important;\}/);
  assert.match(final,/#workspace\.bw33-ready \.bw33-primary-groups\s*\{[^}]*display:flex!important;/s);
  assert.match(final,/#workspace\.bw33-ready \.bw33-home\s*\{[^}]*display:inline-flex!important;/s);
  assert.match(final,/#workspace\.bw33-ready \.bw33-navigation\s*\{[^}]*top:0!important;/s);
  assert.match(final,/@media\(max-width:850px\)/);
  assert.match(final,/@media\(max-width:560px\)/);
  assert.match(page,/staff-enterprise-v40\.css\?v=41\.0\.0/);
  assert.match(alt,/staff-enterprise-v40\.css\?v=41\.0\.0/);
});
check('owner can open five categories at the top, select a task and search',()=>{
  const f=fixture('owner');
  const groups=Array.from(f.d.querySelectorAll('#bw33NavGroups [data-bw33group-trigger]'));
  assert.deepEqual(groups.map(x=>x.textContent.trim()),[
    '상담·등록','클래스 운영','오감놀이 준비','이용료·문서','스튜디오 관리'
  ]);
  const button=f.d.querySelector('[data-bw33group-trigger="sensory"]');
  button.click();
  assert.equal(button.getAttribute('aria-expanded'),'true');
  const menu=f.d.getElementById('bw33Panel-sensory');
  assert.equal(menu.hidden,false);
  menu.querySelector('[data-bw33go="safety"]').click();
  assert.equal(f.state.page,'safety');
  assert.equal(menu.hidden,true);
  f.w.BW33Enterprise.sync();
  assert.ok(f.d.querySelector('[data-bw33group-trigger="sensory"]').classList.contains('is-active'));
  f.d.getElementById('bw33SearchToggle').click();
  const input=f.d.getElementById('bw33SearchInput');
  input.value='재료';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.ok(f.d.querySelector('#bw33SearchResults [data-bw33go="safety"]'));
  f.dom.window.close();
});
check('permission-limited staff see only permitted top categories and routes',()=>{
  const f=fixture('teacher');
  const names=Array.from(f.d.querySelectorAll('#bw33NavGroups [data-bw33group-trigger]'),x=>x.textContent.trim());
  assert.ok(names.includes('클래스 운영'));
  assert.ok(names.includes('오감놀이 준비'));
  assert.ok(!names.includes('스튜디오 관리'));
  assert.equal(f.d.querySelector('.bw33-menu-panel [data-bw33go="payroll"]'),null);
  assert.equal(f.d.querySelector('.bw33-menu-panel [data-bw33go="students"]'),null);
  f.d.getElementById('bw33SearchToggle').click();
  const input=f.d.getElementById('bw33SearchInput');
  input.value='급여';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.equal(f.d.querySelectorAll('#bw33SearchResults [data-bw33go]').length,0);
  f.dom.window.close();
});
check('the visible staff login is provider-neutral while the actual transport remains unchanged',()=>{
  for(const source of [page,alt]){
    const doc=new JSDOM(source).window.document;
    const login=doc.getElementById('loginScreen');
    assert.ok(login);
    assert.doesNotMatch(login.textContent,/Google|구글|Apps Script|SECURE WORKSPACE|OPERATIONS PORTAL/);
    assert.ok(login.querySelector('#passwordLoginForm'));
    assert.ok(login.querySelector('#emailForm'));
    assert.ok(login.querySelector('#otpForm'));
    assert.ok(login.querySelector('#bw27-check-server'));
    assert.ok(login.querySelector('details.bw40-login-help'));
    assert.ok(login.querySelector('a[href^="https://script.google.com/"]'));
    assert.ok(login.querySelector('#bw27-server-status'));
  }
  assert.match(bridge,/hostname !== 'script\.google\.com'/);
  assert.match(bridge,/transport !== 'google-apps-script'/);
  assert.match(bridge,/운영 시스템에 연결되었습니다/);
  assert.doesNotMatch(bridge,/'Google 서버|Google 웹앱 통신이 차단/);
});
check('plain Korean guidance and the privacy-sensitive route contract are intact',()=>{
  assert.match(help,/수업 횟수와 시간은 상담 후 정하면 됩니다/);
  assert.match(help,/아이 명단을 불러온 뒤/);
  assert.match(app,/관리 시스템 업데이트가 필요합니다/);
  assert.match(app,/보호자 동반 여부와 수업 후 인계 결과만 기록해 주세요/);
  const permissions=JSON.parse(app.match(/const BW24_CAPS=(\{[^\n]+\});/)[1]);
  assert.deepEqual(Object.keys(permissions).sort(),MENU.map(x=>x[0]).sort());
  assert.ok(!permissions.payroll.read.includes('teacher'));
  assert.ok(permissions.inquiries.read.includes('frontdesk'));
});
check('no public website or server file is touched by staff V41 presentation imports',()=>{
  assert.doesNotMatch(read('sensory-studio/index.html'),/staff-enterprise-v40\.css/);
  assert.doesNotMatch(read('index.html'),/staff-enterprise-v40\.css/);
  assert.doesNotMatch(css,/fetch\s*\(|localStorage|sessionStorage|SPREADSHEET_ID/);
});
console.log(JSON.stringify({suite:'V41 staff top categories, four-color palette and Korean copy',passed:checks}));
