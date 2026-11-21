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
      node.style.color = warning ? '#a75537' : '#40543a';
      node.style.borderColor = warning ? '#d1693b' : '#99a682';
    }
  };
  const u = new URL(ENDPOINT);
  if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)) {
    throw Error('운영 시스템 접속 주소를 확인해 주세요.');
  }
  let count = 0;
  // V29 diagnostics track only method names and elapsed time, never arguments or tokens.
  let transportHistory = [];
  let bridgeVerified = false;
  let healthPromise = null;
  function checkHealth(force=false) {
    // A manual recheck must revalidate, not reuse a prior verified state.
    if(force)bridgeVerified=false;
    if (bridgeVerified) return Promise.resolve(true);
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
    const isAuth=name==='staff23PasswordLogin'||name==='staff23PasswordCompleteEnrollment';
    // Keep one-time migration within the accelerator's 90-second auth deadline.
    const timeout = name==='bridgeHealth'?15000:isAuth?85000:46000;
    const timer = setTimeout(() => controller.abort(), timeout);
    const started = Date.now();
    const delayed = isAuth?setTimeout(()=>{
      msg('첫 로그인은 보안 방식 전환으로 시간이 더 걸릴 수 있습니다. 다시 누르지 말고 인증 결과를 확인해 주세요.',false);
    },10000):null;
    count += 1;
    try {
      const response = await fetch(ENDPOINT, {
        method:'POST', mode:'cors', credentials:'omit', redirect:'follow',
        cache:'no-store', headers:{'Content-Type':'text/plain;charset=utf-8'},
        body,signal:controller.signal
      });
      if (!response.ok) throw Error('운영 시스템 응답: HTTP ' + response.status);
      const txt = await response.text();
      let data;
      try { data = JSON.parse(txt); } catch (_) {
        throw Error('운영 시스템에서 예상하지 못한 응답을 받았습니다. 연결 설정을 확인해 주세요.');
      }
      if (!data || data.ok !== true) throw Error(String(data && data.message || '요청을 완료하지 못했습니다. 다시 확인해 주세요.'));
      if (name === 'bridgeHealth') {
        if (!data.value || data.value.transport !== 'google-apps-script' || data.value.version !== '27.0.0') throw Error('운영 시스템 버전이 일치하지 않습니다. 관리 담당자에게 확인해 주세요.');
        bridgeVerified = true;
      }
      if (count === 1) msg('운영 시스템에 연결되었습니다.', false);
      return data.value;
    } catch (err) {
      const raw = err && err.message || '';
      const detail = err && err.name === 'AbortError'
        ? '응답이 늦어지고 있습니다. 저장 버튼을 다시 누르기 전에 처리 결과를 확인해 주세요.'
        : (/Failed to fetch|NetworkError|CORS/i.test(raw)
          ? '운영 시스템과 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'
          : String(raw || '운영 시스템에 연결하지 못했습니다.'));
      msg(detail, true);
      throw new Error(detail);
    } finally {
      clearTimeout(timer);
      if(delayed)clearTimeout(delayed);
      const elapsed=Date.now()-started;
      transportHistory.push({method:name,elapsedMs:Math.max(0,elapsed)});
      if(transportHistory.length>30)transportHistory.shift();
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
            else console.error('[Bridge Wonder] staff request failed:', err.message);
          });
        };
      }
    });
  }
  global.google = Object.assign(global.google || {}, {script:Object.assign((global.google||{}).script || {},{run:runner(null,null,null)})});
  global.BW27Bridge = Object.freeze({
    request,checkHealth,version:'29.0.0',mode:'github-standalone-google-api',
    metrics:()=>Object.freeze({
      calls:count,
      last:transportHistory.slice(-15).map(x=>({...x})),
      slow:transportHistory.filter(x=>x.elapsedMs>=3000).length
    })
  });
  const check = document.getElementById('bw27-check-server');
  if (check) check.addEventListener('click', async () => {
    check.disabled=true;
    msg('운영 시스템에 연결하고 있습니다…',false);
    try {
      await checkHealth(true);
      msg('연결 상태를 확인했습니다. 로그인할 수 있습니다.',false);
    } catch (_) { /* Error already reported by request(). */ }
    finally { check.disabled=false; }
  });
  msg('운영 시스템에 연결하고 있습니다…',false);
  // No password or private data is sent by this one-time anonymous health probe.
  Promise.resolve().then(()=>checkHealth()).then(()=>{
    msg('운영 시스템에 연결되었습니다. 로그인할 수 있습니다.',false);
  }).catch(()=>{});
})(window);
