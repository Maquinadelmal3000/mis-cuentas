import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('npm run build genera dist/index.html autocontenido y válido', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build.mjs')], { cwd: root });
  const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
  assert.ok(html.includes('<style>') && html.includes('<script>'));
  assert.ok(!html.includes('<script type="module"') && !html.includes('rel="stylesheet" href="src/'));
  const script = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(script, /^\s*import\s/m);
  assert.doesNotMatch(script, /^\s*export\s/m);
  new vm.Script(script);                                   // compila
  assert.ok(fs.existsSync(path.join(root, 'dist', 'manifest.webmanifest')));
  assert.ok(fs.existsSync(path.join(root, 'dist', 'icons', 'icon-192.png')));
});

test('el paquete no contiene referencias obligatorias a la plataforma de Claude', () => {
  const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /window\.claude|claude\.use|api\.anthropic/i);
});

test('el manifiesto PWA es JSON válido con iconos existentes', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(root, i.src)), i.src);
});
