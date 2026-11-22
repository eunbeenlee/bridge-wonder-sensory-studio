'use strict';
/* V47 — 22 parent questions, staff consultation UI only. No customer records or server calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const client=read('assets/js/staff-parent-faq-v47.js');
const staff=read('staff/index.html');
const fallback=read('staff/standalone.html');
const publicPages=[
  'index.html','sensory-studio/index.html','sensory-studio/programs/index.html',
  'sensory-studio/experience/index.html','sensory-studio/visit/index.html',
  'sensory-studio/enroll/index.html','sensory-studio/privacy/index.html',
  'sensory-studio/story/index.html'
];
const GROUP_LENGTHS={A:5,B:5,C:5,D:5,E:2};
let passed=0;
function test(label,fn){fn();passed++;console.log('PASS '+label);}
function createHTML(){
  return '<!doctype html><html lang="ko"><head></head><body>'+
    '<div id="workspace"><div id="pageBody" class="content">'+
    '<h2 class="page-title">체험·클래스 상담</h2>'+
    '<section class="panel"><div id="inquiryRows"></div><input id="inqSearch" type="search"></section>'+
    '</div></div></body></html>';
}
(async()=>{
  test('both staff entrypoints load FAQ as a separate deferred script after existing administration',()=>{
    for(const file of [staff,fallback]){
      const admin=file.indexOf('administration.js?v=53.0.0');
      const qa=file.indexOf('staff-parent-faq-v47.js?v=47.0.0');
      assert.ok(admin>=0&&qa>admin,'staff FAQ must load after existing app');
    }
    for(const path of publicPages)assert.doesNotMatch(read(path),/staff-parent-faq-v47/);
    assert.doesNotMatch(read('server/apps-script/Code.gs'),/staff47ParentFaq/);
  });
  test('the FAQ script does not talk to Google or persist text on the device',()=>{
    assert.doesNotMatch(client,/fetch\s*\(|localStorage|sessionStorage|google\.script|SPREADSHEET_ID|user\.email/);
    assert.match(client,/within authorized staff consultation UI/);
    assert.match(client,/GitHub-hosted source asset, not a confidential repository/);
  });
  const dom=new JSDOM(createHTML(),{
    url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const win=dom.window,d=win.document,copied=[];
  Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{writeText:async t=>copied.push(t)}});
  win.eval(client);
  d.dispatchEvent(new win.Event('DOMContentLoaded'));
  const hub=d.getElementById('bw47FaqHub');
  const data=Array.from(win.BW47ParentFAQ.items);
  test('22 questions are represented in the same five user-defined groups',()=>{
    assert.ok(hub);
    assert.equal(data.length,22);
    assert.deepEqual(data.map(x=>x.n),Array.from({length:22},(_,i)=>i+1));
    for(const [group,count] of Object.entries(GROUP_LENGTHS)){
      assert.equal(data.filter(x=>x.group===group).length,count,group);
    }
    assert.equal(hub.open,false,'initially collapsed to keep inquiry page compact');
    assert.equal(hub.querySelectorAll('details.bw47-item').length,22);
  });
  test('answers preserve the operator original but show plain-language draft by default',()=>{
    assert.match(data[1].original,/10주간의 수업/);
    assert.match(data[2].original,/35,000원/);
    assert.match(data[9].original,/민형사상 책임/);
    assert.match(data[15].original,/단순변심은 불가능/);
    assert.match(data[20].original,/English Immersion/);
    assert.match(data[21].original,/딱히/);
    assert.match(data[9].answer,/즉시 중단/);
    assert.match(data[15].answer,/관련 법령/);
    assert.match(data[12].answer,/아이 최대 4명/);
    assert.match(data[3].answer,/현재 운영하는 모든 클래스는 보호자/);
    assert.equal(hub.querySelectorAll('.bw47-original').length,22);
  });
  test('unreviewed pricing, waiver, refund, 36+ separation and sibling capacity cannot be copied',()=>{
    for(const id of [2,3,4,9,10,12,13,15,16,17,19,20]){
      const item=data.find(x=>x.n===id);
      assert.equal(item.status,'review','Q'+id);
      assert.equal(hub.querySelector('[data-bw47-number="'+id+'"] [data-bw47-copy]'),null);
      assert.match(hub.querySelector('[data-bw47-number="'+id+'"]').textContent,/확인 전 보호자에게 전송하지 마세요/);
    }
    assert.match(data[9].note,/약관규제법 제7조/);
    assert.match(data[15].note,/개인 사정·단순 변심/);
    assert.match(data[2].note,/기존 공개 홈페이지/);
  });
  test('FAQ search and category / review filters update real results',()=>{
    const search=d.getElementById('bw47Search'),category=d.getElementById('bw47GroupFilter'),status=d.getElementById('bw47StatusFilter');
    search.value='환불';search.dispatchEvent(new win.Event('input',{bubbles:true}));
    let found=[...hub.querySelectorAll('details.bw47-item')];
    assert.ok(found.length>0&&found.length<22);
    for(const card of found)assert.match(card.textContent,/환불|중도/);
    search.value='';search.dispatchEvent(new win.Event('input',{bubbles:true}));
    category.value='E';category.dispatchEvent(new win.Event('change',{bubbles:true}));
    found=[...hub.querySelectorAll('details.bw47-item')];
    assert.deepEqual(found.map(x=>Number(x.dataset.bw47Number)),[21,22]);
    category.value='';category.dispatchEvent(new win.Event('change',{bubbles:true}));
    status.value='review';status.dispatchEvent(new win.Event('change',{bubbles:true}));
    assert.ok(hub.querySelectorAll('details.bw47-item').length<22);
    assert.ok([...hub.querySelectorAll('details.bw47-item')].every(x=>x.textContent.includes('확인 필요')));
    status.value='';status.dispatchEvent(new win.Event('change',{bubbles:true}));
  });
  await (async()=>{
    const button=hub.querySelector('[data-bw47-copy="6"]');
    assert.ok(button);button.click();await new Promise(r=>setImmediate(r));
    assert.equal(copied.length,1);
    assert.match(copied[0],/영어를 처음 듣는 아이도/);
    assert.match(hub.textContent,/답변을 복사했습니다/);
    console.log('PASS draft copy action works and flagged answers have no copy button');
    passed++;
  })();
  await (async()=>{
    const root=d.getElementById('pageBody');
    root.replaceChildren();
    await new Promise(r=>setImmediate(r));
    assert.equal(d.querySelector('#bw47FaqHub'),null);
    root.innerHTML='<section class="panel"><div id="inquiryRows"></div><input id="inqSearch"></section>';
    await new Promise(r=>setImmediate(r));
    assert.equal(root.querySelectorAll('#bw47FaqHub').length,1);
    console.log('PASS Q&A is remounted once when staff revisits consultations');
    passed++;
  })();
  test('responsive neutral studio style and no public or false legal clearance labels',()=>{
    assert.match(d.getElementById('bw47FaqStyle').textContent,/@media\(max-width:680px\)/);
    assert.doesNotMatch(client,/검토 완료|법적 문제 없음|공개용 FAQ 확정/);
    assert.match(client,/확인 필요/);
    assert.match(client,/원문 보기/);
  });
  dom.window.close();
  console.log(JSON.stringify({suite:'V47 parent consultation FAQ staff staging',passed}));
})().catch(error=>{console.error(error);process.exitCode=1;});
