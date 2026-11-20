/* Bridge Wonder V28: public, stable UI defaults only. Never store student, payroll, staff or credentials here. */
(function(global){
  'use strict';
  const config={
    version:'28.0.0',
    roleNames:{owner:'원장',director:'관리자',teacher:'선생님',frontdesk:'상담 담당자'},
    course:{code:'BW-SENSORY',name:'Bridge Wonder Sensory Play Studio'},
    days:['월요일','화요일','수요일','목요일','금요일','토요일','일요일'],
    periodExamples:['1개월','3개월','6개월'],
    policy:'Labels and defaults only. Class times, pricing, staff privileges and all records must be read from the Google server.'
  };
  Object.freeze(config.roleNames);Object.freeze(config.course);Object.freeze(config.days);Object.freeze(config.periodExamples);
  global.BWStaffDefaults=Object.freeze(config);
})(window);
