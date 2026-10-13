import { setClock } from '../../src/utils/dates.js';
import { createDefaultState } from '../../src/models/schema.js';

/** Fija el "hoy" de la aplicación (a las 12:00 locales) durante una prueba. */
export function at(day) { const [y, m, d] = day.split('-').map(Number); setClock(() => new Date(y, m - 1, d, 12, 0, 0)); }
export function realClock() { setClock(null); }

/** Estado vacío ya configurado, con ajustes opcionales. */
export function makeState(over = {}) {
  const s = createDefaultState();
  s.setup = { done: true, opening: 0, start: '2026-01-01' };
  return Object.assign(s, over);
}
let n = 0;
export const tx = (type, amount, date, extra = {}) => ({ id: 't' + (++n), type, cat: type === 'in' ? 'Uber' : 'Comida en casa', amount, date, note: '', ...extra });
export const purchase = (over = {}) => ({ id: 'p' + (++n), cardId: 'c-mia', cat: '', total: 300, n: 3, inst: 100, date: '2026-10-01', note: '', first: '2026-11', paid: {}, ...over });
