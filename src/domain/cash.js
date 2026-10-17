/** Dinero disponible, compromisos con tarjetas, días de trabajo e ingresos fijos. */
import { todayS, parseD } from '../utils/dates.js';
import { sum } from '../utils/math.js';
import { cuotas, unpaidAt, isManual } from './installments.js';

/**
 * Plata que se tiene: saldo inicial + ingresos − gastos al contado − cuotas pagadas.
 * Cuenta todos los movimientos sin importar su fecha (salvo futuros y datos de ejemplo).
 * mode 'now' incluye hoy; 'start' es el inicio del día (excluye lo de hoy).
 */
export function cash(state, mode) {
  const T = todayS(), ok = d => mode === 'now' ? d <= T : d < T;
  let v = state.setup.opening || 0;
  state.tx.forEach(t => { if (!t.sample && ok(t.date)) v += t.type === 'in' ? t.amount : -t.amount; });
  cuotas(state).forEach(c => { if (c.paid && !c.p.sample && ok(c.paid)) v -= c.amount; });
  return v;
}

/**
 * ¿La cuota cuenta como compromiso de pago en el mes ym?  (decisión de diseño, ver docs/CUOTAS.md)
 *  - Modo manual: toda cuota sin pago real que vence hasta ym (incluye meses anteriores atrasados).
 *  - Modo automático: las cuotas de meses anteriores se consideran pagadas por el calendario; solo cuenta la del mes ym
 *    (si no tiene pago real). La plata disponible NO cambia por el avance automático: solo los pagos reales la descuentan.
 */
export const isCommitted = (state, c, mode, ym) => c.due <= ym && unpaidAt(c, mode) && (isManual(state) || c.due === ym);

/** Suma de cuotas que son compromiso hasta el mes ym. */
export function committed(state, mode, ym) { return sum(cuotas(state).filter(c => isCommitted(state, c, mode, ym)).map(c => c.amount)); }

/** Días de trabajo (no marcados como libres) entre dos fechas, ambas incluidas. */
export function workdays(state, from, to) {
  let n = 0; const d = parseD(from), end = parseD(to);
  while (d <= end) { if (!state.off.includes(d.getDay())) n++; d.setDate(d.getDate() + 1); }
  return n;
}

/** Ingreso fijo mensual vigente en el mes ym. */
export const fixedFor = (state, ym) => sum(state.fixed.filter(f => f.from <= ym).map(f => f.amount));
