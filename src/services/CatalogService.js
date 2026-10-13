import { uid } from '../utils/id.js';
import { r2 } from '../utils/math.js';
import { todayS } from '../utils/dates.js';
import { createDefaultState } from '../models/schema.js';

/** Datos de apoyo y configuración: tarjetas, categorías, grupos, fuentes, ingresos fijos, plantillas, días libres, saldo inicial. */
export class CatalogService {
  /** @param {import('../store/Store.js').Store} store */
  constructor(store) { this.store = store; }
  get state() { return this.store.state; }

  /** Termina la configuración inicial: fija el saldo inicial. */
  startApp(opening) {
    this.state.setup = { done: true, opening: isNaN(opening) ? 0 : opening, start: todayS() };
    this.store.commit();
  }
  setOpening(v) { this.state.setup.opening = isNaN(v) ? 0 : v; this.store.commit(); }

  addCard(name, kind) { this.state.cards.push({ id: uid(), name, kind }); this.store.commit(); }
  removeCard(id) { this.state.cards = this.state.cards.filter(c => c.id !== id); this.store.commit(); }

  toggleOffDay(i) {
    const s = this.state;
    s.off = s.off.includes(i) ? s.off.filter(x => x !== i) : s.off.concat(i);
    this.store.commit();
  }

  /** Agrega a una lista ('sources' | 'cats' | 'groups'). Devuelve true si se agregó (no vacío ni repetido). */
  addToList(key, value) {
    if (value && !this.state[key].includes(value)) { this.state[key].push(value); this.store.commit(); return true; }
    return false;
  }

  /**
   * Quita de una lista por posición. Las listas 'sources' y 'cats' conservan al menos un elemento.
   * Al quitar un grupo se desasignan sus categorías; al quitar una categoría se borra su asignación de grupo.
   */
  removeFromList(key, index) {
    const s = this.state;
    if (s[key].length > 1 || key === 'groups') {
      const rem = s[key].splice(index, 1)[0];
      if (key === 'groups') Object.keys(s.catGroups).forEach(c => { if (s.catGroups[c] === rem) delete s.catGroups[c]; });
      if (key === 'cats') delete s.catGroups[rem];
      this.store.commit();
      return true;
    }
    return false;
  }

  /** Asigna (o quita, con group vacío) el grupo de la categoría en la posición catIndex. */
  setCategoryGroup(catIndex, group) {
    const c = this.state.cats[catIndex];
    if (group) this.state.catGroups[c] = group; else delete this.state.catGroups[c];
    this.store.commit();
  }

  addFixedIncome({ name, amount, from }) { this.state.fixed.push({ id: uid(), name, amount: r2(amount), from }); this.store.commit(); }
  removeFixedIncome(index) { this.state.fixed.splice(index, 1); this.store.commit(); }

  /** Guarda una plantilla de movimiento frecuente (se le asigna id). */
  addTemplate(tpl) { this.state.templates.push(Object.assign({ id: uid() }, tpl)); this.store.commit(); }
  removeTemplate(index) { this.state.templates.splice(index, 1); this.store.commit(); }

  /** Borra todos los datos y vuelve al estado inicial. */
  wipe() { this.store.replace(createDefaultState()); }
}
