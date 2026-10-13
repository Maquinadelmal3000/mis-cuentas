import { StateRepository } from './StateRepository.js';

/** Persistencia en memoria. Útil para pruebas; no conserva nada al cerrar. */
export class MemoryRepository extends StateRepository {
  constructor(initial = null) { super(); this.data = initial ? JSON.parse(JSON.stringify(initial)) : null; this.saves = 0; }
  async load() { return this.data ? JSON.parse(JSON.stringify(this.data)) : null; }
  async save(state) { this.data = JSON.parse(JSON.stringify(state)); this.saves++; }
  async clear() { this.data = null; }
}
