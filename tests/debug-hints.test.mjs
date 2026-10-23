import test from 'node:test';import assert from 'node:assert/strict';
import {debugHints} from '../public/debug-hints.mjs';
test('placeholder and compiler errors produce actionable prompts without claiming correctness',()=>{const h=debugHints({source:'throw new NotImplementedException();',errors:'Program.cs(8,4): error CS0161: not all code paths return a value',expected:'Print hello'}).join(' ');assert.match(h,/placeholder/);assert.match(h,/promises a returned value/);assert.doesNotMatch(h,/correct answer/)});
test('Unity scripts receive Editor-specific scope guidance',()=>{assert.match(debugHints({source:'using UnityEngine; class Player : MonoBehaviour {}'}).join(' '),/Unity Editor/)});
test('unknown failures ask for a reproducible example',()=>{assert.match(debugHints().join(' '),/concrete input/)});
