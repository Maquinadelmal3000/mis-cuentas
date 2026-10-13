#!/usr/bin/env node
/**
 * Genera la versión de producción en dist/ (sin dependencias):
 *   dist/index.html            → una sola página con el CSS y el JavaScript incluidos (también abre con doble clic)
 *   dist/manifest.webmanifest  → manifiesto PWA
 *   dist/icons/                → iconos
 *
 * El empaquetado concatena los módulos de src/ en orden de dependencias, quitando import/export.
 * Reglas que debe cumplir el código para poder empaquetarse así (el build las comprueba):
 *   - imports de una sola línea con llaves:  import { a, b } from './x.js';
 *   - exports como declaración:              export function f() {}  /  export const x = ...
 *   - nombres de nivel superior únicos en todo el proyecto (el motor de JS avisa si se repiten).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'src', 'main.js');
const dist = path.join(root, 'dist');

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';?[ \t]*\r?\n?/gm;

function collect(file, seen, order) {
  if (seen.has(file)) return;
  seen.add(file);
  const code = fs.readFileSync(file, 'utf8');
  let m; IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(code))) collect(path.resolve(path.dirname(file), m[2]), seen, order);
  if (/^\s*import\s/m.test(code.replace(IMPORT_RE, ''))) throw new Error(`Import no soportado por el empaquetador en ${path.relative(root, file)}`);
  order.push(file);
}

function strip(code) {
  return code
    .replace(IMPORT_RE, '')
    .replace(/^export\s+(async\s+function|function|const|let|class)\b/gm, '$1');
}

const order = [];
collect(entry, new Set(), order);

const parts = order.map(f => `/* ===== ${path.relative(root, f).replace(/\\/g, '/')} ===== */\n${strip(fs.readFileSync(f, 'utf8'))}`);
const bundle = `(function () {\n'use strict';\n${parts.join('\n')}\n})();\n`;
if (/<\/script/i.test(bundle)) throw new Error('El código contiene </script>; escápalo antes de empaquetar.');

try { new vm.Script(bundle, { filename: 'bundle.js' }); }
catch (e) { throw new Error('El paquete generado no es JavaScript válido (¿nombres repetidos?): ' + e.message); }

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles', 'main.css'), 'utf8');
const cssTag = '<link rel="stylesheet" href="src/styles/main.css">';
const jsTag = '<script type="module" src="src/main.js"></script>';
if (!html.includes(cssTag) || !html.includes(jsTag)) throw new Error('index.html no contiene las etiquetas esperadas de CSS y JS.');
// Se usan funciones de reemplazo: el código contiene '$' que String#replace interpretaría como comandos.
html = html.replace(cssTag, () => `<style>\n${css}</style>`).replace(jsTag, () => `<script>\n${bundle}</script>`);

// Verificación final: el script incluido en el HTML debe ser idéntico al paquete y compilar.
const inline = html.match(/<script>\n([\s\S]*?)<\/script>/);
if (!inline || inline[1] !== bundle) throw new Error('El script insertado en dist/index.html no coincide con el paquete.');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.copyFileSync(path.join(root, 'manifest.webmanifest'), path.join(dist, 'manifest.webmanifest'));
fs.cpSync(path.join(root, 'icons'), path.join(dist, 'icons'), { recursive: true });

console.log(`Listo: dist/index.html (${(html.length / 1024).toFixed(1)} KB, ${order.length} módulos empaquetados)`);
