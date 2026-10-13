import { uid } from '../utils/id.js';
import { r2 } from '../utils/math.js';
import { todayS, curYm, addDays, parseD, shiftYm } from '../utils/dates.js';

/** Datos de ejemplo (sintéticos) para ver los gráficos. Quedan marcados con sample:true y no afectan la plata disponible. */
export class SampleDataService {
  /** @param {import('../store/Store.js').Store} store */
  constructor(store) { this.store = store; }
  get state() { return this.store.state; }

  hasSample() { return this.state.tx.some(t => t.sample) || this.state.purchases.some(p => p.sample); }

  remove() {
    this.state.tx = this.state.tx.filter(t => !t.sample);
    this.state.purchases = this.state.purchases.filter(p => !p.sample);
    this.store.commit();
  }

  load() {
    this.store.batch(() => {
      this.remove();
      const state = this.state;
      const T = todayS(); let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      const pick = n => state.cats.includes(n) ? n : state.cats[0];
      for (let i = 1; i <= 62; i++) {
        const d = addDays(T, -i), wd = parseD(d).getDay(); if (wd === 0) continue;
        const s = (a, b) => r2(a + rnd() * (b - a));
        state.tx.push({ id: uid(), type: 'in', cat: 'Uber', amount: s(30, 95), date: d, note: '', sample: true });
        if (wd >= 1 && wd <= 5 && state.sources.includes('Trabajo') && i % 7 === 1) state.tx.push({ id: uid(), type: 'in', cat: 'Trabajo', amount: s(120, 200), date: d, note: 'Pago semanal', sample: true });
        state.tx.push({ id: uid(), type: 'out', cat: pick('Comida en la calle'), amount: s(4, 14), date: d, note: '', sample: true });
        if (i % 3 === 0) state.tx.push({ id: uid(), type: 'out', cat: pick('Gasolina'), amount: s(12, 28), date: d, note: 'Tanque', sample: true });
        if (i % 9 === 0) state.tx.push({ id: uid(), type: 'out', cat: pick('Salidas'), amount: s(15, 45), date: d, note: '', sample: true });
        if (i % 20 === 0) state.tx.push({ id: uid(), type: 'out', cat: pick('Peluquería'), amount: s(8, 15), date: d, note: '', sample: true });
      }
      const c1 = state.cards.find(c => c.kind === 'credito') || state.cards[0], c2 = state.cards.find(c => c.kind === 'papa') || state.cards[0], Y = curYm();
      if (c1) state.purchases.push({ id: uid(), cardId: c1.id, cat: pick('Ropa'), total: 240, n: 6, inst: 40, date: addDays(T, -14), note: 'Zapatos', first: Y, paid: {}, sample: true });
      if (c2) state.purchases.push({ id: uid(), cardId: c2.id, cat: '', total: 150, n: 3, inst: 50, date: addDays(T, -6), note: 'Frenos de la moto', first: shiftYm(Y, 1), paid: {}, sample: true });
      this.store.commit();
    });
  }
}
