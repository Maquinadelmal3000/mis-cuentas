/**
 * Comprueba las reglas financieras contra las cifras que mostró la aplicación ORIGINAL (extraídas con Chromium)
 * para dos estados sintéticos en siete fechas simuladas. Ver tests/fixtures/cifras-app-original.json.
 */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hydrateState } from '../../src/models/schema.js';
import { homeSummary, monthSummary, cardDebts } from '../../src/domain/summary.js';
import { curYm, shiftYm, monthOnly } from '../../src/utils/dates.js';
import { fmt } from '../../src/utils/format.js';
import { at, realClock } from '../helpers/util.mjs';

afterEach(realClock);
const fx = JSON.parse(fs.readFileSync(new URL('../fixtures/cifras-app-original.json', import.meta.url), 'utf8'));

for (const [name, ds] of Object.entries(fx.datasets)) {
  for (const date of fx.fechas) {
    test(`cifras de Hoy idénticas a la app original · estado "${name}" · ${date}`, () => {
      at(date);
      const s = hydrateState(JSON.parse(JSON.stringify(ds.state))); s.manualInstallments = true;   // la app original solo tenía confirmación manual
      const h = homeSummary(s), exp = ds.original[date].home;
      assert.equal(fmt(h.cNow), exp.plata);
      assert.equal(fmt(h.comp), exp.aPagar);
      assert.equal(exp.duo, `+${fmt(h.inToday)} entró hoy -${fmt(h.outToday)} salió hoy`);
      const meta = h.falta <= 0
        ? `Ya cubres las cuotas de ${monthOnly(h.Y)}. Lo que ganes es plata libre.`
        : `Meta ${h.isOff ? 'por día de trabajo' : 'de hoy'} ${fmt(h.perDay)} Llevas ${fmt(h.inToday)} · faltan ${fmt(h.falta)} para cubrir el mes · ${h.wd} día${h.wd === 1 ? '' : 's'} de trabajo`;
      assert.equal(exp.meta, meta);
      assert.ok(exp.lines.includes(`Te quedaría libre ${fmt(h.libre)}`), 'línea "Te quedaría libre"');
      assert.ok(exp.lines.includes(`Pagado este mes ${fmt(h.mPaid)} de ${fmt(h.mTotal)}`), 'línea "Pagado este mes"');
      if (h.overdue > 0) assert.ok(exp.lines.includes(`Incluye de meses anteriores ${fmt(h.overdue)}`));
      if (h.fixed > 0) assert.ok(exp.lines.includes(`Con tu ingreso fijo te quedaría ${fmt(h.fixedLeft)}`));
    });

    test(`cifras de Análisis y Deudas idénticas a la app original · "${name}" · ${date}`, () => {
      at(date);
      const s = hydrateState(JSON.parse(JSON.stringify(ds.state))), exp = ds.original[date]; s.manualInstallments = true;
      for (const basis of ['cuota', 'total']) {
        for (const off of [-1, 0, 1, 2]) {
          const m = monthSummary(s, shiftYm(curYm(), off), basis, 'out'), e = exp.analysis[basis][off];
          if (!m.inn.length && !m.out.length) { assert.equal(e.resultado, undefined, `mes vacío ${basis} ${off}`); continue; }   // la app muestra "sin movimientos"
          assert.equal(e.resultado, fmt(m.tIn - m.tOut), `resultado ${basis} ${off}`);
          assert.deepEqual(e.cmp, [`Ingresos ${fmt(m.tIn)}`, `Gastos ${fmt(m.tOut)}`], `ingresos/gastos ${basis} ${off}`);
        }
      }
      assert.equal(exp.deudas.total, fmt(cardDebts(s, curYm()).total));
    });
  }
}
