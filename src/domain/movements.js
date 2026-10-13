/** Lista de movimientos (ingresos, gastos al contado, compras con tarjeta y pagos de cuotas) para historial y filtros. */
import { cuotas } from './installments.js';
import { cardName, catOf, pLabel } from './accessors.js';

/**
 * @param {string} prefix  fecha o mes ('YYYY-MM-DD' o 'YYYY-MM') con el que debe empezar la fecha del movimiento
 * @param {'all'|'in'|'out'|'card'} filter
 * @param {string} [q] texto de búsqueda (nota, categoría, tarjeta)
 * @returns {{date:string,kind:'tx'|'purchase'|'payment',ref:object,net:number,inc:number,out:number,q:string}[]}
 *   net = efecto en la plata del día (las compras con tarjeta no la afectan hasta que se pagan sus cuotas).
 */
export function listMovements(state, prefix, filter, q) {
  const items = [], ql = (q || '').trim().toLowerCase();
  const add = (it, text) => { it.q = text.toLowerCase(); items.push(it); };
  if (filter !== 'card') state.tx.forEach(t => {
    if (!t.date.startsWith(prefix)) return;
    if (filter === 'in' && t.type !== 'in') return;
    if (filter === 'out' && t.type !== 'out') return;
    add({ date: t.date, kind: 'tx', ref: t, net: t.type === 'in' ? t.amount : -t.amount, inc: t.type === 'in' ? t.amount : 0, out: t.type === 'out' ? t.amount : 0 }, t.cat + ' ' + (t.note || ''));
  });
  if (filter === 'all' || filter === 'card') {
    state.purchases.forEach(p => { if (p.date.startsWith(prefix)) add({ date: p.date, kind: 'purchase', ref: p, net: 0, inc: 0, out: 0 }, pLabel(p) + ' ' + catOf(p) + ' ' + cardName(state, p.cardId)); });
    cuotas(state).forEach(c => { if (c.paid && c.paid.startsWith(prefix)) add({ date: c.paid, kind: 'payment', ref: c, net: -c.amount, inc: 0, out: c.amount }, 'pago cuota ' + pLabel(c.p) + ' ' + cardName(state, c.p.cardId)); });
  }
  return items.filter(i => !ql || i.q.includes(ql)).sort((a, b) => b.date.localeCompare(a.date));
}
