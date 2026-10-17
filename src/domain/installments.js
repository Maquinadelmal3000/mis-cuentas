/** Cuotas de compras con tarjeta: derivadas de las compras (no se persisten por separado). */
import { shiftYm, todayS, curYm } from '../utils/dates.js';
import { sum, r2 } from '../utils/math.js';

/** ¿Está activada la confirmación manual de cuotas? (por defecto no: avance automático por mes calendario) */
export const isManual = state => !!state.manualInstallments;

/**
 * Meses transcurridos desde el mes de la primera cuota hasta el mes ym, contando ambos extremos.
 * Solo usa año y mes (no días, vencimientos ni zonas horarias): oct→oct = 1, oct→nov = 2, dic→ene = 2.
 */
export function monthsElapsed(first, ym) {
  const [fy, fm] = first.split('-').map(Number), [cy, cm] = ym.split('-').map(Number);
  return (cy * 12 + cm) - (fy * 12 + fm) + 1;
}

/** Cuotas consideradas pagadas por el calendario en el mes ym (0..n). Estado calculado, no un pago real. */
export const autoProgress = (p, ym = curYm()) => Math.max(0, Math.min(p.n, monthsElapsed(p.first, ym)));

/**
 * Importe de cada cuota. Normalmente todas valen `inst`; si el total no coincide con inst × n solo por
 * redondeo de centavos (≤ 1 centavo por cuota), la última absorbe la diferencia para que la suma sea el total.
 * Si la diferencia es mayor (la cuota incluye intereses) se respeta `inst` en todas.
 */
export function cuotaAmounts(p) {
  const a = new Array(p.n).fill(p.inst), diff = r2(p.total - p.inst * p.n);
  if (diff !== 0 && Math.abs(diff) <= 0.01 * p.n) a[p.n - 1] = r2(p.inst + diff);
  return a;
}

/**
 * Expande todas las compras en sus cuotas: la cuota i (0 = primera, se muestra como i+1) vence en el mes first+i.
 *  - paid: fecha del pago REAL registrado (la usa la plata disponible).
 *  - done: "considerada pagada" según la modalidad. Manual: tiene pago registrado. Automática: su mes ya empezó
 *          (o tiene pago registrado). Es un estado calculado: no crea pagos ni movimientos.
 * @returns {{p:object,i:number,due:string,amount:number,paid:string|null,done:boolean}[]}
 */
export function cuotas(state) {
  const manual = isManual(state), cur = curYm(), r = [];
  state.purchases.forEach(p => {
    const amounts = cuotaAmounts(p);
    for (let i = 0; i < p.n; i++) {
      const due = shiftYm(p.first, i), paid = (p.paid && p.paid[i]) || null;
      r.push({ p, i, due, amount: amounts[i], paid, done: manual ? !!paid : (due <= cur || !!paid) });
    }
  });
  return r;
}

/** Cuotas consideradas pagadas de una compra (según la modalidad). */
export const purchaseProgress = (state, p) => cuotas(state).filter(c => c.p.id === p.id && c.done).length;

/** Saldo restante de una compra: suma de sus cuotas aún no consideradas pagadas. */
export const purchaseRemaining = (state, p) => r2(sum(cuotas(state).filter(c => c.p.id === p.id && !c.done).map(c => c.amount)));

/** ¿La cuota seguía sin pagar (pago real) en ese momento? mode 'now' = hasta hoy inclusive; 'start' = al comenzar el día. */
export function unpaidAt(c, mode) {
  const T = todayS();
  if (!c.paid) return true;
  return mode === 'now' ? c.paid > T : c.paid >= T;
}

/** Totales de una tarjeta. Pendiente/pagado según la modalidad ("considerado pagado"); gastado y cuotas del mes no dependen de ella. */
export function cardStats(state, id, ym) {
  const ps = state.purchases.filter(p => p.cardId === id), cs = cuotas(state).filter(c => c.p.cardId === id);
  return {
    spentMonth: sum(ps.filter(p => p.date.startsWith(ym)).map(p => p.total)),
    spentTotal: sum(ps.map(p => p.total)),
    dueMonth: sum(cs.filter(c => c.due === ym).map(c => c.amount)),
    pending: sum(cs.filter(c => !c.done).map(c => c.amount)),
    paidTotal: sum(cs.filter(c => c.done).map(c => c.amount)),
    pendingUpTo: sum(cs.filter(c => !c.done && c.due <= ym).map(c => c.amount))
  };
}
