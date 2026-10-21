/** Proyección por devengamiento: cuotas en el mes correspondiente, nunca compra total + cuota. */
import { curYm, shiftYm } from '../utils/dates.js';
import { cuotas } from './installments.js';
import { fixedFor } from './cash.js';
import { sum } from '../utils/math.js';

const amount = n => Math.max(0, Number(n) || 0);
const totalTx = (s, ym, type) => sum(s.tx.filter(t => t.type === type && t.date.startsWith(ym)).map(t => Number(t.amount) || 0));
const installments = (s, ym) => sum(cuotas(s).filter(c => c.due === ym).map(c => c.amount));
export const planOf = s => s.savingsPlan || { overrides: {}, selected: [] };

/** Gastos al contado de los últimos tres meses completos, sin cuotas (se proyectan por separado). */
export function variableAverage(state, today = curYm()) {
  const months = [3, 2, 1].map(n => shiftYm(today, -n));
  const values = months.map(ym => totalTx(state, ym, 'out'));
  const hasHistory = months.some(ym => state.tx.some(t => t.type === 'out' && t.date.startsWith(ym)));
  return { months, values, amount: sum(values) / 3, hasHistory };
}

/** Ingreso recurrente: los movimientos ya registrados se cuentan una sola vez. */
export function savingMonth(state, ym, today = curYm()) {
  const override = planOf(state).overrides?.[ym] || {};
  const actualIn = totalTx(state, ym, 'in');
  const actualVariable = totalTx(state, ym, 'out');
  const due = installments(state, ym);
  const past = ym < today, current = ym === today;
  const avg = variableAverage(state, today);
  const plannedVariable = override.variable == null ? avg.amount : amount(override.variable);
  const extraIncome = past ? 0 : amount(override.extraIncome);
  const extraExpense = past ? 0 : amount(override.extraExpense);
  // Mes actual: ingreso previsto total = al menos lo ya cobrado; resto pendiente del ingreso fijo.
  const income = past ? actualIn : (current ? Math.max(actualIn, fixedFor(state, ym)) : fixedFor(state, ym)) + extraIncome;
  // Mes actual: no contar dos veces gastos registrados; la estimación es el máximo del promedio y el real.
  const variable = past ? actualVariable : current ? Math.max(actualVariable, plannedVariable) : plannedVariable;
  const expenses = variable + due + extraExpense;
  return { ym, status: past ? 'real' : current ? 'mixto' : 'proyectado', income, actualIn,
    variable, actualVariable, installments: due, extraIncome, extraExpense,
    expenses, available: income - expenses, average: avg.amount,
    hasHistory: avg.hasHistory, missingIncome: !past && fixedFor(state, ym) <= 0 && actualIn <= 0 };
}

export function savingsWindow(state, from = curYm(), count = 6, today = curYm()) {
  return Array.from({ length: count }, (_, i) => savingMonth(state, shiftYm(from, i), today));
}

export function selectedSavings(state, rows) {
  const selected = planOf(state).selected || [];
  return rows.filter(r => selected.includes(r.ym)).reduce((s, r) => s + r.available, 0);
}
