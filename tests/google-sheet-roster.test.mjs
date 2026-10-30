import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSheetLink,parseSheetColumns,normalizeGithub} from '../public/google-sheet-roster.mjs';
const headers=['Timestamp','Email Address','Class Period','First Name','Last Name','Student ID Number','JISD  Username','GitHub  Username','HackerRank Username (Skip if None)'];
test('Google Sheet URL parses private tab link and rejects unrelated domains',()=>{
 assert.deepEqual(parseSheetLink('https://docs.google.com/spreadsheets/d/abc-123/edit#gid=120'),{id:'abc-123',gid:120});
 assert.deepEqual(parseSheetLink('https://docs.google.com/spreadsheets/d/abc123/edit'),{id:'abc123',gid:null});
 assert.throws(()=>parseSheetLink('https://notgoogle.com/spreadsheets/d/abc123/edit'));
 assert.throws(()=>parseSheetLink('https://docs.google.com.evil.com/spreadsheets/d/abc123/edit'));
});
test('normalizes GitHub usernames and Google Form whitespace without collecting IDs',()=>{
 const rows=parseSheetColumns(headers,[['1','2'],['Ada','Grace'],['Lovelace','Hopper'],['@Ada-Code','https://github.com/grace-hopper']]);
 assert.deepEqual(rows,[{github:'ada-code',name:'Ada Lovelace',period:'1',row:2},{github:'grace-hopper',name:'Grace Hopper',period:'2',row:3}]);
 assert.equal(normalizeGithub('HTTPS://github.com/Ada-Code/'),'ada-code');
 assert.equal(JSON.stringify(rows).includes('student_id'),false);
});
test('missing required column fails clearly and empty GitHub cells are skipped',()=>{
 assert.throws(()=>parseSheetColumns(['First Name','Last Name'],[]),/Class Period/);
 assert.deepEqual(parseSheetColumns(headers,[['1','2'],['Ada','Grace'],['Lovelace','Hopper'],['','student1']]),[{github:'student1',period:'2',name:'Grace Hopper',row:3}]);
});
