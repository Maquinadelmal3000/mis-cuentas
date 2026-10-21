/**
 * Transforma el estado de la aplicación (un documento JSON) al modelo relacional propuesto en
 * docs/MODELO_DATOS.md. Es una función pura y no escribe nada: sirve para preparar la migración a
 * PostgreSQL/Supabase y para comprobar que no se pierde información (ver summarizeTables).
 * Conserva los identificadores actuales (columnas id / card_id / purchase_id de tipo texto).
 */
import { num } from '../utils/format.js';

const monthToDate = m => (m ? m + '-01' : null);

/**
 * @param {object} state estado de la app (ya migrado a la versión actual del esquema)
 * @param {string|null} [userId] se copia en la columna user_id de cada fila (null si aún no hay usuario)
 * @returns {{tables:Object<string,object[]>, warnings:string[]}}
 */
export function toRelational(state, userId = null) {
  const warnings = [];
  const u = userId;
  const t = {
    user_settings: [{
      user_id: u, schema_version: state.ver || 0, setup_done: !!state.setup.done, opening_balance: state.setup.opening || 0,
      setup_start: state.setup.start || null, manual_installments: !!state.manualInstallments, savings_plan: state.savingsPlan || { overrides: {}, selected: [] }, off_days: (state.off || []).slice(), app_updated_at: state.updatedAt ? new Date(state.updatedAt).toISOString() : null
    }],
    income_sources: state.sources.map((name, i) => ({ user_id: u, name, position: i })),
    expense_groups: state.groups.map((name, i) => ({ user_id: u, name, position: i })),
    categories: state.cats.map((name, i) => {
      const g = state.catGroups[name];
      const ok = g && state.groups.includes(g);
      if (g && !ok) warnings.push(`categoría "${name}": grupo "${g}" inexistente; se migra sin grupo`);
      return { user_id: u, name, position: i, group_name: ok ? g : null };
    }),
    cards: state.cards.map(c => ({ user_id: u, id: c.id, name: c.name, kind: c.kind, archived: false })),
    fixed_incomes: state.fixed.map(f => ({ user_id: u, id: f.id, name: f.name, amount: f.amount, from_month: monthToDate(f.from) })),
    templates: state.templates.map(x => ({
      user_id: u, id: x.id, name: x.name, mode: x.mode, category: x.cat || null, amount: x.amount ? num(x.amount) : null, note: x.note || '',
      card_id: x.cardId || null, installments: x.n || 1, installment_amount: x.inst ? num(x.inst) : null, source_field: x.src || 'total'
    })),
    transactions: state.tx.map(x => ({ user_id: u, id: x.id, type: x.type, category: x.cat, amount: x.amount, occurred_on: x.date, note: x.note || '', is_sample: !!x.sample })),
    purchases: [],
    installment_payments: []
  };
  const known = new Set(state.cards.map(c => c.id));
  state.purchases.forEach(p => {
    if (!known.has(p.cardId)) {
      known.add(p.cardId);
      t.cards.push({ user_id: u, id: p.cardId, name: 'Tarjeta eliminada', kind: 'credito', archived: true });
      warnings.push(`la tarjeta "${p.cardId}" no existe: se crea archivada como "Tarjeta eliminada" para conservar sus compras`);
    }
    t.purchases.push({
      user_id: u, id: p.id, card_id: p.cardId, category: p.cat || null, total: p.total, installments: p.n, installment_amount: p.inst,
      purchased_on: p.date, note: p.note || '', first_due_month: monthToDate(p.first), is_sample: !!p.sample
    });
    Object.keys(p.paid || {}).forEach(k => {
      if (Number(k) >= p.n) warnings.push(`compra ${p.id}: pago de la cuota ${k} ignorado (solo tiene ${p.n})`);
      else t.installment_payments.push({ user_id: u, purchase_id: p.id, installment_index: Number(k), paid_on: p.paid[k] });
    });
  });
  return { tables: t, warnings };
}

/** Resumen de las tablas generadas, comparable con summarizeState (migration/integrity.js). */
export function summarizeTables(tables) {
  const sum = a => Math.round(a.reduce((s, x) => s + x, 0) * 100) / 100;
  const purchases = tables.purchases, paidRows = tables.installment_payments;
  const byId = new Map(purchases.map(p => [p.id, p]));
  return {
    transactions: tables.transactions.length,
    incomeTotal: sum(tables.transactions.filter(x => x.type === 'in').map(x => x.amount)),
    expenseTotal: sum(tables.transactions.filter(x => x.type === 'out').map(x => x.amount)),
    purchases: purchases.length,
    purchasesTotal: sum(purchases.map(p => p.total)),
    installmentsTotal: sum(purchases.map(p => p.installments)),
    installmentsPaid: paidRows.length,
    installmentsPendingAmount: sum(purchases.map(p => p.installment_amount * p.installments)) - sum(paidRows.map(r => byId.get(r.purchase_id).installment_amount)),
    installmentsPaidAmount: sum(paidRows.map(r => byId.get(r.purchase_id).installment_amount)),
    cards: tables.cards.filter(c => !c.archived).length, templates: tables.templates.length, fixedIncomes: tables.fixed_incomes.length,
    categories: tables.categories.length, groups: tables.expense_groups.length, sources: tables.income_sources.length
  };
}

/** Convierte una tabla a CSV (RFC 4180). Los arreglos se escriben como literal de arreglo de PostgreSQL: {0,1}. */
export function tableToCsv(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const cell = v => {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) v = '{' + v.join(',') + '}';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    const s = String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(',')].concat(rows.map(r => cols.map(c => cell(r[c])).join(','))).join('\n') + '\n';
}
