'use strict';
/* V48 — Q&A-guided staff course settings, synthetic form data only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=path=>fs.readFileSync(__dirname+'/../'+path,'utf8');
const script=read('assets/js/staff-course-policy-v48.js');
const originalStaff=read('assets/js/administration.js');
const index=read('staff/index.html'),standalone=read('staff/standalone.html');
let passed=0;
function check(label,fn){fn();passed++;console.log('PASS '+label);}
function html(){
  return '<!doctype html><html lang="ko"><head></head><body><div id="workspace">'+
    '<div id="pageBody"><h2 class="page-title">스튜디오 이용 조건</h2>'+
    '<p class="page-description">기존 수강계약 시스템에 연결되어 있습니다.</p>'+
    '<section class="panel"><h3>Bridge Wonder · Sensory Play Studio</h3>'+
    '<form id="bw23CourseForm">'+
    ['name','fee','extras','business','license','location','retention','refund','makeup','accompaniment','materials','safety'].map(key=>
      '<label><span>'+key+'</span>'+( ['refund','makeup','accompaniment','materials','safety'].includes(key)?
      '<textarea id="bw23Course_'+key+'"></textarea>':
      '<input type="text" id="bw23Course_'+key+'"></label>')).join('')+
    '<select id="bw23Course_status"><option value="활성">활성</option><option value="중지">중지</option></select>'+
    '<button type="submit">기존 수강조건 저장</button></form></section></div></div></body></html>';
}
(async()=>{
  check('frontend-only addition after existing app, absent from all public pages',()=>{
    for(const page of [index,standalone]){
      assert.ok(page.includes('staff-course-policy-v48.js?v=48.0.0'));
      assert.ok(page.indexOf('administration.js?v=49.0.0')<page.indexOf('staff-course-policy-v48.js'));
    }
    const publicPaths=['index.html','sensory-studio/index.html','sensory-studio/visit/index.html',
       'sensory-studio/programs/index.html','sensory-studio/experience/index.html',
       'sensory-studio/enroll/index.html'];
    for(const path of publicPaths)assert.doesNotMatch(read(path),/staff-course-policy-v48/);
    assert.doesNotMatch(script,/fetch\s*\(|google\.script|localStorage|sessionStorage|SPREADSHEET_ID/);
  });
  const dom=new JSDOM(html(),{url:'https://bridgewonder.bridgeacademy.co.kr/staff/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,root=d.getElementById('pageBody');
  const set=(key,value)=>{d.getElementById('bw23Course_'+key).value=value;};
  const get=key=>d.getElementById('bw23Course_'+key).value;
  set('fee','120000');set('extras','0');set('business','브릿지 원더 학원');
  set('license','레거시-등록번호');set('refund','기존 환불 기준');
  set('makeup','기존 보강 안내');set('accompaniment','기존 동반 기준');
  set('materials','기존 준비물 안내');set('safety','기존 안전 안내');
  w.eval(script);
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.BW48CoursePolicy.mount(root);
  check('class operating plan appears before the legacy contract form',()=>{
    assert.equal(d.querySelectorAll('#bw48Settings').length,1);
    assert.ok(d.getElementById('bw48Settings').compareDocumentPosition(d.getElementById('bw23CourseForm'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
    const text=d.getElementById('bw48Settings').textContent;
    for(const term of ['7~48개월','아이 최대 4명','보호자 동반','주 1회 × 10주','영어','재료비']){
      assert.ok(text.includes(term),term);
    }
    assert.match(d.getElementById('bw48FeeAlert').textContent,/120,000원/);
    assert.match(d.getElementById('bw48FeeAlert').textContent,/기존 계약용 수업비/);
  });
  check('nothing saved or overwritten on page entry',()=>{
    assert.equal(get('fee'),'120000');
    assert.equal(get('business'),'브릿지 원더 학원');
    assert.equal(get('license'),'레거시-등록번호');
    assert.equal(get('refund'),'기존 환불 기준');
    assert.equal(get('accompaniment'),'기존 동반 기준');
    assert.equal(get('safety'),'기존 안전 안내');
  });
  check('curated operating drafts reflect Q1-22 without illegal or unreviewed blanket wording',()=>{
    const data=w.BW48CoursePolicy;
    assert.equal(data.term.weeks,10);
    assert.equal(data.term.children,4);
    assert.equal(data.term.ageMin,7);
    assert.equal(data.term.ageMax,48);
    assert.equal(data.checks.length,10);
    assert.match(data.templates.accompaniment,/36개월 이후 분리형 수업은 별도/);
    assert.match(data.templates.materials,/재료비는 이용료에 포함할 계획/);
    assert.match(data.templates.makeup,/당일 취소, 발열/);
    assert.match(data.templates.safety,/삼킴·질식 위험/);
    assert.doesNotMatch(Object.values(data.templates).join(' '),/원에 민형사상 책임을 물을 수 없습니다|단순변심은 환불 불가능/);
    for(const term of ['3월 체험 35,000원','10주 텀','환불 규정','안전사고 책임','주차','사진·영상']){
      assert.ok(data.checks.some(x=>x.copy.includes(term)||x.title.includes(term)),term);
    }
  });
  let confirms=0;
  w.confirm=()=>{confirms++;return false;};
  const apply=d.getElementById('bw48Apply');
  apply.click();
  check('canceling overwrite leaves all historic terms unchanged',()=>{
    assert.ok(confirms>0);
    assert.equal(get('accompaniment'),'기존 동반 기준');
    assert.equal(get('makeup'),'기존 보강 안내');
  });
  w.confirm=()=>true;apply.click();
  check('clicking apply copies only four safe operational texts to editable inputs',()=>{
    for(const key of ['accompaniment','makeup','materials','safety']){
      assert.equal(get(key),w.BW48CoursePolicy.templates[key]);
    }
    assert.equal(get('fee'),'120000');assert.equal(get('business'),'브릿지 원더 학원');
    assert.equal(get('refund'),'기존 환불 기준');
    assert.equal(get('license'),'레거시-등록번호');
    assert.match(d.getElementById('bw48Result').textContent,/아직 저장되지|확인한 후 저장/);
  });
  let saves=0;
  const form=d.getElementById('bw23CourseForm');
  form.addEventListener('submit',()=>saves++);
  set('safety','부모참여 수업에서 원에 민형사상 책임을 물을 수 없습니다.');
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  check('blanket accident liability waiver is blocked before original save handler',()=>{
    assert.equal(saves,0);
    assert.match(d.getElementById('bw48Result').textContent,/책임 면제/);
  });
  set('safety',w.BW48CoursePolicy.templates.safety);
  set('refund','개인 사유 단순 변심은 환불 불가능');
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  check('blanket personal-circumstance refund refusal is blocked',()=>{
    assert.equal(saves,0);
  });
  set('refund','기존 환불 기준');
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  check('ordinary existing submission is unaffected when unsafe clauses are absent',()=>{
    assert.equal(saves,1);
    assert.match(originalStaff,/staff22SaveCourseSettings/);
  });
  root.replaceChildren();
  await new Promise(resolve=>setImmediate(resolve));
  root.innerHTML=html().match(/<div id="pageBody">([\s\S]+?)<\/div><\/div><\/body>/)?.[1]||'';
  await new Promise(resolve=>setImmediate(resolve));
  check('nav back to course settings remounts once without form duplication',()=>{
    assert.equal(root.querySelectorAll('#bw48Settings').length,1);
    assert.equal(root.querySelectorAll('#bw23CourseForm').length,1);
  });
  dom.window.close();
  console.log(JSON.stringify({suite:'V48 Q&A-based course settings',passed}));
})().catch(err=>{console.error(err);process.exitCode=1;});
