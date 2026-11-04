import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSheetLink,parseSheetColumns,normalizeGithub,sheetColumnIndices} from '../public/google-sheet-roster.mjs';
const headers=['Timestamp','Email Address','Class Period','First Name','Last Name','Student ID Number','JISD  Username','GitHub  Username','HackerRank Username (Skip if None)'];
test('Google Sheet URL parses private tab link and rejects unrelated domains',()=>{
 assert.deepEqual(parseSheetLink('https://docs.google.com/spreadsheets/d/abc-123/edit#gid=120'),{id:'abc-123',gid:120});
 assert.deepEqual(parseSheetLink('https://docs.google.com/spreadsheets/d/abc123/edit'),{id:'abc123',gid:null});
 assert.throws(()=>parseSheetLink('https://notgoogle.com/spreadsheets/d/abc123/edit'));
 assert.throws(()=>parseSheetLink('https://docs.google.com.evil.com/spreadsheets/d/abc123/edit'));
});
test('normalizes usernames and excludes student IDs and email addresses',()=>{
 const rows=parseSheetColumns(headers,[['1','2'],['Ada','Grace'],['Lovelace','Hopper'],['@Ada-Code','https://github.com/grace-hopper']]);
 assert.deepEqual(rows,[{github:'ada-code',firstName:'Ada',lastName:'Lovelace',name:'Ada Lovelace',period:'1',periods:['1'],row:2},{github:'grace-hopper',firstName:'Grace',lastName:'Hopper',name:'Grace Hopper',period:'2',periods:['2'],row:3}]);
 assert.equal(normalizeGithub('HTTPS://github.com/Ada-Code/'),'ada-code');
 assert.equal(JSON.stringify(rows).includes('student_id'),false);
 assert.equal(JSON.stringify(rows).includes('Email'),false);
});
test('new second-period column supports two periods, blanks, and deduplication',()=>{
 const h=[...headers,'Class Period 2 (Answer ONLY if you have me for 2 periods)'];
 assert.deepEqual(sheetColumnIndices(h),[2,3,4,7,9]);
 const rows=parseSheetColumns(h,[['1','2','2'],['Ada','Grace','Lin'],['Lovelace','Hopper','Chen'],['ada','grace','lin'],['3','','2']]);
 assert.deepEqual(rows.map(r=>r.periods),[['1','3'],['2'],['2']]);
 assert.equal(rows[0].name,'Ada Lovelace');
 assert.equal(rows[1].period,'2');
});
test('missing required column fails clearly and blank Github cells are skipped',()=>{
 assert.throws(()=>parseSheetColumns(['First Name','Last Name'],[]),/Class Period/);
 assert.deepEqual(parseSheetColumns(headers,[['1','2'],['Ada','Grace'],['Lovelace','Hopper'],['','student1']]),[{github:'student1',firstName:'Grace',lastName:'Hopper',name:'Grace Hopper',period:'2',periods:['2'],row:3}]);
});
