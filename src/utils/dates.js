/**
 * Utilidades de fechas. Todas las fechas de la aplicación son cadenas locales:
 * día 'YYYY-MM-DD' y mes 'YYYY-MM'. El "ahora" pasa por un reloj inyectable para poder probar.
 */

let clockFn = () => new Date();

/** Reemplaza el reloj (solo para pruebas). Sin argumentos restaura el reloj del sistema. */
export function setClock(fn) { clockFn = fn || (() => new Date()); }
export const now = () => clockFn();
export const nowMs = () => now().getTime();

export const pad = n => String(n).padStart(2, '0');
export const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayS = () => ymd(now());
export const curYm = () => todayS().slice(0, 7);
export const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
export const shiftYm = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
export const monthName = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' }); };
export const monthOnly = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long' }); };
export const monthShort = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'short' }); };
export const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const dayLong = s => parseD(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
export const dayShort = s => parseD(s).toLocaleDateString('es', { day: 'numeric', month: 'short' });
