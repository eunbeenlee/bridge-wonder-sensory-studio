'use strict';
/* V29 native-browser password proof + legacy migration tests. Fictional credentials only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {TextEncoder}=require('node:util');
const source=fs.readFileSync(__dirname+'/../server/apps-script/Code.gs','utf8');
const client=fs.readFileSync(__dirname+'/../assets/js/staff-native-kdf.js','utf8');
const entry=fs.readFileSync(__dirname+'/../staff/index.html','utf8');
const email='teacher@example.invalid',password='Long-correct-Test-Password-2026!';
const pepper='unit-test-private-pepper-only';
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS',name);}
function bytes(x){
  if(typeof x==='string')return Buffer.from(x,'utf8');
  return Buffer.from(Array.from(x,n=>(Number(n)+256)%256));
}
function fixture(){
  const values=new Map([['BW23_PRIVATE_PEPPER',pepper]]);
  const cacheData=new Map();
  const cache={get:k=>cacheData.get(k)||null,put(k,v){cacheData.set(k,v);},remove:k=>cacheData.delete(k)};
  const props={
    getProperty:k=>values.has(k)?values.get(k):null,
    setProperty(k,v){values.set(k,v);return this;},
    deleteProperty:k=>values.delete(k),
    getProperties:()=>Object.fromEntries(values)
  };
  let held=false,hmac=0;const logger=[];
  const lock={waitLock(){assert.equal(held,false,'nested global lock');held=true;},releaseLock(){assert.equal(held,true);held=false;}};
  const utilities={
    getUuid:()=>crypto.randomUUID(),
    DigestAlgorithm:{SHA_256:'SHA_256'},
    Charset:{UTF_8:'UTF_8'},
    newBlob:(v)=>({getBytes:()=>Array.from(bytes(v))}),
    computeDigest:(_alg,text)=>Array.from(crypto.createHash('sha256').update(bytes(text)).digest()).map(x=>x>127?x-256:x),
    computeHmacSha256Signature:(msg,key)=>{
      hmac++;
      return Array.from(crypto.createHmac('sha256',bytes(key)).update(bytes(msg)).digest()).map(x=>x>127?x-256:x);
    },
    formatDate:()=> '20261120'
  };
  const ctx=vm.createContext({Logger:{log:v=>logger.push(String(v))},Utilities:utilities,
    PropertiesService:{getScriptProperties:()=>props},
    CacheService:{getScriptCache:()=>cache},LockService:{getScriptLock:()=>lock}});
  new vm.Script(source,{filename:'Code.gs'}).runInContext(ctx,{timeout:12000});
  const user={email,name:'테스트 선생님',status:'사용',role:'teacher',classes:[],canContact:false};
  ctx.bw17User_=input=>input===email?user:null;
  ctx.bw17Audit_=()=>{};
  ctx.bw24Permissions_=()=>({read:{home:true,payroll:false},write:{home:false,payroll:false}});
  ctx.staffLoginVerify=()=>({user:{email},token:crypto.randomUUID().repeat(3)});
  const count=()=>hmac;
  const credentials=()=>JSON.parse(values.get(ctx.bw23CredentialKey_(email)));
  const store=c=>values.set(ctx.bw23CredentialKey_(email),JSON.stringify(c));
  return {ctx,values,cacheData,credentials,store,count,logger,user};
}
async function webProof(pw=password,userEmail=email,secure=true){
  const w={crypto:crypto.webcrypto,isSecureContext:secure};
  vm.runInNewContext(client,{window:w,TextEncoder,Uint8Array,ArrayBuffer},{timeout:3000});
  return w.BW29KDF.derive(userEmail,pw);
}
const value=p=>({email,password,proof:p});
(async()=>{
 await test('GitHub login loads browser KDF before main app and preserves no-iframe structure',()=>{
   assert.match(entry,/staff-native-kdf\.js\?v=41\.0\.0/);
   assert.ok(entry.indexOf('staff-native-kdf.js')<entry.indexOf('administration.js'));
   assert.doesNotMatch(entry,/<iframe\b/i);
 });
 await test('native WebCrypto PBKDF2 exactly matches Node SHA256 reference',async()=>{
   const actual=await webProof(),expected=crypto.pbkdf2Sync(
     password,'BW29-STAFF-LOGIN|'+email,160000,32,'sha256').toString('hex');
   assert.equal(actual,expected);
   assert.match(actual,/^[a-f0-9]{64}$/);
 });
 await test('insecure or unsupported environments use original slow-login fallback',async()=>{
   assert.equal(await webProof(password,email,false),null);
 });
 await test('new staff password setup stores peppered V2 verifier without 24000 GAS HMAC operations',async()=>{
   const f=fixture(),proof=await webProof();
   const before=f.count();
   const r=f.ctx.staff23PasswordCompleteEnrollment({email,code:'123456',password,proof,mode:'setup'});
   assert.equal(r.ok,true);
   assert.equal(f.credentials().v,2);
   assert.equal(f.credentials().rounds,160000);
   assert.ok(f.count()-before<=2,'Enrollment should run only native-verifier HMAC');
   assert.notEqual(f.credentials().hash,proof);
   assert.ok(!JSON.stringify(f.credentials()).includes(password));
   assert.ok(!JSON.stringify(f.credentials()).includes(proof));
 });
 await test('V1 verifier is actually executed before first account upgrade',async()=>{
   const f=fixture(),salt=crypto.randomBytes(16).toString('hex');
   f.store({v:1,salt,hash:f.ctx.bw23Pbkdf2_(password,salt,24000),rounds:24000,updatedAt:'2026-11-19T00:00:00.000Z'});
   const before=f.count(),result=f.ctx.staff23PasswordLogin(value(await webProof()));
   assert.ok(result.token);
   assert.ok(f.count()-before>=24000);
   assert.equal(f.credentials().v,2);
 });
 await test('subsequent V2 password login uses only constant number of HMAC calls',async()=>{
   const f=fixture(),proof=await webProof();
   f.store(f.ctx.bw29Credential_(email,proof));
   const before=f.count();
   const result=f.ctx.staff23PasswordLogin(value(proof));
   assert.ok(result.token);
   assert.ok(f.count()-before<8,'V2 login should avoid expensive server PBKDF2');
   assert.ok(f.logger.some(x=>x.includes('BW29_AUTH ms=')));
 });
 await test('wrong proof is denied and cannot reuse V2 credential',async()=>{
   const f=fixture(),proof=await webProof();
   f.store(f.ctx.bw29Credential_(email,proof));
   const bad=await webProof('Wrong-Passphrase-Long-2026!');
   assert.throws(()=>f.ctx.staff23PasswordLogin(value(bad)),/비밀번호가 올바르지/);
 });
 await test('legacy HtmlService clients may still verify original peppered V1 password',async()=>{
   const f=fixture(),salt=crypto.randomBytes(16).toString('hex');
   const legacy={v:1,salt,hash:f.ctx.bw23Pbkdf2_(password,salt,24000),rounds:24000};
   const proof=await webProof();
   f.store(f.ctx.bw29Credential_(email,proof,legacy));
   const before=f.count(),result=f.ctx.staff23PasswordLogin({email,password});
   assert.ok(result.token);assert.ok(f.count()-before>=24000);
 });
 await test('V2 password reset cannot authenticate with old browser proof',async()=>{
   const f=fixture();
   const proof=await webProof(),newPassword='Brand-New-Strong-Password-2027!';
   f.store(f.ctx.bw29Credential_(email,proof));
   f.ctx.staff23PasswordCompleteEnrollment({email,code:'123456',password:newPassword,proof:await webProof(newPassword),mode:'reset'});
   assert.throws(()=>f.ctx.staff23PasswordLogin(value(proof)),/비밀번호가 올바르지/);
   assert.ok(f.ctx.staff23PasswordLogin({email,password:newPassword,proof:await webProof(newPassword)}).token);
 });
 await test('five wrong V2 proofs still trigger account lockout',async()=>{
   const f=fixture(),proof=await webProof();f.store(f.ctx.bw29Credential_(email,proof));
   const bad=await webProof('Wrong-Passphrase-Long-2026!');
   for(let i=0;i<4;i++)assert.throws(()=>f.ctx.staff23PasswordLogin({email,password,proof:bad}),/비밀번호가 올바르지/);
   assert.throws(()=>f.ctx.staff23PasswordLogin({email,password,proof:bad}),/비밀번호가 올바르지/);
   assert.throws(()=>f.ctx.staff23PasswordLogin({email,password,proof}),/15분 후/);
 });
 console.log(JSON.stringify({suite:'V29 native KDF + server migration',passed}));
})().catch(e=>{console.error(e);process.exitCode=1;});
