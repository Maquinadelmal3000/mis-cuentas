#!/usr/bin/env node
/**
 * Servidor estático mínimo para desarrollo (sin dependencias).
 *   node scripts/serve.mjs           → sirve la raíz del proyecto (módulos ES en src/)
 *   node scripts/serve.mjs dist      → sirve la versión de producción generada por npm run build
 * Puerto: variable PORT (por defecto 5173).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(projectRoot, process.argv[2] || '.');
const port = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(root, '.' + rel);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Prohibido'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(port, () => console.log(`Mis cuentas → http://localhost:${port}  (sirviendo ${path.relative(process.cwd(), root) || '.'})`));
