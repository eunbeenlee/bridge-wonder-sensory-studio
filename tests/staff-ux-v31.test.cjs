'use strict';
/* V31 staff UX integration tests: synthetic fixture, no live Google calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(__dirname+'/../assets/js/staff-ux-v31.js','utf8');
const html=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const app=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS',label);}
const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body>'+
  '<main id="loginStepPassword"><div class="bw23-login-actions"><button id="bw23FirstTime">첫 사용</button><button id="bw23Reset">비밀번호 재설정</button></div><p class="bw23-legal"></p></main>'+
  '<section id="workspace"><div class="topbar"><div class="row"></div></div>'+
  '<nav id="sideNav"></nav><nav id="mobileNav"></nav><select id="bw20PageSelect"></select>'+
  '<main id="pageBody"></main></section></body></html>',
  {url:'https://example.invalid/staff/',runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.eval(script);
const state={page:'home',user:{role:'teacher',email:'teacher@example.invalid'}};
const MENU=[
 ['home','⌂','오늘의 업무'],['classes','▦','수업 시간표'],['attendance','✓','출석 체크'],
 ['inquiries','◷','상담 접수'],['users','♙','선생님 계정·권한'],['payroll','₩','급여관리']
];
const permitted=new Set(['home','classes','attendance']);
const navigate=page=>{state.page=page;};
w.BW31UX.configure({state,MENU,can:id=>permitted.has(id),navigate});
function buildNav(){
 const side=d.getElementById('sideNav');
 side.replaceChildren(...MENU.filter(m=>permitted.has(m[0])).map(m=>{
   const b=d.createElement('button');b.type='button';b.dataset.page=m[0];b.className='nav-btn';
   b.textContent=m[2];b.onclick=()=>navigate(m[0]);return b;
 }));
}
check('login recovery options remain present and become progressive disclosure',()=>{
 assert.ok(d.getElementById('bw31LoginDetails'));
 assert.equal(d.getElementById('bw23Reset').closest('details').id,'bw31LoginDetails');
 assert.equal(d.getElementById('bw23FirstTime').closest('details').id,'bw31LoginDetails');
});
check('native group dropdown only exposes allowed routes',()=>{
 buildNav();w.BW31UX.decorateNav();
 assert.equal(d.querySelectorAll('#sideNav button[data-page]').length,3);
 assert.equal(d.querySelectorAll('.bw31-nav-group').length,1);
 const select=d.getElementById('bw31TaskSelect');
 assert.equal(select.options.length,3);
 assert.ok([...select.querySelectorAll('optgroup')].some(g=>g.label==='수업·출결'));
 assert.ok(!select.textContent.includes('급여관리'));
 assert.ok(!select.textContent.includes('선생님 계정'));
});
check('dropdown switches page and selected group stays expanded',()=>{
 const select=d.getElementById('bw31TaskSelect');
 select.value='attendance';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(state.page,'attendance');w.BW31UX.decorateNav();
 assert.equal(d.querySelector('.bw31-nav-group').open,true);
 assert.equal(select.value,'attendance');
});
check('every authorized staff page provides a short instruction',()=>{
 state.page='attendance';
 d.getElementById('pageBody').innerHTML='<h2 class="page-title">출결</h2><p class="page-description">수강생 출결</p><section class="panel"></section>';
 w.BW31UX.onPageRendered('attendance');
 assert.match(d.getElementById('bw31Guide').textContent,/명단 불러오기/);
 w.BW31UX.onPageRendered('attendance');
 assert.equal(d.querySelectorAll('#bw31Guide').length,1);
});
check('class editor exposes saved time/period presets and collapses advanced fields',()=>{
 state.page='classes';
 const body=d.getElementById('pageBody');
 body.innerHTML='<h2 class="page-title">시간표</h2><p class="page-description">간편 수업반</p>'+
   '<form id="classForm"><div class="bw241-form-intro"></div>'+
   '<div class="bw241-grid"><div class="form-item"><label>수업 시간</label><input id="classTime" value=""><div class="bw241-chip-row"><button data-bw241-time="11:30–12:20" type="button">11:30</button></div></div>'+
   '<div class="form-item"><input id="classPeriod" value=""><div class="bw241-chip-row"><button type="button" data-bw241-period="1개월">1개월</button></div></div>'+
   '<div class="form-item"><input id="classId" value="BW-TUE-1130"></div></div>'+
   '<div class="bw241-grid"><div class="form-item"><select id="classTemplate"><option value="BW-SENSORY" selected>기본 과정</option></select></div>'+
   '<div class="form-item"><select id="classPublic"><option value="비공개">비공개</option><option value="공개">공개</option></select></div>'+
   '<div class="form-item"><select id="classReview"><option>확인전</option><option>검토완료</option></select></div></div></form>';
 w.BW31UX.onPageRendered('classes');
 const advanced=d.querySelector('.bw31-advanced');
 assert.ok(advanced);assert.equal(advanced.open,false);
 assert.equal(advanced.querySelectorAll('select').length,3);
 assert.equal(advanced.querySelector('#classId').value,'BW-TUE-1130');
 const presets=body.querySelectorAll('.bw31-preset-select');
 assert.equal(presets.length,2);
 presets[0].value='11:30–12:20';presets[0].dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('classTime').value,'11:30–12:20');
 assert.equal(d.querySelectorAll('#classTemplate').length,1);
 assert.ok(d.querySelectorAll('#bw31Guide').length===1);
});
check('operations status filter hides nonmatching cards without deleting data',()=>{
 state.page='operations';
 const root=d.getElementById('pageBody');
 root.innerHTML='<h2 class="page-title">운영 점검</h2><p class="page-description"></p><section class="panel">'+
  '<div class="toolbar"><select id="opsCategory"><option>전체 분야</option></select></div>'+
  '<div id="opsRows"><div class="ops-task-card"><h4>시설 안전</h4><select data-op-status="a"><option>미확인</option></select><button data-op-save="a">저장</button></div>'+
  '<div class="ops-task-card"><h4>교육 신고</h4><select data-op-status="b"><option>완료</option></select><button data-op-save="b">저장</button></div></div></section>';
 w.BW31UX.onPageRendered('operations');
 const status=d.querySelector('.bw31-preset-select');
 status.value='완료';status.dispatchEvent(new w.Event('change',{bubbles:true}));
 const cards=root.querySelectorAll('.ops-task-card');
 assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false);
 const search=root.querySelector('input[type=search]');
 search.value='시설';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,true);
 search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(cards[1].hidden,false);
});
check('staff UX remains frontend-only and does not send hidden data to GitHub',()=>{
 assert.doesNotMatch(script,/fetch\s*\(|localStorage\.|sessionStorage\.|SPREADSHEET_ID|OWNER_EMAIL|BW23_PRIVATE_PEPPER/);
 assert.match(app,/BW31UX\?\.onPageRendered/);
 assert.ok(html.includes('staff-ux-v31.js?v=30.0.0'));
});
console.log(JSON.stringify({suite:'V31 GitHub staff UX',passed:checks}));
dom.window.close();
