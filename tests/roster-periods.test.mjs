import test from 'node:test';
import assert from 'node:assert/strict';
import {availableRosterPeriods,rosterPeriodsForStudent,periodFromSectionName} from '../public/roster-periods.mjs';

const sections=[
 {name:'Period 1'}, {name:'Period 3'}, {name:'Period 5 - Capstone'},
 {name:'Period 6'}, {name:'Period 7'}, {name:'Period 8'}
];
test('period options include configured sections even without a single Sheet match',()=>{
 assert.deepEqual(availableRosterPeriods(sections,[],[]),['1','3','5','6','7','8']);
});
test('period options include both Sheet columns including periods without a class yet',()=>{
 assert.deepEqual(availableRosterPeriods(sections,[{periods:['3','4']},{periods:['1','8']}],[]),['1','3','4','5','6','7','8']);
});
test('students without Sheet matches can still be found under their enrolled class',()=>{
 assert.deepEqual(rosterPeriodsForStudent([],[{name:'Period 6',status:'approved'}]),['6']);
 assert.deepEqual(rosterPeriodsForStudent([],[{name:'Period 7',status:'pending'}]),['7']);
 assert.deepEqual(rosterPeriodsForStudent([],[{name:'Period 3',status:'removed'}]),[]);
});
test('one student may appear in both Sheet periods and their assigned section, without duplicates',()=>{
 assert.deepEqual(rosterPeriodsForStudent(['3','5'],[{name:'Period 3',status:'approved'}]),['3','5']);
});
test('no guesswork for non-period course names or arbitrary strings',()=>{
 assert.equal(periodFromSectionName('Game Programming & Design'),null);
 assert.equal(periodFromSectionName('Period 5 - Capstone'),'5');
 assert.equal(periodFromSectionName('Period 08'),'8');
});
