# Pruebas

Qué se ejecutó, con qué resultado y qué quedó **sin probar**. Todo lo marcado como ejecutado se corrió realmente durante la preparación
del proyecto; lo que no, figura en la sección "Pendiente".

## Entorno de las pruebas

- Node.js v22.22.2 (sin dependencias instaladas).
- Navegador real: Chromium (build 1194, *headless*) controlado con `puppeteer-core`, vista de teléfono 390×844, zona horaria UTC.
- Reloj fijo en las pruebas de navegador: **2026-10-10 12:00** y generador aleatorio determinista (para que los ids coincidan).

## 1. Pruebas automáticas: `npm test` → 97 pruebas, 0 fallos

| Archivo | Pruebas | Qué cubre |
|---|---:|---|
| `tests/unit/format.test.mjs` | 6 | Formato de dinero (`$1.234,50`), lectura de montos escritos (`1.234,56`, `1.500`…), escape de HTML. |
| `tests/unit/dates.test.mjs` | 5 | Reloj inyectable, sumar días/meses, años bisiestos. |
| `tests/unit/finance.test.mjs` | 12 | **Reglas financieras**: expansión de cuotas, plata disponible (saldo + ingresos − gastos − cuotas pagadas; fechas pasadas, futuras y de ejemplo), cuota pagada hoy, comprometido (con atrasadas), días de trabajo, ingreso fijo, estadísticas por tarjeta, total ↔ cuota, meta diaria y "te quedaría". |
| `tests/unit/reports.test.mjs` | 9 | Gastos por mes en base *cuota* y *compra completa*, ingresos, agrupación, acumulados, grupos, filtros y búsqueda de movimientos, resumen del mes, deuda por tarjeta. |
| `tests/unit/schema.test.mjs` | 7 | Estado por defecto independiente, **migración de versiones** (renombres, grupos), idempotencia, hidratación, **respaldo ida y vuelta**, rechazo de respaldos inválidos. |
| `tests/unit/services.test.mjs` | 7 | `Store` (persistencia, `batch`, fallo del repositorio), **crear/consultar/modificar/eliminar** movimientos y compras, pagar/deshacer cuotas, validaciones, catálogo (listas, grupos, tarjetas, ingresos fijos, plantillas, borrado total), respaldo/restauración, datos de ejemplo. |
| `tests/unit/repositories.test.mjs` | 4 | Contrato de repositorio sobre memoria y `localStorage` simulado; copia de datos dañados (`.corrupto`); métodos obligatorios de la interfaz. |
| `tests/unit/migration.test.mjs` | 7 | Integridad (detecta duplicados, tipos, fechas, tarjetas huérfanas, pagos inexistentes…), exportación relacional con **conciliación de conteos y totales**, ids conservados, tarjeta eliminada → archivada, CSV. |
| `tests/unit/merge.test.mjs` | 1 | Combinación de estados por id (reservada para sincronización futura). |
| `tests/unit/original-parity.test.mjs` | 28 | **Equivalencia con la app original**: cifras de Hoy, Análisis (ambas bases, 4 meses) y Deudas, para 2 estados × 7 fechas, contra lo que mostró la app original en Chromium (`tests/fixtures/cifras-app-original.json`). |
| `tests/ui/smoke.test.mjs` | 8 | La interfaz arranca sobre un DOM simulado y recorre configuración inicial, registrar ingreso/gasto/compra, todas las pestañas y subpestañas, pagar/deshacer cuotas, ajustes, plantillas, ingreso fijo, tarjeta nueva, datos de ejemplo, respaldo y borrados con doble toque. |
| `tests/build.test.mjs` | 3 | `npm run build` produce un `dist/index.html` válido y autocontenido, sin referencias a Claude, y el manifiesto PWA es válido con iconos existentes. |

Esta batería **no usa un navegador**: la interfaz se prueba sobre un DOM simulado mínimo (`tests/helpers/fakeDom.mjs`).

## 2. Equivalencia con la aplicación original, en un navegador real

Método: se ejecutó el **mismo guion de 62 pasos** (`tests/e2e/scenario.mjs`) en la aplicación original y en el proyecto nuevo, dentro de Chromium, y se
comparó el HTML de la pantalla y de la hoja abierta en cada paso, más el estado guardado en `localStorage` al final.

El guion cubre: configuración inicial y máscara de miles; registrar ingreso, gasto y compras con tarjeta (total → cuota y cuota → total, stepper, mes de la primera cuota);
Movimientos con filtros, búsqueda y cambio de mes; Análisis (resumen, categorías, grupos, evolución, deudas, ambas bases, detalles); Tarjetas (resumen, meses con filtro,
compras con filtro, detalle de tarjeta, pago con confirmación); Hoy tras los cambios; Ajustes (secciones, día libre, fuente, ingreso fijo, plantilla nueva); plantilla en el
formulario; tarjeta nueva; datos de ejemplo; respaldo; borrado de un movimiento con doble toque.

| Qué se probó | Resultado |
|---|---|
| Módulos de `src/` servidos por HTTP | 62/62 pasos, **0 diferencias**, 0 errores de página, estado guardado idéntico (17.929 bytes) |
| Versión de producción `dist/index.html` abierta como archivo | 62/62 pasos, **0 diferencias**, 0 errores de página |

Las **únicas diferencias normalizadas** (a propósito) son los textos que mencionaban la sincronización con la cuenta de Claude (bloque de Ajustes → Datos), la leyenda de
"Borrar todo" y la etiqueta transitoria "Conectando…" del primer dibujado (`tests/e2e/normalize.mjs`).

Además, para **2 estados × 7 fechas simuladas** (octubre de 2026 a marzo de 2027, incluidos fin de mes y días libres), se extrajeron de ambas aplicaciones las cifras de Hoy, Análisis (4 meses, 2 bases) y Deudas:
**idénticas** en las dos. Una de las bases de datos tiene poca plata para ejercitar la meta diaria; la otra cubre las cuotas.

## 3. Respaldo en navegador real (`tests/e2e/backup.mjs`)

6 comprobaciones, todas correctas: descarga con nombre `mis-cuentas-respaldo-AAAA-MM-DD.json`, archivo descargado válido, **carga con el selector de archivos real** de un respaldo
generado por la app **original**, confirmación con conteos, datos restaurados iguales (movimientos, compras, tarjetas, plantillas, ingresos fijos), **mismos identificadores**, y rechazo de un texto inválido.

## 4. Revisión visual

Se generaron capturas de `dist/index.html` en modo claro y oscuro (Hoy y Análisis → Categorías) y se revisaron dos: Hoy en claro y Análisis en oscuro. Se veían correctas
(navegación inferior, tarjetas, gráfico circular, ranking). Las fuentes de Google no cargaron en el entorno de pruebas (sin internet), así que se vio la tipografía de reemplazo.

## 5. Otras comprobaciones

- **Sin referencias obligatorias a Claude:** búsqueda en `src/` e `index.html` de `claude`, `window.claude`, "tu cuenta": sin resultados (solo hay menciones históricas en esta documentación). `tests/build.test.mjs` verifica además el paquete.
- **Imports y nombres:** se comprobó con el compilador de TypeScript en modo de revisión (solo como herramienta del autor, **no** es parte del proyecto) que no hay nombres sin definir ni imports faltantes.
- **Verificación de un respaldo real de la app original (sintético):** `tests/fixtures/respaldo-original-sintetico.json` fue generado por la función de respaldo de la app original; `verify-backup` lo lee, `export-relational` lo concilia sin diferencias y la app lo carga en navegador real.

## 6. Problemas encontrados durante las pruebas (y corregidos)

1. **Empaquetador:** la primera versión de `dist/index.html` no funcionaba en el navegador (`Invalid or unexpected token`): los `$` del código se interpretaban como comandos de `String#replace` al insertarlo en el HTML. Se detectó solo al ejecutar `dist` en Chromium (la compilación aislada del paquete no lo mostraba). Corregido y el build ahora **verifica que el script insertado sea idéntico al paquete**.
2. **Pruebas propias:** un error de expectativa mía en la prueba de meta diaria (días de trabajo del 26 al 31 de octubre) y un guion de pago de cuotas que no avanzaba al mes de la primera cuota. Se corrigieron las pruebas, no el código.

## 7. Cómo ejecutar

```bash
npm test                                   # 97 pruebas, sin dependencias (Node ≥ 18; ejecutado con Node 22)
npm install --no-save puppeteer-core       # solo para las pruebas en navegador real
CHROME_PATH=/ruta/a/chrome node tests/e2e/run.mjs          # compara los 62 pasos con tests/e2e/golden.json (módulos de src/)
CHROME_PATH=/ruta/a/chrome node tests/e2e/run.mjs --dist   # lo mismo sobre dist/ (ejecutar antes npm run build)
CHROME_PATH=/ruta/a/chrome node tests/e2e/backup.mjs       # respaldo en navegador real
```

`tests/e2e/golden.json` contiene lo que produjo la **aplicación original**; `--update` lo reescribe con la aplicación actual y solo debe usarse si un cambio de comportamiento es intencional.

## 8. Pendiente (NO se probó)

- **Dispositivos reales:** teléfonos y tablets Android, Windows, y navegadores distintos de Chromium (Chrome, Edge, Firefox, Safari). Solo se probó Chromium *headless* de escritorio con vista de teléfono.
- **Instalación como PWA:** hay manifiesto e iconos, pero no se verificó que el navegador ofrezca instalar la app (requiere HTTPS) ni se auditó con Lighthouse. No hay service worker.
- **Modo oscuro:** solo se revisó una captura; no se recorrieron todas las pantallas en oscuro.
- **Rendimiento con muchos datos** (miles de movimientos) y **cuota de `localStorage`**: no se midió.
- **Zonas horarias distintas de UTC:** las pruebas corrieron en UTC.
- **Node 18 y 20:** `npm test` se ejecutó solo en Node 22; el descubrimiento automático de archivos de prueba de `node --test` puede diferir en versiones anteriores.
- **Selector de archivos desde Drive en un teléfono**, y la descarga del respaldo con el menú de compartir en iOS: no se probaron (sí con un archivo local en Chromium).
- **Despliegue** en GitHub y Cloudflare Pages: no se hizo.
- **PostgreSQL / Supabase:** el DDL de `MODELO_DATOS.md` **no se ejecutó** (no había un servidor) y Supabase no está integrado; solo se probó la transformación a CSV/JSON y su conciliación.
- **Accesibilidad** (lectores de pantalla, contraste, teclado): no se auditó.
- **Sincronización:** se eliminó de esta versión; la de Claude se probó aparte con una base de datos simulada y no forma parte de este proyecto.
