'use strict';
/* V40 enterprise portal presentation regression. Tests synthetic staff fixtures,
 * never calls Google or accesses genuine staff/guardian/student information.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const get=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const css=get('assets/css/staff-enterprise-v40.css');
const html=get('staff/index.html');
const fallback=get('staff/standalone.html');
const app=get('assets/js/administration.js');
const groupJs=get('assets/js/staff-ux-v31.js');
const topJs=get('assets/js/staff-enterprise-v33.js');
const baseCss=get('assets/css/administration.css');
const matches=app.match(/const MENU=(\[[^\n]+\]);/);
assert.ok(matches,'existing route/menu registry should remain present');
const MENU=vm.runInNewContext('('+matches[1]+')');
let count=0;
function check(name,fn){fn();console.log('PASS',name);count++;}

check('the new corporate skin only loads on staff entrypoints and is last',()=>{
  for(const page of [html,fallback]){
    assert.match(page,/staff-enterprise-v40\.css\?v=40\.0\.0/);
    assert.ok(page.indexOf('staff-sensory-v39.css')<page.indexOf('staff-enterprise-v40.css'));
    assert.ok(page.indexOf('staff-ux-v31.css')<page.indexOf('staff-enterprise-v40.css'));
    assert.match(page,/id="loginScreen"/);
    assert.match(page,/id="workspace" class="app" hidden/);
    assert.match(page,/id="sideNav"/);
    assert.match(page,/id="bw20PageSelect"/);
  }
  assert.doesNotMatch(get('sensory-studio/index.html'),/staff-enterprise-v40/);
  assert.doesNotMatch(get('index.html'),/staff-enterprise-v40/);
});
check('desktop uses existing scrollable grouped sidebar and keeps toolbar controls accessible',()=>{
  assert.match(css,/@media\(min-width:1080px\)/);
  assert.match(css,/#workspace\.bw33-ready\s*\{[^}]*display:grid!important;[^}]*grid-template-columns:246px minmax\(0,1fr\)/s);
  assert.match(css,/#workspace\.bw33-ready>\.sidebar\s*\{[^}]*display:flex!important;[^}]*position:sticky;[^}]*height:100vh;/s);
  assert.match(css,/#workspace\.bw33-ready \.sidebar-nav\s*\{[^}]*overflow-y:auto/s);
  assert.match(css,/#workspace\.bw33-ready \.bw31-nav-items \.nav-btn/);
  assert.match(css,/#workspace\.bw33-ready \.bw33-primary-groups,\s*#workspace\.bw33-ready \.bw33-home\s*\{display:none!important;\}/s);
  assert.doesNotMatch(css,/#workspace\.bw33-ready \.bw33-primary-actions\s*\{\s*display:none/);
  assert.ok(html.indexOf('id="logoutBtn"')>=0,'original sidebar logout button preserved');
});
check('mobile top navigation and search/PDF retain functional routes',()=>{
  assert.match(css,/@media\(max-width:1079px\)/);
  assert.match(css,/#workspace\.bw33-ready \.bw33-primary-groups\s*\{[^}]*display:flex;/s);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(topJs,/data-bw33group-trigger/);
  assert.match(topJs,/bw33PdfToggle/);
  assert.match(topJs,/bw33SearchToggle/);
  assert.match(topJs,/Ctrl \+ K/);
  assert.doesNotMatch(css,/pointer-events:none!important/);
});
check('design avoids visual clutter with a flat KPI bar, consistent panels and table controls',()=>{
  assert.match(css,/\.metric-grid\s*\{[^}]*gap:0;[^}]*border:1px solid/s);
  assert.match(css,/\.metric\s*\{[^}]*border:0;[^}]*border-right:1px/s);
  assert.match(css,/\.panel\s*\{[^}]*border:1px solid var\(--bw40-border\);[^}]*box-shadow:none;/s);
  assert.match(css,/\.bw39-workstreams\s*\{[^}]*gap:0;/s);
  assert.match(css,/\.bw39-workstream \.cards-list \.btn\s*\{[^}]*border:1px solid transparent;/s);
  assert.match(css,/\.data-table th\s*\{/);
  assert.match(css,/\.data-table td\s*\{/);
  assert.match(css,/#workspace\.bw33-ready input:not\(\[type=checkbox\]\)/);
});
check('original tokens, permissions, authentication and data storage are not rewritten',()=>{
  const access=JSON.parse(app.match(/const BW24_CAPS=(\{[^\n]+\});/)[1]);
  assert.ok(access.students.read.includes('owner'));
  assert.ok(!access.students.read.includes('teacher'));
  assert.ok(access.payroll.read.length===1&&access.payroll.read[0]==='owner');
  assert.ok(access.inquiries.read.includes('frontdesk'));
  assert.ok(access.safety.read.includes('teacher'));
  assert.deepEqual([...new Set(MENU.map(m=>m[0]))].sort(),Object.keys(access).sort());
  assert.match(baseCss,/--forest:#40543a/);
  assert.doesNotMatch(css,/--forest\s*:|--sage\s*:|--orange\s*:|--cream\s*:/);
  assert.doesNotMatch(css,/fetch\s*\(|localStorage|sessionStorage|SPREADSHEET_ID|addEventListener/);
});
check('split-panel login carries the official logo and both authentication and password-recovery paths',()=>{
  for(const page of [html,fallback]){
    const doc=new JSDOM(page).window.document;
    const root=doc.getElementById('loginScreen');
    assert.ok(root,'original login route stays in place');
    assert.ok(root.querySelector('.login-wrap.bw40-login-layout'));
    assert.ok(root.querySelector('.bw40-login-intro .login-brand img.logo[src*="bridge-wonder-logo.png"]'));
    assert.equal(root.querySelectorAll('.bw40-login-intro').length,1);
    assert.ok(root.querySelector('.bw40-intro-areas'));
    assert.ok(root.querySelector('.bw40-login-panel .login-card'));
    assert.ok(root.querySelector('form#passwordLoginForm'));
    assert.ok(root.querySelector('form#emailForm'));
    assert.ok(root.querySelector('form#otpForm'));
    assert.ok(root.querySelector('#loginStepPassword'));
    assert.ok(root.querySelector('#loginStepEmail[hidden]'));
    assert.ok(root.querySelector('#loginStepOtp[hidden]'));
    assert.ok(root.querySelector('input#passwordEmail[autocomplete="username"]'));
    assert.ok(root.querySelector('input#passwordInput[type="password"]'));
    assert.ok(root.querySelector('input#loginOtp[autocomplete="one-time-code"]'));
    assert.ok(root.querySelector('input#bw23NewPass'));
    assert.ok(root.querySelector('input#bw23ConfirmPass'));
    assert.ok(root.querySelector('button#bw23FirstTime'));
    assert.ok(root.querySelector('button#bw23Reset'));
    assert.ok(root.querySelector('button#backToEmail'));
    assert.ok(root.querySelector('#loginFeedback[aria-live="polite"]'));
    assert.ok(root.querySelector('details.bw40-login-help summary'));
    assert.ok(root.querySelector('button#bw27-check-server'));
    assert.ok(root.querySelector('a[href^="https://script.google.com/macros/s/"]'));
    assert.equal(root.querySelectorAll('input#passwordEmail').length,1);
  }
  assert.ok(new JSDOM(html).window.document.querySelector('#loginScreen #bw27-server-status[aria-live="polite"]'));
  assert.match(css,/\.login-wrap\.bw40-login-layout\s*\{[^}]*display:grid;[^}]*grid-template-columns:minmax\(0,\.94fr\) minmax\(0,1\.06fr\)/s);
  assert.match(css,/\.bw40-login-intro\s*\{[^}]*background:#edf2eb;/s);
  assert.match(css,/@media\(max-width:850px\)[\s\S]*\.login-wrap\.bw40-login-layout\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/\.bw40-login-panel \.login-card input:not\(\[type=checkbox\]\):focus/);
  assert.match(css,/\.bw40-login-panel \.bw31-login-help/);
});
check('grouped navigation continues to honor each synthetic employee permission',()=>{
  const dom=new JSDOM('<!doctype html><html lang="ko"><body>'+
    '<div id="workspace" class="app"><aside class="sidebar"><nav id="sideNav" class="sidebar-nav"></nav></aside>'+
    '<main class="main"><header class="topbar"><div class="row"></div></header><nav id="mobileNav"></nav>'+
    '<select id="bw20PageSelect"></select><div id="pageBody"></div></main></div></body></html>',
    {url:'https://example.invalid/staff/',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.eval(groupJs);
  const permitted=new Set(['home','classes','roster','attendance','themes','safety','handoff']);
  const state={page:'home',user:{role:'teacher',email:'fictional@example.invalid'}};
  const links=MENU.filter(m=>permitted.has(m[0]));
  w.BW31UX.configure({state,MENU,can:id=>permitted.has(id),navigate:()=>{}});
  const side=d.getElementById('sideNav');
  for(const m of links){const b=d.createElement('button');b.type='button';b.dataset.page=m[0];b.textContent=m[2];side.appendChild(b);}
  w.BW31UX.decorateNav();
  const rendered=[...side.querySelectorAll('button[data-page]')].map(x=>x.dataset.page);
  assert.deepEqual(rendered.sort(),Array.from(links,m=>m[0]).sort());
  assert.equal(side.querySelector('[data-page="students"]'),null);
  assert.equal(side.querySelector('[data-page="payroll"]'),null);
  assert.ok(side.querySelector('.bw31-nav-group'));
  assert.equal(side.querySelectorAll('.bw31-nav-group[open]').length,1,'active category stays expanded');
  state.page='safety';w.BW31UX.decorateNav();
  assert.ok(side.querySelector('[data-page="safety"]').closest('details').open);
  dom.window.close();
});
console.log(JSON.stringify({suite:'V40 executive staff visual and role navigation',passed:count}));
