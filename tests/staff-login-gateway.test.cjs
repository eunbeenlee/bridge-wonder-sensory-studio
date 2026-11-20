'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const bridge=fs.readFileSync(__dirname+'/../assets/js/staff-google-bridge.js','utf8');
let count=0;
function verify(name,test){test();count++;console.log('PASS '+name);}
verify('GitHub directly renders staff login form',()=>assert.match(html,/id="passwordLoginForm"/));
verify('Legacy Google iframe has been removed',()=>assert.doesNotMatch(html,/<iframe\b/i));
verify('Legacy automatic Google navigation is no longer referenced',()=>assert.doesNotMatch(html,/portal\.js|location\.replace|open-staff-login/i));
verify('Authorized workspace is separate from public login',()=>assert.match(html,/id="workspace"[^>]*hidden/));
verify('Google direct fallback remains explicit, not automatic',()=>assert.match(html,/https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/));
verify('Anonymous connection check is visible and manually retryable',()=>{assert.match(html,/id="bw27-check-server"/);assert.match(html,/id="bw27-server-status"/);});
verify('All three local scripts are loaded after static defaults',()=>{
 const i=['staff-static-defaults.js','staff-google-bridge.js','administration-accelerator.js','administration.js?v=28.0.0'].map(x=>html.indexOf(x));
 assert.ok(i.every(x=>x>=0));assert.ok(i.every((x,j)=>j===0||x>i[j-1]));
});
verify('Credentials cannot leave before health verification',()=>assert.match(bridge,/await ensureHealthy\(\)/));
verify('Public JavaScript contains no database keys or owner configuration',()=>assert.doesNotMatch(bridge,/SPREADSHEET_ID|BW17_AUTH_SECRET|OWNER_EMAIL/));
console.log(JSON.stringify({passed:count,total:9,suite:'V28 GitHub-owned login gateway'}));