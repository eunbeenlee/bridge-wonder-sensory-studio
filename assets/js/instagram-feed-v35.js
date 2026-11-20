/* Bridge Wonder · account-only Instagram profile embed
 * Free, no API key, no third-party widget and no individual post URLs.
 * Instagram official embed.js is loaded only when the visitor asks to view
 * the feed, so no Instagram request is triggered on initial page load.
 */
(function () {
  'use strict';
  const USERNAME = 'bridgewonder.e';
  const PROFILE = 'https://www.instagram.com/' + USERNAME + '/';
  const SCRIPT_URL = 'https://www.instagram.com/embed.js';
  let scriptPromise = null;

  function element(tag, klass, text) {
    const node = document.createElement(tag);
    if (klass) node.className = klass;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function profileLink(label) {
    const link = element('a', 'btn btn-dark', label);
    link.href = PROFILE;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function loadInstagramRenderer() {
    if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === 'function') {
      return Promise.resolve();
    }
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = SCRIPT_URL;
      script.onload = () => {
        if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === 'function') resolve();
        else reject(Error('Instagram profile renderer is unavailable'));
      };
      script.onerror = () => reject(Error('Instagram could not load'));
      document.head.appendChild(script);
    }).catch(error => {
      scriptPromise = null;
      throw error;
    });
    return scriptPromise;
  }

  function status(root, text) {
    const label = root.querySelector('.bw-instagram-profile-status');
    if (label) label.textContent = text;
  }

  function showFallback(root) {
    root.replaceChildren();
    const card = element('div', 'bw-instagram-empty');
    const intro = element('div', 'bw-instagram-empty-head');
    const logo = element('img');
    logo.src = '/assets/img/brand-mark.png';
    logo.alt = '';
    logo.width = 96;
    logo.height = 68;
    logo.loading = 'lazy';
    const copy = element('div');
    copy.append(
      element('strong', '', '원더의 새로운 이야기를 만나 보세요.'),
      element('p', '', '수업 준비와 새로운 놀이 소식은 브릿지 원더 공식 인스타그램에 전해 드립니다.')
    );
    intro.append(logo, copy);
    card.append(intro, profileLink('@bridgewonder.e 방문하기'));
    root.appendChild(card);
  }

  function showAccount(root) {
    root.replaceChildren();
    const outer = element('div', 'bw-instagram-account-widget');
    const intro = element('div', 'bw-instagram-account-intro');
    const caption = element('div');
    caption.append(
      element('strong', '', '@' + USERNAME),
      element('p', '', '최근 게시물과 릴스는 인스타그램이 제공하는 프로필 화면에서 확인할 수 있습니다.')
    );
    const actions = element('div', 'bw-instagram-account-actions');
    const button = element('button', 'btn btn-outline bw-instagram-profile-load', '최근 게시물 보기');
    button.type = 'button';
    const link = profileLink('인스타그램으로 이동');
    actions.append(button, link);
    intro.append(caption, actions);
    const note = element('p', 'bw-instagram-profile-status', '게시물 보기를 선택하면 Instagram의 공식 프로필이 열립니다.');
    note.setAttribute('role', 'status');
    const frame = element('div', 'bw-instagram-profile-frame');
    frame.hidden = true;
    outer.append(intro, note, frame);
    root.appendChild(outer);

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = '프로필을 불러오는 중…';
      frame.hidden = false;
      frame.replaceChildren();

      // Instagram supports profile URLs in its official embed flow.
      // The profile, not an individual post, is the only input.
      const blockquote = element('blockquote', 'instagram-media');
      blockquote.setAttribute('data-instgrm-permalink', PROFILE);
      blockquote.setAttribute('data-instgrm-version', '14');
      blockquote.style.width = '100%';
      blockquote.style.maxWidth = '540px';
      blockquote.style.minWidth = '0';
      blockquote.style.margin = '0 auto';
      const original = element('a', '', 'Instagram에서 @' + USERNAME + ' 보기');
      original.href = PROFILE;
      original.target = '_blank';
      original.rel = 'noopener noreferrer';
      blockquote.appendChild(original);
      frame.appendChild(blockquote);
      status(root, '인스타그램 프로필을 불러오고 있습니다.');

      try {
        await loadInstagramRenderer();
        window.instgrm.Embeds.process();
        button.textContent = '다시 불러오기';
        button.disabled = false;
        status(root, '프로필을 표시하지 못할 경우, 인스타그램으로 이동해 확인해 주세요.');
      } catch (_) {
        frame.hidden = true;
        frame.replaceChildren();
        button.textContent = '프로필 다시 불러오기';
        button.disabled = false;
        status(root, '이 브라우저에서는 인스타그램 미리보기를 열 수 없습니다. 공식 계정에서 확인해 주세요.');
      }
    });
  }

  function initialize() {
    document.querySelectorAll('[data-bw-instagram-feed]').forEach(showAccount);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once:true});
  } else {
    initialize();
  }
})();
