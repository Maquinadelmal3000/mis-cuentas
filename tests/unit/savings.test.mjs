import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, hydrateState } from '../../src/models/schema.js';
import { savingMonth, variableAverage, savingsWindow, selectedSavings } from '../../src/domain/savings.js';
import { toRelational } from '../../src/migration/toRelational.js';
import { tablesToState } from '../../src/sync/relational.js';

const sample = () => {
  const s = createDefaultState();
  s.fixed=[{id:'f1',name:'Sueldo',amount:1000,from:'2026-01'}];
  s.tx=[
    {id:'1',type:'out',date:'2026-06-01',amount:120,cat:'Comida'},
    {id:'2',type:'out',date:'2026-07-01',amount:180,cat:'Comida'},
    {id:'3',type:'out',date:'2026-08-01',amount:300,cat:'Comida'},
    {id:'4',type:'in',date:'2026-09-03',amount:800,cat:'Sueldo'},
    {id:'5',type:'out',date:'2026-09-03',amount:250,cat:'Comida'}
  ];
  s.purchases=[{id:'p1',cardId:s.cards[0].id,cat:'Compras',total:300,n:3,inst:100,date:'2026-07-01',first:'2026-08',paid:{}}];
  return s;
};

test('promedio automático usa 3 meses cerrados y excluye cuotas',()=>{
  const a=variableAverage(sample(),'2026-09');
  assert.deepEqual(a.values,[120,180,300]);assert.equal(a.amount,200);assert.equal(a.hasHistory,true);
});
test('mes actual suma ingresos registrados y previstos sin duplicarlos',()=>{
  const r=savingMonth(sample(),'2026-09','2026-09');
  assert.equal(r.income,1000);assert.equal(r.variable,250);assert.equal(r.installments,100);
  assert.equal(r.available,650);assert.equal(r.status,'mixto');
});
test('meses futuros aplican cuotas, ajustes y promedio de gastos',()=>{
  const s=sample();s.savingsPlan.overrides['2026-10']={variable:350,extraIncome:200,extraExpense:50};
  const r=savingMonth(s,'2026-10','2026-09');
  assert.equal(r.income,1200);assert.equal(r.variable,350);assert.equal(r.installments,100);
  assert.equal(r.expenses,500);assert.equal(r.available,700);
});
test('meses cerrados usan movimientos reales y cuotas de su mes',()=>{
  const r=savingMonth(sample(),'2026-08','2026-09');
  assert.equal(r.income,0);assert.equal(r.variable,300);assert.equal(r.installments,100);assert.equal(r.available,-400);
});
test('selección suma meses arbitrarios incluso con saldo negativo',()=>{
  const s=sample(),rows=savingsWindow(s,'2026-08',3,'2026-09');
  s.savingsPlan.selected=['2026-08','2026-10'];
  assert.equal(selectedSavings(s,rows),rows[0].available+rows[2].available);
});
test('plan se preserva en estado, respaldo y conversión relacional',()=>{
  const s=sample();s.savingsPlan={selected:['2026-10'],overrides:{'2026-10':{variable:400,extraIncome:0,extraExpense:100}}};
  assert.deepEqual(hydrateState(s).savingsPlan,s.savingsPlan);
  const t=toRelational(s,'usuario').tables;
  assert.deepEqual(t.user_settings[0].savings_plan,s.savingsPlan);
  const round=tablesToState(t);
  assert.deepEqual(round.savingsPlan,s.savingsPlan);
});
test('sin historial no se inventan gastos: se marca como estimación incompleta',()=>{
  const s=createDefaultState();const r=savingMonth(s,'2026-11','2026-09');
  assert.equal(r.variable,0);assert.equal(r.hasHistory,false);assert.equal(r.missingIncome,true);
});

test('horizonte sin cuotas: mes anterior y 12 meses desde el actual', async () => {
  const { savingsHorizon } = await import('../../src/domain/savings.js');
  const h = savingsHorizon(createDefaultState(), '2026-10');
  assert.deepEqual(h, {start:'2026-09', end:'2027-09', count:13});
});

test('horizonte llega hasta la última cuota aunque supere 12 meses', async () => {
  const { savingsHorizon } = await import('../../src/domain/savings.js');
  const s = createDefaultState();
  s.purchases = [{id:'long',cardId:'c1',cat:'Compra',total:2400,n:24,inst:100,date:'2026-10-01',first:'2026-10',paid:{}}];
  const h = savingsHorizon(s, '2026-10');
  assert.deepEqual(h, {start:'2026-09', end:'2028-09', count:25});
});

test('horizonte no se acorta por cuotas que ya vencieron', async () => {
  const { savingsHorizon } = await import('../../src/domain/savings.js');
  const s = createDefaultState();
  s.purchases = [{id:'old',cardId:'c1',cat:'Compra',total:200,n:2,inst:100,date:'2025-01-01',first:'2025-02',paid:{}}];
  assert.equal(savingsHorizon(s,'2026-10').end,'2027-09');
});

test('el botón de carga queda fuera de la navegación de cinco pestañas', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const nav = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.equal((nav.match(/data-tab=/g)||[]).length,5);
  assert.doesNotMatch(nav,/id="fab"/);
  assert.match(html,/<\/nav>\s*<button class="plus floating-add" id="fab"/);
});
