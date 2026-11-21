'use strict';
/* V44 — Parent-accompanied sensory studio (7-48 months, 4 children per session). */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const pages=['sensory-studio/index.html','sensory-studio/programs/index.html',
 'sensory-studio/experience/index.html','sensory-studio/visit/index.html','sensory-studio/story/index.html'];
const portal=read('index.html');
const enrollment=read('sensory-studio/enroll/index.html');
const privacy=read('sensory-studio/privacy/index.html');
const staff=read('assets/js/administration.js');
const backend=read('server/apps-script/Code.gs');
const report=read('docs/BRIDGE_V43_LEGAL_REVIEW_EDUCATION_SUPPORT.md');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('all public sensory pages provide consistent age, child and parent limits',()=>{
  for(const p of pages){
    const doc=new JSDOM(read(p)).window.document;
    const card=doc.querySelector('.bw44-family-card');
    assert.ok(card,p+' missing participation card');
    assert.match(card.textContent,/7~48개월/);
    assert.match(card.textContent,/아이 최대 4명/);
    assert.match(card.textContent,/보호자 1명 동반/);
    assert.match(card.textContent,/아이만 맡기는 분리 수업은 운영하지 않습니다/);
    assert.match(read(p),/sensory-family-v44\.css\?v=44\.0\.0/);
    assert.match(read(p),/site\.js\?v=44\.0\.0/);
  }
  assert.match(portal,/아이 최대 4명/);
  assert.match(read('assets/js/site.js'),/한 회차 아이 최대 4명/);
});
test('intake remains consultation-only, no automatic booking',()=>{
  const visit=read('sensory-studio/visit/index.html');
  assert.ok(visit.includes('id="online-inquiry"'));
  assert.match(visit,/아이 한 명당 보호자 한 명이 함께 들어와 수업이 끝날 때까지 참여합니다/);
  assert.match(visit,/한 회차에 아이는 최대 4명/);
  assert.match(visit,/상담 신청은 예약 확정이 아닙니다/);
  assert.doesNotMatch(visit,/온라인 수강 등록으로 이동/);
});
test('legacy academy enrollment page is paused without erasing legacy source or registrations',()=>{
  const page=new JSDOM(enrollment).window.document;
  assert.match(page.querySelector('#main').textContent,/온라인 이용 신청은/);
  assert.match(page.querySelector('#main').textContent,/신규 이용 신청이나 전자서명을 받지 않습니다/);
  assert.equal(page.querySelector('#bw11-enrollment-form'),null);
  assert.equal(page.querySelector('#bw16-day'),null);
  assert.equal(page.querySelector('script[src*="enrollment-client.js"]'),null);
  assert.ok(page.querySelector('a[href="../visit/#online-inquiry"]'));
  const archive=read('tests/fixtures/legacy-enroll-v43.fixture');
  assert.match(archive,/id="bw11-enrollment-form"/);
  assert.match(read('assets/js/enrollment-client.js'),/BW-|enroll/i);
});
test('privacy text distinguishes old signups from current contact-only service',()=>{
  assert.match(privacy,/기존 온라인 수강등록 기록/);
  assert.match(privacy,/신규 온라인 이용 신청서와 전자서명은 현재 준비 중입니다/);
  assert.match(privacy,/상담만으로 예약이나 결제가 확정되지 않습니다/);
});
test('new server cap is 4 and staff cannot configure a higher class capacity',()=>{
  assert.match(backend,/n<1\|\|n>4/);
  assert.match(backend,/n<1\|\|n>4/);
  assert.match(staff,/id="bw20cap-\$\{h\(x\.id\)\}" type="number" min="1" max="4"/);
  assert.match(staff,/아이 정원은 1~4명으로 입력해 주세요/);
  assert.match(report,/7~48개월/);
});
test('public pages never claim preapproval, exemption or child drop-off',()=>{
  for(const p of pages){
    const h=read(p);
    assert.doesNotMatch(h,/학원법 적용 제외 확정|학원 등록 필요 없음|무허가 합법|아이만 맡기세요/);
  }
  assert.match(read('assets/js/staff-compliance-v32.js'),/법제처 25-0736/);
});
console.log(JSON.stringify({suite:'V44 small parent-accompanied sensory studio',passed}));
