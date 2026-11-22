'use strict';
/* V39 — studio-first staff UI. Synthetic role/menu fixtures only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const app=read('assets/js/administration.js');
const portal=read('assets/js/staff-enterprise-v33.js');
const help=read('assets/js/staff-ux-v31.js');
const css=read('assets/css/staff-sensory-v39.css');
const index=read('staff/index.html');
const standalone=read('staff/standalone.html');
const gasAdmin=read('server/apps-script/Admin.html');
const server=read('server/apps-script/Code.gs');
const matches=app.match(/const MENU=(\[[^\n]+\]);/);
if(!matches)throw Error('The staff menu declaration is missing');
const MENU=vm.runInNewContext('('+matches[1]+')');
const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body></body></html>',{
  url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only'
});
dom.window.eval(portal);
const NAV=dom.window.BW33Enterprise.definitions;
let passed=0;
function test(label,fn){fn();passed++;console.log('PASS '+label);}
test('every original authorized workflow remains in exactly one visible studio category',()=>{
  const pages=MENU.map(m=>m[0]).filter(id=>id!=='home');
  const grouped=NAV.flatMap(g=>g.sections.flatMap(s=>s.pages));
  assert.equal(new Set(grouped).size,grouped.length,'duplicate route in grouped navigation');
  assert.deepEqual([...grouped].sort(),[...pages].sort(),'lost or invented staff pages');
});
test('primary categories follow sensory studio operations instead of academy hierarchy',()=>{
  assert.deepEqual(Array.from(NAV,g=>g.label),[
    '상담·등록','클래스 운영','오감놀이 준비','이용료·문서','스튜디오 관리'
  ]);
  assert.ok(NAV[0].sections.flatMap(s=>s.pages).includes('inquiries'));
  assert.ok(NAV[1].sections.flatMap(s=>s.pages).includes('attendance'));
  assert.ok(NAV[2].sections.flatMap(s=>s.pages).includes('safety'));
  assert.ok(NAV[4].sections.flatMap(s=>s.pages).includes('compliance'));
});
test('staff UI uses everyday child, caregiver, class and sensory vocabulary',()=>{
  const labels=new Map(MENU.map(row=>[row[0],row[2]]));
  assert.equal(labels.get('home'),'스튜디오 홈');
  assert.equal(labels.get('inquiries'),'체험·클래스 상담');
  assert.equal(labels.get('students'),'아이 기본정보');
  assert.equal(labels.get('safety'),'재료·안전 점검');
  assert.equal(labels.get('themes'),'월간 오감놀이 계획');
  assert.equal(labels.get('courseSettings'),'스튜디오 운영정보');
  assert.equal(labels.get('compliance'),'운영 기준·법정 확인');
  assert.doesNotMatch(MENU.map(row=>row[2]).join(' '),/학원·행정|학원 운영정보/);
});
test('dashboard groups allowed work without new private API calls',()=>{
  assert.match(app,/bw39-workstreams/);
  assert.match(app,/상담·등록/);
  assert.match(app,/오감놀이 준비/);
  assert.match(app,/스튜디오 운영/);
  assert.match(app,/call\('staffDashboard',token\)\.then/);
  assert.match(app,/bw24Can\(x\[0\]\)/);
  assert.doesNotMatch(portal,/fetch\s*\(|localStorage|sessionStorage|SPREADSHEET_ID/);
});
test('legal checks remain visible but do not presume the registered business type',()=>{
  const compliance=read('assets/js/staff-compliance-v32.js');
  assert.match(compliance,/교육지원 서비스업으로 등록하더라도 실제로 영유아에게 수업을 제공한다면 학원법 적용 대상이 될 수 있습니다/);
  assert.match(compliance,/staff32DownloadInspectionPdf/);
  assert.match(server,/function bw24Can_/);
  assert.match(help,/운영 기준·법정 확인/);
  assert.match(read('assets/js/administration.js'),/전자서명|서명/);
});
test('mobile action cards fit one column without changing brand colors',()=>{
  assert.match(css,/\.bw39-workstreams\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:350px\)/);
  assert.doesNotMatch(css,/--forest\s*:|--sage\s*:|--cream\s*:/);
});
test('GitHub staff entrypoints get the new layer; Apps Script /exec remains on V38',()=>{
  for(const html of [index,standalone]){
    assert.match(html,/staff-sensory-v39\.css\?v=41\.0\.0/);
    for(const asset of ['staff-google-bridge.js','staff-native-kdf.js','administration.js','staff-enterprise-v33.js','staff-ux-v31.js']){
      assert.ok(html.includes(asset+'?v='+(asset==='administration.js'?'53.0.0':asset==='staff-enterprise-v33.js'?'49.0.0':'41.0.0')),asset);
    }
  }
  assert.match(gasAdmin,/administration-layout\.js\?v=38\.0\.0/);
  assert.doesNotMatch(gasAdmin,/staff-sensory-v39\.css/);
});
dom.window.close();
console.log(JSON.stringify({suite:'V39 sensory staff UI',passed}));
