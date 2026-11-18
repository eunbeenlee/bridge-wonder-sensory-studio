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
        result.textContent = `${month}개월 아이에게 적용하는 ‘${stageName}’ 티칭 예시입니다. 월간 테마는 다른 연령과 공유합니다.`;
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
