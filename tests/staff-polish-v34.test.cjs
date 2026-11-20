'use strict';
/* V34 staff UI copy and layout regressions; static checks only.
 * Functional flows are covered by existing authentication/payroll/document tests.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(__dirname+'/../'+path,'utf8');
const css=read('assets/css/staff-polish-v34.css');
const admin=read('assets/js/administration.js');
const payroll=read('assets/js/administration-payroll.js');
const help=read('assets/js/staff-ux-v31.js');
const portal=read('assets/js/staff-enterprise-v33.js');
const files=['staff/index.html','staff/standalone.html','server/apps-script/Admin.html'];
let passed=0;
function test(name,check){check();passed++;console.log('PASS',name);}
test('header height is content-driven and work navigation never overlaps the header',()=>{
  assert.match(css,/#workspace\.bw33-ready \.topbar\s*\{\s*position:\s*relative;/);
  assert.match(css,/#workspace\.bw33-ready \.bw33-navigation\s*\{\s*position:\s*sticky;\s*top:\s*0;/);
  assert.match(css,/@media\s*\(max-width:\s*600px\)/);
  assert.match(css,/grid-template-columns:\s*minmax\(0,1fr\);/);
  assert.match(css,/grid-template-rows:\s*auto auto;/);
});
test('all images and preview tables have bounded width without stretching their ratio',()=>{
  assert.match(css,/#workspace\.bw33-ready \.bw21-topbar-mark\s*\{/);
  assert.match(css,/object-fit:\s*contain;/);
  assert.match(css,/#workspace\.bw33-ready \.doc-preview-brand \.bw21-doc-preview-logo\s*\{/);
  assert.match(css,/height:\s*auto;/);
  assert.match(css,/#workspace\.bw33-ready \.doc-preview \.table-scroll\s*\{/);
  assert.match(css,/overflow-x:\s*auto;/);
});
test('helper text has legible consistent size instead of tiny low-contrast footnotes',()=>{
  assert.match(css,/#workspace\.bw33-ready \.footnote,/);
  assert.match(css,/font-size:\s*12\.5px;/);
  assert.match(css,/line-height:\s*1\.75;/);
  assert.match(css,/#workspace\.bw33-ready \.bw33-document-hint,/);
});
test('administration and payroll instructions use direct, natural language',()=>{
  assert.match(admin,/실제 수납·환불 내역을 확인한 뒤 기록해 주세요/);
  assert.match(admin,/발급한 PDF는 스튜디오 전용 문서함에 보관됩니다/);
  assert.match(admin,/보호자는 학원 인계 절차에 따라 확인하고/);
  assert.doesNotMatch(admin,/저장 즉시 Google Sheets에 반영됩니다/);
  assert.doesNotMatch(admin,/현재 Apps Script는 접속 IP 주소를 별도로 확보하지 못합니다/);
  assert.match(payroll,/급여관리 설정을 확인해 주세요/);
  assert.match(payroll,/금액과 공제 내역을 확인한 후 확정하고/);
  assert.doesNotMatch(payroll,/V26 서버 파일을 적용하고 급여관리 초기 설정을 실행/);
});
test('plain-language guidance preserves critical contract/receipt distinction',()=>{
  assert.match(admin,/등록 확인서와 납부 내역 안내서는 계약서나 영수증을 대신할 수 없습니다/);
  assert.match(portal,/납부 내역 안내서는 교습비 영수증과 다릅니다/);
  assert.match(help,/클래스 출결/);
  assert.match(help,/아이 명단을 불러온 뒤/);
  assert.doesNotMatch(portal,/PARENT DOCUMENT SERVICE/);
});
test('polish stylesheet and fresh cache versions load in all staff entrypoints',()=>{
  const staticPages=files.map(read);
  for(const html of staticPages.slice(0,2))assert.match(html,/staff-polish-v34\.css\?v=39\.0\.0/);
  // The separate Apps Script /exec page stays on V38 until the owner redeploys it.
  assert.match(staticPages[2],/staff-polish-v34\.css\?v=38\.0\.0/);
  const index=staticPages[0];
  for(const script of ['staff-google-bridge.js','administration-accelerator.js','staff-native-kdf.js','staff-account-management.js','staff-ux-v31.js','staff-enterprise-v33.js','administration.js']){
    assert.ok(index.includes(script+'?v=39.0.0'),script);
  }
  assert.match(admin,/administration-payroll\.js\?v=39\.0\.0/);
});
console.log(JSON.stringify({suite:'V34 staff text and overlap prevention',passed}));
