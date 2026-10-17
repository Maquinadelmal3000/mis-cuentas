/** Consultas simples sobre el estado (lectura). */
import { SINCAT } from '../config/constants.js';
import { dayShort } from '../utils/dates.js';

export const cardOf = (state, id) => state.cards.find(c => c.id === id);
export const cardName = (state, id) => cardOf(state, id) ? cardOf(state, id).name : 'Tarjeta eliminada';

/** Categoría de una compra con tarjeta ('Sin categoría' si no tiene). */
export const catOf = p => p.cat || SINCAT;
/** Texto que identifica una compra: nota, categoría o un texto genérico. */
export const pLabel = p => p.note || p.cat || ('Compra con tarjeta · ' + dayShort(p.date));

/** Grupo de una categoría; si no tiene grupo (o el grupo ya no existe) devuelve la propia categoría. */
export const groupOf = (state, c) => (state.catGroups[c] && state.groups.includes(state.catGroups[c])) ? state.catGroups[c] : c;
