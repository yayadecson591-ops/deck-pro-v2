import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExecutionPair } from './execution.js';

const supportedA = 'sportybet';
const supportedB = '1xbet';

test('execution pair requires exactly two distinct bookmakers', () => {
  assert.equal(validateExecutionPair([{ bookmaker: supportedA }]).ok, false);
  assert.equal(validateExecutionPair([{ bookmaker: supportedA }, { bookmaker: supportedA }]).ok, false);
  assert.deepEqual(validateExecutionPair([{ bookmaker: supportedA }, { bookmaker: supportedB }]), {
    ok: true,
    bookmakers: [supportedA, supportedB]
  });
});

test('execution pair rejects unsupported bookmaker', () => {
  const result = validateExecutionPair([
    { bookmaker: supportedA },
    { bookmaker: 'unknown-bookmaker' }
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'BOOKMAKER_UNSUPPORTED');
});
