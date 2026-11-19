/* Bridge Wonder V25.1 | Google-only staff read accelerator.
 * Browser memory only. No credentials, student records, or writable operations are persisted.
 * google.script.run remains inside the authorized HtmlService iframe.
 */
(function (global) {
  'use strict';
  const READ_METHODS = new Set([
    'staffCurrentUser', 'staffDashboard',
    'staffListClasses', 'staffListInquiries', 'staffListRegistrations',
    'staffListRoster', 'staffListAttendance', 'staffListUsers', 'staffListAudit',
    'staffListOperations', 'staffListTuition', 'staffListDailyChecks',
    'staffListHandoffs', 'staffListStaffCompliance',
    'staff22GetCourseSettings', 'staff20Capacity', 'staff20Waitlist',
    'staff20Makeups', 'staff20Themes', 'staff20ActionCenter',
    'staffDocTypes', 'staffDocSources', 'staffDocPreview',
    'staffDocHistory', 'staffDocDownload'
  ]);
  // Only operational summaries and class schedules may be cached briefly.
  // Names, child details, phone numbers, audit details, and documents are NOT cached.
  const TTL_MS = Object.freeze({
    staffDashboard: 10000,
    staffListClasses: 20000,
    staff20Capacity: 12000,
    staff20Themes: 16000,
    staff20ActionCenter: 8000
  });
  const VIEW_CANCELED = 'BW24_STALE_VIEW';
  function errorOf(e) {
    return e instanceof Error ? e : new Error(e && e.message ? String(e.message) : String(e));
  }
  function create(options) {
    if (!options || typeof options.invoke !== 'function') throw Error('invoke 함수가 필요합니다.');
    const now = options.now || (() => Date.now());
    const concurrency = Math.max(1, Math.min(6, Number(options.concurrency) || 4));
    const readTimeout = Number(options.readTimeoutMs) || 30000;
    const writeTimeout = Number(options.writeTimeoutMs) || 45000;
    const cache = new Map();
    const inFlight = new Map();
    let active = 0, queue = [], dataEpoch = 0, session = null, currentNav = 0;
    let cacheHits = 0, coalesced = 0, calls = 0, errors = 0, timedOut = 0, maxQueued = 0;
    let measurements = [];
    function metrics() {
      const sorted = measurements.map(x => x.ms).sort((a, b) => a - b);
      const p95 = sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : 0;
      return Object.freeze({ calls, errors, timedOut, cacheHits, coalesced, active, queued: queue.length, maxQueued, p95Ms: p95, cacheEntries: cache.size });
    }
    function invalidate() {
      dataEpoch += 1;
      cache.clear();
      inFlight.clear();
      // Dropping queued reads prevents obsolete work from delaying the next page.
      const canceled = queue;
      queue = [];
      canceled.forEach(x => x.reject(new Error(VIEW_CANCELED)));
    }
    function setSession(value) {
      const current = String(value || '');
      if (current !== session) { session = current; invalidate(); }
    }
    function setNavigation(value) {
      currentNav = value;
      const kept = [];
      queue.forEach(x => {
        if (x.nav !== undefined && x.nav !== currentNav) {
          if (x.key) inFlight.delete(x.key);
          x.reject(new Error(VIEW_CANCELED));
        } else kept.push(x);
      });
      queue = kept;
    }
    function limitedInvoke(name, args, timeoutMs) {
      return new Promise((resolve, reject) => {
        let finished = false;
        const timeout = setTimeout(() => {
          if (finished) return;
          finished = true;
          timedOut++;
          reject(new Error(timeoutMs === writeTimeout
            ? '저장 결과를 확인하지 못했습니다. 중복 저장하지 말고 먼저 기록을 확인해 주세요.'
            : '조회가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'));
        }, timeoutMs);
        Promise.resolve().then(() => options.invoke(name, args)).then(value => {
          if (finished) return;
          finished = true; clearTimeout(timeout); resolve(value);
        }, e => {
          if (finished) return;
          finished = true; clearTimeout(timeout); reject(errorOf(e));
        });
      });
    }
    function pump() {
      while (active < concurrency && queue.length) {
        const item = queue.shift();
        if (item.epoch !== dataEpoch || (item.nav !== undefined && item.nav !== currentNav)) {
          item.reject(new Error(VIEW_CANCELED)); continue;
        }
        active++;
        limitedInvoke(item.name, item.args, readTimeout).then(item.resolve, item.reject)
          .finally(() => { active--; pump(); });
      }
    }
    function scheduleRead(name, args, nav, key) {
      return new Promise((resolve, reject) => {
        // Keep the most recent page requests ahead of older pending reads.
        const item = { name, args, nav, key, epoch: dataEpoch, resolve, reject };
        queue.unshift(item); // urgent UI requests first (no hidden prefetch tasks)
        maxQueued = Math.max(maxQueued, queue.length);
        pump();
      });
    }
    function request(name, args, cfg) {
      cfg = cfg || {};
      setSession(cfg.session);
      const read = READ_METHODS.has(name), ttl = TTL_MS[name] || 0;
      const hasNav = Number.isInteger(cfg.nav);
      const nav = hasNav && read && name !== 'staffCurrentUser' ? cfg.nav : undefined;
      if (!read) invalidate(); // invalidate at mutation *start*, not only at success
      const version = dataEpoch;
      const cacheArgs = ttl ? JSON.stringify(args.slice(1)) : '';
      const key = ttl ? name + ':' + cacheArgs : '';
      function guard(value) {
        if (nav !== undefined && nav !== currentNav) throw Error(VIEW_CANCELED);
        if (cfg.session !== session && name !== 'staffLogout') throw Error(VIEW_CANCELED);
        return value;
      }
      if (ttl) {
        const entry = cache.get(key);
        if (entry && entry.until > now()) { cacheHits++; return Promise.resolve(entry.value).then(guard); }
        if (entry) cache.delete(key);
        const shared = inFlight.get(key);
        if (shared && shared.version === version) {
          coalesced++;
          return shared.promise.then(guard); // per-consumer nav guard, shared transport
        }
      }
      calls++;
      const started = now();
      const job = read ? scheduleRead(name, args, nav, key) : limitedInvoke(name, args, writeTimeout);
      const task = job.then(value => {
        if (read && ttl && version === dataEpoch && cfg.session === session) {
          // LRU bound: prevents unbounded memory usage from class filters.
          if (cache.size >= 24) cache.delete(cache.keys().next().value);
          cache.set(key, { value, until: now() + ttl });
        }
        if (!read) invalidate(); // also invalidate when write completes
        return value;
      }, e => {
        errors++;
        if (!read) invalidate(); // timed-out or failed mutation must not leave potentially stale read caches
        throw errorOf(e);
      }).finally(() => {
        if (key && inFlight.get(key)?.promise === task) inFlight.delete(key);
        const ms = Math.max(0, now() - started);
        measurements.push({ name, ms }); if (measurements.length > 60) measurements.shift();
        if (typeof options.onTiming === 'function') options.onTiming(name, ms);
        if (ms > 2500 && typeof options.onSlow === 'function') options.onSlow(name, ms);
      });
      if (key) inFlight.set(key, { version, promise: task });
      return task.then(guard);
    }
    function clear() { session = null; invalidate(); measurements = []; }
    return Object.freeze({ request, invalidate, setSession, setNavigation, clear, metrics, isRead: n => READ_METHODS.has(n) });
  }
  global.BW25Acceleration = Object.freeze({ create, READ_METHODS, VIEW_CANCELED });
})(window);
