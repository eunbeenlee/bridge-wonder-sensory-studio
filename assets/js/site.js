(function () {
  'use strict';
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navScrim = document.querySelector('.nav-scrim');
  if (navToggle && siteNav) {
    const update = (open) => {
      const next = Boolean(open && window.innerWidth <= 840);
      siteNav.classList.toggle('is-open', next);
      document.body.classList.toggle('nav-open', next);
      navToggle.setAttribute('aria-expanded', String(next));
      navToggle.setAttribute('aria-label', next ? '메뉴 닫기' : '메뉴 열기');
      if (navScrim) navScrim.hidden = !next;
    };
    navToggle.addEventListener('click', () => update(!siteNav.classList.contains('is-open')));
    siteNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => update(false)));
    if (navScrim) navScrim.addEventListener('click', () => update(false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
        update(false); navToggle.focus();
      }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 840) update(false); });
  }
  const tabs = Array.from(document.querySelectorAll('[data-stage-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-stage-panel]'));
  if (tabs.length && panels.length) {
    const activate = idx => {
      tabs.forEach((tab, i) => {
        const selected = i === idx;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel, i) => { panel.hidden = (i !== idx); });
      if (tabs[idx] && tabs[idx].scrollIntoView && window.innerWidth < 600) {
        // Horizontal tab list only: avoid changing vertical page scroll.
        const scroller = tabs[idx].closest('.stage-tabs');
        if (scroller && scroller.scrollWidth > scroller.clientWidth) {
          scroller.scrollTo({ left: tabs[idx].offsetLeft - scroller.offsetLeft - 24, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
      }
    };
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => activate(idx));
      tab.addEventListener('keydown', evt => {
        if (evt.key !== 'ArrowRight' && evt.key !== 'ArrowLeft' && evt.key !== 'Home' && evt.key !== 'End') return;
        evt.preventDefault();
        const next = evt.key === 'Home' ? 0 : evt.key === 'End' ? tabs.length - 1 : (idx + (evt.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        activate(next); tabs[next].focus();
      });
    });
    const ageFinder = document.querySelector('[data-age-finder]');
    if (ageFinder) {
      ageFinder.hidden = false;
      const monthInput = ageFinder.querySelector('#child-months');
      const result = ageFinder.querySelector('[data-age-result]');
      ageFinder.addEventListener('submit', (event) => {
        event.preventDefault();
        const month = Number(monthInput.value);
        if (!Number.isInteger(month) || month < 7 || month > 48) {
          result.classList.add('is-error');
          result.textContent = '7~48개월 사이의 월령을 입력해 주세요.';
          monthInput.focus();
          return;
        }
        const idx = month <= 12 ? 0 : month <= 18 ? 1 : month <= 24 ? 2 : month <= 35 ? 3 : 4;
        activate(idx);
        result.classList.remove('is-error');
        const stageName = ['감각 중심 상호작용', '시범과 반복', '선택과 모방', '분류와 탐색', '이야기 확장'][idx];
        result.textContent = `${month}개월 아이를 위한 ‘${stageName}’ 수업 예시입니다. 같은 월간 주제를 아이의 발달에 맞춰 경험합니다.`;
        tabs[idx].focus({ preventScroll: true });
      });
    }
  }
  document.querySelectorAll('[data-copy-address]').forEach(button => button.addEventListener('click', async () => {
    const value = button.getAttribute('data-copy-address');
    const message = document.querySelector('.copy-feedback');
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unsupported');
      await navigator.clipboard.writeText(value);
      if (message) message.textContent = '주소를 복사했습니다.';
    } catch (_error) {
      try {
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('copy command unavailable');
        if (message) message.textContent = '주소를 복사했습니다.';
      } catch (_fallbackError) {
        if (message) message.textContent = '주소: ' + value + ' (직접 선택해 복사해 주세요.)';
      }
    }
  }));
})();

/* Bridge Wonder opening notice · theme-matched · v3: close does not suppress refresh */
(function () {
  'use strict';
  const pathname = location.pathname.replace(/\/index\.html$/i,'/').replace(/\/*$/, '/');
  if (!(pathname === '/' || pathname.startsWith('/sensory-studio/'))) return;
  if (/^\/sensory-studio\/(enroll|privacy)\//.test(pathname)) return;
  if (Date.now() >= Date.parse('2027-02-01T00:00:00+09:00')) return;

  const NAV_SKIP_KEY='bw-open-2027-skip-next-route-v3';
  const DAY_KEY='bw-open-2027-hidden-today-brand-v2';
  const sessionStore=(()=>{try{return window.sessionStorage;}catch(_){return null;}})();
  const localStore=(()=>{try{return window.localStorage;}catch(_){return null;}})();
  const storeRead=(store,key)=>{try{return store ? store.getItem(key) : null;}catch(_){return null;}};
  const storeWrite=(store,key,value)=>{try{if(store)store.setItem(key,value);}catch(_){}};
  // Only suppress the popup once immediately after its CTA navigates to a new page.
  // Normal close/X/Escape/backdrop must NEVER persist a hidden flag.
  const navSkipPath=storeRead(sessionStore,NAV_SKIP_KEY);
  if (navSkipPath === pathname) {
    try { if (sessionStore) sessionStore.removeItem(NAV_SKIP_KEY); } catch (_) {}
    return;
  }
  const hideUntil=Number(storeRead(localStore,DAY_KEY)||0);
  if (hideUntil && Date.now()<hideUntil) return;

  const modal=document.createElement('div');
  modal.className='bw-open-layer';
  modal.id='bw-open-2027';
  modal.innerHTML=`
    <section class="bw-open-card" role="dialog" aria-modal="true" aria-labelledby="bw-open-title" aria-describedby="bw-open-desc">
      <button class="bw-open-close-icon" type="button" data-bw-close aria-label="팝업 닫기">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <img class="bw-open-logo" src="/assets/img/bridge-wonder-logo.png" width="170" height="81" alt="Bridge Wonder Sensory Play Studio">
      <p class="bw-open-kicker">OPENING NOTICE</p>
      <p class="bw-open-date">JANUARY · 2027</p>
      <h2 id="bw-open-title" class="bw-open-title">2027년 1월<br><em>오픈 예정</em></h2>
      <p id="bw-open-desc" class="bw-open-description">작은 호기심이 특별한 발견으로 이어지는 곳.<br><strong>7~48개월 아이를 위한 영어 오감놀이 스튜디오</strong><br>브릿지 원더가 부산 명지에서 첫 만남을 준비합니다.</p>
      <p class="bw-open-subline">1월 체험수업 예정 · 정규 수업은 3월 시작 예정</p>
      <div class="bw-open-actions">
        <a class="btn btn-dark" href="/sensory-studio/visit/#online-inquiry" data-bw-link>체험수업 상담 신청 <span aria-hidden="true">↗</span></a>
        <a class="btn btn-outline" href="/sensory-studio/programs/" data-bw-link>프로그램 살펴보기</a>
      </div>
      <div class="bw-open-foot">
        <button type="button" data-bw-today>오늘 하루 보지 않기</button>
        <button type="button" data-bw-close>닫기</button>
      </div>
    </section>`;
  const priorFocus=document.activeElement;
  document.body.appendChild(modal);
  document.documentElement.classList.add('bw-open-locked');
  const first=modal.querySelector('.bw-open-close-icon');
  const close=(today)=>{
    if(today){
      const now=new Date();
      const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
      storeWrite(localStore,DAY_KEY,String(midnight));
    }
    document.documentElement.classList.remove('bw-open-locked');
    document.removeEventListener('keydown',keyHandler);
    modal.remove();
    if(priorFocus&&priorFocus.isConnected&&typeof priorFocus.focus==='function'){
      try{priorFocus.focus({preventScroll:true});}catch(_){priorFocus.focus();}
    }
  };
  function keyHandler(event){
    if(event.key==='Escape'){event.preventDefault();close(false);return;}
    if(event.key!=='Tab') return;
    const controls=[...modal.querySelectorAll('button:not([disabled]),a[href]')];
    if(!controls.length) return;
    const firstControl=controls[0],lastControl=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===firstControl){event.preventDefault();lastControl.focus();}
    else if(!event.shiftKey&&document.activeElement===lastControl){event.preventDefault();firstControl.focus();}
  }
  document.addEventListener('keydown',keyHandler);
  modal.querySelectorAll('[data-bw-close]').forEach(b=>b.addEventListener('click',()=>close(false)));
  modal.querySelector('[data-bw-today]').addEventListener('click',()=>close(true));
  modal.querySelectorAll('[data-bw-link]').forEach(link=>link.addEventListener('click',()=>{
    // Prevent a second popup immediately on the CTA destination, but let its next refresh show it.
    try {
      const next=new URL(link.href,location.href);
      if (next.origin===location.origin) {
        const nextPath=next.pathname.replace(/\/index\.html$/i,'/').replace(/\/*$/, '/');
        storeWrite(sessionStore,NAV_SKIP_KEY,nextPath);
      }
    } catch (_) {}
  }));
  modal.addEventListener('click',event=>{if(event.target===modal)close(false);});
  first.focus({preventScroll:true});
})();
