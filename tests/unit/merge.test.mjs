import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStates } from '../../src/domain/merge.js';
import { createDefaultState } from '../../src/models/schema.js';

test('mergeStates une movimientos por id sin duplicar y combina pagos de cuotas', () => {
  const a = createDefaultState(), b = createDefaultState();
  a.updatedAt = 2; b.updatedAt = 1;
  const t1 = { id: 't1', type: 'in', cat: 'Uber', amount: 1, date: '2026-01-01', note: '' }, t2 = { id: 't2', type: 'out', cat: 'Otro', amount: 2, date: '2026-01-02', note: '' };
  a.tx = [t1]; b.tx = [t1, t2];
  const p = { id: 'p', cardId: 'c-mia', cat: '', total: 20, n: 2, inst: 10, date: '2026-01-01', first: '2026-02', note: '' };
  a.purchases = [{ ...p, paid: { 0: '2026-02-01' } }]; b.purchases = [{ ...p, paid: { 1: '2026-03-01' } }];
  a.setup = { done: true, opening: 5, start: null }; b.setup = { done: true, opening: 9, start: null };
  const m = mergeStates(a, b);
  assert.deepEqual(m.tx.map(t => t.id).sort(), ['t1', 't2']);
  assert.deepEqual(m.purchases[0].paid, { 0: '2026-02-01', 1: '2026-03-01' });
  assert.equal(m.setup.opening, 5);   // gana el más reciente
});
