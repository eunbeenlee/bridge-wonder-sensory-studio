'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const entry=read('staff/index.html'),alias=read('staff/standalone.html'),app=read('assets/js/administration.js'),defaults=read('assets/js/staff-static-defaults.js');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('staff index and alias keep identical login forms',()=>{
 assert.equal(entry,alias);assert.match(entry,/id="passwordLoginForm"/);assert.match(entry,/id="workspace"/);
});
check('staff renders without iframe or forced navigation',()=>{
 assert.doesNotMatch(entry,/<iframe\b|location\.replace|portal\.js/i);
});
check('static scripts load in deterministic order',()=>{
 const a=entry.indexOf('staff-static-defaults.js'),b=entry.indexOf('staff-google-bridge.js'),c=entry.indexOf('administration-accelerator.js'),d=entry.indexOf('administration.js?v=28.0.0');
 assert.ok(a>0&&b>a&&c>b&&d>c);
});
check('safe public course defaults do not contain private records or financial settings',()=>{
 assert.match(defaults,/BW-SENSORY/);assert.doesNotMatch(defaults,/SPREADSHEET_ID|OWNER_EMAIL|BW17_AUTH_SECRET|\d{8}-\d{7}|bankAccount|childName/);
});
check('home paints static work menu before server summary response',()=>{
 const start=app.indexOf('    function renderHome(){'),end=app.indexOf('    async function renderInquiries()',start);
 assert.ok(start>0&&end>start);
 const body=app.slice(start,end),paint=body.indexOf("$('pageBody').innerHTML"),read=body.indexOf("call('staffDashboard'");
 assert.ok(paint>=0&&read>paint);assert.doesNotMatch(body,/await\s+call\('staffDashboard'/);
 assert.match(body,/bw28LastUpdated/);
});
check('home action counts fetch in background without blocking navigation',()=>{
 assert.match(app,/renderHome=function\(\)\{[\s\S]*?call\('staff20ActionCenter',session\)\.then/);
});
check('payroll and private records remain on-demand',()=>{
 assert.match(app,/if\(page==='payroll'\)await renderPayroll\(\)/);
 assert.match(app,/call\('staffListInquiries',state\.token\)/);
 assert.match(app,/call\('staffListTuition',state\.token\)/);
});
check('client role authorization is preserved for owner-only payroll',()=>{
 assert.match(app,/"payroll":\{"label":"직원 급여관리","read":\["owner"\],"write":\["owner"\]/);
 assert.match(app,/const userPolicy=state\.user\.permissions/);
});
check('server connection check and Google direct fallback are both available',()=>{
 assert.match(entry,/id="bw27-check-server"/);assert.match(entry,/id="bw27-server-status"/);
 assert.match(entry,/https:\/\/script\.google\.com\/macros\/s\//);
});
console.log(JSON.stringify({suite:'V28 static-first staff UI',passed,total:9}));