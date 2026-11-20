'use strict';
/* V30 offline credential lifecycle regression. All accounts are synthetic. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../server/apps-script/Code.gs','utf8');
const bridge=fs.readFileSync(__dirname+'/../server/apps-script/StaffBridge.gs','utf8');
const accountUI=fs.readFileSync(__dirname+'/../assets/js/staff-account-management.js','utf8');
const adminUI=fs.readFileSync(__dirname+'/../assets/js/administration.js','utf8');
const index=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const ownerEmail='director@example.invalid',teacherEmail='teacher@example.invalid';
const secret='unit-test-only-pepper';
const originalPassword='Old-BW-Password-2026!';
const temporaryPassword='Temporary-Secure-BW-2026!';
const newPassword='My-New-BW-Password-2026!';
const proof=(password,email=teacherEmail)=>crypto.pbkdf2Sync(password,'BW29-STAFF-LOGIN|'+email,160000,32,'sha256').toString('hex');
function bytes(value){
  if(typeof value==='string')return Buffer.from(value,'utf8');
  return Buffer.from(Array.from(value,x=>(Number(x)+256)%256));
}
function signed(value,key){return [...crypto.createHmac('sha256',bytes(key)).update(bytes(value)).digest()].map(n=>n>127?n-256:n);}
function fixture(){
  const properties=new Map([['BW23_PRIVATE_PEPPER',secret]]),cacheData=new Map(),audit=[];
  let locked=false;
  const props={getProperty:k=>properties.get(k)||null,setProperty(k,v){properties.set(k,v);return this;},deleteProperty:k=>properties.delete(k),getProperties:()=>Object.fromEntries(properties)};
  const cache={get:k=>cacheData.get(k)||null,put:(k,v)=>cacheData.set(k,v),remove:k=>cacheData.delete(k)};
  const lock={waitLock(){assert.equal(locked,false,'nested script lock');locked=true;},releaseLock(){assert.equal(locked,true);locked=false;}};
  const u={
    getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
    computeDigest:(_a,v)=>Array.from(crypto.createHash('sha256').update(bytes(v)).digest()).map(n=>n>127?n-256:n),
    computeHmacSha256Signature:signed,
    newBlob:v=>({getBytes:()=>[...bytes(v)].map(n=>n>127?n-256:n)}),
    formatDate:()=> '20261120'
  };
  const ctx=vm.createContext({Utilities:u,PropertiesService:{getScriptProperties:()=>props},
    CacheService:{getScriptCache:()=>cache},LockService:{getScriptLock:()=>lock},
    Logger:{log(){}},SpreadsheetApp:{}});
  new vm.Script(source,{filename:'Code.gs'}).runInContext(ctx);
  const owner={email:ownerEmail,role:'owner',name:'테스트 원장',status:'사용',classes:[],canContact:true};
  const teacher={email:teacherEmail,role:'teacher',name:'테스트 선생님',status:'사용',classes:[],canContact:false};
  ctx.bw17Config_=()=>({owner:ownerEmail});
  ctx.bw17User_=email=>email===ownerEmail?owner:email===teacherEmail?teacher:null;
  ctx.bw17Audit_=(u,action,email)=>audit.push({actor:u.email,action,email});
  ctx.bw24Permissions_=()=>({read:{home:true},write:{home:false}});
  properties.set(ctx.bw23CredentialKey_(teacherEmail),JSON.stringify(ctx.bw29Credential_(teacherEmail,proof(originalPassword),null)));
  properties.set(ctx.bw23CredentialKey_(ownerEmail),JSON.stringify(ctx.bw29Credential_(ownerEmail,proof('Owner-Long-Password-2026!',ownerEmail),null)));
  return {ctx,properties,cacheData,audit,owner,teacher};
}
(async()=>{
  new vm.Script(accountUI,{filename:'staff-account-management.js'});
  new vm.Script(adminUI,{filename:'administration.js'});
  assert.match(index,/staff-account-management\.js\?v=30\.0\.0/);
  assert.ok(index.indexOf('staff-account-management.js')<index.indexOf('administration.js?v=34.0.0'));
  assert.match(bridge,/staff30IssueTemporaryPassword:\s*staff30IssueTemporaryPassword/);
  assert.match(bridge,/staff30ChangeOwnPassword:\s*staff30ChangeOwnPassword/);
  const f=fixture(),c=f.ctx;
  const ownerToken=c.bw23IssueSession_(f.owner).token;
  const teacherBefore=c.bw23IssueSession_(f.teacher).token;
  assert.equal(c.staffCurrentUser(teacherBefore).mustChange,false);
  assert.throws(()=>c.staff30IssueTemporaryPassword(teacherBefore,{email:teacherEmail,proof:proof(temporaryPassword)}),/권한/);
  assert.throws(()=>c.staff30IssueTemporaryPassword(ownerToken,{email:ownerEmail,proof:proof(temporaryPassword,ownerEmail)}),/계정/);
  const issued=c.staff30IssueTemporaryPassword(ownerToken,{email:teacherEmail,proof:proof(temporaryPassword)});
  assert.equal(issued.mustChange,true);
  assert.equal(c.bw30AccountState_(teacherEmail).revision,1);
  assert.equal(c.bw30AccountState_(teacherEmail).mustChange,true);
  assert.throws(()=>c.staffCurrentUser(teacherBefore),/로그인 정보가 변경/);
  assert.throws(()=>c.staff23PasswordLogin({email:teacherEmail,password:originalPassword,proof:proof(originalPassword)}),/비밀번호/);
  const logged=c.staff23PasswordLogin({email:teacherEmail,password:temporaryPassword,proof:proof(temporaryPassword)});
  assert.equal(logged.user.mustChange,true);
  assert.throws(()=>c.bw17Authorized_(logged.token),/비밀번호를 먼저 변경/);
  assert.equal(c.staffCurrentUser(logged.token).mustChange,true);
  assert.throws(()=>c.staff30ChangeOwnPassword(logged.token,{currentPassword:'Wrong-Old-Password-2026!',currentProof:proof('Wrong-Old-Password-2026!'),newPassword,newProof:proof(newPassword)}),/현재 비밀번호/);
  const result=c.staff30ChangeOwnPassword(logged.token,{currentPassword:temporaryPassword,currentProof:proof(temporaryPassword),newPassword,newProof:proof(newPassword)});
  assert.equal(result.ok,true);
  assert.equal(c.bw30AccountState_(teacherEmail).revision,2);
  assert.equal(c.bw30AccountState_(teacherEmail).mustChange,false);
  assert.throws(()=>c.staffCurrentUser(logged.token),/접속 시간이 만료/);
  assert.throws(()=>c.staff23PasswordLogin({email:teacherEmail,password:temporaryPassword,proof:proof(temporaryPassword)}),/비밀번호/);
  const next=c.staff23PasswordLogin({email:teacherEmail,password:newPassword,proof:proof(newPassword)});
  assert.equal(next.user.mustChange,false);
  assert.equal(c.bw17Authorized_(next.token).email,teacherEmail);
  const stored=JSON.stringify(c.bw23GetCred_(teacherEmail));
  assert.ok(!stored.includes(temporaryPassword) && !stored.includes(newPassword) && !stored.includes(proof(newPassword)));
  assert.ok(f.audit.some(x=>x.action==='직원 임시 비밀번호 발급'));
  assert.ok(f.audit.some(x=>x.action==='본인 비밀번호 변경'));
  console.log('PASS V30 issued credentials / owner-only / force change / session invalidation / offline verifier');
})().catch(e=>{console.error(e);process.exitCode=1;});
