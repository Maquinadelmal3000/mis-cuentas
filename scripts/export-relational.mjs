#!/usr/bin/env node
/**
 * Convierte un respaldo JSON al modelo relacional propuesto (docs/MODELO_DATOS.md) y comprueba que los
 * conteos y totales coinciden. NO se conecta a ninguna base de datos; solo escribe archivos.
 *   node scripts/export-relational.mjs <respaldo.json> [carpeta-salida]
 * Genera en la carpeta (por defecto ./export-relacional): tables.json, un CSV por tabla y reporte.txt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseBackup, hydrateState } from '../src/models/schema.js';
import { checkIntegrity, summarizeState } from '../src/migration/integrity.js';
import { toRelational, summarizeTables, tableToCsv } from '../src/migration/toRelational.js';

const [file, outArg] = process.argv.slice(2);
if (!file) { console.error('Uso: node scripts/export-relational.mjs <respaldo.json> [carpeta-salida]'); process.exit(2); }
const raw = parseBackup(fs.readFileSync(file, 'utf8'));
if (!raw) { console.error('El archivo no es un respaldo válido de Mis cuentas.'); process.exit(2); }

const state = hydrateState(raw);
const issues = checkIntegrity(state);
const { tables, warnings } = toRelational(state, null);
const before = summarizeState(state), after = summarizeTables(tables);
const diffs = Object.keys(before).filter(k => before[k] !== after[k]);

const out = path.resolve(outArg || 'export-relacional');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'tables.json'), JSON.stringify(tables, null, 1));
for (const [name, rows] of Object.entries(tables)) fs.writeFileSync(path.join(out, name + '.csv'), tableToCsv(rows, rows[0] ? Object.keys(rows[0]) : []));

const report = [
  'Reporte de exportación relacional', '',
  'Filas por tabla:', ...Object.entries(tables).map(([n, r]) => `  ${n}: ${r.length}`), '',
  'Conciliación (estado de la app vs tablas):', ...Object.keys(before).map(k => `  ${k}: ${before[k]} vs ${after[k]} ${before[k] === after[k] ? 'OK' : 'DIFERENCIA'}`), '',
  'Advertencias de transformación:', ...(warnings.length ? warnings.map(w => '  - ' + w) : ['  (ninguna)']), '',
  'Hallazgos de integridad:', ...(issues.length ? issues.map(i => `  [${i.level}] ${i.message}`) : ['  (ninguno)'])
].join('\n');
fs.writeFileSync(path.join(out, 'reporte.txt'), report + '\n');
console.log(report);
console.log('\nArchivos escritos en', out);
process.exit(diffs.length || issues.some(i => i.level === 'error') ? 1 : 0);
