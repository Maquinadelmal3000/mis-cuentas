/**
 * DOM mínimo para probar la interfaz en Node sin dependencias. No imita un navegador completo:
 * guarda el HTML que se dibuja y permite disparar los eventos que registra la aplicación.
 */
export function installFakeDom() {
  const handlers = {}, els = {}, ls = new Map();
  const mk = id => ({
    id, innerHTML: '', value: '', style: {}, dataset: {}, files: null, scrollTop: 0, textContent: '',
    classList: { _on: new Set(), add(c) { this._on.add(c); }, remove(c) { this._on.delete(c); }, contains(c) { return this._on.has(c); } },
    addEventListener(t, f) { (handlers[id + ':' + t] = handlers[id + ':' + t] || []).push(f); },
    querySelector() { return { scrollTop: 0 }; }, focus() {}, select() {}, setAttribute() {}
  });
  const doc = {
    getElementById: id => els[id] || (els[id] = mk(id)),
    querySelectorAll: () => [],
    addEventListener(t, f) { (handlers['doc:' + t] = handlers['doc:' + t] || []).push(f); },
    createElement: () => ({ click() {}, remove() {}, set href(v) {}, set download(v) {} }),
    body: { appendChild() {} }
  };
  const storage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: k => { ls.delete(k); } };
  Object.assign(globalThis, { document: doc, window: { scrollTo() {} }, localStorage: storage });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const click = (act, id, extra) => { const b = { dataset: Object.assign({ act, id }, extra || {}), textContent: '' }; (handlers['doc:click'] || []).forEach(f => f({ target: { closest: () => b } })); return b; };
  const tab = t => { const b = { dataset: { tab: t } }; (handlers['nav:click'] || []).forEach(f => f({ target: { closest: () => b } })); };
  const fab = () => (handlers['fab:click'] || []).forEach(f => f());
  const set = (id, value) => { const e = doc.getElementById(id); e.value = value; return e; };
  return { els, handlers, storage, doc, sleep, click, tab, fab, set, app: () => els.app.innerHTML, sheet: () => els.sheet.innerHTML };
}
