/** Utilidades numéricas mínimas. */
export const sum = a => a.reduce((s, x) => s + x, 0);
/** Redondea a 2 decimales (centavos). */
export const r2 = n => Math.round(n * 100) / 100;
