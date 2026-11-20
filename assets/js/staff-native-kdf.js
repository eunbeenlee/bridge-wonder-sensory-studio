/* Bridge Wonder V29: native-browser PBKDF2 to reduce Google Apps Script crypto service calls.
 * Uses 160,000 Web Crypto PBKDF2-SHA256 iterations, UTF-8, 256-bit output.
 * The resulting proof is a password-equivalent secret: never persist, log or cache it.
 * Google verifies a server-peppered HMAC of the proof; all roles remain server-side.
 * v1 accounts migrate only after their existing password is verified by Google.
 */
(function (global) {
  'use strict';
  const ITERATIONS = 160000;
  const PREFIX = 'BW29-STAFF-LOGIN|';
  const bytes = new TextEncoder();
  async function derive(email, password) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw Error('업무용 이메일을 확인해 주세요.');
    if (typeof password !== 'string' || password.length < 12 || password.length > 100) throw Error('비밀번호는 12자 이상 100자 이하로 입력해 주세요.');
    const subtle = global.crypto && global.crypto.subtle;
    // Legacy fallback is deliberately a slower, fully server-verified login.
    if (!global.isSecureContext || !subtle) return null;
    const key = await subtle.importKey('raw', bytes.encode(password), {name:'PBKDF2'}, false, ['deriveBits']);
    const raw = await subtle.deriveBits(
      {name:'PBKDF2',salt:bytes.encode(PREFIX + normalized),iterations:ITERATIONS,hash:'SHA-256'},
      key, 256
    );
    return Array.from(new Uint8Array(raw), n => n.toString(16).padStart(2,'0')).join('');
  }
  Object.defineProperty(global, 'BW29KDF', {
    value:Object.freeze({derive,iterations:ITERATIONS,available:() => !!(global.isSecureContext&&global.crypto?.subtle)}),
    writable:false,configurable:false
  });
})(window);
