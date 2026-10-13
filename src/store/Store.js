import { createDefaultState, hydrateState } from '../models/schema.js';
import { nowMs } from '../utils/dates.js';

/**
 * Contenedor del estado de la aplicación. Es el único que habla con el repositorio.
 *  - state: documento de trabajo en memoria (la interfaz lo lee de forma síncrona).
 *  - commit(): marca updatedAt y persiste. Los servicios lo llaman después de cada cambio.
 *  - batch(fn): agrupa varios cambios en una sola persistencia.
 */
export class Store {
  /** @param {import('../repositories/StateRepository.js').StateRepository} repository */
  constructor(repository, { onPersistError } = {}) {
    this.repository = repository;
    this.state = createDefaultState();
    this.onPersistError = onPersistError || (e => console.error('No se pudo guardar:', e));
    this._depth = 0;
    this._dirty = false;
  }

  /** Carga (e hidrata y migra) lo persistido. Si no hay nada, queda el estado por defecto. */
  async load() {
    this.state = hydrateState(await this.repository.load());
    return this.state;
  }

  /** Vuelve a leer el estado remoto sin escribirlo de nuevo. */
  async reload() { this.state = hydrateState(await this.repository.load()); return this.state; }

  /** Marca el estado como modificado y lo persiste (diferido si hay un batch abierto). */
  commit() {
    if (this._depth > 0) { this._dirty = true; return; }
    this.state.updatedAt = nowMs();
    Promise.resolve().then(() => this.repository.save(this.state)).catch(e => this.onPersistError(e));
  }

  /** Ejecuta fn y persiste una sola vez al terminar. */
  batch(fn) {
    this._depth++;
    let result;
    try { result = fn(); } finally { this._depth--; }
    if (this._depth === 0 && this._dirty) { this._dirty = false; this.commit(); }
    return result;
  }

  /** Reemplaza todo el estado (restaurar respaldo, borrar todo) y lo persiste. */
  replace(newState) { this.state = newState; this.commit(); }
}
