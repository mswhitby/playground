import test from 'node:test';import assert from 'node:assert/strict';
import {visibleCourses,courseUnits,accountCourses,forgetCourseSections} from '../public/course-navigation.mjs';
const catalog=[{id:'python',status:'active'},{id:'web',status:'active'},{id:'planned',status:'planned'}];
test('students see only approved enrolled courses, including the empty case',()=>{
 assert.deepEqual(visibleCourses(catalog,{signedIn:true}),[]);
 assert.deepEqual(visibleCourses(catalog,{signedIn:true,memberships:[{course_id:'python',status:'approved'},{course_id:'web',status:'pending'}]}).map(c=>c.id),['python']);
});
test('teachers see courses with their sections rather than their student memberships',()=>{
 assert.deepEqual(visibleCourses(catalog,{signedIn:true,isTeacher:true,memberships:[{course_id:'python',status:'approved'}],sections:[{course_id:'web'},{course_id:'web'}]}).map(c=>c.id),['web']);
 assert.deepEqual(visibleCourses(catalog,{signedIn:true,isTeacher:true}),[]);
 assert.equal(visibleCourses(catalog).length,2);
});
test('teacher section requests are shared and can be invalidated after classroom changes',async()=>{
 let calls=0;const a={signedIn:true,classroom:{context:{is_teacher:true},async rpc(){calls++;return [{course_id:'web'}]}}};
 await Promise.all([accountCourses(catalog,a),accountCourses(catalog,a)]);assert.equal(calls,1);forgetCourseSections(a);await accountCourses(catalog,a);assert.equal(calls,2);
});
test('unit links retain authored IDs and lesson numbering within each unit',()=>{
 const groups=courseUnits('computer-science-1',{lessons:[{id:'one/a',unit:1,unitName:'First',title:'A'},{id:'two/b',unit:2,unitName:'Second',title:'B'}]});
 assert.equal(groups[1].lessons[0].number,1);assert.equal(groups[1].lessons[0].url,'#/course/computer-science-1/lesson/two%2Fb');assert.equal(groups[1].id,'2');
 const weeks=courseUnits('tsi-math',{weeks:[{id:'w1',title:'Week',sessions:[{id:'d1',title:'Day'}]}]});assert.equal(weeks[0].label,'Week');assert.equal(weeks[0].lessons.length,1);
});

test('archived Computer Science I lessons disappear from units while historical IDs remain in manifest',()=>{
 const old={id:'01-old/a',unit:1,unitName:'Intro',title:'Old',status:'archived'};
 const live={id:'07-new/b',unit:7,unitName:'Strings',title:'New'};
 const manifest={lessons:[old,live]};
 const units=courseUnits('computer-science-1',manifest);
 assert.deepEqual(units.map(u=>u.id),['7']);
 assert.equal(manifest.lessons.length,2);
 assert.equal(manifest.lessons[0].id,'01-old/a');
});
