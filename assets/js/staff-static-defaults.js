/** Bridge Wonder V27.1 static defaults. Safe to publish on GitHub.
 * These are editor hints, not live schedules, tuition fees or account records.
 * Update this file for public labels, form shortcuts and display ordering only.
 */
(function(global){
 'use strict';
 const value={
   version:'54.0.0',
   brand:{name:'Bridge Wonder',studio:'Sensory Play Studio',staffTitle:'센서리 스튜디오 운영'},
   classEditor:{
     courseCode:'BW-SENSORY',
     weekdays:['월요일','화요일','수요일','목요일','금요일','토요일','일요일'],
     durationChoices:['10주','8주','12주'],
     newClassVisibility:'비공개',
     newClassReview:'확인전'
   },
   pricing:{termWeeks:10,termTotal:320000,sessionMinutes:50,maxChildren:4},
   home:{quickOrder:['inquiries','waitlist','students','registrations','classes','capacity','roster','attendance','makeups','handoff','experiences','themes','safety','tuition','documents','operations','courseSettings','compliance','staffCompliance','users','payroll','security']},
   loading:{pending:'스튜디오 운영 현황을 확인하고 있습니다…',empty:'—'}
 };
 function deepFreeze(obj){Object.values(obj).forEach(v=>{if(v&&typeof v==='object')deepFreeze(v)});return Object.freeze(obj);}
 global.BWStaffDefaults=deepFreeze(value);
})(window);
