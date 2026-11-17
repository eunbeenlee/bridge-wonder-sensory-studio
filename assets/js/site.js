(function () {
  'use strict';
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    const update = (open) => {
      siteNav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    };
    navToggle.addEventListener('click', () => update(!siteNav.classList.contains('is-open')));
    siteNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => update(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') update(false); });
    document.addEventListener('click', e => { if (!siteNav.contains(e.target) && !navToggle.contains(e.target)) update(false); });
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
  }
  document.querySelectorAll('[data-copy-address]').forEach(button => button.addEventListener('click', async () => {
    const value = button.getAttribute('data-copy-address');
    const message = document.querySelector('.copy-feedback');
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unsupported');
      await navigator.clipboard.writeText(value);
      if (message) message.textContent = '주소를 복사했습니다.';
    } catch (_error) {
      if (message) message.textContent = '주소: ' + value + ' (길게 눌러 복사할 수 있습니다.)';
    }
  }));
})();
