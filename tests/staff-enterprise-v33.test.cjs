'use strict';
/* V33 enterprise navigation tests — fictional staff and parent documents only.
 * No external requests, saved data, or authenticated accounts.
 */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(__dirname+'/../assets/js/staff-enterprise-v33.js','utf8');
const style=fs.readFileSync(__dirname+'/../assets/css/staff-enterprise-v33.css','utf8');
const app=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
const html=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const fixtureHTML='<!doctype html><html lang="ko"><body>'+
  '<div id="workspace" class="app"><aside class="sidebar"><nav id="sideNav"></nav></aside><main class="main">'+
  '<header class="topbar"><div class="bw21-topbar-lockup"><h1 id="topTitle">오늘의 업무</h1></div><div class="row"><span id="roleBadge">선생님</span></div></header>'+
  '<nav id="mobileNav"></nav><div class="bw20-mobile-switch"><select id="bw20PageSelect"></select></div>'+
  '<div id="pageBody" class="content"></div></main></div></body></html>';
const dom=new JSDOM(fixtureHTML,{url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true});
const win=dom.window,doc=win.document;
win.eval(script);
let routes=[],toast=[],passed=0,typeChanges=0;
const MENU=[
  ['home','⌂','스튜디오 홈'],['classes','▦','클래스 시간표'],['themes','♧','월간 오감놀이 계획'],
  ['attendance','✓','출결 체크'],['inquiries','◷','체험·클래스 상담'],['registrations','▤','등록 서류 확인'],
  ['documents','▣','보호자 문서·PDF'],['tuition','₩','수업비·환불 기록'],['operations','☷','시설·운영 점검'],
  ['compliance','▤','운영 기준·법정 확인'],['users','♙','직원 계정'],['payroll','₩','직원 급여'],['security','⌘','이용 기록·백업']
];
const access=new Set(['home','classes','attendance','inquiries','documents']);
const state={page:'home',user:{email:'teacher@example.invalid',role:'teacher'}};
function navigate(page){routes.push(page);state.page=page;}
function test(name,fn){fn();passed++;console.log('PASS',name);}
const api=win.BW33Enterprise;
test('progressive enhancement does not remove sidebar before configured render',()=>{
  assert.equal(doc.getElementById('workspace').classList.contains('bw33-ready'),false);
  assert.equal(doc.querySelector('aside.sidebar')?.isConnected,true);
});
api.configure({state,MENU,can:id=>access.has(id),navigate,toast:(msg,err)=>toast.push({msg,err})});
api.sync();
test('fully horizontal header appears with only role-allowed grouped items',()=>{
  assert.ok(doc.getElementById('workspace').classList.contains('bw33-ready'));
  assert.ok(doc.getElementById('bw33Navigation'));
  assert.equal(doc.querySelectorAll('#bw33NavGroups [data-bw33group-trigger]').length,3);
  assert.equal(doc.querySelectorAll('.bw33-menu-panel [data-bw33go]').length,4);
  assert.equal(doc.querySelector('[data-bw33go="users"]'),null);
  assert.equal(doc.querySelector('[data-bw33go="payroll"]'),null);
  assert.equal(doc.querySelector('[data-bw33go="security"]'),null);
  assert.ok(doc.getElementById('bw33PdfToggle'));
  assert.match(doc.getElementById('bw33Breadcrumb').textContent,/스튜디오 홈/);
});
test('top-level parent menu shows second-level sections and click navigates',()=>{
  const group=doc.querySelector('[data-bw33group-trigger="consult"]');
  assert.ok(group);
  group.click();
  assert.equal(group.getAttribute('aria-expanded'),'true');
  const panel=doc.getElementById('bw33Panel-consult');
  assert.equal(panel.hidden,false);
  assert.match(panel.textContent,/문의와 대기/);
  assert.match(panel.textContent,/체험·클래스 상담/);
  panel.querySelector('[data-bw33go="inquiries"]').click();
  assert.equal(state.page,'inquiries');
  assert.equal(panel.hidden,true);
  api.sync();
  assert.match(doc.getElementById('bw33Breadcrumb').textContent,/체험·클래스 상담/);
});
test('Ctrl+K finds allowed tasks without additional requests or access bypass',()=>{
  const key=new win.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true});
  doc.dispatchEvent(key);
  const search=doc.getElementById('bw33SearchInput');
  assert.equal(doc.getElementById('bw33SearchPanel').hidden,false);
  search.value='PDF';search.dispatchEvent(new win.Event('input',{bubbles:true}));
  const rows=[...doc.querySelectorAll('#bw33SearchResults button[data-bw33go]')];
  assert.equal(rows.length,1);
  assert.equal(rows[0].dataset.bw33go,'documents');
  search.value='급여';search.dispatchEvent(new win.Event('input',{bubbles:true}));
  assert.equal(doc.querySelectorAll('#bw33SearchResults [data-bw33go]').length,0);
  doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.getElementById('bw33SearchPanel').hidden,true);
});
test('parent document button opens secure existing PDF flow with selected type',()=>{
  doc.getElementById('bw33PdfToggle').click();
  assert.equal(doc.getElementById('bw33PdfPanel').hidden,false);
  assert.match(doc.getElementById('bw33PdfPanel').textContent,/교습비 영수증/);
  doc.querySelector('#bw33DocShortcuts [data-bw33doc="contract"]').click();
  assert.equal(state.page,'documents');
  assert.equal(doc.getElementById('bw33PdfPanel').hidden,true);
  const root=doc.getElementById('pageBody');
  root.innerHTML='<h2 class="page-title">문서 발급</h2><p class="page-description">PDF 생성</p>'+
    '<section class="panel"><select id="docType"><option value="registration">수강 등록 확인서</option>'+
      '<option value="contract">전자서명 계약서 사본</option>'+
      '<option value="notice">일반 안내문</option></select><select id="docSource"><option value="">기록 선택</option></select></section>'+
    '<section class="panel"><div id="docPreview"></div></section>'+
    '<section class="panel"><div id="docResult"></div><button id="docDownloadBtn">다운로드</button></section>'+
    '<details class="bw31-history"><summary>발급 기록</summary><section class="panel"><div id="docHistory">이전 문서</div></section></details>';
  typeChanges=0;
  doc.getElementById('docType').addEventListener('change',()=>typeChanges++);
  api.pageReady('documents');
  assert.equal(doc.getElementById('docType').value,'contract');
  assert.equal(typeChanges,1);
  assert.ok(doc.getElementById('bw33DocumentHub'));
  assert.equal(doc.querySelectorAll('#bw33DocumentChoices [data-bw33doc]').length,3);
  assert.ok(!doc.querySelector('[data-bw33doc="payment"]')?.closest('#bw33DocumentChoices'));
  doc.getElementById('bw33HistoryOpen').click();
  assert.equal(doc.querySelector('.bw31-history').open,true);
  assert.equal(routes.filter(x=>x==='documents').length,1,'no navigation loop');
});
test('document template button switches existing doc type without generating content',()=>{
  doc.querySelector('#bw33DocumentChoices [data-bw33doc="notice"]').click();
  assert.equal(doc.getElementById('docType').value,'notice');
  assert.equal(typeChanges,2);
  doc.querySelector('#bw33DocumentChoices [data-bw33doc="contract"]').click();
  assert.equal(typeChanges,3);
  assert.equal(doc.querySelectorAll('[id="bw33DocumentHub"]').length,1);
});
test('role denial hides PDF shortcut and inaccessible groups',()=>{
  access.delete('documents');access.delete('inquiries');
  state.page='home';api.sync();
  assert.equal(doc.getElementById('bw33PdfToggle').hidden,true);
  assert.equal(doc.querySelector('[data-bw33group-trigger="consult"]'),null);
  assert.equal(doc.querySelectorAll('.bw33-menu-panel [data-bw33go="documents"]').length,0);
  const before=routes.length;
  api.openDocument('contract');
  assert.equal(routes.length,before);
});
test('client never calls network, writes secrets or stores guardian data',()=>{
  assert.doesNotMatch(script,/fetch\s*\(|localStorage|sessionStorage|SPREADSHEET_ID|OWNER_EMAIL|PRIVATE_PEPPER/);
  assert.match(style,/\.bw33-ready/);
  assert.match(style,/\.sidebar\{display:none!important/);
  assert.match(html,/staff-enterprise-v33\.js\?v=41\.0\.0/);
  assert.match(app,/BW33Enterprise\?\.sync/);
  assert.match(app,/BW33Enterprise\?\.pageReady/);
});
dom.window.close();
console.log(JSON.stringify({suite:'V33 enterprise top navigation and parent PDF shortcuts',passed}));
