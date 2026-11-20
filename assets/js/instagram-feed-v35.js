/* Bridge Wonder V35 — public Instagram story feed.
 * Reads ONLY a same-origin JSON snapshot. Never exposes Instagram credentials
 * in the browser and never scrapes Instagram's private endpoints.
 */
(function(){
  'use strict';
  const FEED='/assets/data/instagram-feed.json';
  const PROFILE='https://www.instagram.com/bridgewonder.e/';
  const MAX_ITEMS=9;
  const host='www.instagram.com';
  function permalink(value){
    if(typeof value!=='string'||value.length>230)return null;
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'||!['www.instagram.com','instagram.com'].includes(url.hostname))return null;
      if(!/^\/(?:p|reel|tv)\/[A-Za-z0-9_-]{5,40}\/?$/.test(url.pathname))return null;
      return url.origin+url.pathname;
    }catch(_){return null;}
  }
  function mediaSrc(value){
    if(typeof value!=='string'||value.length>180)return null;
    if(!/^\/assets\/img\/instagram\/ig-[0-9]{6,30}\.webp$/.test(value))return null;
    return value;
  }
  function caption(value){
    return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,125);
  }
  function valid(data){
    if(!data||data.account!=='bridgewonder.e'||!Array.isArray(data.items))return [];
    const dedupe=new Set();
    return data.items.slice(0,40).map(item=>{
      if(!item||typeof item!=='object')return null;
      const url=permalink(item.permalink),image=mediaSrc(item.image),id=String(item.id||'');
      if(!url||!image||!/^\d{6,30}$/.test(id)||dedupe.has(id))return null;
      dedupe.add(id);
      const kind=['IMAGE','VIDEO','CAROUSEL_ALBUM'].includes(item.media_type)?item.media_type:'IMAGE';
      const when=typeof item.timestamp==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(item.timestamp)?item.timestamp:'';
      return {id,url,image,kind,when,caption:caption(item.caption)};
    }).filter(Boolean).slice(0,MAX_ITEMS);
  }
  function node(tag,klass,text){
    const el=document.createElement(tag);
    if(klass)el.className=klass;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function storyImage(){
    const img=node('img');
    img.src='/assets/img/brand-mark.png';
    img.alt='';
    img.loading='lazy';
    img.decoding='async';
    img.width=96;
    img.height=68;
    return img;
  }
  function fallback(root){
    root.replaceChildren();
    const box=node('div','bw-instagram-empty');
    const group=node('div','bw-instagram-empty-head');
    const copy=node('div');
    copy.append(
      node('strong','', '원더의 이야기는 인스타그램에서 이어집니다.'),
      node('p','','수업을 준비하는 모습과 새로운 놀이 소식은 공식 인스타그램에서 확인해 주세요.')
    );
    group.append(storyImage(),copy);
    const link=node('a','btn btn-dark','@bridgewonder.e 방문하기');
    link.href=PROFILE;link.target='_blank';link.rel='noopener noreferrer';
    box.append(group,link);root.appendChild(box);
  }
  function prettyDate(when){
    if(!when)return '';
    const time=Date.parse(when.replace(/([+-]\d{2})(\d{2})$/,'$1:$2'));
    if(!Number.isFinite(time))return '';
    return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'short',day:'numeric'}).format(new Date(time));
  }
  function card(item){
    const link=node('a','bw-instagram-post');
    link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
    link.setAttribute('aria-label','Instagram에서 게시물 보기: '+(item.caption.slice(0,50)||'브릿지 원더'));
    const art=node('div','bw-instagram-post-media');
    const image=node('img');
    image.src=item.image;
    image.alt=item.caption?item.caption.slice(0,100):'브릿지 원더 공식 인스타그램 게시물';
    image.loading='lazy';
    image.decoding='async';
    image.width=600;image.height=600;
    image.addEventListener('error',()=>{
      // Never insert a fake image, show a direct original-post link instead.
      image.remove();
      art.appendChild(node('span','bw-instagram-image-unavailable','원본 게시물 보기'));
    },{once:true});
    art.appendChild(image);
    const content=node('div','bw-instagram-post-copy');
    const kind=item.kind==='VIDEO'?'릴스·영상':item.kind==='CAROUSEL_ALBUM'?'사진 여러 장':'사진';
    const day=prettyDate(item.when);
    content.appendChild(node('span','bw-instagram-post-meta',day?kind+' · '+day:kind));
    content.appendChild(node('p','bw-instagram-post-title',item.caption||'브릿지 원더 인스타그램 게시물 보기'));
    link.append(art,content);
    return link;
  }
  async function draw(){
    const roots=[...document.querySelectorAll('[data-bw-instagram-feed]')];
    if(!roots.length)return;
    roots.forEach(fallback);
    let controller=null,timer=null;
    try{
      controller=typeof AbortController!=='undefined'?new AbortController():null;
      if(controller)timer=setTimeout(()=>controller.abort(),4500);
      const response=await fetch(FEED,{cache:'no-cache',credentials:'omit',...(controller?{signal:controller.signal}:{})});
      if(!response.ok)throw Error('Feed unavailable');
      const data=await response.json();
      const items=valid(data);
      if(!items.length)return;
      roots.forEach(root=>{
        const grid=node('div','bw-instagram-grid');
        items.forEach(item=>grid.appendChild(card(item)));
        root.replaceChildren(grid);
        root.dataset.bwFeedStatus='loaded';
      });
    }catch(_){/* Editorial fallback is kept; nothing fabricated. */}
    finally{if(timer)clearTimeout(timer);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',draw,{once:true});
  else draw();
})();
