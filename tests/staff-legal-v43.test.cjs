'use strict';
/* V43 — education-support legal applicability and plain Korean.
 * Synthetic-only tests; no Google requests or guardian records.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=path=>fs.readFileSync(__dirname+'/../'+path,'utf8');
const compliance=read('assets/js/staff-compliance-v32.js');
const app=read('assets/js/administration.js');
const documentCatalog=read('assets/js/staff-documents-v42.js');
const server=read('server/apps-script/Code.gs');
const refundServer=read('server/apps-script/Compliance.gs');
const report=read('docs/BRIDGE_V43_LEGAL_REVIEW_EDUCATION_SUPPORT.md');
const drafts=read('docs/BRIDGE_V43_PARENT_FORM_DRAFTS.md');
const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body></body></html>',{
  url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only'
});
dom.window.eval(compliance);
const rows=dom.window.BW32Compliance.catalog;
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('preserve all original 26 legal status keys and server contracts',()=>{
  const expected=[
    'REG01','REG02','REG03','REG04','REG05',
    'FEE01','FEE02','FEE03','FEE04','FEE05',
    'STAFF01','STAFF02','STAFF03','STAFF04',
    'PRIV01','PRIV02','PRIV03','PRIV04',
    'SAFE01','SAFE02','SAFE03','SAFE04','SAFE05',
    'OPS01','OPS02','OPS03'
  ];
  assert.deepEqual(Array.from(rows,x=>x.code),expected);
  assert.match(server,/function staffDocTypes\(token\)/);
  assert.match(refundServer,/function staff32SaveRefund/);
});
test('studio criteria are conditional and do not declare automatic exemption',()=>{
  const data=rows.map(r=>r.title+' '+r.help).join('\n');
  for(const s of ['85709','북부교육지원청','영어','부가세','환불','놀이시설','법정대리인']){
    assert.ok(data.includes(s),s);
  }
  assert.match(compliance,/교육지원 서비스업으로 등록하더라도 실제로 영유아에게 수업을 제공한다면 학원법 적용 대상이 될 수 있습니다/);
  assert.doesNotMatch(compliance,/등록 없이도 합법|학원법 면제|교육지원업은 법정 등록 제외/);
  assert.ok(rows.some(r=>r.code==='REG02'&&r.kind==='관할 확인'));
});
test('old academy-only refund deadline is explicitly labeled a legacy calculation',()=>{
  assert.match(compliance,/기존 서버 계산값/);
  assert.match(compliance,/기존 시스템 참고일 \(5일\)/);
  assert.match(compliance,/신규 체험·정기 이용권의 환불 기준과 기한은 적용 법령을 확인/);
  assert.doesNotMatch(compliance,/반환사유 발생일부터 5일 이내 반환 원칙/);
  assert.match(app,/실제로 환불한 건만 ‘환불완료’/);
});
test('staff copy is brief, conversational Korean and flags pre-existing templates',()=>{
  assert.match(app,/필요한 업무부터 편하게 시작하세요/);
  assert.match(app,/신규 스튜디오 이용계약에 적용하기 전에 확인/);
  assert.match(app,/기존 학원용 항목은 적용 여부를 먼저 확인/);
  assert.match(app,/기존 수강조건 저장/);
  assert.doesNotMatch(app,/오늘 필요한 업무를 확인하고 바로 시작하세요/);
  assert.doesNotMatch(app,/기한은 관할 교육지원청의 기준에 맞춰 직접 설정/);
  assert.match(documentCatalog,/기존 학원형 양식/);
  assert.match(documentCatalog,/신규 스튜디오 이용동의서가 아님/);
  assert.doesNotMatch(documentCatalog,/새 이용동의서 자동 생성 완료/);
});
test('parent drafts clearly separate consent and prevent false finished issuance',()=>{
  for(const str of ['선택 동의서','법정대리인','동의하지 않아도','환불','민감정보','미구현']){
    assert.ok(drafts.includes(str),str);
  }
  assert.match(drafts,/개발·법률 검토용/);
  assert.match(report,/최종.*확정|결론/);
  assert.match(report,/2026-11-21/);
  assert.match(report,/051-330-1291~1295/);
});
test('no public marketing, original PDF, user secrets or new privileged transport was added',()=>{
  assert.doesNotMatch(compliance,/fetch\s*\(|localStorage|sessionStorage|google\.script\.run/);
  assert.doesNotMatch(documentCatalog,/fetch\s*\(|localStorage|sessionStorage|google\.script\.run/);
  assert.match(read('staff/index.html'),/staff-documents-v42\.js\?v=43\.0\.0/);
  assert.match(read('staff/standalone.html'),/staff-documents-v42\.js\?v=43\.0\.0/);
});
dom.window.close();
console.log(JSON.stringify({suite:'V43 education support + copy',passed}));
