# Mis Cuentas — traspaso del trabajo en curso

Base: el ZIP `mis-cuentas-main.zip` (rama `main`) + los cambios de esta sesión. No se hizo push ni se publicó nada.

## Terminado y probado (120 tests en verde: 97 originales + 23 nuevos)
- Cuotas numeradas 1..n, sin cuotas extra; modo automático por mes calendario y modo manual (interruptor en Configuración → "Cuotas", columna `manualInstallments`; por defecto automático). Redondeo: la última cuota absorbe centavos si total ≈ cuota × n.
- Calendario de cuotas (Tarjetas → Calendario): mes/año, filtro por tarjeta, totales programado/pagado/pendiente, desglose por tarjeta, detalle de compra.
- Edición de movimientos y de compras (botón "Editar" en el detalle; mismo id, sin duplicar; no deja bajar las cuotas por debajo de una con pago registrado).
- Plantillas: selector "Usar plantilla" (rellena sin guardar) y botón "Guardar plantilla" propio (actualiza si ya existe el mismo nombre y tipo).
- Descripciones: campo "Descripción de la compra"; si falta, "Compra con tarjeta · <fecha>".

## Pendiente (NO implementado)
1. Gesto Atrás de Android (History API: un `pushState` al entrar a una pestaña o abrir una hoja; `popstate` cierra la hoja → vuelve a Inicio → deja salir; confirmar si el formulario tiene cambios sin guardar. Ya existen `isDraftDirty()` y `snapDraft()` en `src/ui/views/addForm.js`).
2. Modo offline completo: Service Worker, IndexedDB, cola de cambios (outbox), conflictos, sesión sin Internet, indicadores, aviso de "Nueva versión".
3. SQL de versionado por fila (ver abajo) y tests de navegación/offline/Service Worker.
4. README y docs no están actualizados; build final y comandos Git.

## Decisiones que tomé por mi cuenta (cámbialas si no coinciden)
- Automático: la cuota de un mes cuenta como pagada desde el día 1 de ese mes SOLO para progreso, deuda restante, calendario y estadísticas.
- "A pagar este mes" / comprometido / meta diaria: en automático cuentan solo las cuotas del mes actual (no hay "atrasos"); en manual todo sigue como antes (incluye atrasadas). Está centralizado en `isCommitted()` (`src/domain/cash.js`).
- "Plata de hoy" NO se descuenta por el avance automático: solo por pagos reales (`paid`).

## Archivos
Nuevos: `src/domain/calendar.js`, `src/sync/relational.js` (mapeo tablas↔estado compartido; base del offline), `docs/sql/001_manual_installments.sql`, `tests/unit/installments-modes.test.mjs`, `tests/unit/edit-templates.test.mjs`.
Modificados: `src/domain/{installments,cash,summary,accessors}.js`, `src/models/schema.js`, `src/migration/toRelational.js` (columna `manual_installments`), `src/repositories/SupabaseRepository.js` (ahora usa `tablesToState` y `TABLES` de `sync/relational.js`), `src/services/{LedgerService,CatalogService}.js`, `src/ui/{ctx,actions,events,widgets}.js`, `src/ui/views/{cards,details,settings,addForm}.js`, `src/styles/main.css`, `tests/helpers/util.mjs`, `tests/unit/{original-parity,schema}.test.mjs`, `tests/ui/smoke.test.mjs`.

## Cosas a tener en cuenta
- Los tests antiguos describen la confirmación MANUAL: por eso `makeState()` (tests/helpers/util.mjs) pone `manualInstallments = true` y la prueba de equivalencia lo fuerza. Los tests nuevos usan automático explícitamente.
- `tests/e2e/golden.json` quedó desactualizado (es del original, solo manual, sin login). No forma parte de `npm test`.
- `src/domain/cash.js` menciona `docs/CUOTAS.md`, que no existe (usar este archivo).
- El build plano (`scripts/build.mjs`) exige nombres de nivel superior únicos en todo el proyecto (hubo choques con `TABLES` y `month`, ya resueltos).
- Para detectar nombres sin definir se usó el compilador de TypeScript como revisor (`allowJs/checkJs`, buscar errores TS2304), no forma parte del proyecto.

## Diseño propuesto para el offline (para quien continúe)
- Causas actuales: no hay Service Worker; `store.load()` necesita red; `ensureSession()` en `SupabaseApi.js` BORRA la sesión si no puede renovar el token (dura ~1 h); cada commit sube todas las tablas sin control de versión y un fallo solo se registra en consola; el refresco de token no es de una sola ejecución (carreras).
- Copia local en IndexedDB, una base por usuario (`mis-cuentas-db:<userId>`), un store por tabla (`t_<tabla>` con `{k,row,base}`), `outbox` (seq, opId, table, k, op insert|update|delete, row, baseRev, status, attempts, lastError, nextAttemptAt), `conflicts`, `meta`.
- Réplica en memoria síncrona con escritura diferida a IndexedDB; `save(state)` calcula la diferencia contra el último snapshot cargado y la convierte en operaciones (fusionando operaciones sobre la misma fila); orden: altas/ediciones padres→hijos y bajas hijos→padres (`TABLES`/`RANK` en `sync/relational.js`).
- Envío idempotente: INSERT con `on_conflict` + `Prefer: resolution=ignore-duplicates`; UPDATE/DELETE condicionados a `rev=eq.<baseRev>`; si no devuelve filas, leer y comparar contenido (replay ok / conflicto). Conflictos: nunca sobrescribir; guardar ambos y pedir resolución al usuario. Una sola sincronización a la vez (Web Locks). Disparadores: inicio, evento `online`, tras guardar (con retardo) y botón "Sincronizar ahora"; sin polling.
- Service Worker: precache del shell (`./`, `index.html`, manifest, iconos) con versión por hash en `sw.js` generado por el build; sin `skipWaiting` automático (mensaje "Nueva versión — Actualizar"); NO interceptar Supabase; fuentes de Google en caché aparte; `_headers` con `no-cache` para `sw.js` e `index.html`.

## SQL
- Necesario YA: `docs/sql/001_manual_installments.sql` (una columna con valor por defecto; segura).
- Faltaría para el offline (NO escrito): en las 10 tablas sincronizadas (`user_settings, income_sources, expense_groups, categories, cards, fixed_incomes, templates, transactions, purchases, installment_payments`) agregar `rev bigint not null default 1` y `updated_at timestamptz not null default now()` si no existen, y un trigger BEFORE UPDATE que haga `new.rev := old.rev + 1; new.updated_at := now()`. Sin borrar datos. Además, hay que comprobar contra tu base real que las columnas y claves coinciden con `src/sync/relational.js`.

## Resultados de tests ya ejecutados
- Línea base en tu `main`: 97 pruebas, 97 pasan.
- Última corrida completa tras los cambios: 120 pruebas, 120 pasan, 0 fallan. Revisión de nombres sin definir (TypeScript): sin errores.
- No se ejecutó el build final ni pruebas en Android/Windows/Supabase real.
