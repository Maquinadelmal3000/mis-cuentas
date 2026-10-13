/**
 * Formato y lectura de números y textos.
 * Convención de la app: punto para miles y coma para decimales (1.234.567,89).
 */

export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Escapa texto para insertarlo en HTML. */
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Lee un número escrito por una persona: acepta 1.234,56 · 1234,56 · 1234.56 · 1.500 (= 1500). Devuelve NaN si no es número. */
export const num = s => {
  let t = String(s == null ? '' : s).trim().replace(/[^\d.,-]/g, '');
  if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');          // 1.234,56 -> 1234.56
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');         // 1.234 -> 1234
  return parseFloat(t);
};

/** Formatea con separador de miles (.) y decimales (,). */
export const fmtNum = (n, d = 2) => {
  const r = Math.round(Math.abs(n) * Math.pow(10, d)) / Math.pow(10, d);
  const [i, f] = r.toFixed(d).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d > 0 ? ',' + f : '');
};

/** Formatea dinero: $1.234,50 (el signo menos solo si el valor redondeado no es cero). */
export const fmt = n => { const r = Math.round(Math.abs(n) * 100) / 100; return (n < 0 && r > 0 ? '-' : '') + '$' + fmtNum(r, 2); };

/** Formato para precargar un campo de monto: sin decimales si es entero. */
export const fmtIn = n => { const r = Math.round(n * 100) / 100; return fmtNum(r, Number.isInteger(r) ? 0 : 2); };

/** Convierte un monto guardado (texto o número) al texto de un campo; '' si no es número. */
export const inStr = x => { const n = num(x); return isNaN(n) ? '' : fmtIn(n); };
