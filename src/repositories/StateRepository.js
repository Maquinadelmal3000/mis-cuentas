/**
 * CONTRATO de persistencia del estado de la aplicación (patrón Repository).
 *
 * La lógica de negocio y la interfaz NO conocen dónde se guardan los datos: solo hablan con esta interfaz
 * (a través del Store). Para usar otro almacén (p. ej. Supabase/PostgreSQL) basta con crear una clase que
 * extienda StateRepository y pasarla a Store en main.js. Ver docs/MIGRACION.md.
 *
 * Reglas del contrato:
 *  - load():  devuelve el estado persistido tal cual (objeto) o null si no hay datos / no es legible.
 *             No debe lanzar por datos vacíos. La hidratación y migración de versiones las hace el Store.
 *  - save():  persiste el estado completo recibido. Puede ser asíncrono; si falla debe rechazar la promesa.
 *  - clear(): elimina lo persistido.
 *  - Sincronización (opcional): un repositorio remoto sobreescribe supportsSync, getSyncStatus y syncNow.
 *    Un repositorio local NO debe simular sincronización.
 *
 * @typedef {'off'|'connecting'|'pending'|'ok'|'error'} SyncStatus
 */
export class StateRepository {
  /** @returns {Promise<object|null>} */
  async load() { throw new Error('StateRepository.load() no implementado'); }

  /** @param {object} state @returns {Promise<void>} */
  async save(state) { throw new Error('StateRepository.save() no implementado'); }

  /** @returns {Promise<void>} */
  async clear() { throw new Error('StateRepository.clear() no implementado'); }

  /** ¿El repositorio sincroniza con un servidor? */
  get supportsSync() { return false; }

  /** @returns {SyncStatus} 'off' = solo este dispositivo. */
  getSyncStatus() { return 'off'; }

  /** Fuerza una sincronización (solo si supportsSync). @returns {Promise<void>} */
  async syncNow() { /* sin efecto en repositorios locales */ }
}
