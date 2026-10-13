import { StateRepository } from './StateRepository.js';
import { STORAGE_KEY } from '../config/constants.js';

/**
 * Persistencia local en el navegador (localStorage). Guarda el estado completo como un único JSON.
 * Si lo guardado está dañado, load() devuelve null y deja una copia del texto en la clave `<clave>.corrupto`.
 */
export class LocalStorageRepository extends StateRepository {
  /**
   * @param {Storage} [storage] por defecto window.localStorage
   * @param {string} [key] clave de almacenamiento
   */
  constructor(storage = globalThis.localStorage, key = STORAGE_KEY) {
    super();
    this.storage = storage;
    this.key = key;
  }

  async load() {
    let raw = null;
    try {
      raw = this.storage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      // El contenido existe pero no se puede leer: se conserva una copia antes de que la app empiece de cero
      // y lo sobrescriba en el próximo guardado (ver docs/RESPALDO_E_INTEGRIDAD.md).
      try { if (raw && this.storage.getItem(this.key + '.corrupto') === null) this.storage.setItem(this.key + '.corrupto', raw); } catch (e2) { /* sin espacio: no hay nada más que hacer */ }
      return null;
    }
  }

  async save(state) { this.storage.setItem(this.key, JSON.stringify(state)); }

  async clear() { this.storage.removeItem(this.key); }
}
