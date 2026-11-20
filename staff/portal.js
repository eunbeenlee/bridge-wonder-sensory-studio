/* Bridge Wonder V26.1 — cross-origin iframe-free staff login gateway.
 * Google Apps Script handles all authentication and authorization. The public URL is not a secret.
 */
(() => {
  'use strict';
  const login = document.getElementById('open-staff-login');
  const label = document.getElementById('connection-label');
  const manualLink = document.getElementById('manual-mode');
  if (!login || !label || !manualLink) return;
  const officialHost = 'script.google.com';
  let target;
  try { target = new URL(login.href); } catch (_) { target = null; }
  if (!target || target.protocol !== 'https:' || target.hostname !== officialHost ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(target.pathname)) {
    label.textContent = '관리자 연결 주소를 확인해 주세요.';
    login.removeAttribute('href');
    manualLink.hidden = true;
    return;
  }
  const manual = new URL(window.location.href).searchParams.get('manual') === '1';
  const embedded = window.self !== window.top;
  if (manual || embedded) {
    label.textContent = '버튼을 누르면 공식 로그인 화면으로 이동합니다.';
    manualLink.hidden = true;
    if (embedded) login.target = '_blank';
    return;
  }
  // A top-level navigation avoids Google Apps Script's external iframe and third-party cookie failures.
  // No cross-origin iframe load event is treated as authentication success.
  const timer = window.setTimeout(() => window.location.replace(target.href), 1200);
  login.addEventListener('click', () => window.clearTimeout(timer), { once: true });
  window.addEventListener('pagehide', () => window.clearTimeout(timer), { once: true });
})();
