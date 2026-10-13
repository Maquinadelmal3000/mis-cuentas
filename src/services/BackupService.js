import { serializeBackup, parseBackup, createDefaultState, migrateState } from '../models/schema.js';
import { clone } from '../utils/object.js';

/** Exportación e importación de respaldos JSON. */
export class BackupService {
  /** @param {import('../store/Store.js').Store} store */
  constructor(store) { this.store = store; }

  /** Texto JSON del respaldo completo. */
  exportJson() { return serializeBackup(this.store.state); }

  /** Valida y lee un respaldo; null si no es válido. */
  parse(text) { return parseBackup(text); }

  /** Reemplaza todos los datos por los del respaldo (ya validado). */
  restore(p) {
    const state = Object.assign(createDefaultState(), clone(p));
    state.ver = p.ver || 0;
    migrateState(state);
    this.store.replace(state);
  }
}
