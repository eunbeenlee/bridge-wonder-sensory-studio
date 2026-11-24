/* V55 public regular-course price. Only explicitly approved numeric data.
 * No login, private fields, arbitrary HTML, or private APIs are used.
 * The static confirmed 10-week price is retained if the owner has not published.
 */
(function(){
  'use strict';
  const ENDPOINT='https://script.google.com/macros/s/AKfycbwQVKOruJFxxUHVrsrsDvIpv95jz-ag5SbozlJcJ9mDNrpdGFyYp-uIsT2y2_-3n-xa/exec';
  const krw=new Intl.NumberFormat('ko-KR');
  let done=false;
  function valid(response){
    const p=response&&response.ok===true&&response.price;
    if(!p||!Number.isSafeInteger(p.weeks)||p.weeks<1||p.weeks>52||
       !Number.isSafeInteger(p.total)||p.total<1||p.total>100000000)return null;
    return {weeks:p.weeks,total:p.total};
  }
  function apply(p){
    const total=krw.format(p.total)+'원';
    const term='주 1회 × '+p.weeks+'주';
    const labels={
      home:'정규 과정 '+term+' 총 '+total+'(회당 50분) · 할인 조건은 상담 시 안내',
      programs:'정규 수업은 '+term+' 총 '+total+'(회당 50분)입니다. 활동별 시간은 아이의 반응과 수업 주제에 맞춰 조정합니다. 체험수업은 1회 25,000원 프로모션을 안내하고 있습니다.',
      experience:'정규 수업은 '+term+' 총 '+total+'(회당 50분), 체험수업은 프로모션가 25,000원입니다. 실제 예약과 할인 조건은 상담 후 확인해 주세요.',
      term:'정규 과정 · '+p.weeks+'주 / '+p.weeks+'회',
      amount:total,
      summary:'정규 수업은 '+term+' '+total+'입니다. 체험 프로모션과 추가 할인 조건은 상담 시 확인해 주세요.'
    };
    document.querySelectorAll('[data-bw55-price]').forEach(node=>{
      const key=node.dataset.bw55Price;
      if(Object.prototype.hasOwnProperty.call(labels,key))node.textContent=labels[key];
    });
    document.documentElement.dataset.bw55Pricing='published';
  }
  window.BWPublicPricing=Object.freeze({receive(response){
    if(done)return;
    const p=valid(response);
    if(!p)return;
    done=true;apply(p);
  }});
  function start(){
    if(!document.querySelector('[data-bw55-price]'))return;
    const script=document.createElement('script');
    script.async=true;script.src=ENDPOINT+'?view=pricing-v55';
    script.onerror=()=>script.remove();
    document.head.appendChild(script);
    setTimeout(()=>{if(!done&&script.isConnected)script.remove();},7000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
