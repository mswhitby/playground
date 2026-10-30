import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTeacherDirectory} from '../public/teacher-directory.mjs';
test('account directory UI has an importable module',()=>{
 assert.equal(typeof mountTeacherDirectory,'function');
});
