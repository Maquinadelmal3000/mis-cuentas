import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkIntegrity, summarizeState } from '../../src/migration/integrity.js';
import { toRelational, summarizeTables, tableToCsv } from '../../src/migration/toRelational.js';
import { parseBackup, hydrateState } from '../../src/models/schema.js';
import { makeState, tx, purchase } from '../helpers/util.mjs';

const fixture = () => hydrateState(parseBackup(fs.readFileSync(new URL('../fixtures/respaldo-original-sintetico.json', import.meta.url), 'utf8')));

test('un respaldo generado por la app original no tiene errores de integridad', () => {
  const issues = checkIntegrity(fixture());
  assert.deepEqual(issues.filter(i => i.level === 'error'), []);
});

test('checkIntegrity detecta datos que violarían el modelo relacional', () => {
  const s = makeState({
    tx: [tx('in', 5, '2026-01-01', { id: 'dup' }), tx('in', 5, '2026-01-01', { id: 'dup' }), tx('x', -1, 'ayer')],
    purchases: [purchase({ id: 'pp', cardId: 'no-existe', n: 2, paid: { 5: '2026-02-01' }, first: 'mal' })],
    catGroups: { Gasolina: 'GrupoInexistente' }
  });
  const codes = checkIntegrity(s).map(i => i.code);
  for (const c of ['duplicate-id', 'tx-type', 'tx-amount', 'tx-date', 'orphan-card', 'paid-index', 'purchase-first', 'unknown-group']) assert.ok(codes.includes(c), 'falta ' + c);
});

test('toRelational concilia conteos y totales con el estado original', () => {
  const s = fixture();
  const { tables, warnings } = toRelational(s, 'user-1');
  assert.deepEqual(summarizeTables(tables), summarizeState(s));
  assert.deepEqual(warnings, []);
  assert.ok(tables.transactions.every(r => r.user_id === 'user-1'));
});

test('toRelational conserva los identificadores actuales', () => {
  const s = fixture(); const { tables } = toRelational(s);
  assert.deepEqual(tables.transactions.map(r => r.id), s.tx.map(t => t.id));
  assert.deepEqual(tables.purchases.map(r => r.id), s.purchases.map(p => p.id));
  assert.deepEqual(tables.cards.map(r => r.id), s.cards.map(c => c.id));
  assert.ok(tables.installment_payments.every(r => s.purchases.some(p => p.id === r.purchase_id)));
});

test('toRelational convierte meses a fecha, textos a números y marca datos de ejemplo', () => {
  const s = makeState({
    fixed: [{ id: 'f', name: 'Trabajo', amount: 100, from: '2026-10' }],
    templates: [{ id: 'tp', name: 'T', mode: 'card', cat: '', amount: '1.500', note: '', cardId: 'c-mia', n: 3, inst: '500,50', src: 'inst' }],
    tx: [tx('in', 5, '2026-01-01', { sample: true })], purchases: [purchase({ id: 'pp', first: '2026-11', paid: { 0: '2026-11-03' } })]
  });
  const { tables } = toRelational(s);
  assert.equal(tables.fixed_incomes[0].from_month, '2026-10-01');
  assert.equal(tables.templates[0].amount, 1500); assert.equal(tables.templates[0].installment_amount, 500.5); assert.equal(tables.templates[0].category, null);
  assert.equal(tables.transactions[0].is_sample, true);
  assert.equal(tables.purchases[0].first_due_month, '2026-11-01');
  assert.deepEqual(tables.installment_payments, [{ user_id: null, purchase_id: 'pp', installment_index: 0, paid_on: '2026-11-03' }]);
});

test('toRelational: una tarjeta eliminada se migra como tarjeta archivada para no perder sus compras', () => {
  const s = makeState({ purchases: [purchase({ id: 'pp', cardId: 'vieja' })] });
  const { tables, warnings } = toRelational(s);
  const card = tables.cards.find(c => c.id === 'vieja');
  assert.ok(card && card.archived === true && card.name === 'Tarjeta eliminada');
  assert.equal(warnings.length, 1);
  assert.equal(summarizeTables(tables).cards, summarizeState(s).cards);   // las archivadas no cuentan como tarjetas activas
});

test('tableToCsv escapa comillas, comas y saltos; arreglos como literal de PostgreSQL', () => {
  const csv = tableToCsv([{ a: 'x,y', b: 'di "hola"', c: null, d: [0, 1], e: true, f: 'l1\nl2', g: 3.5 }]);
  assert.equal(csv, 'a,b,c,d,e,f,g\n"x,y","di ""hola""",,"{0,1}",true,"l1\nl2",3.5\n');
});
