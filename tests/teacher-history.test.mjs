import test from 'node:test';
import assert from 'node:assert/strict';
import {centralWeekStart,groupStudentAssignments,availableWeeks,weeklyStudentRows,weekLabel} from '../public/teacher-history.mjs';
import {studentAssignmentsHtml,weeklyPointsHtml} from '../public/teacher-student-panel.mjs';
test('Central Time weeks start Monday, including Sunday night and DST changes',()=>{
 assert.equal(centralWeekStart('2026-11-01T05:59:00Z'),'2026-10-26');
 assert.equal(centralWeekStart('2026-11-02T05:59:00Z'),'2026-10-26');
 assert.equal(centralWeekStart('2026-11-02T06:00:00Z'),'2026-11-02');
 assert.equal(centralWeekStart('2026-03-09T04:59:00Z'),'2026-03-02');
 assert.equal(centralWeekStart('2026-03-09T05:00:00Z'),'2026-03-09');
});
const sample={
 practice:[{activity_id:'challenge:sample',activity_kind:'challenge',status:'completed',updated_at:'2026-11-01T10:00:00Z'},
 {activity_id:'lesson:one',activity_kind:'lesson',status:'completed',updated_at:'2026-10-28T11:00:00Z'}],
 submissions:[{id:'first',activity_id:'challenge:sample',activity_kind:'challenge',submitted_at:'2026-11-03T12:00:00Z',grade_status:'graded',points:7,possible:10},
 {id:'second',activity_id:'challenge:sample',activity_kind:'challenge',submitted_at:'2026-11-04T12:00:00Z',grade_status:'graded',points:6,possible:10},
 {id:'third',activity_id:'project:demo',activity_kind:'project',submitted_at:'2026-11-02T10:00:00Z',grade_status:'ungraded'}],
 checks:[{activity_id:'challenge:sample',checks:9,last_check:'2026-11-04T13:00:00Z'}]
};
test('all assignments grouped with browser completion, multiple hand-ins, and best graded score',()=>{
 const grouped=groupStudentAssignments(sample);
 assert.equal(grouped.length,3);
 const c=grouped.find(r=>r.activity_id==='challenge:sample');
 assert.equal(c.completed,true);assert.equal(c.submissions.length,2);assert.equal(c.best_points,7);assert.equal(c.checks,9);
 assert.equal(grouped.find(r=>r.activity_id==='project:demo').status,'submitted');
 assert.equal(grouped.find(r=>r.activity_id==='lesson:one').status,'completed');
});
test('weekly leaderboard excludes ungraded work and handles weeks without any points',()=>{
 const people=[{user_id:'one',display_name:'Zoe',github_account:'zoe'},{user_id:'two',display_name:'Ada',github_account:'ada'}];
 const weekly={method:'verified_score_improvements',weeks:[{user_id:'one',week_start:'2026-11-02',points:7,assignments:1}]};
 assert.deepEqual(weeklyStudentRows(people,weekly,'2026-11-02').map(p=>p.earned),[7,0]);
 assert.deepEqual(weeklyStudentRows(people,weekly,'2026-10-26').map(p=>p.earned),[0,0]);
 assert.deepEqual(availableWeeks(weekly,'2026-11-05T12:00:00Z'),['2026-11-02']);
 assert.match(weekLabel('2026-11-02'),/Nov 2/);
 const html=weeklyPointsHtml(people,weekly,'2026-11-02','2026-11-05T12:00:00Z');
 assert.match(html,/verified points/i);assert.match(html,/7/);
});
test('expanded history lists all hand-ins, and escapes filenames and activity identifiers',()=>{
 const html=studentAssignmentsHtml({...sample,submissions:[...sample.submissions,{id:'evil',activity_id:'challenge:<script>alert(1)</script>',activity_kind:'challenge',submitted_at:'2026-11-04T20:00:00Z',grade_status:'ungraded'}]});
 assert.match(html,/Assignment history/);assert.match(html,/data-history-receipt="evil"/);
 assert.ok(!html.includes('<script>'));
 assert.match(html,/&lt;Script&gt;/i);
});
