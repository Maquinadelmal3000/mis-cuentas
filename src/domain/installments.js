/** Cuotas de compras con tarjeta: derivadas de las compras (no se persisten por separado). */
import { shiftYm, todayS } from '../utils/dates.js';
import { sum } from '../utils/math.js';

/**
 * Expande todas las compras en sus cuotas.
 * Cuota i de una compra: vence en el mes first+i; valor = inst; paid = fecha de pago o null.
 * @returns {{p:object,i:number,due:string,amount:number,paid:string|null}[]}
 */
export function cuotas(state) {
  const r = [];
  state.purchases.forEach(p => {
    for (let i = 0; i < p.n; i++) r.push({ p, i, due: shiftYm(p.first, i), amount: p.inst, paid: (p.paid && p.paid[i]) || null });
  });
  return r;
}

/** ¿La cuota seguía sin pagar en ese momento? mode 'now' = hasta hoy inclusive; 'start' = al comenzar el día. */
export function unpaidAt(c, mode) {
  const T = todayS();
  if (!c.paid) return true;
  return mode === 'now' ? c.paid > T : c.paid >= T;
}

/** Totales de una tarjeta: gastado en un mes, gastado en total, cuotas del mes, pendiente, pagado y pendiente hasta un mes. */
export function cardStats(state, id, ym) {
  const ps = state.purchases.filter(p => p.cardId === id), cs = cuotas(state).filter(c => c.p.cardId === id);
  return {
    spentMonth: sum(ps.filter(p => p.date.startsWith(ym)).map(p => p.total)),
    spentTotal: sum(ps.map(p => p.total)),
    dueMonth: sum(cs.filter(c => c.due === ym).map(c => c.amount)),
    pending: sum(cs.filter(c => !c.paid).map(c => c.amount)),
    paidTotal: sum(cs.filter(c => c.paid).map(c => c.amount)),
    pendingUpTo: sum(cs.filter(c => !c.paid && c.due <= ym).map(c => c.amount))
  };
}
