/** Regla de captura de compras en cuotas: total y cuota se calculan entre sí. */
import { num, fmtNum } from '../utils/format.js';

/**
 * Dado lo último que escribió la persona (src: 'total' o 'inst'), calcula el otro valor.
 * Si escribió el total, cuota = total / n. Si escribió la cuota, total = cuota × n
 * (útil cuando la cuota incluye intereses).
 * Devuelve textos con formato de campo (punto de miles y coma decimal).
 */
export function linkedAmounts({ src, amount, inst, n }) {
  const a = num(amount), c = num(inst);
  if (src === 'total') return { amount, inst: (a > 0 && n > 0) ? fmtNum(a / n, 2) : '' };
  return { amount: (c > 0) ? fmtNum(c * n, 2) : '', inst };
}
