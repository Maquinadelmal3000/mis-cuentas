# Mis cuentas

Aplicación web para llevar tus ingresos, gastos y compras en cuotas con tarjeta. Pensada para quien cobra día a día
(por ejemplo, con Uber) y además tiene un sueldo fijo: muestra cuánta plata tienes hoy, cuánto debes pagar de tarjetas
este mes y cuánto necesitas ganar por día para cubrirlo.

Este proyecto es la versión **independiente** de la aplicación que se desarrolló dentro del entorno de Claude: mismo diseño,
mismas funciones y mismas reglas de cálculo, pero organizada como proyecto de código, sin depender de ningún servicio de
esa plataforma. Los datos se guardan, por ahora, en el navegador (localStorage).

## Qué hace

- **Hoy:** plata actual, lo que entró y salió hoy, meta diaria de ingresos, tarjetas del mes (a pagar, cobertura, por tarjeta) y movimientos del día o del mes.
- **Movimientos:** historial por mes con búsqueda y filtros (ingresos, gastos al contado, tarjetas).
- **Registrar:** ingresos, gastos al contado y compras con tarjeta en cuotas (el total y la cuota se calculan entre sí), con plantillas para movimientos frecuentes.
- **Análisis:** resumen del mes, categorías y grupos (gráfico y ranking), evolución y deudas por tarjeta.
- **Tarjetas:** cuotas por mes, ingreso fijo y "cuánto te queda", pago de cuotas, detalle por tarjeta (incluida la "tarjeta de papá").
- **Ajustes:** saldo inicial, días libres, fuentes de ingreso, ingresos fijos, categorías y grupos, plantillas, datos de ejemplo, respaldo y borrado.
- **Respaldo:** exportar/importar todo en un archivo JSON.

Inventario completo: [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).

## Tecnologías

| Qué | Con qué |
|---|---|
| Interfaz | HTML + CSS + JavaScript nativo (módulos ES). Sin framework. |
| Persistencia | `localStorage` detrás de una interfaz (patrón Repository), lista para cambiar a Supabase. |
| Herramientas de desarrollo | Node.js ≥ 18 (probado con Node 22). Solo para servidor local, empaquetado y pruebas. |
| Dependencias | **Ninguna** (ni de ejecución ni de desarrollo). El servidor, el empaquetador y las pruebas usan solo Node. |
| Fuentes | Google Fonts (Bricolage Grotesque y Figtree) cargadas desde internet. Sin conexión se usa una tipografía de reemplazo y todo funciona igual. |

Pruebas opcionales en navegador real: `puppeteer-core` + Chrome/Chromium (no se instalan por defecto; ver [docs/PRUEBAS.md](docs/PRUEBAS.md)).

## Estructura

```
index.html                  Página (marcado base de la navegación)
manifest.webmanifest        Manifiesto PWA (sin service worker)
icons/                      Iconos
src/
  main.js                   Punto de entrada y raíz de composición
  config/                   Constantes y valores por defecto
  utils/                    Fechas, formato, matemática, ids
  models/                   Esquema del estado, migración de versiones, formato de respaldo
  domain/                   Reglas financieras (funciones puras sobre el estado)
  repositories/             Contrato de persistencia + localStorage + memoria
  store/                    Estado en memoria; el único que habla con el repositorio
  services/                 Casos de uso (movimientos, catálogo, respaldo, datos de ejemplo)
  migration/                Verificación de integridad y exportación al modelo relacional
  ui/                       Interfaz: vistas, componentes, acciones y eventos
  styles/main.css           Estilos
scripts/                    Servidor local, empaquetador, verificación y exportación de respaldos
tests/                      Pruebas unitarias, de interfaz, del empaquetado y extremo a extremo (opcional)
docs/                       Documentación técnica
```

Detalle de capas y responsabilidades: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Instalación

No hay nada que instalar: no existen dependencias. Solo necesitas **Node.js 18 o superior** para el servidor local, el
empaquetado y las pruebas.

```bash
node --version      # debe ser v18 o mayor
```

## Ejecutar en local

```bash
npm start
# → http://localhost:5173
```

Los módulos ES **no funcionan abriendo `index.html` con doble clic** (el navegador bloquea los módulos desde `file://`).
Para abrir la app sin servidor, genera la versión de producción (más abajo) y abre `dist/index.html`.

El puerto se cambia con la variable `PORT` (`PORT=8080 npm start`).

## Generar la versión de producción

```bash
npm run build
```

Crea `dist/` con:

- `index.html`: **un solo archivo** con el CSS y el JavaScript incluidos (funciona con doble clic y en cualquier hosting estático).
- `manifest.webmanifest` e `icons/`.

Para revisarla por HTTP: `npm run preview`.

## Publicar (cuando llegue el momento)

Es un sitio 100 % estático. Estos pasos **no se probaron** desde el entorno donde se preparó el proyecto:

1. **GitHub:** crea un repositorio y sube el contenido de esta carpeta (el `.gitignore` ya excluye `dist/` y `node_modules/`).
2. **Cloudflare Pages:** conecta el repositorio con *Framework preset: None*, *Build command:* `npm run build`, *Build output directory:* `dist`. No requiere variables de entorno mientras los datos sean locales.
3. **Supabase:** se hará después. Ver [docs/MIGRACION.md](docs/MIGRACION.md). Cuando llegue ese momento, las claves van en variables de entorno o configuración de despliegue, nunca en el repositorio.

## Pruebas

```bash
npm test
```

Ejecuta 97 pruebas con el ejecutor de Node, sin instalar nada (reglas financieras, esquema y migración, servicios, repositorios,
migración a relacional, equivalencia con la app original, interfaz sobre un DOM simulado y empaquetado). Probado en Node 22. Detalle de lo probado y de lo
que quedó pendiente: [docs/PRUEBAS.md](docs/PRUEBAS.md).

## Datos y respaldo

- Los datos viven en `localStorage` bajo la clave `mis-cuentas-v2` **del navegador y del sitio donde abras la app**. Otro navegador, otro dispositivo u otra dirección empiezan vacíos.
- Para llevar tus datos desde la aplicación original: ⚙ Ajustes → Datos → Respaldo → *Descargar archivo de respaldo*, y cárgalo aquí con *Cargar desde un archivo*. Guía completa: [docs/RESPALDO_E_INTEGRIDAD.md](docs/RESPALDO_E_INTEGRIDAD.md).
- Verificar un respaldo sin modificarlo: `node scripts/verify-backup.mjs respaldo.json`.
- Preparar los datos para PostgreSQL: `node scripts/export-relational.mjs respaldo.json salida/`.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Capas, módulos, patrones y flujo de datos |
| [docs/MODELO_DATOS.md](docs/MODELO_DATOS.md) | Entidades, reglas de negocio y propuesta PostgreSQL |
| [docs/MIGRACION.md](docs/MIGRACION.md) | Guía técnica hacia Supabase |
| [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md) | Inventario de funciones |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Pruebas realizadas, resultados y pendientes |
| [docs/RESPALDO_E_INTEGRIDAD.md](docs/RESPALDO_E_INTEGRIDAD.md) | Exportar, preservar y restaurar datos |

## Limitaciones conocidas

- Sin sincronización entre dispositivos (la versión de Claude la tenía; aquí queda pendiente hasta integrar Supabase).
- Los movimientos y compras no se pueden **editar**, solo eliminar y volver a crear (igual que la versión original).
- No hay service worker: la app no funciona sin conexión en una instalación PWA (el archivo único `dist/index.html` sí funciona sin red, salvo las fuentes).
- Probada en Chromium de escritorio con una vista de teléfono. **No** se probó en dispositivos Android reales, tablets ni Windows con otros navegadores.

## Supabase (versión integrada)

Esta copia usa Supabase como persistencia principal en navegador real. La configuración pública está en `src/config/supabase.js`.
Al abrirla por primera vez solicita iniciar sesión o crear una cuenta. Las políticas RLS del esquema hacen que cada usuario solo vea sus filas.
`LocalStorageRepository` se conserva para pruebas y como implementación alternativa, pero producción usa `SupabaseRepository`.
