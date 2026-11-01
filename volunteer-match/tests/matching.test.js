const test = require('node:test');
const assert = require('node:assert');
const M = require('../matching.js');

const shift = (o) => Object.assign({ id: 'x', title: 'T', cause: 'Youth', date: '2026-11-07', start: '09:00', end: '11:00', location: 'L', skills: [], slots: 2, signups: [] }, o);
const vol = { id: 'v1', name: 'A', email: 'a@x', skills: ['Cooking'], interests: ['Hunger'], availability: ['sat-am'] };

test('slotKey derives weekday and part of day', () => {
  assert.strictEqual(M.slotKey(shift({})), 'sat-am');           // 2026-11-07 is a Saturday
  assert.strictEqual(M.slotKey(shift({ start: '18:00' })), 'sat-eve');
});

test('ranking puts available, skill- and cause-matched shifts first', () => {
  const a = shift({ id: 'a', skills: ['Cooking'], cause: 'Hunger' });
  const b = shift({ id: 'b', start: '13:00', end: '14:00' });            // outside availability
  const c = shift({ id: 'c', start: '07:00', end: '08:00' });            // available, no skill match
  const ranked = M.rankShifts(vol, [b, c, a]);
  assert.deepStrictEqual(ranked.map((r) => r.shift.id), ['a', 'c', 'b']);
  assert.strictEqual(ranked[2].available, false);
});

test('full shifts and already-joined shifts are excluded', () => {
  const full = shift({ id: 'f', slots: 1, signups: ['other'] });
  const joined = shift({ id: 'j', signups: ['v1'], start: '13:00', end: '14:00' });
  assert.deepStrictEqual(M.rankShifts(vol, [full, joined]), []);
});

test('signUp blocks overlapping shifts and full shifts', () => {
  const a = shift({ id: 'a' });
  const b = shift({ id: 'b', title: 'B', start: '10:00', end: '12:00' });
  const all = [a, b];
  assert.ok(M.signUp(vol, a, all).ok);
  const r = M.signUp(vol, b, all);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /Overlaps/);
  const full = shift({ id: 'f', date: '2026-11-08', slots: 1, signups: ['z'] });
  assert.strictEqual(M.signUp(vol, full, [full]).ok, false);
});

test('rewards count hours and badges', () => {
  const s = [shift({ id: 'a', start: '08:00', end: '14:00', signups: ['v1'] }), shift({ id: 'b', date: '2026-11-09', start: '08:00', end: '13:00', signups: ['v1'], cause: 'Hunger' })];
  const r = M.rewards(vol, s);
  assert.strictEqual(r.hours, 11);
  assert.deepStrictEqual(r.badges.map((b) => b.name), ['First Shift', 'Ten Hour Club']);
});
