/**
 * Bridge Wonder V27 — experimental Shinjeon-style standalone UI bridge.
 * Google-only backend, no Cloudflare. Using HTTP requests means an API is used;
 * it is NOT identical to the prior "no API" google.script.run architecture.
 * This is a public JS file: never store private keys, owner email or Sheets IDs here.
 */
(function (global) {
  'use strict';
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwQVKOruJFxxUHVrsrsDvIpv95jz-ag5SbozlJcJ9mDNrpdGFyYp-uIsT2y2_-3n-xa/exec';
  const PROTOCOL = 'BW_STAFF_V27';
  const STATUS = () => document.getElementById('bw27-server-status');
  const msg = (text, warning) => {
    const node = STATUS();
    if (node) {
      node.textContent = text;
      node.style.color = warning ? '#8c4428' : '#40543a';
      node.style.borderColor = warning ? '#c66b44' : '#e8dcc8';
    }
  };
  const u = new URL(ENDPOINT);
  if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)) {
    throw Error('직원용 Google 배포 주소가 올바르지 않습니다.');
  }
  let count = 0;
  let bridgeVerified = false;
  let healthPromise = null;
  function checkHealth(force=false) {
    if (bridgeVerified && !force) return Promise.resolve(true);
    if (healthPromise) return healthPromise;
    healthPromise = request('bridgeHealth',[]).then(()=>true).finally(()=>{healthPromise=null;});
    return healthPromise;
  }
  async function request(name, args) {
    // Never send credentials, student data or payroll before the server identity is verified.
    if (name !== 'bridgeHealth' && !bridgeVerified) await checkHealth();
    if (!Array.isArray(args)) throw Error('요청 형식 오류');
    const body = JSON.stringify({protocol:PROTOCOL,method:name,args});
    if (body.length > 350000) throw Error('요청이 너무 큽니다. 입력 데이터를 확인해 주세요.');
    const controller = new AbortController();
    // Existing login verifier may require a longer server time than read-only requests.
    const timeout = (name === 'bridgeHealth') ? 15000 : ((name === 'staff23PasswordLogin') ? 55000 : 46000);
    const timer = setTimeout(() => controller.abort(), timeout);
    count += 1;
    try {
      const response = await fetch(ENDPOINT, {
        method:'POST', mode:'cors', credentials:'omit', redirect:'follow',
        cache:'no-store', headers:{'Content-Type':'text/plain;charset=utf-8'},
        body,signal:controller.signal
      });
      if (!response.ok) throw Error('Google 서버 응답: HTTP ' + response.status);
      const txt = await response.text();
      let data;
      try { data = JSON.parse(txt); } catch (_) {
        throw Error('Google 서버가 JSON 대신 다른 페이지를 반환했습니다. 배포 주소와 Google 접근 설정을 확인해 주세요.');
      }
      if (!data || data.ok !== true) throw Error(String(data && data.message || 'Google 서버 요청이 실패했습니다.'));
      if (name === 'bridgeHealth') {
        if (!data.value || data.value.transport !== 'google-apps-script' || data.value.version !== '27.0.0') throw Error('Google 직원 서버의 연결 버전이 일치하지 않습니다. 새 배포를 확인해 주세요.');
        bridgeVerified = true;
      }
      if (count === 1) msg('Google 직원 서버와 통신되었습니다.', false);
      return data.value;
    } catch (err) {
      const raw = err && err.message || '';
      const detail = err && err.name === 'AbortError'
        ? 'Google 서버 요청이 지연되었습니다. 저장 작업을 중복 실행하지 말고 결과를 확인해 주세요.'
        : (/Failed to fetch|NetworkError|CORS/i.test(raw)
          ? 'Google 웹앱 통신이 차단되었습니다. 배포 주소·접근 권한과 브라우저의 CORS 오류를 확인해 주세요.'
          : String(raw || 'Google 서버 연결에 실패했습니다.'));
      msg(detail, true);
      throw new Error(detail);
    } finally {
      clearTimeout(timer);
    }
  }
  // Mimic google.script.run's success/failure callback chain without importing Google UI.
  // All business validation and ownership restrictions still occur on the server.
  function runner(ok, fail, userObject) {
    return new Proxy(Object.create(null), {
      get(_, prop) {
        if (prop === 'withSuccessHandler') return fn => runner(fn, fail, userObject);
        if (prop === 'withFailureHandler') return fn => runner(ok, fn, userObject);
        if (prop === 'withUserObject') return obj => runner(ok, fail, obj);
        if (typeof prop === 'symbol' || prop === 'then') return undefined;
        return (...args) => {
          request(String(prop), args).then(value => {
            if (typeof ok === 'function') ok(value, userObject);
          }, err => {
            if (typeof fail === 'function') fail({message:err.message}, userObject);
            else console.error('[Bridge Wonder] Google request failed:', err.message);
          });
        };
      }
    });
  }
  global.google = Object.assign(global.google || {}, {script:Object.assign((global.google||{}).script || {},{run:runner(null,null,null)})});
  global.BW27Bridge = Object.freeze({request,checkHealth,version:'27.1.0',mode:'github-standalone-google-api'});
  const check = document.getElementById('bw27-check-server');
  if (check) check.addEventListener('click', async () => {
    check.disabled=true;
    msg('Google 서버 통신을 확인하고 있습니다…',false);
    try {
      await checkHealth(true);
      msg('Google 직원 서버 연결이 확인되었습니다. 로그인할 수 있습니다.',false);
    } catch (_) { /* Error already reported by request(). */ }
    finally { check.disabled=false; }
  });
  msg('Google 서버 연결을 자동으로 확인하고 있습니다…',false);
  // No password or private data is sent by this one-time anonymous health probe.
  Promise.resolve().then(()=>checkHealth()).then(()=>{
    msg('Google 직원 서버 연결 확인 완료 · 로그인할 수 있습니다.',false);
  }).catch(()=>{});
})(window);
