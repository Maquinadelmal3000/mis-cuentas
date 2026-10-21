/**
 * Modelo de datos persistido: valores por defecto, migración de versiones y formato de respaldo.
 *
 * Estado (un solo documento):
 *   ver, updatedAt?, setup{done,opening,start}, off[], sources[], cats[], groups[], catGroups{cat:grupo},
 *   fixed[{id,name,amount,from}], templates[{id,name,mode,cat,amount,note,cardId,n,inst,src}],
 *   cards[{id,name,kind}], tx[{id,type,cat,amount,date,note,sample?}],
 *   purchases[{id,cardId,cat,total,n,inst,date,note,first,paid{indice:fecha},sample?}]
 * Detalle completo en docs/MODELO_DATOS.md.
 */
import {
  SCHEMA_VERSION, DEFAULT_CATEGORY_GROUPS, DEFAULT_SOURCES, DEFAULT_CATEGORIES, DEFAULT_GROUPS,
  DEFAULT_CARDS, DEFAULT_OFF_DAYS, LEGACY_CATEGORY_RENAMES
} from '../config/constants.js';
import { clone } from '../utils/object.js';
import { now } from '../utils/dates.js';

/** Estado inicial de una instalación nueva. */
export function createDefaultState() {
  return {
    ver: SCHEMA_VERSION,
    setup: { done: false, opening: 0, start: null },
    off: DEFAULT_OFF_DAYS.slice(),
    savingsPlan: { overrides: {}, selected: [] },
    manualInstallments: false,   // false = cuotas por mes calendario (automático); true = confirmación manual
    sources: DEFAULT_SOURCES.slice(),
    cats: DEFAULT_CATEGORIES.slice(),
    groups: DEFAULT_GROUPS.slice(),
    fixed: [],
    templates: [],
    catGroups: Object.assign({}, DEFAULT_CATEGORY_GROUPS),
    cards: DEFAULT_CARDS.map(c => Object.assign({}, c)),
    tx: [], purchases: []
  };
}

/** ¿Tiene la forma mínima de un estado válido? */
export const isStateShape = p => !!(p && p.setup && Array.isArray(p.tx));

/** Actualiza (en el mismo objeto) un estado de una versión anterior al esquema actual. Idempotente. */
export function migrateState(state) {
  if (!state.groups) state.groups = DEFAULT_GROUPS.slice();
  if (!state.fixed) state.fixed = [];
  if (!state.templates) state.templates = [];
  if (!state.savingsPlan || typeof state.savingsPlan !== "object") state.savingsPlan = { overrides: {}, selected: [] };
  if (!state.savingsPlan.overrides || typeof state.savingsPlan.overrides !== "object") state.savingsPlan.overrides = {};
  if (!Array.isArray(state.savingsPlan.selected)) state.savingsPlan.selected = [];
  if (!state.catGroups) state.catGroups = {};
  if (!state.ver || state.ver < 5) {
    const rn = n => LEGACY_CATEGORY_RENAMES[n] || n;
    state.tx.forEach(t => { t.cat = rn(t.cat); });
    state.purchases.forEach(p => { if (p.cat) p.cat = rn(p.cat); });
    const seen = []; state.cats.map(rn).forEach(c => { if (!seen.includes(c)) seen.push(c); });
    DEFAULT_CATEGORIES.forEach(c => { if (!seen.includes(c)) seen.push(c); });
    state.cats = seen;
    Object.keys(DEFAULT_CATEGORY_GROUPS).forEach(c => { if (!state.catGroups[c] && state.cats.includes(c)) state.catGroups[c] = DEFAULT_CATEGORY_GROUPS[c]; });
    state.ver = 5;
  }
  return state;
}

/**
 * Construye el estado de trabajo a partir de lo leído del almacenamiento (o null).
 * Si lo leído no es válido se devuelve el estado por defecto.
 */
export function hydrateState(loaded) {
  let state = createDefaultState();
  if (isStateShape(loaded)) { state = Object.assign(state, loaded); state.ver = loaded.ver || 0; }
  return migrateState(state);
}

/* ---------- Formato de respaldo (archivo/texto JSON) ---------- */

/** Sobre del respaldo: { app, version, exportedAt, state }. No incluye updatedAt. */
export function buildBackup(state) {
  const o = clone(state);
  delete o.syncedOnce; delete o.updatedAt;
  return { app: 'mis-cuentas', version: 1, exportedAt: now().toISOString(), state: o };
}

export const serializeBackup = state => JSON.stringify(buildBackup(state), null, 1);

/** Lee un respaldo (con o sin sobre). Devuelve el estado contenido o null si no es válido. */
export function parseBackup(text) {
  let p; try { p = JSON.parse(text); } catch (e) { return null; }
  if (p && p.state) p = p.state;
  return isStateShape(p) ? p : null;
}
