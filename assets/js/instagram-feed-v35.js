/* Bridge Wonder V36 — automatic, account-only Instagram profile embed.
 * No Meta API key, paid widget, scraping, or individual-post URLs.
 * Official Instagram embed.js loads once per visit, near the feed viewport;
 * the visitor does not have to click anything to see recent posts.
 */
(function () {
  'use strict';
  const USERNAME = 'bridgewonder.e';
  const PROFILE = 'https://www.instagram.com/' + USERNAME + '/';
  const EMBED_SCRIPT = 'https://www.instagram.com/embed.js';
  let rendererPromise = null;

  function make(tag, klass, text) {
    const node = document.createElement(tag);
    if (klass) node.className = klass;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(label, klass) {
    const a = make('a', klass || 'btn btn-dark', label);
    a.href = PROFILE;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function renderer() {
    if (window.instgrm?.Embeds?.process) return Promise.resolve();
    if (rendererPromise) return rendererPromise;
    rendererPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = EMBED_SCRIPT;
      script.async = true;
      script.referrerPolicy = 'no-referrer-when-downgrade';
      script.onload = () => window.instgrm?.Embeds?.process
        ? resolve() : reject(Error('Instagram embed unavailable'));
      script.onerror = () => reject(Error('Instagram embed unavailable'));
      document.head.appendChild(script);
    }).catch(error => {
      rendererPromise = null;
      throw error;
    });
    return rendererPromise;
  }

  function profileCard() {
    const intro = make('div', 'bw-instagram-account-intro');
    const account = make('div', 'bw-instagram-account-identity');
    const mark = make('img');
    mark.src = '/assets/img/brand-mark.png';
    mark.alt = '';
    mark.width = 82;
    mark.height = 58;
    mark.loading = 'lazy';
    mark.decoding = 'async';
    const handle = make('div', 'bw-instagram-handle');
    handle.append(make('span', '', 'BRIDGE WONDER · OFFICIAL INSTAGRAM'),
      make('strong', '', '@' + USERNAME));
    account.append(mark, handle);

    intro.append(
      account,
      make('h3', 'bw-instagram-account-title', '원더의 작은 순간을 기록합니다.'),
      make('p', 'bw-instagram-account-description',
        '그림책과 노래, 감각놀이를 준비하는 모습부터 새로운 프로그램 소식까지. 브릿지 원더의 이야기를 가까이에서 만나 보세요.')
    );

    const labels = make('div', 'bw-instagram-account-tags');
    labels.append(make('span', '', '사진'), make('span', '', '릴스'), make('span', '', '원더의 소식'));
    intro.append(labels);

    const links = make('div', 'bw-instagram-account-actions');
    links.append(link('인스타그램 전체 보기'));
    intro.append(links);

    intro.append(make('p', 'bw-instagram-story-note',
      '24시간 스토리는 공식 인스타그램에서 확인하실 수 있습니다.'));
    return intro;
  }

  function profileFrame() {
    const media = make('div', 'bw-instagram-account-media');
    media.setAttribute('aria-label', '@' + USERNAME + ' 인스타그램 최근 게시물');
    const frame = make('div', 'bw-instagram-profile-frame');
    const quote = make('blockquote', 'instagram-media');
    quote.setAttribute('data-instgrm-permalink', PROFILE);
    quote.setAttribute('data-instgrm-version', '14');
    quote.style.width = '100%';
    quote.style.maxWidth = '540px';
    quote.style.minWidth = '0';
    quote.style.margin = '0 auto';
    quote.appendChild(link('인스타그램에서 게시물 보기', 'bw-instagram-profile-original'));
    frame.appendChild(quote);

    const state = make('p', 'bw-instagram-profile-status', '인스타그램의 최신 게시물을 불러오고 있습니다.');
    state.setAttribute('role', 'status');
    media.append(frame, state);
    return {media, frame, state};
  }

  function loadNearViewport(root, frame, state) {
    let started = false;
    function begin() {
      if (started) return; // no repeated requests or background polling
      started = true;
      let finished = false;
      let timeout = null;
      let watch = null;
      const success = () => {
        if (finished) return;
        finished = true;
        if (timeout) clearTimeout(timeout);
        if (watch) watch.disconnect();
        state.hidden = true;
        root.classList.add('bw-instagram-embed-ready');
      };
      const unavailable = () => {
        if (finished) return;
        finished = true;
        if (timeout) clearTimeout(timeout);
        if (watch) watch.disconnect();
        state.hidden = false;
        state.textContent = '인스타그램 게시물을 표시하지 못했습니다. 공식 계정에서 확인해 주세요.';
        root.classList.add('bw-instagram-embed-unavailable');
      };
      if (typeof MutationObserver !== 'undefined') {
        watch = new MutationObserver(() => {
          if (frame.querySelector('iframe')) success();
        });
        watch.observe(frame, {childList:true, subtree:true});
      }
      timeout = setTimeout(() => {
        if (frame.querySelector('iframe')) success();
        else unavailable();
      }, 16000);
      renderer().then(() => {
        if (!finished && !frame.querySelector('iframe')) {
          window.instgrm.Embeds.process();
        }
        if (frame.querySelector('iframe')) success();
      }).catch(unavailable);
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        begin();
      }, {rootMargin:'650px 0px', threshold:0});
      observer.observe(root);
    } else {
      begin(); // older browsers: automatic render without a button
    }
  }

  function init(root) {
    root.replaceChildren();
    const widget = make('div', 'bw-instagram-account-widget');
    const intro = profileCard();
    const {media,frame,state} = profileFrame();
    widget.append(intro,media);
    root.appendChild(widget);
    loadNearViewport(root,frame,state);
  }

  function initialize() {
    document.querySelectorAll('[data-bw-instagram-feed]').forEach(init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  } else {
    initialize();
  }
})();
