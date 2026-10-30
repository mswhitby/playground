import test from 'node:test';import assert from 'node:assert/strict';
import {saveSheetLink,readSavedSheetLink,clearSheetLink} from '../public/google-sheet-roster.mjs';
test('saved Sheet link survives reload but stores no roster or token',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const url='https://docs.google.com/spreadsheets/d/roster123/edit#gid=123';saveSheetLink(storage,url);
 assert.equal(readSavedSheetLink(storage),url);assert.deepEqual([...values.keys()],['playground:teacher-google-sheet-url']);
 clearSheetLink(storage);assert.equal(readSavedSheetLink(storage),'');
});
test('only valid Sheets URL accepted for saved link',()=>{
 const storage={getItem:()=>'',setItem:()=>{throw Error('unexpected write')}};
 assert.throws(()=>saveSheetLink(storage,'https://example.com/roster'));
});
