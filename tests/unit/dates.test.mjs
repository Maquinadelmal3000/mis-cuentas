import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { todayS, curYm, addDays, shiftYm, daysIn, parseD, ymd } from '../../src/utils/dates.js';
import { at, realClock } from '../helpers/util.mjs';

afterEach(realClock);

test('el reloj es inyectable', () => { at('2026-10-10'); assert.equal(todayS(), '2026-10-10'); assert.equal(curYm(), '2026-10'); });
test('addDays cruza meses y años', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});
test('shiftYm suma y resta meses', () => {
  assert.equal(shiftYm('2026-11', 3), '2027-02');
  assert.equal(shiftYm('2026-01', -1), '2025-12');
});
test('daysIn considera años bisiestos', () => { assert.equal(daysIn('2028-02'), 29); assert.equal(daysIn('2026-02'), 28); });
test('parseD / ymd son inversos', () => { assert.equal(ymd(parseD('2026-03-09')), '2026-03-09'); });
