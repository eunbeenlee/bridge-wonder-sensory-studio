'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const diag=fs.readFileSync(__dirname+'/../staff/standalone.html','utf8');
const bridge=fs.readFileSync(__dirname+'/../assets/js/staff-google-bridge.js','utf8');
const defaults=fs.readFileSync(__dirname+'/../assets/js/staff-static-defaults.js','utf8');
const app=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
let passed=0;
function ok(name,check){check();passed++;console.log('PASS',name);}
ok('GitHub owns the native login screen',()=>{assert.match(html,/id="loginScreen"/);assert.match(html,/id="passwordLoginForm"/);});
ok('No Google iframe or top-level redirect needed',()=>{assert.doesNotMatch(html,/<iframe\b|window\.location\.replace/);assert.match(diag,/id="loginScreen"/);});
ok('Direct Google link retained as optional recovery',()=>{assert.match(html,/Google 직접 접속/);assert.match(html,/script\.google\.com\/macros\/s\//);});
ok('Static defaults load before Google bridge and app',()=>{const p=html.indexOf('staff-static-defaults.js'),b=html.indexOf('staff-google-bridge.js'),a=html.indexOf('administration.js');assert.ok(p>=0&&b>p&&a>b);});
ok('No private data, credentials, or Sheets ID in defaults',()=>{assert.doesNotMatch(defaults,/SPREADSHEET_ID|OWNER_EMAIL|password|payrollCommand|studentPhone|secret|google\.com\/macros/);});
ok('Class presets are reusable yet cannot grant permissions',()=>{const win={};vm.runInNewContext(defaults,{window:win,Object});assert.equal(win.BWStaffDefaults.classEditor.courseCode,'BW-SENSORY');assert.equal(win.BWStaffDefaults.classEditor.newClassVisibility,'비공개');assert.ok(Object.isFrozen(win.BWStaffDefaults.classEditor));});
ok('Dashboard quicklinks paint before Google metric request',()=>{const r=app.slice(app.indexOf('async function renderHome(){'),app.indexOf('async function renderInquiries(){'));assert.ok(r.indexOf("$('pageBody').innerHTML")<r.indexOf("await call('staffDashboard'"));assert.match(r,/bw24Can\(x\[0\]\)/);});
ok('Bridge never sends private requests before anonymous health succeeds',()=>{assert.match(bridge,/if \(name !== 'bridgeHealth' && !bridgeVerified\) await checkHealth\(\)/);assert.match(bridge,/Promise\.resolve\(\)\.then\(\(\)=>checkHealth\(\)\)/);});
console.log(JSON.stringify({suite:'staff native login',passed,total:8}));
