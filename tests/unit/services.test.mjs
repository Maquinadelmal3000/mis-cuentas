import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../src/store/Store.js';
import { MemoryRepository } from '../../src/repositories/MemoryRepository.js';
import { LedgerService } from '../../src/services/LedgerService.js';
import { CatalogService } from '../../src/services/CatalogService.js';
import { BackupService } from '../../src/services/BackupService.js';
import { SampleDataService } from '../../src/services/SampleDataService.js';
import { ValidationError } from '../../src/services/errors.js';
import { createDefaultState } from '../../src/models/schema.js';
import { cash } from '../../src/domain/cash.js';
import { cuotas } from '../../src/domain/installments.js';
import { at, realClock } from '../helpers/util.mjs';

afterEach(realClock);
const flush = () => new Promise(r => setImmediate(r));
async function boot(initial = null) {
  const repo = new MemoryRepository(initial);
  const store = new Store(repo); await store.load();
  return { repo, store, ledger: new LedgerService(store), catalog: new CatalogService(store), backup: new BackupService(store), samples: new SampleDataService(store) };
}

test('Store: load hidrata, commit persiste con updatedAt y batch agrupa en una sola persistencia', async () => {
  const { repo, store } = await boot();
  assert.deepEqual(store.state, createDefaultState());
  store.commit(); await flush();
  assert.equal(repo.saves, 1); assert.ok(repo.data.updatedAt > 0);
  store.batch(() => { store.commit(); store.commit(); store.commit(); }); await flush();
  assert.equal(repo.saves, 2);
});

test('Store: un fallo del repositorio no rompe la app y se informa', async () => {
  const repo = new MemoryRepository(); repo.save = async () => { throw new Error('disco lleno'); };
  let seen = null; const store = new Store(repo, { onPersistError: e => { seen = e; } });
  store.commit(); await flush();
  assert.equal(seen.message, 'disco lleno');
});

test('LedgerService: crear, consultar, modificar (pagar) y eliminar movimientos y compras', async () => {
  at('2026-10-10');
  const { store, ledger, catalog } = await boot();
  catalog.startApp(1000);
  const t = ledger.addTransaction({ type: 'in', cat: 'Uber', amount: 50.456, date: '2026-10-09', note: 'x' });
  assert.equal(t.amount, 50.46);
  assert.equal(store.state.tx.length, 1);
  const p = ledger.addPurchase({ cardId: 'c-mia', cat: '', total: 300, n: 3, inst: 100, date: '2026-10-09', note: '', first: '2026-10' });
  assert.deepEqual(p.paid, {});
  assert.equal(cash(store.state, 'now'), 1000 + 50.46);                       // la compra no baja la plata
  assert.equal(ledger.payInstallment(p.id, '0', '2026-10-10'), true);          // el índice puede llegar como texto
  assert.equal(cash(store.state, 'now'), 1000 + 50.46 - 100);
  assert.equal(ledger.unpayInstallment(p.id, 0), true);
  assert.equal(cash(store.state, 'now'), 1000 + 50.46);
  assert.equal(ledger.unpayInstallment(p.id, 0), true);                        // idempotente
  assert.equal(ledger.payInstallment('no-existe', 0, '2026-10-10'), false);
  ledger.payCardUpTo('c-mia', '2026-11', '2026-10-10');
  assert.equal(cuotas(store.state).filter(c => c.paid).length, 2);             // oct y nov; dic sigue pendiente
  ledger.deletePurchase(p.id);
  assert.equal(store.state.purchases.length, 0);
  assert.equal(cash(store.state, 'now'), 1000 + 50.46);                        // sin compra no hay pagos
  ledger.deleteTransaction(t.id);
  assert.equal(store.state.tx.length, 0);
});

test('LedgerService: valida datos', async () => {
  const { ledger } = await boot();
  assert.throws(() => ledger.addTransaction({ type: 'x', cat: 'a', amount: 1, date: '2026-01-01', note: '' }), ValidationError);
  assert.throws(() => ledger.addTransaction({ type: 'in', cat: 'a', amount: 0, date: '2026-01-01', note: '' }), ValidationError);
  assert.throws(() => ledger.addTransaction({ type: 'in', cat: 'a', amount: 5, date: '', note: '' }), ValidationError);
  assert.throws(() => ledger.addPurchase({ cardId: '', total: 10, n: 1, inst: 10, date: '2026-01-01', first: '2026-02' }), ValidationError);
  assert.throws(() => ledger.addPurchase({ cardId: 'c', total: 0, n: 1, inst: 0, date: '2026-01-01', first: '2026-02' }), ValidationError);
});

test('CatalogService: configuración, listas, grupos, ingresos fijos, plantillas y borrado total', async () => {
  const { store, catalog, repo } = await boot();
  catalog.startApp(NaN); assert.equal(store.state.setup.opening, 0); assert.equal(store.state.setup.done, true);
  catalog.setOpening(250); assert.equal(store.state.setup.opening, 250);
  catalog.toggleOffDay(1); assert.deepEqual(store.state.off, [0, 1]); catalog.toggleOffDay(0); assert.deepEqual(store.state.off, [1]);
  assert.equal(catalog.addToList('sources', 'Delivery'), true);
  assert.equal(catalog.addToList('sources', 'Delivery'), false);   // repetida
  assert.equal(catalog.addToList('sources', ''), false);           // vacía
  store.state.sources = ['Uber'];
  assert.equal(catalog.removeFromList('sources', 0), false);       // siempre queda al menos una
  const cats = store.state.cats.length;
  assert.equal(catalog.removeFromList('cats', 0), true); assert.equal(store.state.cats.length, cats - 1);
  catalog.setCategoryGroup(store.state.cats.indexOf('Salidas'), 'Hogar'); assert.equal(store.state.catGroups['Salidas'], 'Hogar');
  catalog.setCategoryGroup(store.state.cats.indexOf('Salidas'), ''); assert.equal(store.state.catGroups['Salidas'], undefined);
  catalog.removeFromList('groups', store.state.groups.indexOf('Moto'));
  assert.ok(!Object.values(store.state.catGroups).includes('Moto'));
  catalog.addFixedIncome({ name: 'Trabajo', amount: 1200.555, from: '2026-10' }); assert.equal(store.state.fixed[0].amount, 1200.56); assert.ok(store.state.fixed[0].id);
  catalog.removeFixedIncome(0); assert.equal(store.state.fixed.length, 0);
  catalog.addTemplate({ name: 'Tanque', mode: 'out', cat: 'Gasolina', amount: '20', note: '', cardId: null, n: 1, inst: '', src: 'total' });
  assert.ok(store.state.templates[0].id); catalog.removeTemplate(0); assert.equal(store.state.templates.length, 0);
  catalog.addCard('Visa', 'credito'); assert.equal(store.state.cards.length, 3); catalog.removeCard(store.state.cards[2].id); assert.equal(store.state.cards.length, 2);
  await flush();
  catalog.wipe(); await flush();
  assert.deepEqual(Object.assign({}, repo.data, { updatedAt: undefined }), Object.assign(createDefaultState(), { updatedAt: undefined }));
});

test('BackupService: exporta, valida y restaura reemplazando todo', async () => {
  const a = await boot(); a.catalog.startApp(10); a.ledger.addTransaction({ type: 'in', cat: 'Uber', amount: 5, date: '2026-10-01', note: 'n' });
  const json = a.backup.exportJson();
  const b = await boot(); b.ledger.addTransaction({ type: 'out', cat: 'Otro', amount: 1, date: '2026-10-01', note: '' });
  const parsed = b.backup.parse(json); assert.ok(parsed);
  b.backup.restore(parsed);
  assert.equal(b.store.state.tx.length, 1); assert.equal(b.store.state.tx[0].note, 'n'); assert.equal(b.store.state.setup.opening, 10);
  assert.equal(b.backup.parse('basura'), null);
});

test('SampleDataService: carga datos de ejemplo que no afectan la plata, sin duplicar, y los quita', async () => {
  at('2026-10-10');
  const { store, catalog, samples } = await boot();
  catalog.startApp(500);
  const before = cash(store.state, 'now');
  samples.load(); const n1 = store.state.tx.length;
  assert.ok(n1 > 50); assert.equal(samples.hasSample(), true);
  assert.equal(cash(store.state, 'now'), before);
  samples.load(); assert.equal(store.state.tx.length, n1);        // recargar no duplica
  samples.remove(); assert.equal(store.state.tx.length, 0); assert.equal(store.state.purchases.length, 0); assert.equal(samples.hasSample(), false);
});
