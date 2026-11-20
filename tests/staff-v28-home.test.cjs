'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
const bridge=fs.readFileSync(__dirname+'/../assets/js/staff-google-bridge.js','utf8');
const html=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
let passed=0;
function check(title,fn){fn();passed++;console.log('PASS '+title);}
check('dashboard paints authenticated menu before counts',()=>{
 const start=app.indexOf('function renderHome(){'),end=app.indexOf('async function renderInquiries()',start);
 assert.ok(start>=0&&end>start);
 const body=app.slice(start,end);
 assert.ok(body.indexOf("$('pageBody').innerHTML")>=0);
 assert.ok(body.indexOf("$('pageBody').innerHTML")<body.indexOf("call('staffDashboard',token)"));
 assert.match(body,/call\('staffDashboard',token\)\.then/);
});
check('action center is concurrent and nonblocking',()=>{
 assert.match(app,/renderHome=function\(\)\{[\s\S]*?call\('staff20ActionCenter',token\)\.then/);
});
check('older home refresh responses never overwrite newer view',()=>{
 assert.match(app,/bw282HomeEpoch/);assert.match(app,/epoch===bw282HomeEpoch/);
 assert.match(app,/epoch!==bw282HomeEpoch/);
});
check('pending summary remains unknown, not a fake zero',()=>assert.match(app,/r\[key\]===null\|\|r\[key\]===undefined\?'—'/));
check('mobile menu options are memoized',()=>assert.match(app,/dataset\.bw282Menu/));
check('login connection state is in the login card and unique',()=>{
 assert.equal((html.match(/id="bw27-server-status"/g)||[]).length,1);
 const start=html.indexOf('id="loginScreen"'),end=html.indexOf('id="workspace"');
 assert.ok(html.indexOf('id="bw27-server-status"')>start&&html.indexOf('id="bw27-server-status"')<end);
});
check('manual health recheck always drops prior trust before retry',()=>{
 assert.match(bridge,/if\(force\)bridgeVerified=false/);
});
check('no private data placed in static markup or sessions',()=>{
 assert.doesNotMatch(html,/SPREADSHEET_ID|BW17_AUTH_SECRET|BANK_ACCOUNT|api[_-]?key/i);
 const release=JSON.parse(fs.readFileSync(__dirname+'/../package.json','utf8')).version;
 for(const file of ['staff-google-bridge.js','administration-accelerator.js','administration.js','staff-native-kdf.js']){
   assert.ok(html.includes(file+'?v='+release),'version mismatch: '+file);
 }
});
console.log(JSON.stringify({suite:'V28.2 concurrent home and health',passed,total:8}));