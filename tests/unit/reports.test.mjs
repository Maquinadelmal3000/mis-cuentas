import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { expenses, ingresos, groupBy, accumulatedSum } from '../../src/domain/reports.js';
import { listMovements } from '../../src/domain/movements.js';
import { groupOf } from '../../src/domain/accessors.js';
import { monthSummary, cardDebts } from '../../src/domain/summary.js';
import { at, realClock, makeState, tx, purchase } from '../helpers/util.mjs';

afterEach(realClock);

const sample = () => makeState({
  tx: [tx('in', 100, '2026-10-02'), tx('out', 40, '2026-10-03', { cat: 'Gasolina' }), tx('out', 10, '2026-09-30', { cat: 'Gasolina' })],
  purchases: [purchase({ id: 'pa', cat: 'Ropa', total: 300, n: 3, inst: 100, date: '2026-09-20', first: '2026-10' }),
              purchase({ id: 'pb', cat: '', total: 90, n: 1, inst: 90, date: '2026-10-05', first: '2026-11' })]
});

test('expenses basis cuota: gastos al contado + cuotas que vencen ese mes', () => {
  const e = expenses(sample(), '2026-10', 'cuota');
  assert.equal(e.length, 2);
  assert.deepEqual(e.map(i => i.amount).sort((a, b) => a - b), [40, 100]);
  assert.ok(e.some(i => i.when === 'cuota 1/3' && i.cat === 'Ropa'));
});
test('expenses basis total: gastos al contado + compras completas del mes (sin categoría → "Sin categoría")', () => {
  const e = expenses(sample(), '2026-10', 'total');
  assert.deepEqual(e.map(i => [i.cat, i.amount]).sort(), [['Gasolina', 40], ['Sin categoría', 90]]);
});
test('ingresos del mes', () => { assert.equal(ingresos(sample(), '2026-10').length, 1); assert.equal(ingresos(sample(), '2026-09').length, 0); });
test('groupBy suma por categoría y ordena de mayor a menor', () => {
  const g = groupBy([{ cat: 'a', amount: 5 }, { cat: 'b', amount: 20 }, { cat: 'a', amount: 10 }]);
  assert.deepEqual(g, [['b', 20], ['a', 15]]);
  assert.deepEqual(groupBy([{ cat: 'a', amount: 1 }], i => 'X'), [['X', 1]]);
});
test('accumulatedSum: acumulado hasta hoy por categoría', () => {
  at('2026-10-10');
  const s = sample();
  assert.equal(accumulatedSum(s, 'out', 'total', i => i.cat === 'Gasolina'), 50);
  assert.equal(accumulatedSum(s, 'out', 'cuota', i => i.cat === 'Ropa'), 100);   // solo la cuota de octubre ya venció
  assert.equal(accumulatedSum(s, 'in', 'cuota', () => true), 100);
});
test('groupOf: grupo de la categoría, o ella misma si no tiene grupo', () => {
  const s = makeState();
  assert.equal(groupOf(s, 'Gasolina'), 'Moto');
  assert.equal(groupOf(s, 'Transporte'), 'Transporte');
  s.groups = s.groups.filter(g => g !== 'Moto');
  assert.equal(groupOf(s, 'Gasolina'), 'Gasolina');
});

test('listMovements: filtros, búsqueda y efecto en la plata', () => {
  const s = makeState({
    tx: [tx('in', 100, '2026-10-02', { note: 'Pago' }), tx('out', 40, '2026-10-03', { cat: 'Gasolina' })],
    purchases: [purchase({ id: 'pz', cat: 'Ropa', note: 'Zapatos', total: 300, n: 3, inst: 100, date: '2026-10-04', first: '2026-10', paid: { 0: '2026-10-09' } })]
  });
  const all = listMovements(s, '2026-10', 'all');
  assert.deepEqual(all.map(m => m.kind), ['payment', 'purchase', 'tx', 'tx']);          // orden por fecha descendente
  assert.equal(all.find(m => m.kind === 'purchase').net, 0);                             // la compra no baja la plata
  assert.equal(all.find(m => m.kind === 'payment').net, -100);
  assert.equal(listMovements(s, '2026-10', 'in').length, 1);
  assert.equal(listMovements(s, '2026-10', 'out').length, 1);
  assert.equal(listMovements(s, '2026-10', 'card').length, 2);
  assert.equal(listMovements(s, '2026-10', 'all', 'zapat').length, 2);                   // compra + pago de cuota
  assert.equal(listMovements(s, '2026-10-02', 'all').length, 1);                         // un día
  assert.equal(listMovements(s, '2026-11', 'all').length, 0);
});

test('monthSummary: totales y cuotas del mes', () => {
  const m = monthSummary(sample(), '2026-10', 'cuota', 'out');
  assert.equal(m.tIn, 100); assert.equal(m.tOut, 140); assert.equal(m.contado, 40);
  assert.equal(m.cuotasMes, 100); assert.equal(m.pagadas, 0); assert.equal(m.compras, 90);
});

test('cardDebts: deuda total y por tarjeta, próxima cuota y fin de deuda', () => {
  const s = sample();
  const d = cardDebts(s, '2026-10');
  assert.equal(d.total, 100 * 3 + 90);
  const mia = d.rows.find(r => r.cd.id === 'c-mia');
  assert.equal(mia.debt, 390); assert.equal(mia.nxt.due, '2026-10'); assert.equal(mia.lst.due, '2026-12'); assert.equal(mia.nxtAmt, 100);
  assert.equal(d.rows.find(r => r.cd.id === 'c-papa').debt, 0);
});
