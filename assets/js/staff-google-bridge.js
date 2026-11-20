/**
 * Bridge Wonder V27.2 · GitHub standalone / Google-only HTTP bridge
 *
 * The server remains the authority for authentication, per-user role access,
 * payroll secrecy, validation, and all writes. No browser credentials, API
 * secrets, spreadsheet IDs, or personal records are embedded in this file.
 *
 * Browser -> Google Apps Script /exec, POST text/plain JSON.
 * A health check is performed only once per page load (or by explicit retry)
 * and must succeed before ANY account credential or staff data is sent.
 */
(function (global) {
  'use strict';
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwQVKOruJFxxUHVrsrsDvIpv95jz-ag5SbozlJcJ9mDNrpdGFyYp-uIsT2y2_-3n-xa/exec';
  const PROTOCOL = 'BW_STAFF_V27';
  const STATUS_ID = 'bw27-server-status';
  const HEALTH_VERSION = '27.0.0'; // Matches deployed StaffBridge.gs, not the UI release.
  const REQUEST_LIMIT = 350000;
  const metrics = {sent:0,failed:0,healthChecks:0,healthVerified:false,lastMs:0};
  let healthPromise = null;
  let verified = false;

  function notice(message, warning) {
    const node = document.getElementById(STATUS_ID);
    if (!node) return;
    node.textContent = message;
    node.style.color = warning ? '#8c4428' : '#6e7c69';
  }
  function messageFromError(error, method) {
    const m = String(error && error.message || error || '서버 통신 오류');
    if (error && error.name === 'AbortError')
      return method === 'bridgeHealth'
        ? 'Google 서버의 연결 확인이 지연되고 있습니다. 다시 확인해 주세요.'
        : '서버의 처리 결과를 확인하지 못했습니다. 중복 저장하지 말고 먼저 기록을 확인해 주세요.';
    if (/Failed to fetch|NetworkError|CORS/i.test(m))
      return 'Google 서버 통신이 차단되었습니다. 연결·배포 주소와 브라우저 네트워크 설정을 확인해 주세요.';
    if (/^Google 응답: HTTP [45]\d\d/.test(m))
      return m + ' · Google 웹앱 배포와 접근 설정을 확인해 주세요.';
    return m.slice(0,240);
  }
  const url = new URL(ENDPOINT);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname))
    throw Error('설정된 Google 직원용 웹앱 주소가 올바르지 않습니다.');

  // Fail closed when an unrelated site embeds the management portal in a frame.
  if (global.top && global.self && global.top !== global.self) {
    document.body.textContent = '선생님 운영공간은 별도 브라우저 탭에서 열어 주세요.';
    return;
  }

  async function transport(method, args) {
    if (!Array.isArray(args)) throw Error('요청 인수 형식이 올바르지 않습니다.');
    const json = JSON.stringify({protocol:PROTOCOL,method,args});
    if (json.length > REQUEST_LIMIT) throw Error('요청 데이터가 너무 큽니다. 입력 내용을 확인해 주세요.');
    const controller = new AbortController();
    const timeoutMs = method === 'bridgeHealth' ? 15000 : method === 'staff23PasswordLogin' ? 55000 : 45000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    metrics.sent += 1;
    try {
      const response = await fetch(ENDPOINT, {
        method:'POST', mode:'cors', credentials:'omit', redirect:'follow', cache:'no-store',
        headers:{'Content-Type':'text/plain;charset=utf-8'}, body:json, signal:controller.signal
      });
      if (!response.ok) throw Error('Google 응답: HTTP ' + response.status);
      const text = await response.text();
      let reply;
      try { reply = JSON.parse(text); }
      catch (_) {
        throw Error('Google이 정상 JSON 대신 다른 페이지를 반환했습니다. 웹앱 배포·연결 설정을 확인해 주세요.');
      }
      if (!reply || reply.ok !== true) {
        // A business/authorization error is not a network outage. App UI renders its own error.
        const e = new Error(String(reply && reply.message || '요청 처리에 실패했습니다.').slice(0,240));
        e.businessError = true;
        throw e;
      }
      if (method === 'bridgeHealth' &&
          (!reply.value || reply.value.version !== HEALTH_VERSION || reply.value.transport !== 'google-apps-script'))
        throw Error('Google 직원 서버의 연결 버전이 일치하지 않습니다. Apps Script 배포를 확인해 주세요.');
      return reply.value;
    } catch (error) {
      metrics.failed += 1;
      if (error && error.businessError) throw error;
      const msg = messageFromError(error, method);
      notice(msg, true);
      throw Error(msg);
    } finally {
      clearTimeout(timer);
      metrics.lastMs = Math.max(0, Date.now() - started);
    }
  }

  function ensureReady(force) {
    if (verified && !force) return Promise.resolve({transport:'google-apps-script',version:HEALTH_VERSION});
    if (healthPromise) return healthPromise;
    metrics.healthChecks += 1;
    notice('Google 업무 서버에 안전하게 연결하는 중입니다…', false);
    const job = transport('bridgeHealth', [])
      .then(value => {
        verified = true;
        metrics.healthVerified = true;
        notice('업무 서버 연결 완료 · 이메일과 비밀번호로 로그인할 수 있습니다.', false);
        return value;
      })
      .catch(error => {
        verified = false;
        metrics.healthVerified = false;
        throw error;
      })
      .finally(() => { if (healthPromise === job) healthPromise = null; });
    healthPromise = job;
    return job;
  }

  async function request(method, args) {
    if (method === 'bridgeHealth') return ensureReady(true);
    // A single anonymous handshake is shared by concurrent login/restored-session calls.
    await ensureReady(false);
    return transport(method, args);
  }

  // Interface expected by existing V26 GitHub UI. It preserves failure callbacks
  // and avoids injecting Google HtmlService or cross-origin iframes.
  function runner(success, failure, userObject) {
    return new Proxy(Object.create(null), {
      get(_, key) {
        if (key === 'withSuccessHandler') return fn => runner(fn, failure, userObject);
        if (key === 'withFailureHandler') return fn => runner(success, fn, userObject);
        if (key === 'withUserObject') return obj => runner(success, failure, obj);
        if (typeof key === 'symbol' || key === 'then') return undefined;
        return (...args) => {
          request(String(key), args).then(value => {
            if (typeof success === 'function') success(value, userObject);
          }, error => {
            if (typeof failure === 'function') failure({message:error.message}, userObject);
            else console.error('[Bridge Wonder] 요청 실패:', error.message);
          });
        };
      }
    });
  }
  global.google = Object.assign(global.google || {}, {
    script:Object.assign((global.google || {}).script || {}, {run:runner(null,null,null)})
  });

  const retry = document.getElementById('bw27-check-server');
  if (retry) retry.addEventListener('click', async () => {
    retry.disabled = true;
    try { await ensureReady(true); }
    catch (_) { /* An actionable status is already shown. */ }
    finally { retry.disabled = false; }
  });

  global.BW27Bridge = Object.freeze({
    request, ensureReady,
    metrics:() => Object.freeze({...metrics}),
    version:'27.2.0', mode:'github-standalone-google-http'
  });

  // First load does not block rendering of GitHub's static login form.
  // No staff identifier, password, token, or student record goes into this request.
  ensureReady(false).catch(() => {});
})(window);
