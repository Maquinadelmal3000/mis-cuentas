import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, migrateState, hydrateState, serializeBackup, parseBackup, buildBackup } from '../../src/models/schema.js';
import { SCHEMA_VERSION } from '../../src/config/constants.js';

test('el estado por defecto es independiente en cada llamada', () => {
  const a = createDefaultState(); a.cats.push('X'); a.cards[0].name = 'cambiada'; a.catGroups.X = 'Y';
  const b = createDefaultState();
  assert.ok(!b.cats.includes('X')); assert.notEqual(b.cards[0].name, 'cambiada'); assert.equal(b.catGroups.X, undefined);
  assert.equal(b.ver, SCHEMA_VERSION);
  assert.deepEqual(Object.keys(b), ['ver', 'setup', 'off', 'savingsPlan', 'manualInstallments', 'sources', 'cats', 'groups', 'fixed', 'templates', 'catGroups', 'cards', 'tx', 'purchases']);
});

test('migración desde una versión anterior: renombra categorías, agrega las nuevas y asigna grupos', () => {
  const old = { ver: 4, setup: { done: true, opening: 5 }, off: [0], sources: ['Uber'], cats: ['Moto: gasolina', 'Comida', 'Mantenimiento del auto', 'Otro'],
    cards: [], tx: [{ id: 'a', type: 'out', cat: 'Moto: gasolina', amount: 10, date: '2026-01-01', note: '' }],
    purchases: [{ id: 'p', cardId: 'x', cat: 'Mantenimiento del auto', total: 1, n: 1, inst: 1, date: '2026-01-01', first: '2026-02', paid: {} }] };
  const s = migrateState(old);
  assert.equal(s.ver, 5);
  assert.equal(s.tx[0].cat, 'Gasolina');
  assert.equal(s.purchases[0].cat, 'Mantenimiento');
  assert.ok(s.cats.includes('Gasolina') && s.cats.includes('Comida') && s.cats.includes('Peluquería'));
  assert.ok(!s.cats.includes('Moto: gasolina'));
  assert.equal(s.cats.filter(c => c === 'Mantenimiento').length, 1);
  assert.equal(s.catGroups['Gasolina'], 'Moto');
  assert.deepEqual(s.fixed, []); assert.deepEqual(s.templates, []);
});

test('la migración es idempotente', () => {
  const once = hydrateState({ setup: { done: true }, tx: [], purchases: [], cats: ['Moto: gasolina'], sources: [], cards: [], off: [] });
  const twice = migrateState(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice, once);
});

test('hydrateState: sin datos o con datos inválidos devuelve el estado por defecto', () => {
  assert.deepEqual(hydrateState(null), createDefaultState());
  assert.deepEqual(hydrateState({ foo: 1 }), createDefaultState());
});

test('hydrateState conserva los datos guardados', () => {
  const saved = Object.assign(createDefaultState(), { setup: { done: true, opening: 77, start: null }, updatedAt: 123 });
  saved.tx.push({ id: 'x', type: 'in', cat: 'Uber', amount: 5, date: '2026-01-01', note: '' });
  const s = hydrateState(JSON.parse(JSON.stringify(saved)));
  assert.equal(s.setup.opening, 77); assert.equal(s.tx.length, 1); assert.equal(s.updatedAt, 123);
});

test('respaldo: ida y vuelta sin pérdida (excepto updatedAt)', () => {
  const s = createDefaultState(); s.setup = { done: true, opening: 10, start: null }; s.updatedAt = 999;
  s.tx.push({ id: 'x', type: 'in', cat: 'Uber', amount: 5.25, date: '2026-01-01', note: 'ñandú' });
  const back = parseBackup(serializeBackup(s));
  const expected = JSON.parse(JSON.stringify(s)); delete expected.updatedAt;
  assert.deepEqual(back, expected);
  const env = buildBackup(s);
  assert.equal(env.app, 'mis-cuentas'); assert.equal(env.version, 1); assert.ok(env.exportedAt);
});

test('parseBackup acepta el estado sin sobre y rechaza lo que no es un respaldo', () => {
  const s = createDefaultState();
  assert.ok(parseBackup(JSON.stringify(s)));
  assert.equal(parseBackup('no es json'), null);
  assert.equal(parseBackup('{"a":1}'), null);
  assert.equal(parseBackup(''), null);
});
