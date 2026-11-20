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
  async function request(name, args) {
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
  global.BW27Bridge = Object.freeze({request,version:'27.0.0',mode:'github-standalone-google-api'});
  const check = document.getElementById('bw27-check-server');
  if (check) check.addEventListener('click', async () => {
    check.disabled=true;
    msg('Google 서버 통신을 검사하고 있습니다…',false);
    try {
      const result=await request('bridgeHealth',[]);
      if (result && result.transport==='google-apps-script') msg('Google 직원 서버 연결에 성공했습니다. 이제 계정 로그인과 업무 권한을 확인할 수 있습니다.',false);
      else msg('Google 응답을 받았지만 예상 버전과 다릅니다. 배포 내용을 확인해 주세요.',true);
    } catch (_) { /* request() already displays the actionable diagnostic. */ }
    finally { check.disabled=false; }
  });
  msg('독립 관리자 화면이 준비되었습니다. Google 서버 연결 검사 버튼으로 상태를 확인할 수 있습니다.',false);
})(window);
