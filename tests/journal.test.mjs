import test from 'node:test';
import assert from 'node:assert/strict';
import { centralWeekStart, journalWeeks, journalActivity, journalDraftKey, journalSnapshot } from '../public/journal-model.mjs';
import { describeKey, draftKey } from '../public/account-model.mjs';

test('Journal weeks are Mondays in America/Chicago across DST', () => {
  assert.equal(centralWeekStart(new Date('2026-11-05T20:00:00Z')), '2026-11-02');
  assert.equal(centralWeekStart(new Date('2026-11-02T02:00:00Z')), '2026-10-26');
  assert.equal(centralWeekStart(new Date('2026-03-08T12:00:00Z')), '2026-03-02');
  assert.deepEqual(journalWeeks(new Date('2026-11-05T20:00:00Z'), 3), ['2026-11-02','2026-10-26','2026-10-19']);
});

test('Distinct per-course per-week draft names round-trip through cloud sync', () => {
  for (const course of ['computer-science-1','game-programming','mobile-app-dev','uil','capstone']) {
    for (const field of ['response','details']) {
      const key = journalDraftKey(course, '2026-11-02', field);
      assert.equal(draftKey(describeKey(key)), key);
      assert.equal(describeKey(key).activity_id, 'journal:2026-11-02');
    }
  }
});

test('Journal snapshots are standalone, explicit, ungraded hand-ins', () => {
  const result = journalSnapshot({course:'uil',week:'2026-11-02',response:'I solved the puzzle by testing each possibility.',type:'logic-puzzle',aiUse:'none'});
  assert.equal(result.activity_id, 'journal:2026-11-02');
  assert.equal(result.activity_kind, 'self-report');
  assert.match(result.files['journal.md'], /testing each possibility/);
  assert.equal(JSON.parse(result.files['journal-info.json']).response_type, 'logic-puzzle');
  assert.notEqual(journalActivity('2026-11-02'), journalActivity('2026-11-09'));
});

test('Empty responses, undeclared AI and invalid weeks are rejected', () => {
  const data = {course:'uil',week:'2026-11-02',response:'A detailed original explanation.',type:'essay',aiUse:'none'};
  assert.throws(()=>journalSnapshot({...data,response:'  '}),/Write your response/);
  assert.throws(()=>journalSnapshot({...data,aiUse:''}),/AI-use declaration/);
  assert.throws(()=>journalSnapshot({...data,aiUse:'disclosed',aiDetails:''}),/Describe any AI use/);
  assert.throws(()=>journalSnapshot({...data,week:'2026-11-03'}),/valid Monday/);
});
