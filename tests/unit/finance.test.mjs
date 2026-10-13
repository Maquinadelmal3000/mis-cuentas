import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cuotas, cardStats, unpaidAt } from '../../src/domain/installments.js';
import { cash, committed, workdays, fixedFor } from '../../src/domain/cash.js';
import { homeSummary } from '../../src/domain/summary.js';
import { linkedAmounts } from '../../src/domain/installmentCalc.js';
import { at, realClock, makeState, tx, purchase } from '../helpers/util.mjs';

afterEach(realClock);

test('cuotas: una compra se expande en n cuotas mensuales desde el mes de la primera', () => {
  const s = makeState({ purchases: [purchase({ id: 'p1', n: 3, inst: 100, first: '2026-11', paid: { 1: '2026-12-05' } })] });
  const c = cuotas(s);
  assert.deepEqual(c.map(x => x.due), ['2026-11', '2026-12', '2027-01']);
  assert.deepEqual(c.map(x => x.paid), [null, '2026-12-05', null]);
  assert.deepEqual(c.map(x => x.amount), [100, 100, 100]);
  assert.deepEqual(c.map(x => x.i), [0, 1, 2]);
});

test('cash: saldo inicial + ingresos − gastos al contado − cuotas pagadas', () => {
  at('2026-10-10');
  const s = makeState({
    setup: { done: true, opening: 1000, start: null },
    tx: [
      tx('in', 200, '2026-10-01'), tx('out', 50, '2026-10-02'), tx('out', 30, '2026-10-10'),
      tx('in', 100, '2026-08-01'),                   // anterior a hoy: también cuenta
      tx('in', 500, '2026-10-20'),                   // futuro: no cuenta todavía
      tx('in', 999, '2026-10-03', { sample: true })  // dato de ejemplo: no cuenta
    ],
    purchases: [purchase({ n: 2, inst: 40, first: '2026-10', paid: { 0: '2026-10-05' } })]
  });
  assert.equal(cash(s, 'now'), 1000 + 200 - 50 - 30 + 100 - 40);
  assert.equal(cash(s, 'start'), 1000 + 200 - 50 + 100 - 40);   // al empezar el día no incluye lo de hoy
});

test('cash: una cuota pagada hoy resta hoy; deshacerla la devuelve', () => {
  at('2026-10-10');
  const s = makeState({ setup: { done: true, opening: 500, start: null }, purchases: [purchase({ n: 1, inst: 120, first: '2026-10', paid: { 0: '2026-10-10' } })] });
  assert.equal(cash(s, 'now'), 380);
  delete s.purchases[0].paid[0];
  assert.equal(cash(s, 'now'), 500);
});

test('committed: suma cuotas sin pagar hasta el mes (incluye atrasadas)', () => {
  at('2026-10-10');
  const s = makeState({ purchases: [
    purchase({ n: 3, inst: 100, first: '2026-09', paid: { 0: '2026-09-20' } }),   // sep pagada, oct y nov pendientes
    purchase({ n: 1, inst: 70, first: '2026-08' })                                  // atrasada de agosto
  ] });
  assert.equal(committed(s, 'now', '2026-10'), 100 + 70);            // oct + atrasada
  assert.equal(committed(s, 'now', '2026-11'), 100 + 100 + 70);
  assert.equal(committed(s, 'now', '2026-07'), 0);
});

test('unpaidAt: una cuota pagada hoy cuenta como pendiente al empezar el día', () => {
  at('2026-10-10');
  const c = { paid: '2026-10-10' };
  assert.equal(unpaidAt(c, 'now'), false);
  assert.equal(unpaidAt(c, 'start'), true);
  assert.equal(unpaidAt({ paid: null }, 'now'), true);
});

test('workdays: cuenta días no marcados como libres, extremos incluidos', () => {
  const s = makeState({ off: [0] });
  assert.equal(workdays(s, '2026-10-10', '2026-10-16'), 6);   // sáb 10 … vie 16, sin el domingo 11
  assert.equal(workdays(makeState({ off: [] }), '2026-10-10', '2026-10-16'), 7);
  assert.equal(workdays(s, '2026-10-12', '2026-10-11'), 0);
});

test('fixedFor: suma los ingresos fijos vigentes en el mes', () => {
  const s = makeState({ fixed: [{ id: 'a', name: 'Trabajo', amount: 1000, from: '2026-11' }, { id: 'b', name: 'Otro', amount: 500, from: '2026-01' }] });
  assert.equal(fixedFor(s, '2026-10'), 500);
  assert.equal(fixedFor(s, '2026-11'), 1500);
});

test('cardStats: gastado, cuotas del mes, pendiente y pagado por tarjeta', () => {
  const s = makeState({ purchases: [
    purchase({ cardId: 'c-mia', total: 300, n: 3, inst: 100, date: '2026-10-05', first: '2026-10', paid: { 0: '2026-10-09' } }),
    purchase({ cardId: 'c-papa', total: 90, n: 1, inst: 90, date: '2026-09-01', first: '2026-10' })
  ] });
  const st = cardStats(s, 'c-mia', '2026-10');
  assert.deepEqual(st, { spentMonth: 300, spentTotal: 300, dueMonth: 100, pending: 200, paidTotal: 100, pendingUpTo: 0 });
  assert.equal(cardStats(s, 'c-mia', '2026-12').pendingUpTo, 200);
  assert.equal(cardStats(s, 'c-papa', '2026-10').spentMonth, 0);
});

test('linkedAmounts: total y cuota se calculan entre sí según lo último escrito', () => {
  assert.deepEqual(linkedAmounts({ src: 'total', amount: '600', inst: '', n: 6 }), { amount: '600', inst: '100,00' });
  assert.deepEqual(linkedAmounts({ src: 'inst', amount: '', inst: '120', n: 6 }), { amount: '720,00', inst: '120' });
  assert.deepEqual(linkedAmounts({ src: 'total', amount: '', inst: 'x', n: 3 }), { amount: '', inst: '' });
});

test('homeSummary: meta diaria = faltante ÷ días de trabajo restantes del mes', () => {
  const base = () => makeState({ off: [0], setup: { done: true, opening: 100, start: null }, purchases: [purchase({ n: 1, inst: 600, first: '2026-10' })] });
  at('2026-10-26');                 // lunes 26 → 26..31: 6 días de trabajo (no hay domingo en el rango)
  let h = homeSummary(base());
  assert.equal(h.comp, 600);
  assert.equal(h.libre, 100 - 600);
  assert.equal(h.falta, 500);
  assert.equal(h.wd, 6);
  assert.ok(Math.abs(h.perDay - 500 / 6) < 1e-9);
  at('2026-10-24');                 // sábado 24 → 24..31 son 8 días, el domingo 25 es libre: 7
  h = homeSummary(base());
  assert.equal(h.wd, 7);
});

test('homeSummary: si la plata cubre lo comprometido no hay meta', () => {
  at('2026-10-10');
  const s = makeState({ setup: { done: true, opening: 1000, start: null }, purchases: [purchase({ n: 1, inst: 300, first: '2026-10' })] });
  const h = homeSummary(s);
  assert.equal(h.falta, 0);
  assert.equal(h.libre, 700);
});

test('homeSummary: con ingreso fijo, "te quedaría" = ingreso fijo − cuotas del mes', () => {
  at('2026-10-10');
  const s = makeState({ fixed: [{ id: 'f', name: 'Trabajo', amount: 1000, from: '2026-01' }], purchases: [purchase({ n: 1, inst: 350, first: '2026-10' })] });
  const h = homeSummary(s);
  assert.equal(h.fixed, 1000);
  assert.equal(h.fixedLeft, 650);
});
