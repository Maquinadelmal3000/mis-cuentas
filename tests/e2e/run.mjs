#!/usr/bin/env node
/**
 * Prueba extremo a extremo OPCIONAL en un navegador real (no forma parte de `npm test`).
 *
 * Requisitos (solo para esta prueba):
 *   npm install --no-save puppeteer-core
 *   y un Chrome/Chromium instalado:  CHROME_PATH=/ruta/al/chrome node tests/e2e/run.mjs
 *
 * Qué hace: levanta el servidor de desarrollo, ejecuta el guion de tests/e2e/scenario.mjs (≈60 pasos:
 * configuración inicial, registrar movimientos y compras, pagar cuotas, análisis, tarjetas, ajustes,
 * plantillas, respaldo, borrados…) y compara el HTML de cada paso y el estado guardado con
 * tests/e2e/golden.json, que se capturó de la aplicación original.
 * Con --dist prueba el paquete de producción (dist/index.html) en lugar de los módulos de src/.
 * Con --update reescribe golden.json con lo que produce la app actual (¡solo si el cambio es intencional!).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FIXED_JS, scenario } from './scenario.mjs';
import { normalize, sortKeys } from './normalize.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const goldenFile = path.join(root, 'tests', 'e2e', 'golden.json');
const chrome = process.env.CHROME_PATH;
const useDist = process.argv.includes('--dist'), update = process.argv.includes('--update');
if (!chrome) { console.error('Define CHROME_PATH con la ruta de Chrome/Chromium.'); process.exit(2); }
let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; } catch { console.error('Falta puppeteer-core: npm install --no-save puppeteer-core'); process.exit(2); }

const port = 5199;
const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs'), useDist ? 'dist' : '.'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const errors = [], caps = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.evaluateOnNewDocument(FIXED_JS);
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const snap = async name => { const r = await page.evaluate(() => ({ app: document.getElementById('app').innerHTML, sheet: document.getElementById('sheet').innerHTML })); caps.push({ name, app: normalize(r.app), sheet: normalize(r.sheet) }); };
  const act = async (a, id, extra) => { await page.evaluate((a, id, extra) => { const sel = '[data-act="' + a + '"]' + (id !== undefined ? '[data-id="' + id + '"]' : '') + (extra || ''); const el = document.querySelector('#sheet.on ' + sel) || document.querySelector('#sheet ' + sel) || document.querySelector(sel); if (!el) throw new Error('no existe ' + sel); el.click(); }, a, id, extra); await wait(30); };
  const tab = async t => { await page.evaluate(t => document.querySelector('[data-tab="' + t + '"]').click(), t); await wait(30); };
  const typeIn = async (sel, txt) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.press('Backspace'); await page.type(sel, txt); };
  const setSel = async (sel, val) => { await page.select(sel, val); };
  const setVal = async (sel, val) => { await page.evaluate((sel, val) => { const el = document.querySelector(sel); el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }, sel, val); };
  const fab = async () => { await page.evaluate(() => document.getElementById('fab').click()); await wait(30); };
  await scenario({ page, snap, act, tab, typeIn, setSel, setVal, fab });
  await wait(200);
  caps.push({ name: 'ESTADO', app: JSON.stringify(sortKeys(JSON.parse(await page.evaluate(() => localStorage.getItem('mis-cuentas-v2'))))), sheet: '' });
} catch (e) { errors.push('guion: ' + e.message); }
await browser.close(); server.kill();

if (update) { fs.writeFileSync(goldenFile, JSON.stringify({ descripcion: 'Regenerado con la aplicación actual (--update).', capturas: caps })); console.log('golden.json actualizado con', caps.length, 'capturas'); process.exit(0); }
const gold = JSON.parse(fs.readFileSync(goldenFile, 'utf8')).capturas;
let bad = 0;
gold.forEach((g, i) => {
  const c = caps[i];
  if (!c) { bad++; console.log('FALTA la captura', g.name); return; }
  for (const k of ['app', 'sheet']) if (g[k] !== c[k]) { bad++; let j = 0; while (g[k][j] === c[k][j]) j++; console.log(`DIFERENCIA en "${g.name}" [${k}] pos ${j}\n  golden: ${JSON.stringify(g[k].slice(Math.max(0, j - 60), j + 120))}\n  actual: ${JSON.stringify(c[k].slice(Math.max(0, j - 60), j + 120))}`); }
});
console.log(`pasos: ${caps.length}/${gold.length} · errores de página: ${JSON.stringify(errors)} · diferencias: ${bad}`);
process.exit(bad || errors.length || caps.length !== gold.length ? 1 : 0);
