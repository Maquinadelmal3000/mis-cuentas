/** Calendario de cuotas: todas las cuotas que caen en un mes, de todas las tarjetas (o de una). */
import { cuotas } from './installments.js';
import { cardName, pLabel } from './accessors.js';
import { sum, r2 } from '../utils/math.js';

/**
 * @param {string} ym mes 'YYYY-MM'
 * @param {string} [cardId] 'all' (todas) o el id de una tarjeta
 * @returns {{ym:string,rows:object[],count:number,scheduled:number,done:number,pending:number,perCard:object[]}}
 *   scheduled = suma de todas las cuotas del mes; done = las consideradas pagadas según la modalidad; pending = el resto.
 *   Cada fila: la cuota (c.i + 1 = número, c.p.n = total) más description y cardName.
 */
export function monthInstallments(state, ym, cardId = 'all') {
  const rows = cuotas(state).filter(c => c.due === ym && (cardId === 'all' || c.p.cardId === cardId))
    .map(c => ({ ...c, description: pLabel(c.p), cardName: cardName(state, c.p.cardId) }))
    .sort((a, b) => a.cardName.localeCompare(b.cardName, 'es') || a.description.localeCompare(b.description, 'es') || a.i - b.i);
  const scheduled = r2(sum(rows.map(r => r.amount))), done = r2(sum(rows.filter(r => r.done).map(r => r.amount)));
  const by = new Map();
  rows.forEach(r => {
    const g = by.get(r.p.cardId) || { cardId: r.p.cardId, name: r.cardName, count: 0, scheduled: 0, done: 0, pending: 0 };
    g.count++; g.scheduled = r2(g.scheduled + r.amount);
    if (r.done) g.done = r2(g.done + r.amount); else g.pending = r2(g.pending + r.amount);
    by.set(r.p.cardId, g);
  });
  return { ym, rows, count: rows.length, scheduled, done, pending: r2(scheduled - done), perCard: [...by.values()] };
}
