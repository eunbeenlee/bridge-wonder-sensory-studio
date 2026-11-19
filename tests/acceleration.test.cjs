'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={window:{},setTimeout,clearTimeout,Date,Promise,Map,Set,Object,Number,Error,JSON};
vm.runInNewContext(fs.readFileSync(__dirname+'/../assets/js/administration-accelerator.js','utf8'),scope);
const create=scope.window.BW25Acceleration.create,delay=(ms=1)=>new Promise(r=>setTimeout(r,ms));
const cfg=(nav=1,session='test-session')=>({nav,session});
const stale=p=>assert.rejects(p,/BW24_STALE_VIEW/);
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('duplicate summaries coalesce; TTL and returned copies prevent cache mutation',async()=>{
  let calls=0,clock=0;const e=create({now:()=>clock,invoke:async()=>{calls++;await delay();return {rows:[{name:'original'}]};}});e.setNavigation(1);
  const [a,b]=await Promise.all([e.request('staffDashboard',['token'],cfg()),e.request('staffDashboard',['token'],cfg())]);assert.equal(calls,1);a.rows[0].name='changed';assert.equal(b.rows[0].name,'original');
  const c=await e.request('staffDashboard',['token'],cfg());assert.equal(c.rows[0].name,'original');assert.equal(calls,1);clock=10001;await e.request('staffDashboard',['token'],cfg());assert.equal(calls,2);
 });
 await test('sensitive reads and payroll commands never reuse stored responses',async()=>{
  let calls=0;const e=create({invoke:async()=>({n:++calls})});e.setNavigation(1);
  for(const name of ['staffListInquiries','staffDocDownload','payrollCommand']){const a=await e.request(name,['token'],cfg()),b=await e.request(name,['token'],cfg());assert.notEqual(a.n,b.n);}assert.equal(e.metrics().cacheEntries,0);
 });
 await test('rapid navigation cancels old consumer without poisoning shared transport',async()=>{
  let resolve;const e=create({invoke:()=>new Promise(r=>resolve=r)});e.setNavigation(1);
  const old=e.request('staffListClasses',['token'],cfg());const oldCheck=stale(old);await delay();e.setNavigation(2);const next=e.request('staffListClasses',['token'],cfg(2));resolve({rows:[]});await oldCheck;await next;
 });
 await test('same-page read started before a write cannot render or refill cache afterward',async()=>{
  let resolve;const e=create({invoke:name=>name==='staffListClasses'?new Promise(r=>resolve=r):Promise.resolve({ok:true})});e.setNavigation(1);
  const read=e.request('staffListClasses',['token'],cfg()),check=stale(read);await delay();await e.request('staffSaveClass',['token',{}],cfg());resolve({rows:['obsolete']});await check;assert.equal(e.metrics().cacheEntries,0);
 });
 await test('physical concurrent reads remain bounded after consumer timeouts',async()=>{
  let started=0;const pending=[];const e=create({concurrency:2,readTimeoutMs:12,invoke:()=>{started++;return new Promise(r=>pending.push(r));}});e.setNavigation(1);
  const jobs=Array.from({length:5},()=>e.request('staffListAttendance',['token'],cfg()));await Promise.all(jobs.map(p=>assert.rejects(p,/지연/)));
  assert.equal(started,2);assert.equal(e.metrics().active,2);assert.equal(e.metrics().queued,0);pending.forEach(r=>r([]));await delay();assert.equal(e.metrics().active,0);
 });
 await test('navigation removes queued requests and their coalescing entries',async()=>{
  const pending=[];const e=create({concurrency:1,invoke:()=>new Promise(r=>pending.push(r))});e.setNavigation(1);
  const active=e.request('staffListAttendance',['token'],cfg());const queued=e.request('staffListClasses',['token'],cfg());const checks=[stale(active),stale(queued)];await delay();e.setNavigation(2);
  const next=e.request('staffListClasses',['token'],cfg(2));pending[0]([]);await delay();assert.equal(pending.length,2);pending[1]({rows:[]});await Promise.all(checks);await next;
 });
 await test('late completion of a timed-out write invalidates summaries read meanwhile',async()=>{
  let complete,calls=0;const e=create({writeTimeoutMs:12,invoke:name=>name==='staffSaveClass'?new Promise(r=>complete=r):Promise.resolve({n:++calls})});e.setNavigation(1);
  await assert.rejects(e.request('staffSaveClass',['token',{}],cfg()),/중복 저장/);await e.request('staffDashboard',['token'],cfg());assert.equal(e.metrics().cacheEntries,1);complete({ok:true});await delay();assert.equal(e.metrics().cacheEntries,0);
 });
 await test('session transitions reject prior results and old writes cannot clear new cache',async()=>{
  let complete;const e=create({invoke:name=>name==='staffSaveClass'?new Promise(r=>complete=r):Promise.resolve({ok:true})});e.setNavigation(1);
  const old=e.request('staffSaveClass',['token-A'],cfg(1,'A')),check=stale(old);await delay();await e.request('staffDashboard',['token-B'],cfg(1,'B'));complete({ok:true});await check;assert.equal(e.metrics().cacheEntries,1);e.clear();assert.equal(e.metrics().cacheEntries,0);
 });
 await test('failed mutations are invoked exactly once and queued work cannot leak past logout',async()=>{
  let calls=0;const e=create({invoke:async()=>{calls++;throw Error('원래 오류');}});e.setNavigation(1);await assert.rejects(e.request('staffSaveClass',['token'],cfg()),/원래 오류/);assert.equal(calls,1);
 });
 console.log(JSON.stringify({suite:'acceleration offline',passed,total:9}));
})().catch(e=>{console.error(e);process.exitCode=1;});
