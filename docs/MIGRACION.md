# Guía de migración hacia Supabase PostgreSQL

Estado de partida: la aplicación guarda **un documento JSON** en `localStorage` mediante `LocalStorageRepository`.
**Nada de Supabase está implementado** (ni claves, ni conexiones, ni una sincronización simulada). Esta guía describe
qué cambiar y en qué orden, para que otra persona pueda continuar.

## 1. Qué ya está preparado

- Persistencia aislada tras el contrato `StateRepository` (`src/repositories/StateRepository.js`) y usada solo por el `Store`.
- Servicios (`src/services/`) que modifican el estado y piden persistir: no hay `localStorage` fuera del repositorio.
- Interfaz que lee el estado de sincronización del repositorio (`getSyncStatus()`, `supportsSync`) y un botón "Sincronizar ahora" que solo aparece si el repositorio lo soporta.
- Respaldo JSON (`BackupService`) para sacar y meter datos sin depender del almacén.
- Esquema versionado (`ver`) con migraciones (`migrateState`).
- Herramientas de preparación: `scripts/verify-backup.mjs` y `scripts/export-relational.mjs` (+ `src/migration/`).
- `domain/merge.js`: combinación de dos estados por id, escrita para la futura sincronización (probada, no usada).

## 2. Dos caminos para el repositorio Supabase

| | A. Documento JSON | B. Tablas relacionales |
|---|---|---|
| Qué guarda | Una fila por usuario (`state jsonb`) | El modelo de `MODELO_DATOS.md` |
| Cambio en el código | Mínimo: una clase que lee/escribe el documento | Mayor: mapear estado ↔ filas en ambos sentidos (existe `toRelational`; **falta** la función inversa y su prueba) y guardar por filas |
| Varios dispositivos | Sí, con "gana el último" sobre todo el documento | Sí, con fusión por fila (más seguro) |
| Consultas SQL / informes | Limitadas | Completas |
| Riesgo | Dos dispositivos que editan a la vez pueden pisarse | Más trabajo y más pruebas |

El objetivo declarado es PostgreSQL relacional (**B**). A es un paso intermedio razonable para validar autenticación y
despliegue antes de invertir en B; ambos usan el mismo contrato `StateRepository`.

## 3. Cambios necesarios en el código

1. **`SupabaseRepository extends StateRepository`** (nuevo archivo en `src/repositories/`):
   - `load()` devuelve el documento (A) o lo reconstruye desde las tablas (B).
   - `save(state)` persiste (con *debounce* ~2,5 s y guardando solo lo que cambió, como hacía la versión de Claude).
   - `supportsSync = true`, `getSyncStatus()` (`connecting` | `pending` | `ok` | `error`) y `syncNow()`.
   - Política de conflictos: la versión de Claude usaba *gana el más reciente* por `updatedAt` del documento y, en la primera conexión de un dispositivo con datos propios, **combinaba** por id (`domain/merge.js`). Replicar o decidir otra.
2. **`main.js`**: elegir el repositorio (local o Supabase) según haya sesión y configuración.
3. **Autenticación**: Supabase Auth (enlace por correo o proveedor OAuth). Hoy no existe pantalla de inicio de sesión: hay que diseñarla (la app original no la necesitaba).
4. **Configuración**: URL y *anon key* del proyecto por variables de entorno del despliegue (Cloudflare Pages) → generar un archivo de configuración en el build. **No** commitear claves; la *service role key* nunca debe estar en el cliente.
5. **Librería cliente** (`@supabase/supabase-js`): ver riesgos (el empaquetador actual no resuelve paquetes npm).
6. **Seguridad por filas (RLS)** en todas las tablas con `user_id = auth.uid()` (ejemplo en MODELO_DATOS.md).
7. **Tarjeta eliminada**: si se adopta `archived`, cambiar `CatalogService.removeCard` para archivar en lugar de borrar (cambia un comportamiento visible solo en datos huérfanos).
8. **Eliminar la dependencia de la clave de almacenamiento local** solo cuando la migración esté verificada (hoy el repositorio local sigue existiendo como respaldo).

## 4. Migración de los datos existentes (no destructiva)

1. **Exportar** desde la app original (ver RESPALDO_E_INTEGRIDAD.md) → `respaldo.json`. Guárdalo en lugar seguro.
2. **Verificar**: `node scripts/verify-backup.mjs respaldo.json` → conteos, totales, cifras calculadas, huella SHA-256 y hallazgos de integridad. Resolver los `[error]`; leer los `[warning]`.
3. **Transformar**: `node scripts/export-relational.mjs respaldo.json salida/` → un CSV por tabla, `tables.json` y `reporte.txt` con la **conciliación** (conteos y totales del estado vs tablas). Debe decir `OK` en cada línea.
4. **Crear las tablas** con el DDL de MODELO_DATOS.md (revisado) en un proyecto Supabase de **pruebas**.
5. **Cargar** los CSV en este orden (por las claves foráneas): `user_settings`, `income_sources`, `expense_groups`, `categories`, `cards`, `fixed_incomes`, `templates`, `transactions`, `purchases`, `installment_payments`. La columna `user_id` viene vacía: asignar el `uuid` del usuario (por ejemplo, con una tabla temporal y `update`, o completando la columna antes de importar).
6. **Reconciliar en SQL** (ejemplos):
   ```sql
   select count(*) from transactions where user_id = :uid;                     -- = movimientos del reporte
   select type, sum(amount) from transactions where user_id = :uid group by type;   -- = incomeTotal / expenseTotal
   select count(*), sum(total) from purchases where user_id = :uid;            -- = purchases / purchasesTotal
   select count(*) filter (where paid_on is not null),
          sum(amount) filter (where paid_on is not null),
          sum(amount) filter (where paid_on is null)
   from v_installments where user_id = :uid;                                    -- = pagadas / monto pagado / monto pendiente
   ```
7. **Comparar cifras de la app**: con la fecha de hoy, la "plata de hoy" y la deuda en cuotas que muestra la app deben coincidir con las de `verify-backup`.
8. **No borrar** el almacenamiento local ni el respaldo hasta haber operado un tiempo con ambos coincidiendo.

## 5. Riesgos y problemas conocidos

| Riesgo | Detalle / mitigación |
|---|---|
| **Pérdida de datos por conflictos** | Con el documento completo y "gana el último", dos dispositivos pueden pisarse. Mitigar con fusión por id (`merge.js`) o pasar a filas (camino B). |
| **Ids no globales** | Los ids son únicos por usuario; las tarjetas por defecto comparten id entre usuarios. Usar `(user_id, id)` como clave (ya propuesto). |
| **Datos huérfanos** | Compras con tarjeta eliminada; categorías de movimientos que ya no existen en la lista; grupos inexistentes. `checkIntegrity` los informa. |
| **Datos de ejemplo mezclados** | Si el respaldo contiene registros `sample:true`, quitarlos antes de migrar o migrarlos con `is_sample = true`. |
| **Redondeo** | La app guarda números de JavaScript redondeados a 2 decimales; `numeric(14,2)` los representa sin error. Los totales del reporte de conciliación lo comprueban. |
| **Empaquetador sin npm** | `scripts/build.mjs` solo une módulos locales. Para usar `@supabase/supabase-js`: (a) cargarlo desde un `<script>` de CDN y usar la variable global, o (b) reemplazar el empaquetador por uno estándar (Vite/esbuild) — decisión pendiente. |
| **Fecha del dispositivo** | "Hoy" sale del reloj del dispositivo. En varios dispositivos con zonas horarias distintas, la plata "de hoy" puede diferir. |
| **localStorage lleno o bloqueado** | Un fallo al guardar solo se registra en la consola (igual que el original). Con Supabase habrá que mostrar el error al usuario. |
| **Fuentes de Google** | La app carga fuentes externas; con una política de seguridad estricta (CSP) habrá que permitirlas o alojarlas localmente. |

## 6. Pendientes antes de integrar Supabase

- [ ] Elegir el camino (A o B) y la política de conflictos.
- [ ] Crear proyecto Supabase de pruebas; ejecutar y corregir el DDL (no se probó).
- [ ] Diseñar la pantalla de inicio de sesión y qué ve un usuario sin sesión (¿modo local?).
- [ ] Decidir cómo incorporar `supabase-js` (CDN o empaquetador estándar).
- [ ] Implementar `SupabaseRepository` y sus pruebas contra el contrato (hay un ejemplo con `MemoryRepository` en `tests/unit/repositories.test.mjs`).
- [ ] Función inversa `fromRelational` si se elige el camino B.
- [ ] Ensayar la migración con el respaldo real en un proyecto de pruebas y reconciliar.
- [ ] Definir copias de seguridad y exportación periódica (el respaldo JSON se mantiene).
