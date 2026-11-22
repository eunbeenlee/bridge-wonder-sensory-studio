'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const login=read('staff/index.html'),core=read('assets/js/administration.js');
const fresh=read('assets/css/staff-modern-v53.css');
assert.match(login,/staff-modern-v53\.css\?v=53\.0\.0/);
assert.match(login,/오늘의 업무,<br>더 간편하게/);
assert.match(login,/passwordLoginForm|loginStepOtp/);
assert.match(login,/staff-google-bridge\.js/);
assert.match(core,/bw53-home-pills/);
assert.match(core,/staffDashboard/);
assert.doesNotMatch(core,/staff-v52-beaver|원더풀한/);
assert.match(fresh,/V53/);
assert.match(fresh,/prefers-reduced-motion/);
assert.match(fresh,/focus-visible/);
assert.match(fresh,/content:none!important/);
for(const section of ['content','costs','curriculum','materials','settings','templates']){
 const html=read('staff/'+section+'/index.html');
 assert.match(html,/staff-modern-v53\.css\?v=53\.0\.0/);
 assert.match(html,/staff-content-v51\.js\?v=51\.0\.0/);
 assert.match(html,/authForm/);
 assert.match(html,/entryForm/);
 assert.doesNotMatch(html,/staff-v52-beaver|원더풀한/);
}
for (const file of ['assets/css/staff-fresh-v52.css','assets/css/staff-content-v52.css']){
 assert.doesNotMatch(read(file),/staff-v52-beaver/);
}
assert.equal(fs.existsSync(path.join(ROOT,'assets/img/staff-v52-beaver.webp')),false);
console.log('V53 presentation-only changes verified: no mascot, same credentials/permission/editor routes.');
