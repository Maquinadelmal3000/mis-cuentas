#!/usr/bin/env node
/**
 * Verifica un respaldo JSON (exportado desde la app original o desde esta) sin modificarlo.
 *   node scripts/verify-backup.mjs <respaldo.json>
 * Muestra: conteos y totales, valores calculados por las reglas financieras (plata de hoy, deuda en cuotas),
 * hallazgos de integridad y una huella SHA-256 del contenido (para comprobar que dos copias son iguales).
 * Código de salida 1 si hay errores de integridad.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseBackup, hydrateState } from '../src/models/schema.js';
import { checkIntegrity, summarizeState } from '../src/migration/integrity.js';
import { cash, committed } from '../src/domain/cash.js';
import { cuotas } from '../src/domain/installments.js';
import { curYm } from '../src/utils/dates.js';
import { fmt } from '../src/utils/format.js';

const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/verify-backup.mjs <respaldo.json>'); process.exit(2); }
const raw = parseBackup(fs.readFileSync(file, 'utf8'));
if (!raw) { console.error('El archivo no es un respaldo válido de Mis cuentas.'); process.exit(2); }

const state = hydrateState(raw);
const sum = summarizeState(state);
const canonical = JSON.stringify(sortKeys(state));

console.log('== Resumen ==');
console.log(JSON.stringify(sum, null, 2));
console.log('\n== Valores calculados con las reglas actuales (fecha de hoy) ==');
console.log('Plata de hoy:', fmt(cash(state, 'now')));
console.log('Comprometido hasta este mes:', fmt(committed(state, 'now', curYm())));
console.log('Cuotas pendientes (cantidad):', cuotas(state).filter(c => !c.paid).length);
console.log('\nSHA-256 del contenido (claves ordenadas, sin updatedAt):', crypto.createHash('sha256').update(JSON.stringify(sortKeys({ ...state, updatedAt: undefined }))).digest('hex'));

const issues = checkIntegrity(state);
console.log('\n== Integridad ==');
if (!issues.length) console.log('Sin hallazgos.');
issues.forEach(i => console.log(`[${i.level}] ${i.message}`));
process.exit(issues.some(i => i.level === 'error') ? 1 : 0);

function sortKeys(o) {
  if (Array.isArray(o)) return o.map(sortKeys);
  if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => [k, sortKeys(o[k])]));
  return o;
}
