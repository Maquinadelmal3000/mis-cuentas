import { uid } from '../utils/id.js';
import { r2 } from '../utils/math.js';
import { cuotas } from '../domain/installments.js';
import { ValidationError } from './errors.js';

/**
 * Movimientos y compras con tarjeta: altas, bajas y pagos de cuotas.
 * Cada operación modifica el estado y persiste a través del Store.
 * La interfaz valida lo que escribe la persona (mensajes); aquí se protege la integridad.
 */
export class LedgerService {
  /** @param {import('../store/Store.js').Store} store */
  constructor(store) { this.store = store; }
  get state() { return this.store.state; }

  /** Ingreso (type 'in') o gasto al contado (type 'out'). */
  addTransaction({ type, cat, amount, date, note }) {
    if (type !== 'in' && type !== 'out') throw new ValidationError('type', 'Tipo de movimiento inválido');
    if (!(amount > 0)) throw new ValidationError('amount', 'El monto debe ser mayor a 0');
    if (!date) throw new ValidationError('date', 'Falta la fecha');
    const t = { id: uid(), type, cat, amount: r2(amount), date, note };
    this.state.tx.push(t); this.store.commit();
    return t;
  }

  /** Compra con tarjeta en n cuotas de valor inst; first = mes ('YYYY-MM') de la primera cuota. */
  addPurchase({ cardId, cat, total, n, inst, date, note, first }) {
    if (!(total > 0) || !(inst > 0)) throw new ValidationError('amount', 'Total y cuota deben ser mayores a 0');
    if (!cardId) throw new ValidationError('card', 'Falta la tarjeta');
    if (!date) throw new ValidationError('date', 'Falta la fecha');
    const p = { id: uid(), cardId, cat: cat || '', total: r2(total), n, inst: r2(inst), date, note, first, paid: {} };
    this.state.purchases.push(p); this.store.commit();
    return p;
  }

  deleteTransaction(id) { this.state.tx = this.state.tx.filter(x => x.id !== id); this.store.commit(); }

  /** Elimina la compra (y con ella todas sus cuotas y pagos). */
  deletePurchase(id) { this.state.purchases = this.state.purchases.filter(x => x.id !== id); this.store.commit(); }

  /** Marca la cuota index (0 = primera) como pagada en la fecha dada. Resta de la plata disponible ese día. */
  payInstallment(purchaseId, index, date) {
    const p = this.state.purchases.find(x => x.id === purchaseId);
    if (!p) return false;
    p.paid = p.paid || {}; p.paid[index] = date;
    this.store.commit();
    return true;
  }

  /** Deshace el pago de una cuota. */
  unpayInstallment(purchaseId, index) {
    const p = this.state.purchases.find(x => x.id === purchaseId);
    if (!p || !p.paid) return false;
    delete p.paid[index];
    this.store.commit();
    return true;
  }

  /** Paga todas las cuotas pendientes de una tarjeta que vencen hasta el mes ym (inclusive). */
  payCardUpTo(cardId, ym, date) {
    cuotas(this.state).forEach(c => { if (c.p.cardId === cardId && c.due <= ym && !c.paid) { c.p.paid = c.p.paid || {}; c.p.paid[c.i] = date; } });
    this.store.commit();
  }
}
