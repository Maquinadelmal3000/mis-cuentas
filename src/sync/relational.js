/**
 * Modelo relacional compartido por la persistencia remota (Supabase) y la copia local (IndexedDB).
 * Aquí viven: la lista de tablas y su orden de dependencias, las claves, las columnas de datos, la
 * normalización de filas y la conversión de filas ↔ estado de la aplicación.
 */

/** Padres primero. Altas/actualizaciones se envían en este orden; las bajas, en el inverso (hijos primero). */
export const TABLES = ['user_settings', 'income_sources', 'expense_groups', 'categories', 'cards', 'fixed_incomes', 'templates', 'transactions', 'purchases', 'installment_payments'];
export const RANK = Object.fromEntries(TABLES.map((t, i) => [t, i]));

/** Clave primaria de cada tabla (siempre empieza por user_id). */
export const KEY_COLS = {
  user_settings: ['user_id'], income_sources: ['user_id', 'name'], expense_groups: ['user_id', 'name'], categories: ['user_id', 'name'],
  cards: ['user_id', 'id'], fixed_incomes: ['user_id', 'id'], templates: ['user_id', 'id'], transactions: ['user_id', 'id'],
  purchases: ['user_id', 'id'], installment_payments: ['user_id', 'purchase_id', 'installment_index']
};

/** Columnas de datos (las que produce migration/toRelational.js). rev / updated_at / created_at son del servidor. */
export const COLUMNS = {
  user_settings: ['user_id', 'schema_version', 'setup_done', 'opening_balance', 'setup_start', 'manual_installments', 'savings_plan', 'off_days', 'app_updated_at'],
  income_sources: ['user_id', 'name', 'position'], expense_groups: ['user_id', 'name', 'position'],
  categories: ['user_id', 'name', 'position', 'group_name'],
  cards: ['user_id', 'id', 'name', 'kind', 'archived'],
  fixed_incomes: ['user_id', 'id', 'name', 'amount', 'from_month'],
  templates: ['user_id', 'id', 'name', 'mode', 'category', 'amount', 'note', 'card_id', 'installments', 'installment_amount', 'source_field'],
  transactions: ['user_id', 'id', 'type', 'category', 'amount', 'occurred_on', 'note', 'is_sample'],
  purchases: ['user_id', 'id', 'card_id', 'category', 'total', 'installments', 'installment_amount', 'purchased_on', 'note', 'first_due_month', 'is_sample'],
  installment_payments: ['user_id', 'purchase_id', 'installment_index', 'paid_on']
};

const NUMERIC = new Set(['schema_version', 'opening_balance', 'position', 'amount', 'installments', 'installment_amount', 'total', 'installment_index']);
/** Columnas que no cuentan para decidir si una fila cambió (metadatos que cambian en cada guardado). */
const IGNORED = { user_settings: ['app_updated_at'] };

/** Clave natural de una fila como texto (sin user_id). */
export const keyOf = (table, row) => KEY_COLS[table].filter(c => c !== 'user_id').map(c => String(row[c])).join('|') || 'self';

/** Deja solo las columnas de datos, con números como números y null en lugar de undefined. */
export function normalizeRow(table, row) {
  const out = {};
  for (const c of COLUMNS[table]) {
    let v = row[c];
    if (v === undefined) v = null;
    if (v !== null && NUMERIC.has(c)) v = Number(v);
    if (c === 'off_days' && Array.isArray(v)) v = v.map(Number);
    out[c] = v;
  }
  return out;
}

/** ¿Son iguales los datos de dos filas? (ignora metadatos y, opcionalmente, columnas extra) */
export function rowsEqual(table, a, b, extraIgnored = []) {
  const skip = new Set([...(IGNORED[table] || []), ...extraIgnored]);
  const x = normalizeRow(table, a), y = normalizeRow(table, b);
  return COLUMNS[table].every(c => skip.has(c) || JSON.stringify(x[c]) === JSON.stringify(y[c]));
}

/** Metadatos de versión que informa el servidor para una fila. */
export const baseOf = r => (r && r.rev != null ? { rev: Number(r.rev), updated_at: r.updated_at || null } : null);

/* ---------- filas → estado de la aplicación (mismo mapeo que usaba SupabaseRepository) ---------- */
const ymOf = d => d ? String(d).slice(0, 7) : null;

/** @param {Object<string,object[]>} t filas por tabla @returns {object|null} estado, o null si no hay configuración */
export function tablesToState(t) {
  const s = (t.user_settings || [])[0];
  if (!s) return null;
  const by = (arr, f) => (arr || []).slice().sort((a, b) => a.position - b.position).map(f);
  const cards = (t.cards || []).filter(c => !c.archived).map(c => ({ id: c.id, name: c.name, kind: c.kind }));
  const paid = {};
  (t.installment_payments || []).forEach(x => { (paid[x.purchase_id] || (paid[x.purchase_id] = {}))[x.installment_index] = x.paid_on; });
  return {
    ver: s.schema_version || 5, updatedAt: s.app_updated_at ? new Date(s.app_updated_at).getTime() : undefined,
    manualInstallments: !!s.manual_installments,
    savingsPlan: s.savings_plan || { overrides: {}, selected: [] },
    setup: { done: !!s.setup_done, opening: Number(s.opening_balance) || 0, start: s.setup_start || null }, off: s.off_days || [0],
    sources: by(t.income_sources, x => x.name), groups: by(t.expense_groups, x => x.name),
    cats: by(t.categories, x => x.name), catGroups: Object.fromEntries((t.categories || []).filter(x => x.group_name).map(x => [x.name, x.group_name])),
    cards, fixed: (t.fixed_incomes || []).map(x => ({ id: x.id, name: x.name, amount: Number(x.amount), from: ymOf(x.from_month) })),
    templates: (t.templates || []).map(x => ({ id: x.id, name: x.name, mode: x.mode, cat: x.category || '', amount: x.amount == null ? '' : String(x.amount), note: x.note || '', cardId: x.card_id || null, n: x.installments || 1, inst: x.installment_amount == null ? '' : String(x.installment_amount), src: x.source_field || 'total' })),
    tx: (t.transactions || []).map(x => ({ id: x.id, type: x.type, cat: x.category, amount: Number(x.amount), date: x.occurred_on, note: x.note || '', ...(x.is_sample ? { sample: true } : {}) })),
    purchases: (t.purchases || []).map(x => ({ id: x.id, cardId: x.card_id, cat: x.category || '', total: Number(x.total), n: x.installments, inst: Number(x.installment_amount), date: x.purchased_on, note: x.note || '', first: ymOf(x.first_due_month), paid: paid[x.id] || {}, ...(x.is_sample ? { sample: true } : {}) }))
  };
}

/** Texto corto para describir una fila en pantalla (conflictos). */
export function describeRow(table, r) {
  if (!r) return '(no existe)';
  const m = v => '$' + Number(v).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  switch (table) {
    case 'transactions': return `${r.type === 'in' ? 'Ingreso' : 'Gasto'} ${m(r.amount)} · ${r.category} · ${r.occurred_on}${r.note ? ' · ' + r.note : ''}`;
    case 'purchases': return `Compra ${m(r.total)} en ${r.installments} cuotas de ${m(r.installment_amount)} · ${r.purchased_on}${r.note ? ' · ' + r.note : ''}`;
    case 'installment_payments': return `Pago de la cuota ${Number(r.installment_index) + 1} el ${r.paid_on}`;
    case 'cards': return `Tarjeta "${r.name}" (${r.kind})${r.archived ? ' archivada' : ''}`;
    case 'fixed_incomes': return `Ingreso fijo "${r.name}" ${m(r.amount)} desde ${String(r.from_month).slice(0, 7)}`;
    case 'templates': return `Plantilla "${r.name}"`;
    case 'categories': return `Categoría "${r.name}"${r.group_name ? ' · grupo ' + r.group_name : ''}`;
    case 'income_sources': return `Fuente de ingreso "${r.name}"`;
    case 'expense_groups': return `Grupo "${r.name}"`;
    case 'user_settings': return `Configuración · saldo inicial ${m(r.opening_balance)}`;
    default: return JSON.stringify(r);
  }
}
