import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cuotas, cuotaAmounts, monthsElapsed, autoProgress, purchaseProgress, purchaseRemaining, cardStats } from '../../src/domain/installments.js';
import { cash, committed } from '../../src/domain/cash.js';
import { homeSummary } from '../../src/domain/summary.js';
import { monthInstallments } from '../../src/domain/calendar.js';
import { Store } from '../../src/store/Store.js';
import { MemoryRepository } from '../../src/repositories/MemoryRepository.js';
import { LedgerService } from '../../src/services/LedgerService.js';
import { CatalogService } from '../../src/services/CatalogService.js';
import { at, realClock, makeState, purchase } from '../helpers/util.mjs';

afterEach(realClock);
const auto = (over = {}) => makeState({ manualInstallments: false, ...over });

for (const n of [1, 3, 6, 8]) {
  test(`una compra de ${n} cuota(s) genera exactamente ${n}, numeradas de 1 a ${n}, en meses consecutivos`, () => {
    const s = auto({ purchases: [purchase({ id: 'p', n, inst: 10, total: 10 * n, first: '2026-11' })] });
    const c = cuotas(s);
    assert.equal(c.length, n);
    assert.deepEqual(c.map(x => x.i + 1), Array.from({ length: n }, (_, k) => k + 1));
    assert.equal(c[0].due, '2026-11');
    assert.equal(c[n - 1].due, n === 1 ? '2026-11' : ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'][n - 1]);
    assert.equal(new Set(c.map(x => x.due)).size, n);          // un mes distinto por cuota
  });
}

test('modo automático: progreso y deuda restante mes a mes (ejemplo de 6 cuotas desde octubre)', () => {
  const s = auto({ purchases: [purchase({ id: 'p', total: 600000, n: 6, inst: 100000, first: '2026-10', date: '2026-09-20' })] });
  const esperado = [['2026-09', 0, 600000], ['2026-10', 1, 500000], ['2026-11', 2, 400000], ['2026-12', 3, 300000], ['2027-01', 4, 200000], ['2027-02', 5, 100000], ['2027-03', 6, 0], ['2027-04', 6, 0]];
  for (const [ym, prog, resto] of esperado) {
    at(ym + '-15');
    assert.equal(purchaseProgress(s, s.purchases[0]), prog, 'progreso en ' + ym);
    assert.equal(purchaseRemaining(s, s.purchases[0]), resto, 'resto en ' + ym);
  }
});

test('el avance ocurre al empezar el mes calendario (31 oct → 1; 1 nov → 2) y cruza de año', () => {
  const s = auto({ purchases: [purchase({ id: 'p', n: 6, inst: 100, total: 600, first: '2026-10' })] });
  at('2026-10-31'); assert.equal(purchaseProgress(s, s.purchases[0]), 1);
  at('2026-11-01'); assert.equal(purchaseProgress(s, s.purchases[0]), 2);
  at('2026-12-31'); assert.equal(purchaseProgress(s, s.purchases[0]), 3);
  at('2027-01-01'); assert.equal(purchaseProgress(s, s.purchases[0]), 4);
  assert.equal(monthsElapsed('2026-12', '2027-01'), 2);
  assert.equal(monthsElapsed('2026-10', '2026-10'), 1);
  assert.equal(autoProgress({ n: 3, first: '2026-10' }, '2030-01'), 3);   // se limita al total
});

test('la primera cuota puede ser posterior al mes de la compra', () => {
  const s = auto({ purchases: [purchase({ id: 'p', n: 6, inst: 100, total: 600, date: '2026-10-05', first: '2026-11' })] });
  at('2026-10-20'); assert.equal(purchaseProgress(s, s.purchases[0]), 0);
  at('2026-11-02'); assert.equal(purchaseProgress(s, s.purchases[0]), 1);
  at('2026-12-02'); assert.equal(purchaseProgress(s, s.purchases[0]), 2);
});

test('modo manual: no avanza solo; se marca y se desmarca cuota por cuota', async () => {
  at('2026-12-15');
  const repo = new MemoryRepository(), store = new Store(repo); await store.load();
  const ledger = new LedgerService(store), catalog = new CatalogService(store);
  catalog.startApp(1000); catalog.setManualInstallments(true);
  const p = ledger.addPurchase({ cardId: 'c-mia', cat: '', total: 300, n: 3, inst: 100, date: '2026-10-01', note: 'x', first: '2026-10' });
  assert.equal(purchaseProgress(store.state, p), 0);                      // pasaron meses, pero nadie confirmó
  ledger.payInstallment(p.id, 0, '2026-12-15');
  assert.equal(purchaseProgress(store.state, p), 1);
  assert.equal(cash(store.state, 'now'), 900);
  ledger.unpayInstallment(p.id, 0);
  assert.equal(purchaseProgress(store.state, p), 0);
  assert.equal(cash(store.state, 'now'), 1000);
});

test('cambiar de modalidad conserva los pagos reales y no genera pagos ni movimientos', async () => {
  at('2026-12-15');
  const store = new Store(new MemoryRepository()); await store.load();
  const ledger = new LedgerService(store), catalog = new CatalogService(store);
  catalog.startApp(1000); catalog.setManualInstallments(true);
  const p = ledger.addPurchase({ cardId: 'c-mia', cat: '', total: 600, n: 6, inst: 100, date: '2026-10-01', note: 'x', first: '2026-10' });
  ledger.payInstallment(p.id, 0, '2026-10-05');
  const antes = JSON.stringify({ paid: store.state.purchases[0].paid, tx: store.state.tx, n: store.state.purchases.length });
  const plata = cash(store.state, 'now');
  catalog.setManualInstallments(false);                                    // → automático
  assert.equal(JSON.stringify({ paid: store.state.purchases[0].paid, tx: store.state.tx, n: store.state.purchases.length }), antes);
  assert.equal(cash(store.state, 'now'), plata);                           // el calendario no descuenta plata
  assert.equal(purchaseProgress(store.state, store.state.purchases[0]), 3); // oct, nov, dic
  catalog.setManualInstallments(true);                                     // → manual otra vez
  assert.equal(JSON.stringify({ paid: store.state.purchases[0].paid, tx: store.state.tx, n: store.state.purchases.length }), antes);
  assert.equal(purchaseProgress(store.state, store.state.purchases[0]), 1); // solo el pago real
  assert.equal(store.state.manualInstallments, true);
});

test('el avance automático nunca cambia la plata disponible (solo cuentan pagos reales)', () => {
  const s = auto({ setup: { done: true, opening: 500, start: null }, purchases: [purchase({ n: 3, inst: 100, total: 300, first: '2026-10' })] });
  at('2026-10-10'); const a = cash(s, 'now');
  at('2027-03-10'); assert.equal(cash(s, 'now'), a);
  assert.equal(a, 500);
});

test('compromisos: en modo manual incluyen atrasos; en automático solo la cuota del mes', () => {
  at('2026-11-10');
  const base = { purchases: [purchase({ n: 3, inst: 100, total: 300, first: '2026-09' })] };   // sep, oct y nov
  assert.equal(committed(makeState(base), 'now', '2026-11'), 300);                              // manual: sep+oct+nov sin pagar
  assert.equal(committed(auto(base), 'now', '2026-11'), 100);                                   // automático: solo noviembre
  assert.equal(homeSummary(auto(base)).overdue, 0);
  assert.equal(homeSummary(makeState(base)).overdue, 200);
});

test('redondeo: la última cuota absorbe los centavos; con intereses se respeta la cuota', () => {
  assert.deepEqual(cuotaAmounts({ total: 100, n: 3, inst: 33.33 }), [33.33, 33.33, 33.34]);
  assert.deepEqual(cuotaAmounts({ total: 100, n: 3, inst: 40 }), [40, 40, 40]);                 // intereses
  assert.deepEqual(cuotaAmounts({ total: 600, n: 6, inst: 100 }), [100, 100, 100, 100, 100, 100]);
  const s = auto({ purchases: [purchase({ total: 100, n: 3, inst: 33.33, first: '2026-10' })] });
  assert.equal(Math.round(cuotas(s).reduce((a, c) => a + c.amount, 0) * 100) / 100, 100);
});

test('estadísticas de tarjeta según la modalidad', () => {
  at('2026-12-10');
  const mk = manual => makeState({ manualInstallments: manual, purchases: [purchase({ cardId: 'c-mia', n: 4, inst: 100, total: 400, first: '2026-11', date: '2026-10-20' })] });
  assert.deepEqual([cardStats(mk(false), 'c-mia', '2026-12').pending, cardStats(mk(false), 'c-mia', '2026-12').paidTotal], [200, 200]);
  assert.deepEqual([cardStats(mk(true), 'c-mia', '2026-12').pending, cardStats(mk(true), 'c-mia', '2026-12').paidTotal], [400, 0]);
});

/* ---------- Calendario de cuotas ---------- */
test('calendario: varias compras y tarjetas en un mes, con totales y desglose', () => {
  at('2026-11-10');
  const s = auto({ purchases: [
    purchase({ id: 'a', cardId: 'c-mia', note: 'Moto', n: 12, inst: 47000, total: 564000, first: '2026-08' }),    // nov = 4/12
    purchase({ id: 'b', cardId: 'c-mia', note: 'Celular', n: 6, inst: 38000, total: 228000, first: '2026-06' }),   // nov = 6/6
    purchase({ id: 'c', cardId: 'c-papa', note: 'Zapatillas', n: 3, inst: 25000, total: 75000, first: '2026-09' }),// nov = 3/3
    purchase({ id: 'd', cardId: 'c-papa', note: 'Super', n: 3, inst: 30000, total: 90000, first: '2026-10' })      // nov = 2/3
  ] });
  const m = monthInstallments(s, '2026-11');
  assert.equal(m.count, 4); assert.equal(m.scheduled, 47000 + 38000 + 25000 + 30000);
  assert.deepEqual(m.rows.map(r => r.i + 1 + '/' + r.p.n).sort(), ['2/3', '3/3', '4/12', '6/6']);
  assert.deepEqual(m.perCard.map(g => [g.cardId, g.scheduled]).sort(), [['c-mia', 85000], ['c-papa', 55000]]);
  assert.equal(m.done, m.scheduled);          // automático: noviembre ya empezó
  assert.equal(m.pending, 0);
  assert.equal(monthInstallments(s, '2026-11', 'c-papa').scheduled, 55000);   // filtro por tarjeta
  const dic = monthInstallments(s, '2026-12');            // celular y zapatillas ya terminaron: quedan Moto 5/12 y Super 3/3
  assert.deepEqual([dic.count, dic.scheduled, dic.pending, dic.done], [2, 77000, 77000, 0]);
});

test('calendario: una compra de 6 cuotas aparece en 6 meses consecutivos, cruza de año y nunca en un séptimo', () => {
  const s = auto({ purchases: [purchase({ id: 'p', n: 6, inst: 100, total: 600, first: '2026-11' })] });
  const meses = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05'];
  assert.deepEqual(meses.map(m => monthInstallments(s, m).count), [0, 1, 1, 1, 1, 1, 1, 0]);
  assert.deepEqual(['2026-11', '2027-04'].map(m => monthInstallments(s, m).rows[0].i + 1), [1, 6]);
});

test('calendario: estados según la modalidad (futuro pendiente; manual solo lo confirmado)', () => {
  at('2026-11-10');
  const p = purchase({ id: 'p', n: 3, inst: 100, total: 300, first: '2026-10', paid: { 0: '2026-10-09' } });
  const a = auto({ purchases: [JSON.parse(JSON.stringify(p))] }), m = makeState({ purchases: [JSON.parse(JSON.stringify(p))] });
  assert.deepEqual([monthInstallments(a, '2026-11').done, monthInstallments(a, '2026-12').pending], [100, 100]);
  assert.deepEqual([monthInstallments(m, '2026-10').done, monthInstallments(m, '2026-11').done, monthInstallments(m, '2026-11').pending], [100, 0, 100]);
});

test('calendario: editar o eliminar una compra se refleja y no deja cuotas duplicadas', () => {
  const s = auto({ purchases: [purchase({ id: 'p', n: 3, inst: 100, total: 300, first: '2026-11' })] });
  assert.equal(monthInstallments(s, '2026-12').count, 1);
  s.purchases[0].first = '2027-01';
  assert.equal(monthInstallments(s, '2026-12').count, 0); assert.equal(monthInstallments(s, '2027-01').count, 1);
  const todas = cuotas(s).map(c => c.p.id + ':' + c.i); assert.equal(new Set(todas).size, todas.length);
  s.purchases = [];
  assert.equal(monthInstallments(s, '2027-01').count, 0);
});
