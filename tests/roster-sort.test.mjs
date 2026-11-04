import test from 'node:test';
import assert from 'node:assert/strict';
import {sortRoster,splitDisplayName} from '../public/roster-sort.mjs';

const people=[
 {github:'zzeta',name:'Alice Baker',first:'Alice',last:'Baker'},
 {github:'aaardvark',name:'Zoe Adams',first:'Zoe',last:'Adams'},
 {github:'mid',name:'Beth Baker',first:'Beth',last:'Baker'}
];
test('sort by last name, then first, with stable GitHub tie-breaker',()=>{
 assert.deepEqual(sortRoster(people,'last').map(p=>p.github),['aaardvark','zzeta','mid']);
});
test('sort by first name and GitHub handle independently',()=>{
 assert.deepEqual(sortRoster(people,'first').map(p=>p.github),['zzeta','mid','aaardvark']);
 assert.deepEqual(sortRoster(people,'github').map(p=>p.github),['aaardvark','mid','zzeta']);
});
test('fallback student-entered name splits for sorting when no Sheet entry exists',()=>{
 assert.deepEqual(splitDisplayName('Taylor Morgan'),{first:'Taylor',last:'Morgan'});
 assert.deepEqual(sortRoster([{name:'Zoe Brown',github:'a'},{name:'Ada Smith',github:'b'}],'last').map(p=>p.github),['a','b']);
});
test('preferred Sheet first and last fields sort differently from student-provided name',()=>{
 const roster=[{id:1,github:'a',name:'Zoe Brown',first:'Marie',last:'Abel'},{id:2,github:'b',name:'Ada Jones',first:'Ada',last:'York'}];
 assert.deepEqual(sortRoster(roster,'last').map(p=>p.id),[1,2]);
 assert.deepEqual(sortRoster(roster,'first').map(p=>p.id),[2,1]);
});
