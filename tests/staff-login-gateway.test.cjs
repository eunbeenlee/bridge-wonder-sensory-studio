'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const js = fs.readFileSync(__dirname + '/../staff/portal.js','utf8');
const html = fs.readFileSync(__dirname + '/../staff/index.html','utf8');
const match = html.match(/<a class="button" id="open-staff-login" href="([^"]+)"/);
assert.ok(match,'Direct login fallback link missing');
const URL_TARGET = match[1];
const tests=[];
function harness({url='https://bridgewonder.bridgeacademy.co.kr/staff/',embedded=false,href=URL_TARGET}={}){
 const redirected=[],timers=[],cleared=[];
 const buttons={
  'open-staff-login':{href,target:'_self',listeners:{},removeAttribute(k){if(k==='href')this.href='';},addEventListener(k,fn){this.listeners[k]=fn;}},
  'connection-label':{textContent:''},
  'manual-mode':{hidden:false}
 };
 const root={location:{href:url,replace(target){redirected.push(target)}},top:null,self:{},setTimeout(fn,ms){const t={fn,ms,cleared:false};timers.push(t);return t;},clearTimeout(t){if(t)t.cleared=true;cleared.push(t);},addEventListener(){}};
 root.top=embedded?{}:root.self;buttons['open-staff-login'].href=href;
 vm.runInNewContext(js,{window:root,document:{getElementById(k){return buttons[k]??null;}},URL}, {timeout:5000});
 return {buttons,root,timers,redirected,fire(){for(const t of timers)if(!t.cleared)t.fn()}};
}
let h=harness();
assert.equal(h.timers.length,1);
assert.equal(h.timers[0].ms,1200);
h.fire();assert.deepEqual(h.redirected,[URL_TARGET]);tests.push('Direct top-level navigation after delay');
h=harness({url:'https://bridgewonder.bridgeacademy.co.kr/staff/?manual=1'});
assert.equal(h.timers.length,0);assert.equal(h.buttons['manual-mode'].hidden,true);assert.match(h.buttons['connection-label'].textContent,/버튼/);tests.push('Manual mode never auto-redirects');
h=harness({embedded:true});assert.equal(h.timers.length,0);assert.equal(h.buttons['open-staff-login'].target,'_blank');tests.push('Nested environments do not auto-redirect');
h=harness({href:'https://evil.example.com/x'});assert.equal(h.buttons['open-staff-login'].href,'');assert.equal(h.timers.length,0);tests.push('Untrusted login target blocked');
h=harness();h.buttons['open-staff-login'].listeners.click();h.fire();assert.deepEqual(h.redirected,[]);tests.push('Click cancels automatic redirect');
assert.doesNotMatch(html,/<iframe\b/i);tests.push('Cross-origin iframe removed');
assert.match(html,/로그인 화면 열기/);assert.match(html,/\?manual=1/);tests.push('Accessible manual fallback present');
assert.doesNotMatch(js,/google\.script\.run|SPREADSHEET_ID|OWNER_EMAIL/);tests.push('No hidden auth RPC or secrets in gateway');
console.log(JSON.stringify({passed:tests.length,total:tests.length,tests},null,2));
