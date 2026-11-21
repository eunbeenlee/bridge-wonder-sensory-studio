'use strict';
/* V42 — Sensory studio document catalog. Synthetic data only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../assets/js/staff-documents-v42.js','utf8');
const html=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const alt=fs.readFileSync(__dirname+'/../staff/standalone.html','utf8');
const original=fs.readFileSync(__dirname+'/../server/apps-script/Code.gs','utf8');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const documentHTML=types=>'<h2 class="page-title">보호자 문서·PDF</h2>'+
  '<p class="page-description">기존 안내</p><div class="warning">계약과 영수증 구분</div>'+
  '<div id="bw33DocumentHub"><div class="bw33-doc-hub-head"><h3>보호자 서류 발급</h3><p>기존 메뉴</p></div>'+
  '<div id="bw33DocumentChoices"><button type="button" data-bw33doc="notice">일반 안내문</button></div>'+
  '<div class="bw33-document-hint">기존 안내</div></div>'+
  '<div><select id="docType">'+types.map(type=>'<option value="'+type+'">'+type+'</option>').join('')+'</select></div>'+
  '<div class="footnote">기존 안내</div>';
function fixture(types) {
  const dom=new JSDOM('<!doctype html><html lang="ko"><head></head><body>'+
    '<div id="workspace"><nav id="bw33Navigation"><div id="bw33PdfPanel"><div id="bw33DocShortcuts">'+
    ['registration','contract','payment','class','inquiry','notice'].map(t=>
      '<button data-bw33doc="'+t+'"><span>'+t+'</span><small>기존</small></button>').join('')+
    '</div><p>교습비 영수증</p></div></nav>'+
    '<main id="pageBody">'+documentHTML(types)+'</main></div></body></html>',{
      url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true
    });
  dom.window.eval(source);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}
async function flush(){await new Promise(resolve=>setImmediate(resolve));}
(async()=>{
  test('both static staff entrypoints load V42 after V33 and before the existing app',()=>{
    for(const file of [html,alt]){
      const v33=file.indexOf('staff-enterprise-v33.js?v=41.0.0');
      const v42=file.indexOf('staff-documents-v42.js?v=43.0.0');
      const app=file.indexOf('administration.js?v=44.0.0');
      assert.ok(v33>=0&&v42>v33&&app>v42,'load order must remain stable');
    }
  });
  const dom=fixture(['inquiry','class','notice','payment','registration','contract']);
  const w=dom.window,d=w.document;
  await flush();
  test('catalog separates studio documents into real operating categories',()=>{
    const categories=[...d.querySelectorAll('.bw42-doc-group>summary')].map(x=>x.textContent);
    assert.equal(categories.length,6);
    for(const term of ['상담·체험','보호자 동의','클래스','이용료','영유아 안전','기존 계약']){
      assert.ok(categories.some(x=>x.includes(term)),term);
    }
    assert.match(d.querySelector('.page-title').textContent,/스튜디오 문서센터/);
  });
  test('all server-supported document IDs are retained unchanged',()=>{
    const enabled=[...d.querySelectorAll('#bw33DocumentChoices button[data-bw33doc]')].map(x=>x.dataset.bw33doc);
    assert.deepEqual(enabled.sort(),['inquiry','registration','payment','class','contract','notice'].sort());
    assert.ok(d.querySelector('#bw33DocumentChoices [data-bw33doc="contract"]').textContent.includes('기존 원본'));
    assert.ok(d.querySelector('[data-bw33doc="registration"]').textContent.includes('학원형'));
    assert.match(original,/function staffDocTypes\(token\)/);
  });
  test('new unsigned, sensitive and payment documents are not counterfeit PDF actions',()=>{
    for(const id of ['privacy-consent','media-consent','studio-application','incident','receipt','daily-safety']){
      assert.ok(d.querySelector('#bw33DocumentChoices [data-status]')?.isConnected);
      assert.ok([...d.querySelectorAll('.bw42-doc-card:not(button)')].some(x=>x.textContent.includes({
        'privacy-consent':'개인정보 처리',
        'media-consent':'사진·영상',
        'studio-application':'스튜디오 이용 신청서',
        incident:'사고·특이사항',
        receipt:'결제 증빙',
        'daily-safety':'일일 재료'
      }[id])));
    }
    assert.equal(d.querySelectorAll('button[data-bw33doc="privacy-consent"]').length,0);
    assert.match(d.getElementById('bw33DocumentHub').textContent,/서식 준비 중/);
    assert.match(d.querySelector('.warning').textContent,/기존 문서와 기록은 유지/);
  });
  test('legacy documents remain visible with a warning, never silently reissued as studio consent',()=>{
    assert.match(d.getElementById('docType').textContent,/기존 수강 등록 확인서 \(학원형\)/);
    assert.match(d.getElementById('docType').textContent,/기존 전자서명 계약서 사본/);
    assert.match(d.getElementById('bw33DocumentHub').textContent,/신규 스튜디오 이용동의서가 아님/);
  });
  test('existing shortcut buttons preserve their server IDs, with natural studio names',()=>{
    const top=d.getElementById('bw33DocShortcuts');
    assert.equal(top.querySelectorAll('button[data-bw33doc]').length,6);
    assert.match(top.querySelector('[data-bw33doc="payment"]').textContent,/이용료 납부 내역/);
    assert.match(top.querySelector('[data-bw33doc="contract"]').textContent,/원본/);
    assert.match(d.getElementById('bw33PdfPanel').querySelector('p').textContent,/현재 지원하는 PDF/);
  });
  const root=d.getElementById('pageBody');
  root.innerHTML=documentHTML(['class','notice']);
  await flush();
  test('a new page rebuild honors server-provided available document options',()=>{
    const enabled=[...d.querySelectorAll('#bw33DocumentChoices button[data-bw33doc]')].map(x=>x.dataset.bw33doc);
    assert.deepEqual(enabled.sort(),['class','notice']);
    assert.equal(d.querySelector('#bw33DocumentChoices button[data-bw33doc="contract"]'),null);
    assert.ok(d.querySelectorAll('#bw33DocumentChoices .bw42-doc-group').length===6);
  });
  test('responsive forest/sage/cream branding and no extra data transport',()=>{
    assert.match(d.getElementById('bw42DocumentsStyle').textContent,/max-width:680px/);
    assert.match(d.getElementById('bw42DocumentsStyle').textContent,/#40543a/);
    assert.match(d.getElementById('bw42DocumentsStyle').textContent,/#99a682/);
    assert.doesNotMatch(source,/fetch\s*\(|localStorage|sessionStorage|google\.script|SPREADSHEET_ID|MailApp/);
  });
  w.close();
  console.log(JSON.stringify({suite:'V42 sensory document catalog',passed}));
})().catch(err=>{console.error(err);process.exitCode=1;});
