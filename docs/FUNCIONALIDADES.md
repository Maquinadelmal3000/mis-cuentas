# Inventario de funcionalidades

Lista de todo lo que hace la aplicación, levantada leyendo el código de la versión original y confirmada contra la versión
refactorizada (62 pasos de un guion en navegador real producen exactamente el mismo HTML; ver PRUEBAS.md).
Entre paréntesis, el módulo principal.

## Navegación general

- Barra inferior con **Hoy**, **Movimientos**, **Análisis** y **Tarjetas**, y un botón **+** central para registrar (`index.html`, `ui/events.js`).
- Acceso a **Ajustes** (⚙) desde el encabezado de cada pantalla.
- Selector de mes (‹ ›) en las pantallas que trabajan por mes; subpestañas en Análisis y Tarjetas.
- **Hojas inferiores** (bottom sheets) para formularios y detalles, con botones fijos al pie (`ui/dom.js`).
- **Tema claro y oscuro**: automático según la preferencia del sistema (`prefers-color-scheme`). El CSS también admite `data-theme="light|dark"`, pero **no hay un selector manual** en la interfaz.
- Diseño para teléfono (ancho máximo 560 px, centrado en pantallas grandes), con márgenes de seguridad para pantallas con muesca.

## Configuración inicial

- Primera apertura: pide el **saldo inicial** (plata que tienes hoy) (`ui/views/settings.js → openSetup`, `CatalogService.startApp`).

## Hoy (`ui/views/home.js`, `domain/summary.js`)

- **Plata que tienes hoy**; lo que **entró** y lo que **salió** hoy.
- **Meta diaria de ingresos** con barra de progreso, calculada con los **días de trabajo** que quedan del mes (configurables). Aviso cuando la plata ya cubre las cuotas del mes.
- **Tarjetas del mes**: a pagar, cobertura (qué parte de lo que debes cubre tu plata), pagado vs total del mes, atrasos de meses anteriores, deuda por tarjeta, "con tu ingreso fijo te quedaría" y "te quedaría libre".
- **Movimientos del día o del mes** con totales de entrada/salida, y navegación a Tarjetas.
- Indicador del estado de sincronización (hoy: "Solo en este dispositivo").

## Registrar (`ui/views/addForm.js`, `ui/actions.js`, `LedgerService`)

- **Ingreso**, **gasto al contado** y **compra con tarjeta**, con fecha (pasada, de hoy o futura) y nota.
- Monto grande con **máscara de miles** mientras se escribe (punto de miles, coma decimal); acepta también el punto como decimal.
- **Categoría en lista desplegable** agrupada por grupos; **fuente** para ingresos.
- Compra con tarjeta: elegir **tarjeta**, **número de cuotas** (botones − / + y atajos 1, 3, 6, 12, 24; 1–60), **total y valor de cuota que se calculan entre sí** según cuál escribas (la cuota puede incluir intereses), **mes de la primera cuota** (por defecto el siguiente a la compra), **categoría opcional** ("Sin categoría").
- **Plantillas**: usar una (rellena el formulario), **guardar como plantilla** al registrar, o crear una nueva en Ajustes (monto opcional).
- Validaciones con mensajes (monto, fecha, tarjeta, total/cuota).

## Movimientos (`ui/views/list.js`, `domain/movements.js`)

- Historial del mes con **búsqueda** (nota, categoría, tarjeta) y **filtros**: todos, ingresos, gastos al contado, tarjetas.
- Agrupado por día ("Hoy", "Ayer"…), con el efecto neto del día en la plata.
- Muestra ingresos, gastos, compras con tarjeta y **pagos de cuotas**. Detalle de cada movimiento y **eliminación** con confirmación (doble toque).

## Análisis (`ui/views/analysis.js`, `domain/reports.js`)

- **Cómo contar las compras con tarjeta**: por *cuotas del mes* (lo que te toca pagar) o *compra completa* (en el mes en que se hizo).
- **Resumen**: resultado del mes, ingresos vs gastos, composición de gastos (contado y tarjeta), % de ingresos que se va en cuotas, datos útiles (promedio y mejor día, categoría que más pesa).
- **Categorías**: gráfico circular + ranking con barras y porcentajes; **por categoría o por grupo**; gastos o ingresos. Al tocar una fila: total del mes, acumulado hasta hoy, **últimos 6 meses** y movimientos; para un grupo, sus categorías.
- **Evolución**: ingresos por día con **línea de promedio**, últimos 6 meses (ingresos vs gastos) con variación contra el mes anterior, mayores gastos del mes.
- **Deudas**: deuda total en cuotas con reparto por tarjeta; por tarjeta: pagado vs total, cuotas pendientes, cuotas del mes, próxima cuota y mes en que termina la deuda.

## Tarjetas (`ui/views/cards.js`, `details.js`)

- **Resumen**: cuotas del mes con progreso, "te quedaría" con ingreso fijo (verde/rojo), una ficha por tarjeta (gastado en el mes, cuotas del mes, gastado en total, deuda), **pagar hasta el mes** (con confirmación) y **agregar tarjeta** (de crédito o "de papá").
- **Meses**: 12 meses con cuotas y, si hay ingreso fijo, "te queda" (verde/rojo); **filtro por tarjeta**; fila de meses anteriores sin pagar; al tocar un mes, sus cuotas con **Pagar / Deshacer**.
- **Compras**: lista con progreso de pago, **filtro por tarjeta**.
- **Detalle de tarjeta**: gastado en total, pagado, falta por pagar (o "por devolver a papá"), compras con deuda, mes a mes, **quitar tarjeta** (con confirmación).
- **Detalle de compra**: total, tarjeta, día, primera cuota, categoría, todas sus cuotas con Pagar/Deshacer y **eliminar compra** (con confirmación).
- **Tarjeta de papá**: tipo especial; se muestra "por devolver a papá" y se incluye en la deuda.

## Ajustes (`ui/views/settings.js`, `CatalogService`)

Secciones plegables:

- **Mi plata**: saldo inicial y **días libres** (no cuentan para la meta).
- **Ingresos**: fuentes de ingreso (agregar/quitar) e **ingresos fijos mensuales** (fuente, monto, mes desde el que rige).
- **Gastos**: **grupos** y **categorías** (agregar, quitar y asignar el grupo de cada una).
- **Plantillas**: lista, nueva y quitar.
- **Datos**: estado de sincronización, **datos de ejemplo** (cargar/quitar), **respaldo** y **borrar todo** (doble confirmación).

## Respaldo (`ui/views/backup.js`, `BackupService`)

- **Descargar archivo de respaldo** (JSON).
- **Cargar desde un archivo** (selector de archivos): muestra cuántos movimientos y compras trae y pide confirmar con doble toque antes de **reemplazar** los datos.
- **Respaldo como texto** (copiar/pegar) y **restaurar desde texto**.
- El respaldo acepta tanto el formato con sobre (`{app, version, exportedAt, state}`) como el estado sin sobre.

## Datos y reglas transversales

- Guardado automático en cada cambio (`localStorage`, clave `mis-cuentas-v2`).
- **Migración de versiones** del esquema (renombra categorías antiguas, agrega categorías y grupos nuevos).
- **Datos de ejemplo** marcados y excluidos de la plata disponible.
- Formato numérico `$1.234,56`; lectura tolerante de montos escritos (`1.234,56`, `1234,56`, `1234.56`, `1.500`).
- Fechas y meses en español (`toLocaleDateString('es')`).

## Qué NO existe (igual que en la versión original)

- Editar un movimiento o una compra existente (solo eliminar y volver a crear).
- Selector manual de tema, inicio de sesión, varios usuarios.
- Funcionamiento sin conexión como PWA (no hay service worker).

## Qué se quitó o cambió al independizar la app de Claude

| Original (entorno de Claude) | Ahora |
|---|---|
| Sincronización automática con la cuenta de Claude (`window.claude`: base de datos, usuario) | **Eliminada.** El indicador de estado se alimenta del repositorio; el local informa "Solo en este dispositivo". Quedó el contrato para un repositorio con sincronización (ver MIGRACION.md). |
| Descarga del respaldo con el servicio de descargas de Claude (en el original publicado) | Descarga normal del navegador (un enlace con el archivo). En la copia independiente del original ya se usaba ese mismo mecanismo. |
| Texto de Ajustes → Datos sobre "tu cuenta" / "abrir con tu cuenta de Claude" | Reemplazado por textos sobre este dispositivo. |
| Código sin uso: función `monthBar` (ya no se llamaba), rama de cambio de "Cuenta desde" (el campo se quitó en una versión anterior), bandera `syncedOnce` | No se migró. El campo `setup.start` sigue en los datos para no perder información, pero no se usa. |
| `localStorage`: clave `mis-cuentas-v2` | **Igual** (permite reutilizar datos locales de la misma clave). |

Añadido (sin alterar reglas de negocio): si lo guardado en `localStorage` está dañado, se conserva una copia en `mis-cuentas-v2.corrupto` antes de que la app empiece de cero.
