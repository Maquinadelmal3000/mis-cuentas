/**
 * Verificaciones de integridad de un estado/respaldo ANTES de migrar o importar.
 * Es solo lectura: no modifica nada. Devuelve una lista de hallazgos.
 *   level 'error'   → dato que violaría el modelo relacional propuesto (hay que corregirlo o decidir cómo migrarlo)
 *   level 'warning' → situación válida en la app pero que requiere una decisión de migración (p. ej. tarjeta eliminada)
 */
import { cuotas } from '../domain/installments.js';

const RE_DAY = /^\d{4}-\d{2}-\d{2}$/;
const RE_MONTH = /^\d{4}-\d{2}$/;

function dupIds(items, label, out) {
  const seen = new Set();
  (items || []).forEach(i => { if (seen.has(i.id)) out.push({ level: 'error', code: 'duplicate-id', message: `${label}: id repetido "${i.id}"` }); seen.add(i.id); });
}

/** @returns {{level:'error'|'warning',code:string,message:string}[]} */
export function checkIntegrity(state) {
  const out = [];
  dupIds(state.tx, 'movimientos', out); dupIds(state.purchases, 'compras', out);
  dupIds(state.cards, 'tarjetas', out); dupIds(state.templates, 'plantillas', out); dupIds(state.fixed, 'ingresos fijos', out);

  state.tx.forEach(t => {
    if (t.type !== 'in' && t.type !== 'out') out.push({ level: 'error', code: 'tx-type', message: `movimiento ${t.id}: tipo inválido "${t.type}"` });
    if (!(t.amount > 0)) out.push({ level: 'error', code: 'tx-amount', message: `movimiento ${t.id}: monto no positivo (${t.amount})` });
    if (!RE_DAY.test(t.date || '')) out.push({ level: 'error', code: 'tx-date', message: `movimiento ${t.id}: fecha inválida "${t.date}"` });
  });

  const cardIds = new Set((state.cards || []).map(c => c.id));
  state.cards.forEach(c => { if (c.kind !== 'credito' && c.kind !== 'papa') out.push({ level: 'error', code: 'card-kind', message: `tarjeta ${c.id}: tipo inválido "${c.kind}"` }); });
  state.purchases.forEach(p => {
    if (!cardIds.has(p.cardId)) out.push({ level: 'warning', code: 'orphan-card', message: `compra ${p.id}: la tarjeta "${p.cardId}" ya no existe (la app la muestra como "Tarjeta eliminada")` });
    if (!(p.total > 0) || !(p.inst > 0)) out.push({ level: 'error', code: 'purchase-amount', message: `compra ${p.id}: total o cuota no positivos` });
    if (!Number.isInteger(p.n) || p.n < 1 || p.n > 60) out.push({ level: 'error', code: 'purchase-n', message: `compra ${p.id}: número de cuotas fuera de 1–60 (${p.n})` });
    if (!RE_DAY.test(p.date || '')) out.push({ level: 'error', code: 'purchase-date', message: `compra ${p.id}: fecha inválida "${p.date}"` });
    if (!RE_MONTH.test(p.first || '')) out.push({ level: 'error', code: 'purchase-first', message: `compra ${p.id}: mes de primera cuota inválido "${p.first}"` });
    Object.keys(p.paid || {}).forEach(k => {
      const i = Number(k);
      if (!Number.isInteger(i) || i < 0 || i >= p.n) out.push({ level: 'error', code: 'paid-index', message: `compra ${p.id}: pago de una cuota inexistente (índice ${k} de ${p.n})` });
      if (!RE_DAY.test(p.paid[k] || '')) out.push({ level: 'error', code: 'paid-date', message: `compra ${p.id}: fecha de pago inválida en la cuota ${k}` });
    });
  });
  (state.fixed || []).forEach(f => {
    if (!RE_MONTH.test(f.from || '')) out.push({ level: 'error', code: 'fixed-from', message: `ingreso fijo ${f.id}: mes inicial inválido "${f.from}"` });
    if (!(f.amount > 0)) out.push({ level: 'error', code: 'fixed-amount', message: `ingreso fijo ${f.id}: monto no positivo` });
  });
  const groups = new Set(state.groups || []);
  Object.entries(state.catGroups || {}).forEach(([cat, g]) => {
    if (!groups.has(g)) out.push({ level: 'warning', code: 'unknown-group', message: `categoría "${cat}": su grupo "${g}" no existe en la lista de grupos (la app lo ignora)` });
  });
  const sampleCount = state.tx.filter(t => t.sample).length + state.purchases.filter(p => p.sample).length;
  if (sampleCount) out.push({ level: 'warning', code: 'sample-data', message: `hay ${sampleCount} registros de ejemplo (sample:true): quítalos en Ajustes → Datos antes de migrar o migra el indicador is_sample` });
  return out;
}

/** Resumen numérico del estado (para comparar antes y después de migrar). */
export function summarizeState(state) {
  const cs = cuotas(state);
  const sum = a => Math.round(a.reduce((s, x) => s + x, 0) * 100) / 100;
  return {
    transactions: state.tx.length,
    incomeTotal: sum(state.tx.filter(t => t.type === 'in').map(t => t.amount)),
    expenseTotal: sum(state.tx.filter(t => t.type === 'out').map(t => t.amount)),
    purchases: state.purchases.length,
    purchasesTotal: sum(state.purchases.map(p => p.total)),
    installmentsTotal: cs.length,
    installmentsPaid: cs.filter(c => c.paid).length,
    installmentsPendingAmount: sum(cs.filter(c => !c.paid).map(c => c.amount)),
    installmentsPaidAmount: sum(cs.filter(c => c.paid).map(c => c.amount)),
    cards: state.cards.length, templates: state.templates.length, fixedIncomes: state.fixed.length,
    categories: state.cats.length, groups: state.groups.length, sources: state.sources.length
  };
}
