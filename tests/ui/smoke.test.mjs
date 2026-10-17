/**
 * Prueba de humo de la interfaz: arranca la aplicación (src/main.js) sobre un DOM simulado y recorre
 * las pantallas y los flujos principales. Comprueba que se dibujan sin errores y que los datos llegan a
 * almacenamiento. No sustituye una prueba en navegador real (ver tests/e2e).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from '../helpers/fakeDom.mjs';
import { at } from '../helpers/util.mjs';

const dom = installFakeDom();
at('2026-10-10');
await import('../../src/main.js');
await dom.sleep(30);

test('al abrir por primera vez pide la configuración inicial', () => {
  assert.match(dom.sheet(), /Antes de empezar/);
  assert.match(dom.app(), /Plata que tienes hoy/);
});

test('configuración inicial → pantalla Hoy con el saldo', () => {
  dom.set('s-open', '1.500'); dom.click('startapp');
  assert.match(dom.app(), /\$1\.500,00/);
  assert.doesNotMatch(dom.sheet(), /Antes de empezar/);
});

test('registrar un ingreso, un gasto y una compra en cuotas', async () => {
  dom.fab();
  dom.click('dmode', 'in'); dom.set('f-amt', '250,5'); dom.set('f-date', '2026-10-10'); dom.set('f-note', ''); dom.set('f-cat', 'Uber');
  dom.click('savetx');
  assert.match(dom.app(), /\$1\.750,50/);

  dom.fab(); dom.set('f-amt', '12.345'); dom.set('f-date', '2026-10-10'); dom.set('f-note', ''); dom.set('f-cat', 'Gasolina'); dom.click('savetx');
  assert.match(dom.app(), /-\$12\.345,00/);

  dom.fab(); dom.click('dmode', 'card'); dom.click('dcard', 'c-mia'); dom.click('dn', '6');
  dom.set('f-amt', '600'); dom.set('f-inst', '100'); dom.set('f-date', '2026-10-10'); dom.set('f-note', 'Zapatillas'); dom.set('f-cat', 'Ropa');
  dom.set('f-first', '2026-11'); dom.set('f-n', '6');
  dom.click('savetx');
  await dom.sleep(20);
  const saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  assert.equal(saved.tx.length, 2); assert.equal(saved.purchases.length, 1);
  assert.equal(saved.purchases[0].n, 6); assert.equal(saved.purchases[0].paid && Object.keys(saved.purchases[0].paid).length, 0);
});

test('todas las pestañas y subpestañas se dibujan', () => {
  const pasos = [
    ['list'], ['cats'], ['cards'], ['home']
  ];
  for (const [t] of pasos) { dom.tab(t); assert.ok(dom.app().length > 200, 'pestaña ' + t); }
  dom.tab('cats');
  for (const an of ['sum', 'cat', 'evo', 'debt']) { dom.click('an', an); assert.ok(dom.app().length > 200, 'análisis ' + an); }
  dom.click('an', 'cat'); dom.click('dim', 'group'); assert.match(dom.app(), /Por grupo/);
  dom.click('catdet', 'Gasolina'); assert.match(dom.sheet(), /Gasolina/); dom.click('close');
  dom.tab('cards');
  for (const ct of ['sum', 'mon', 'buy']) { dom.click('ct', ct); assert.ok(dom.app().length > 200, 'tarjetas ' + ct); }
  dom.click('ct', 'sum'); dom.click('cdet', 'c-mia'); assert.match(dom.sheet(), /Mi tarjeta/); dom.click('close');
  dom.tab('home');
});

test('pagar una cuota resta de la plata y se puede deshacer', async () => {
  dom.click('settings'); dom.click('manualtoggle'); dom.click('close');   // este flujo es el de confirmación manual
  dom.tab('cards'); dom.click('ct', 'sum'); dom.click('next');
  dom.click('paycard', 'c-mia'); assert.match(dom.app(), /¿Confirmar pago\?/);   // primer toque pide confirmar
  dom.click('paycard', 'c-mia');
  await dom.sleep(20);
  const saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  assert.equal(Object.keys(saved.purchases[0].paid).length, 1);
  dom.click('dpur', saved.purchases[0].id); assert.match(dom.sheet(), /pagada el/);
  dom.click('unpay', saved.purchases[0].id, { i: '0' });
  await dom.sleep(20);
  assert.equal(Object.keys(JSON.parse(dom.storage.getItem('mis-cuentas-v2')).purchases[0].paid).length, 0);
  dom.click('close'); dom.tab('home');
});

test('ajustes, plantillas, ingreso fijo, tarjeta nueva y datos de ejemplo', async () => {
  dom.click('settings'); assert.match(dom.sheet(), /Ajustes/);
  dom.set('fx-amt', '1.200'); dom.set('fx-name', 'Trabajo'); dom.set('fx-from', '2026-10'); dom.click('addfixed');
  dom.click('newtpl'); dom.set('f-tname', 'Gasolina moto'); dom.set('f-amt', '20'); dom.set('f-note', ''); dom.click('savetplonly');
  assert.match(dom.sheet(), /Gasolina moto/);
  dom.click('close');
  dom.tab('cards'); dom.click('newcard'); dom.set('cname', 'Visa banco'); dom.click('addcard');
  dom.click('settings'); dom.click('sample'); assert.match(dom.app(), /Análisis|Resultado/);
  dom.click('settings'); assert.match(dom.sheet(), /Quitar datos de ejemplo/); dom.click('unsample'); dom.click('close');
  await dom.sleep(20);
  const saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  assert.equal(saved.fixed[0].amount, 1200); assert.equal(saved.templates[0].name, 'Gasolina moto');
  assert.ok(saved.cards.some(c => c.name === 'Visa banco'));
  assert.ok(!saved.tx.some(t => t.sample));
});

test('respaldo: texto exportado y confirmación de borrado con doble toque', async () => {
  dom.click('settings'); dom.click('backup');
  assert.match(dom.sheet(), /Descargar archivo de respaldo/);
  dom.tab('list');
  const id = JSON.parse(dom.storage.getItem('mis-cuentas-v2')).tx[0].id;
  dom.click('dtx', id); const b = dom.click('deltx', id); assert.match(b.textContent, /otra vez/);
  dom.click('deltx', id, {}); // nuevo botón: en el primer toque solo arma
});

test('la interfaz no depende de servicios de Claude', () => {
  assert.equal(typeof globalThis.window.claude, 'undefined');
  assert.match(dom.app() + dom.sheet(), /Solo en este dispositivo|Respaldo|Movimientos/);
});

test('editar un movimiento desde el detalle actualiza el original sin duplicar', async () => {
  dom.tab('home');
  dom.fab(); dom.click('dmode', 'out'); dom.set('f-amt', '40'); dom.set('f-date', '2026-10-10'); dom.set('f-note', 'Nafta'); dom.set('f-cat', 'Gasolina'); dom.click('savetx');
  await dom.sleep(20);
  let saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  const t = saved.tx.find(x => x.note === 'Nafta'), n0 = saved.tx.length;
  dom.click('dtx', t.id); assert.match(dom.sheet(), /Editar/);
  dom.click('edittx', t.id); assert.match(dom.sheet(), /Editar movimiento/); assert.match(dom.sheet(), /Guardar cambios/);
  dom.set('f-amt', '55,5'); dom.set('f-date', '2026-10-09'); dom.set('f-note', 'Nafta YPF'); dom.set('f-cat', 'Gasolina'); dom.click('savetx');
  await dom.sleep(20);
  saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  const e = saved.tx.find(x => x.id === t.id);
  assert.equal(saved.tx.length, n0); assert.equal(e.amount, 55.5); assert.equal(e.note, 'Nafta YPF'); assert.equal(e.date, '2026-10-09');
});

test('plantillas: guardar con su botón sin duplicar, y elegirla en el selector completa el formulario sin guardar nada', async () => {
  dom.fab(); dom.click('dmode', 'out');
  dom.set('f-amt', '20'); dom.set('f-date', '2026-10-10'); dom.set('f-note', 'Tanque'); dom.set('f-cat', 'Gasolina'); dom.set('f-tname', 'Nafta');
  dom.click('savetplnow'); assert.match(dom.sheet(), /Plantilla guardada/);
  dom.click('savetplnow'); assert.match(dom.sheet(), /Plantilla actualizada/);
  dom.click('close'); await dom.sleep(20);
  let saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  const tpls = saved.templates.filter(x => x.name === 'Nafta'); assert.equal(tpls.length, 1);
  const txBefore = saved.tx.length;
  dom.fab(); assert.match(dom.sheet(), /Usar plantilla/);
  (dom.handlers['doc:change'] || []).forEach(f => f({ target: { id: 'f-tpl', value: tpls[0].id, dataset: {} } }));
  assert.match(dom.sheet(), /value="20"/);                       // el monto de la plantilla quedó en el formulario
  assert.match(dom.sheet(), /value="Tanque"/);
  await dom.sleep(20);
  saved = JSON.parse(dom.storage.getItem('mis-cuentas-v2'));
  assert.equal(saved.tx.length, txBefore);                       // elegir una plantilla NO guarda el movimiento
  dom.click('close');
});
