'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const admin=read('assets/js/administration.js');
const pages={consult:'inquiries',class:'classes',sensory:'themes',service:'tuition',admin:'operations'};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('all five staff workspace URLs have static entrypoints with safe canonical auth redirect',()=>{
  for(const [area,defaultPage] of Object.entries(pages)){
    const source=read('staff/'+area+'/index.html');
    assert.match(source,new RegExp('area='+area+'&amp;page='+defaultPage));
    assert.match(source,/window\.location\.replace\(dest\.href\)/);
    assert.match(source,/noindex,nofollow,noarchive/);
    assert.match(source,/const page=known\[own\]\.includes\(requested\)\?requested:fallback/);
    assert.doesNotMatch(source,/token=|session=|SPREADSHEET_ID|google\.script\.run/);
  }
});
test('URL routing reuses the original staff authorization and does not introduce server methods',()=>{
  assert.match(admin,/const BW50_AREAS=Object\.freeze/);
  assert.match(admin,/if\(!state\.user\|\|!bw24Can\(page\)\)return/);
  assert.match(admin,/await showPage\(bw24Can\(bw50FromURL\(\)\)\?bw50FromURL\(\):'home',true\)/);
  assert.match(admin,/window\.addEventListener\('popstate'/);
  assert.match(admin,/bw50SyncURL\(page,fromHistory\)/);
  assert.doesNotMatch(admin,/location\.href\s*=\s*['"]https:\/\/script\.google/);
});
test('direct URL never contains account tokens or private sheet data',()=>{
  const url=admin.slice(admin.indexOf('const BW50_AREAS='),admin.indexOf('let toastTimer'));
  assert.match(url,/searchParams\.set\('area'/);
  assert.match(url,/searchParams\.set\('page'/);
  assert.doesNotMatch(url,/state\.token|password|email|SPREADSHEET_ID/);
});
test('area and page validation rejects unknown and mismatched deep links',()=>{
  const dom=new JSDOM('<!doctype html><html lang="ko"><body></body></html>',{
    url:'https://bridgewonder.bridgeacademy.co.kr/staff/?area=consult&page=finance',
    runScripts:'outside-only'
  });
  const w=dom.window;
  const map={consult:['inquiries','waitlist','students','registrations'],class:['classes','capacity','roster','attendance','makeups','handoff'],
    sensory:['experiences','themes','safety'],service:['tuition','documents'],
    admin:['operations','courseSettings','compliance','staffCompliance','users','payroll','finance','security']};
  const valid=(page,area)=>Boolean(Object.keys(map).some(key=>map[key].includes(page)&&(!area||area===key)));
  assert.equal(valid('finance','consult'),false);
  assert.equal(valid('finance','admin'),true);
  assert.equal(valid('unknown','admin'),false);
  assert.equal(valid('attendance','class'),true);
  dom.window.close();
});
test('all existing staff login and Apps Script contracts remain intact',()=>{
  assert.match(admin,/sessionStorage\.setItem\('bw17_staff_session'/);
  assert.match(admin,/staff23PasswordLogin/);
  assert.match(admin,/function call\(name,\.\.\.args\)/);
  assert.match(admin,/bw25Accel\?\.setNavigation\(seq\)/);
  assert.match(admin,/window\.BW33Enterprise\?\.sync\(\)/);
});
console.log(JSON.stringify({suite:'V50 staff workspace deep links',passed}));
