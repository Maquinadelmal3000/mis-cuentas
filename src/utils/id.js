import { nowMs } from './dates.js';

/** Identificador corto y único (base 36: marca de tiempo + 4 caracteres aleatorios). Mismo formato que la versión original. */
export const uid = () => nowMs().toString(36) + Math.random().toString(36).slice(2, 6);
