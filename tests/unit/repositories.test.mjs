import test from 'node:test';
import assert from 'node:assert/strict';
import { StateRepository } from '../../src/repositories/StateRepository.js';
import { LocalStorageRepository } from '../../src/repositories/LocalStorageRepository.js';
import { MemoryRepository } from '../../src/repositories/MemoryRepository.js';
import { STORAGE_KEY } from '../../src/config/constants.js';

const fakeStorage = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, _m: m }; };

for (const [name, make] of [['MemoryRepository', () => new MemoryRepository()], ['LocalStorageRepository', () => new LocalStorageRepository(fakeStorage())]]) {
  test(`${name} cumple el contrato: load/save/clear`, async () => {
    const r = make();
    assert.equal(await r.load(), null);
    await r.save({ a: 1, b: [1, 2] });
    assert.deepEqual(await r.load(), { a: 1, b: [1, 2] });
    await r.clear();
    assert.equal(await r.load(), null);
    assert.equal(r.supportsSync, false);
    assert.equal(r.getSyncStatus(), 'off');
    await r.syncNow();
  });
}

test('LocalStorageRepository usa la clave de la versión original y tolera JSON dañado', async () => {
  const st = fakeStorage(); const r = new LocalStorageRepository(st);
  assert.equal(STORAGE_KEY, 'mis-cuentas-v2');
  await r.save({ x: 1 }); assert.equal(st.getItem('mis-cuentas-v2'), '{"x":1}');
  st.setItem('mis-cuentas-v2', '{roto'); assert.equal(await r.load(), null);
  assert.equal(st.getItem('mis-cuentas-v2.corrupto'), '{roto');          // copia del contenido dañado
  st.setItem('mis-cuentas-v2', '{otro roto'); await r.load();
  assert.equal(st.getItem('mis-cuentas-v2.corrupto'), '{roto');          // no pisa la primera copia
});

test('la interfaz base obliga a implementar load/save/clear (para repositorios futuros)', async () => {
  const r = new StateRepository();
  await assert.rejects(() => r.load(), /no implementado/);
  await assert.rejects(() => r.save({}), /no implementado/);
  await assert.rejects(() => r.clear(), /no implementado/);
});
