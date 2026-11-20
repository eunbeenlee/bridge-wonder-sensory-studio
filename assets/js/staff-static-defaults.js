/** Bridge Wonder V27.1 static defaults. Safe to publish on GitHub.
 * These are editor hints, not live schedules, tuition fees or account records.
 * Update this file for public labels, form shortcuts and display ordering only.
 */
(function(global){
 'use strict';
 const value={
   version:'27.1.0',
   brand:{name:'Bridge Wonder',studio:'Sensory Play Studio',staffTitle:'선생님 운영공간'},
   classEditor:{
     courseCode:'BW-SENSORY',
     weekdays:['월요일','화요일','수요일','목요일','금요일','토요일','일요일'],
     durationChoices:['1개월','3개월','6개월'],
     newClassVisibility:'비공개',
     newClassReview:'확인전'
   },
   home:{quickOrder:['attendance','roster','classes','makeups','inquiries','waitlist','registrations','tuition','payroll','documents','safety','handoff','capacity','themes','operations','courseSettings','users','staffCompliance']},
   loading:{pending:'최신 운영 현황을 확인하고 있습니다…',empty:'—'}
 };
 function deepFreeze(obj){Object.values(obj).forEach(v=>{if(v&&typeof v==='object')deepFreeze(v)});return Object.freeze(obj);}
 global.BWStaffDefaults=deepFreeze(value);
})(window);
