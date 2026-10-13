/**
 * Combinación de dos estados (p. ej. datos locales y datos remotos) sin perder movimientos.
 * RESERVADO para una futura sincronización: la aplicación actual no lo invoca.
 * Regla: movimientos, compras, tarjetas, plantillas e ingresos fijos se unen por id; los pagos de cuotas
 * se unen; listas y ajustes toman prioridad del estado más reciente (updatedAt).
 */
export function mergeStates(a, b) { // a = local, b = remoto
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b, older = newer === a ? b : a;
  const m = Object.assign({}, older, newer);
  const union = (x, y, key) => { const map = new Map(); (x || []).forEach(i => map.set(key(i), i)); (y || []).forEach(i => { if (!map.has(key(i))) map.set(key(i), i); }); return [...map.values()]; };
  const byId = i => i.id;
  m.tx = union(a.tx, b.tx, byId);
  m.purchases = union(a.purchases, b.purchases, byId).map(p => {
    const pa = (a.purchases || []).find(x => x.id === p.id), pb = (b.purchases || []).find(x => x.id === p.id);
    if (pa && pb) p = Object.assign({}, p, { paid: Object.assign({}, pb.paid || {}, pa.paid || {}) });
    return p;
  });
  m.cards = union(newer.cards, older.cards, byId);
  m.templates = union(newer.templates, older.templates, byId);
  m.fixed = union(newer.fixed, older.fixed, byId);
  ['sources', 'cats', 'groups'].forEach(k => { m[k] = union((newer[k] || []).map(v => ({ id: v, v })), (older[k] || []).map(v => ({ id: v, v })), i => i.id).map(i => i.v); });
  m.catGroups = Object.assign({}, older.catGroups || {}, newer.catGroups || {});
  return m;
}
