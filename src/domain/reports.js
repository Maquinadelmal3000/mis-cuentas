/** Informes de ingresos y gastos para el análisis. */
import { dayShort, curYm } from '../utils/dates.js';
import { sum } from '../utils/math.js';
import { cuotas } from './installments.js';
import { cardName, catOf, pLabel } from './accessors.js';

/**
 * Gastos de un mes. basis 'cuota' cuenta las cuotas que vencen ese mes; 'total' cuenta la compra completa en su mes.
 * Los gastos al contado se cuentan siempre.
 */
export function expenses(state, ym, basis) {
  const items = [];
  state.tx.forEach(t => { if (t.type === 'out' && t.date.startsWith(ym)) items.push({ date: t.date, when: dayShort(t.date), cat: t.cat, amount: t.amount, label: t.note || t.cat, sub: 'Al contado' }); });
  if (basis === 'total') {
    state.purchases.forEach(p => { if (p.date.startsWith(ym)) items.push({ date: p.date, when: dayShort(p.date), cat: catOf(p), amount: p.total, label: pLabel(p), sub: cardName(state, p.cardId) + ' · compra completa en ' + p.n + (p.n > 1 ? ' cuotas' : ' cuota') }); });
  } else {
    cuotas(state).forEach(c => { if (c.due === ym) items.push({ date: ym + '-01', when: 'cuota ' + (c.i + 1) + '/' + c.p.n, cat: catOf(c.p), amount: c.amount, label: pLabel(c.p), sub: cardName(state, c.p.cardId) }); });
  }
  return items;
}

/** Ingresos de un mes. */
export function ingresos(state, ym) { return state.tx.filter(t => t.type === 'in' && t.date.startsWith(ym)).map(t => ({ date: t.date, when: dayShort(t.date), cat: t.cat, amount: t.amount, label: t.note || t.cat, sub: 'Ingreso' })); }

/** Suma importes por clave (por defecto la categoría) y ordena de mayor a menor. */
export function groupBy(items, fn) { const g = {}; items.forEach(i => { const k = fn ? fn(i) : i.cat; g[k] = (g[k] || 0) + i.amount; }); return Object.entries(g).sort((a, b) => b[1] - a[1]); }

/**
 * Acumulado hasta hoy de los movimientos que cumplen fn. catMode 'in' = ingresos; 'out' = gastos
 * (con basis 'total' cuenta compras completas; con 'cuota' las cuotas que vencen hasta el mes actual).
 */
export function accumulatedSum(state, catMode, basis, fn) {
  let a = [];
  if (catMode === 'in') a = state.tx.filter(t => t.type === 'in').map(t => ({ cat: t.cat, amount: t.amount }));
  else {
    a = state.tx.filter(t => t.type === 'out').map(t => ({ cat: t.cat, amount: t.amount }));
    if (basis === 'total') state.purchases.forEach(p => a.push({ cat: catOf(p), amount: p.total }));
    else cuotas(state).forEach(c => { if (c.due <= curYm()) a.push({ cat: catOf(c.p), amount: c.amount }); });
  }
  return sum(a.filter(fn).map(i => i.amount));
}
