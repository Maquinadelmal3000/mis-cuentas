#!/usr/bin/env node
/**
 * Prueba extremo a extremo OPCIONAL del respaldo en un navegador real: descargar el archivo y cargarlo con el
 * selector de archivos. Mismos requisitos que run.mjs (puppeteer-core + CHROME_PATH).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FIXED_JS } from './scenario.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const chrome = process.env.CHROME_PATH;
if (!chrome) { console.error('Define CHROME_PATH con la ruta de Chrome/Chromium.'); process.exit(2); }
const puppeteer = (await import('puppeteer-core')).default;
const port = 5198;
const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs'), '.'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const results = [], errors = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log((ok ? 'OK    ' : 'FALLO ') + name + (extra ? ' · ' + extra : '')); };
try {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(FIXED_JS);
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const act = async (a, id) => { await page.evaluate((a, id) => { const el = document.querySelector('#sheet [data-act="' + a + '"]' + (id ? '[data-id="' + id + '"]' : '')) || document.querySelector('[data-act="' + a + '"]' + (id ? '[data-id="' + id + '"]' : '')); if (!el) throw new Error('no existe ' + a); el.click(); }, a, id); await wait(40); };

  // 1) Descargar: se intercepta el clic del enlace de descarga y se lee el contenido del Blob
  await page.evaluate(() => { window.__dl = null; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dlName = this.download; fetch(this.href).then(r => r.text()).then(t => { window.__dl = t; }); } else orig.call(this); }; });
  await page.type('#s-open', '2500'); await act('startapp');
  await act('settings'); await act('backup'); await act('dlbackup'); await wait(200);
  const name = await page.evaluate(() => window.__dlName), body = await page.evaluate(() => window.__dl);
  check('descarga con nombre mis-cuentas-respaldo-YYYY-MM-DD.json', /^mis-cuentas-respaldo-\d{4}-\d{2}-\d{2}\.json$/.test(name || ''), name);
  const parsed = JSON.parse(body);
  check('el archivo descargado es un respaldo válido con el saldo inicial', parsed.app === 'mis-cuentas' && parsed.state.setup.opening === 2500);

  // 2) Cargar el respaldo de la aplicación ORIGINAL (fixture) con el selector de archivos real
  const fixture = path.join(root, 'tests', 'fixtures', 'respaldo-original-sintetico.json');
  const expected = JSON.parse(fs.readFileSync(fixture, 'utf8')).state;
  const input = await page.$('#bk-file'); await input.uploadFile(fixture); await wait(300);
  check('aparece la confirmación con los conteos', (await page.evaluate(() => document.getElementById('bk-confirm').innerText)).includes(`${expected.tx.length} movimientos`));
  await act('applyrestore'); await act('applyrestore'); await wait(300);
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('mis-cuentas-v2')));
  check('los datos restaurados coinciden (movimientos, compras, tarjetas, plantillas, ingresos fijos)',
    saved.tx.length === expected.tx.length && saved.purchases.length === expected.purchases.length && saved.cards.length === expected.cards.length &&
    saved.templates.length === expected.templates.length && saved.fixed.length === expected.fixed.length && saved.setup.opening === expected.setup.opening);
  check('mismos identificadores', JSON.stringify(saved.tx.map(t => t.id)) === JSON.stringify(expected.tx.map(t => t.id)));

  // 3) Texto inválido
  await act('settings'); await act('backup');
  await page.evaluate(() => { const t = document.getElementById('bk-in'); t.value = 'esto no es un respaldo'; }); await act('restore');
  check('un texto inválido se rechaza con mensaje', (await page.evaluate(() => document.getElementById('bk-err').textContent)).includes('no es un respaldo válido'));
} catch (e) { errors.push('guion: ' + e.message); results.push(false); }
await browser.close(); server.kill();
console.log('errores de página:', JSON.stringify(errors));
process.exit(results.every(Boolean) && !errors.length ? 0 : 1);
