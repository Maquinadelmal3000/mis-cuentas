/**
 * Cifras de resumen que muestran las pantallas. Son funciones puras sobre el estado: la interfaz solo las formatea.
 * Reglas (idénticas a la versión original):
 *  - Meta diaria = (cuotas pendientes hasta este mes − plata al empezar el día) ÷ días de trabajo que quedan del mes.
 *  - Libre = plata de hoy − lo comprometido en tarjetas hasta este mes.
 *  - "Con tu ingreso fijo te quedaría" = ingreso fijo del mes − cuotas del mes.
 */
import { todayS, curYm, daysIn, pad, now } from '../utils/dates.js';
import { sum } from '../utils/math.js';
import { cash, committed, workdays, fixedFor } from './cash.js';
import { cuotas } from './installments.js';
import { expenses, ingresos } from './reports.js';

/** Cifras de la pantalla Hoy. */
export function homeSummary(state) {
  const T = todayS(), Y = curYm();
  const cNow = cash(state, 'now'), cStart = cash(state, 'start');
  const comp = committed(state, 'now', Y), compStart = committed(state, 'start', Y);
  const libre = cNow - comp;
  const all = cuotas(state);
  const mc = all.filter(c => c.due === Y), mTotal = sum(mc.map(c => c.amount)), mPaid = sum(mc.filter(c => c.paid).map(c => c.amount));
  const overdue = sum(all.filter(c => c.due < Y && !c.paid).map(c => c.amount));
  const inToday = sum(state.tx.filter(t => t.type === 'in' && t.date === T).map(t => t.amount));
  const outToday = sum(state.tx.filter(t => t.type === 'out' && t.date === T).map(t => t.amount)) + sum(all.filter(c => c.paid === T).map(c => c.amount));
  const falta = Math.max(0, compStart - cStart), wd = workdays(state, T, Y + '-' + pad(daysIn(Y))), perDay = wd > 0 ? falta / wd : falta;
  const isOff = state.off.includes(now().getDay());
  const perCard = state.cards.map(cd => ({ cd, v: sum(all.filter(c => c.p.cardId === cd.id && c.due <= Y && !c.paid).map(c => c.amount)) })).filter(x => x.v > 0);
  const fixed = fixedFor(state, Y);
  return { T, Y, cNow, comp, libre, mTotal, mPaid, overdue, inToday, outToday, falta, wd, perDay, isOff, perCard, fixed, fixedLeft: fixed - mTotal };
}

/** Cifras de un mes para la pantalla Análisis. */
export function monthSummary(state, ym, basis, mode) {
  const out = expenses(state, ym, basis), inn = ingresos(state, ym);
  const cm = cuotas(state).filter(x => x.due === ym);
  return {
    ym, mode, basis, out, inn,
    tIn: sum(inn.map(i => i.amount)), tOut: sum(out.map(i => i.amount)),
    contado: sum(state.tx.filter(t => t.type === 'out' && t.date.startsWith(ym)).map(t => t.amount)),
    compras: sum(state.purchases.filter(p => p.date.startsWith(ym)).map(p => p.total)),
    cuotasMes: sum(cm.map(x => x.amount)),
    pagadas: sum(cm.filter(x => x.paid).map(x => x.amount))
  };
}

/** Deuda en cuotas por tarjeta (y total) para la pestaña Deudas. */
export function cardDebts(state, ym) {
  const all = cuotas(state), pend = all.filter(c => !c.paid), total = sum(pend.map(c => c.amount));
  const rows = state.cards.map((cd, i) => {
    const cs = all.filter(c => c.p.cardId === cd.id), pe = cs.filter(c => !c.paid);
    const debt = sum(pe.map(c => c.amount)), paid = sum(cs.filter(c => c.paid).map(c => c.amount));
    const ord = pe.slice().sort((a, b) => a.due.localeCompare(b.due)), nxt = ord[0], lst = ord[ord.length - 1];
    return {
      cd, i, debt, paid, sumAll: debt + paid, pe, nxt, lst,
      mDue: sum(cs.filter(c => c.due === ym).map(c => c.amount)),
      nxtAmt: nxt ? sum(pe.filter(c => c.due === nxt.due).map(c => c.amount)) : 0
    };
  });
  return { total, rows };
}
