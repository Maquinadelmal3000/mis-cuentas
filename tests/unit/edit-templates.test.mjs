import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../src/store/Store.js';
import { MemoryRepository } from '../../src/repositories/MemoryRepository.js';
import { LedgerService } from '../../src/services/LedgerService.js';
import { CatalogService } from '../../src/services/CatalogService.js';
import { ValidationError } from '../../src/services/errors.js';
import { cash } from '../../src/domain/cash.js';
import { monthInstallments } from '../../src/domain/calendar.js';
import { pLabel } from '../../src/domain/accessors.js';
import { at, realClock } from '../helpers/util.mjs';

afterEach(realClock);
async function boot() { const store = new Store(new MemoryRepository()); await store.load(); return { store, ledger: new LedgerService(store), catalog: new CatalogService(store) }; }

test('editar un movimiento actualiza el original (mismo id), sin duplicar, y recalcula la plata', async () => {
  at('2026-10-10');
  const { store, ledger, catalog } = await boot(); catalog.startApp(1000);
  const t = ledger.addTransaction({ type: 'out', cat: 'Gasolina', amount: 40, date: '2026-10-09', note: 'Nafta' });
  assert.equal(cash(store.state, 'now'), 960);
  const e = ledger.updateTransaction(t.id, { type: 'in', cat: 'Uber', amount: 55.555, date: '2026-10-08', note: 'Cambió' });
  assert.equal(store.state.tx.length, 1); assert.equal(e.id, t.id);
  assert.deepEqual([e.type, e.cat, e.amount, e.date, e.note], ['in', 'Uber', 55.56, '2026-10-08', 'Cambió']);
  assert.equal(cash(store.state, 'now'), 1055.56);
});

test('editar conserva la marca de ejemplo y valida los datos', async () => {
  const { store, ledger } = await boot();
  const t = ledger.addTransaction({ type: 'out', cat: 'Otro', amount: 5, date: '2026-10-09', note: '' }); t.sample = true;
  ledger.updateTransaction(t.id, { type: 'out', cat: 'Otro', amount: 6, date: '2026-10-09', note: '' });
  assert.equal(store.state.tx[0].sample, true);
  assert.throws(() => ledger.updateTransaction('no-existe', { type: 'in', cat: 'a', amount: 1, date: '2026-01-01', note: '' }), ValidationError);
  assert.throws(() => ledger.updateTransaction(t.id, { type: 'x', cat: 'a', amount: 1, date: '2026-01-01', note: '' }), ValidationError);
  assert.throws(() => ledger.updateTransaction(t.id, { type: 'in', cat: 'a', amount: 0, date: '2026-01-01', note: '' }), ValidationError);
  assert.throws(() => ledger.updateTransaction(t.id, { type: 'in', cat: 'a', amount: 1, date: '', note: '' }), ValidationError);
});

test('editar una compra: conserva los pagos, actualiza el calendario y protege las cuotas pagadas', async () => {
  at('2026-12-10');
  const { store, ledger, catalog } = await boot(); catalog.startApp(0); catalog.setManualInstallments(true);
  const p = ledger.addPurchase({ cardId: 'c-mia', cat: '', total: 600, n: 6, inst: 100, date: '2026-10-01', note: '', first: '2026-10' });
  ledger.payInstallment(p.id, 0, '2026-10-05'); ledger.payInstallment(p.id, 2, '2026-12-05');
  assert.equal(pLabel(p).startsWith('Compra con tarjeta'), true);          // sin descripción: texto genérico (con la fecha)
  ledger.updatePurchase(p.id, { cardId: 'c-papa', cat: 'Ropa', total: 480, n: 4, inst: 120, date: '2026-10-02', note: 'Zapatillas', first: '2026-11' });
  const q = store.state.purchases[0];
  assert.equal(store.state.purchases.length, 1); assert.equal(q.id, p.id); assert.deepEqual(q.paid, { 0: '2026-10-05', 2: '2026-12-05' });
  assert.equal(pLabel(q), 'Zapatillas');                                    // la descripción real se muestra
  assert.equal(monthInstallments(store.state, '2026-11').rows[0].description, 'Zapatillas');
  assert.equal(monthInstallments(store.state, '2026-10').count, 0);        // se movió la primera cuota
  assert.equal(monthInstallments(store.state, '2027-02').count, 1);        // 4 cuotas: nov, dic, ene, feb
  assert.equal(monthInstallments(store.state, '2027-03').count, 0);        // sin cuota extra
  assert.throws(() => ledger.updatePurchase(p.id, { cardId: 'c-papa', cat: '', total: 240, n: 2, inst: 120, date: '2026-10-02', note: 'x', first: '2026-11' }), e => e.code === 'paid-installments');
  assert.equal(store.state.purchases[0].n, 4);                              // el rechazo no modificó nada
});

test('plantillas: guardar sin duplicar (mismo nombre y tipo se actualiza), conservar el id', async () => {
  const { store, catalog } = await boot();
  const t = { name: 'Nafta', mode: 'out', cat: 'Gasolina', amount: '20', note: '', cardId: null, n: 1, inst: '', src: 'total' };
  assert.equal(catalog.saveTemplate(t), 'created');
  const id = store.state.templates[0].id;
  assert.equal(catalog.saveTemplate({ ...t, name: ' nafta ', amount: '25' }), 'updated');
  assert.equal(store.state.templates.length, 1); assert.equal(store.state.templates[0].id, id); assert.equal(store.state.templates[0].amount, '25');
  assert.equal(catalog.saveTemplate({ ...t, mode: 'in', cat: 'Uber' }), 'created');       // otro tipo: otra plantilla
  assert.equal(store.state.templates.length, 2);
  catalog.removeTemplate(0); assert.equal(store.state.templates.length, 1);
});
