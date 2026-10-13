# Arquitectura

La aplicación es un cliente web estático sin servidor y sin framework. El código sigue una **arquitectura por capas** con
dependencias en un solo sentido, para que la interfaz, las reglas de negocio y el almacenamiento se puedan cambiar por separado.

## Capas y reglas de dependencia

```
              ┌───────────────────────────── ui/ ─────────────────────────────┐
              │  events.js → actions.js → views/*  ·  widgets  ·  moneyMask    │  Presentación
              └──────────────┬──────────────────────────────┬─────────────────┘
                 escribe vía │                              │ lee vía
                             ▼                              ▼
              ┌──────── services/ ────────┐       ┌──────── domain/ ────────┐
              │ Ledger · Catalog · Backup │       │ cash · installments ·   │  Lógica de negocio
              │ · SampleData              │──────▶│ reports · summary ·     │  (funciones puras)
              └──────────────┬────────────┘ usa   │ movements · merge       │
                             ▼                     └────────────┬────────────┘
              ┌───────── store/Store ─────────┐                 │
              │ estado en memoria + commit()  │                 ▼
              └──────────────┬────────────────┘      ┌── models/ · config/ · utils/ ──┐
                             ▼                       │ esquema, constantes, fechas,   │  Modelo y utilidades
              ┌──── repositories/ ────┐              │ formato                        │
              │ StateRepository       │              └────────────────────────────────┘
              │ ├ LocalStorage (hoy)  │
              │ ├ Memory (pruebas)    │   ← aquí se enchufará SupabaseRepository
              │ └ (Supabase, futuro)  │
              └───────────────────────┘
```

Reglas:

1. `domain/`, `models/`, `config/` y `utils/` **no conocen** el DOM, el navegador ni el almacenamiento.
2. `services/` modifican el estado y piden persistir a través del `Store`; no tocan el DOM.
3. `store/Store` es el **único** que habla con un repositorio.
4. `ui/` lee el estado con funciones de `domain/` y **modifica solo mediante servicios** (a través de `ui/actions.js`).
5. `repositories/` no conoce nada de la aplicación: guarda y devuelve un documento JSON.
6. `migration/` es una herramienta aparte (no la usa la app): verifica integridad y transforma al modelo relacional.

## Módulos

| Carpeta / archivo | Responsabilidad |
|---|---|
| `config/constants.js` | Clave de almacenamiento, tipos de tarjeta, paleta, valores por defecto (categorías, grupos, fuentes, tarjetas). Solo datos. |
| `utils/dates.js` | Fechas como texto local (`YYYY-MM-DD`, `YYYY-MM`) y **reloj inyectable** (`setClock`) para poder probar. |
| `utils/format.js` | Formato de dinero (`$1.234,50`), lectura de números escritos por la persona, escape de HTML. |
| `utils/math.js`, `id.js`, `object.js` | `sum`, `r2` (centavos), `uid`, `clone`. |
| `models/schema.js` | Forma del estado, valores por defecto, **migración de versiones**, hidratación, formato del respaldo (`buildBackup`, `parseBackup`). |
| `domain/installments.js` | Expande compras en **cuotas** (derivadas, no persistidas) y estadísticas por tarjeta. |
| `domain/cash.js` | Plata disponible, compromisos con tarjetas, días de trabajo, ingreso fijo. |
| `domain/reports.js` | Gastos e ingresos por mes (base *cuota* o *compra completa*), agrupación, acumulados. |
| `domain/movements.js` | Lista unificada de movimientos con filtros, búsqueda y efecto en la plata. |
| `domain/summary.js` | Cifras de las pantallas: `homeSummary`, `monthSummary`, `cardDebts`. |
| `domain/installmentCalc.js` | Regla de captura: total ↔ cuota. |
| `domain/merge.js` | Combinación de dos estados. **Reservado** para una futura sincronización (la app no lo invoca). |
| `repositories/StateRepository.js` | **Contrato** de persistencia (ver más abajo). |
| `repositories/LocalStorageRepository.js` | Implementación actual. Si lo guardado está dañado deja copia en `<clave>.corrupto`. |
| `repositories/MemoryRepository.js` | Implementación en memoria para pruebas. |
| `store/Store.js` | Estado de trabajo + `commit()`, `batch()`, `replace()`. |
| `services/LedgerService.js` | Altas/bajas de movimientos y compras; pago y deshacer de cuotas. |
| `services/CatalogService.js` | Tarjetas, categorías, grupos, fuentes, ingresos fijos, plantillas, días libres, saldo inicial, borrado total. |
| `services/BackupService.js` | Exportar, validar y restaurar respaldos. |
| `services/SampleDataService.js` | Datos de ejemplo (sintéticos, marcados `sample:true`). |
| `ui/ctx.js` | Contexto compartido: servicios, estado de navegación (`view`) y estado efímero (`ui`). |
| `ui/dom.js`, `ui/app.js` | Referencias al DOM, hoja inferior, `render()` según la pestaña. |
| `ui/widgets.js`, `ui/icons.js` | Piezas reutilizables: encabezado, selector de mes, pestañas, filas, listas agrupadas. |
| `ui/views/*` | Pantallas y hojas: `home`, `list`, `analysis`, `cards`, `details`, `addForm`, `settings`, `backup`. |
| `ui/actions.js` | Una acción por botón (`data-act="..."`): valida lo escrito, llama a un servicio y vuelve a dibujar. |
| `ui/events.js` | Registra los eventos del documento y los delega en las acciones. |
| `ui/moneyMask.js` | Máscara de miles al escribir montos. |
| `main.js` | Raíz de composición: crea repositorio → Store → servicios → UI. |
| `migration/` | `checkIntegrity`, `summarizeState`, `toRelational`, `tableToCsv` (herramientas, ver MIGRACION.md). |

## Patrones aplicados

- **Repository** (`StateRepository` y sus implementaciones): aísla dónde se guardan los datos.
- **Capa de servicios** (`services/`): casos de uso que encapsulan las modificaciones del estado.
- **Command** (`ui/actions.js`): cada acción de la interfaz es una función con nombre; `events.js` solo las despacha.
- **Raíz de composición / inyección de dependencias manual** (`main.js`): los servicios reciben el `Store`; el `Store` recibe el repositorio.
- **Funciones puras** en `domain/`: reciben el estado y devuelven datos; se prueban sin DOM.

SOLID donde tiene sentido: *responsabilidad única* (cada módulo una tarea), *abierto/cerrado* y *sustitución de Liskov*
(un nuevo repositorio reemplaza al actual sin tocar el resto), *inversión de dependencias* (`Store` depende del contrato, no
de `localStorage`). No se aplicó más abstracción de la necesaria (no hay contenedor de dependencias ni framework).

## Flujo de datos

**Arranque** (`main.js`):

1. `new LocalStorageRepository()` → `new Store(repository)` → `await store.load()` (lee, **hidrata y migra** el esquema).
2. Se crean los servicios y se guardan en `ctx`.
3. `bindEvents()` registra los eventos y `startUi()` dibuja la pantalla (y la configuración inicial si es la primera vez).

**Una acción** (por ejemplo, guardar un gasto):

```
clic en "Guardar" → events.onClick → actions.savetx
   → valida lo escrito (mensajes de error en pantalla)
   → ctx.store.batch(() => ledger.addTransaction(...); saveTemplateIf(...))
        → LedgerService modifica store.state y llama store.commit()
        → Store: marca updatedAt y repository.save(state)   (una sola vez por batch)
   → render() → vistas leen store.state con funciones de domain/ y escriben HTML
```

**Lectura**: las vistas llaman `S()` (estado actual) y funciones de `domain/` (`cash`, `cuotas`, `homeSummary`…). Nada en
`domain/` se guarda: las **cuotas, la plata disponible, los compromisos y las metas se calculan siempre** a partir de los datos persistidos.

## El contrato de persistencia

```js
class StateRepository {
  async load()            // → objeto persistido o null
  async save(state)       // persiste el estado completo
  async clear()
  get supportsSync()      // false en repositorios locales
  getSyncStatus()         // 'off' | 'connecting' | 'pending' | 'ok' | 'error'
  async syncNow()
}
```

El `Store` hidrata (`hydrateState`) lo que devuelve `load()` y entrega a `save()` el documento completo. Un repositorio
remoto debe cumplir ese contrato; si sincroniza, sobrescribe `supportsSync`, `getSyncStatus` y `syncNow`. La interfaz
muestra el estado de sincronización que informe el repositorio (hoy: "Solo en este dispositivo").
Ver [MIGRACION.md](MIGRACION.md).

## Empaquetado

`scripts/build.mjs` (sin dependencias) concatena los módulos de `src/` en orden de dependencias, quita `import`/`export` y
lo inserta con el CSS en `dist/index.html`. Exige que los imports sean de una línea (`import { a, b } from './x.js';`) y
que los nombres de nivel superior sean únicos en todo el proyecto (el motor de JavaScript falla si se repiten, y el build lo
verifica compilando el resultado). Se verificó que el paquete produce **exactamente el mismo HTML** que los módulos (ver PRUEBAS.md).

Si más adelante se incorpora una librería externa (p. ej. `@supabase/supabase-js`), habrá que ampliar el empaquetador o adoptar un
empaquetador estándar (ver MIGRACION.md, sección de riesgos).

## Estado de la refactorización y deuda técnica

Hecho: separación de capas, repositorio, servicios, reglas financieras puras y probadas, empaquetado y pruebas.

Pendiente o mejorable (no se hizo para no alterar el comportamiento ni inventar reglas):

- Las vistas siguen **construyendo HTML como texto** (`innerHTML`) con funciones auxiliares, igual que el original. Se escapa todo texto de usuario con `esc()`. Pasar a componentes reales sería un rediseño interno que no se emprendió.
- Algunas agregaciones de presentación aún viven en las vistas (p. ej. promedio por día, serie de 6 meses, mayores gastos en `analysis.js`). Las reglas financieras centrales ya están en `domain/`.
- `ui/ctx.js` es un contexto global compartido (simple y suficiente para esta escala).
- `domain/merge.js` y `StateRepository.syncNow` están preparados para la futura sincronización y no se usan hoy.
- No hay edición de movimientos existentes (la aplicación original tampoco la tenía).
