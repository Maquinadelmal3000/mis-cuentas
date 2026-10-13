# Respaldo, preservación e integridad de los datos

Objetivo: **no perder ni un movimiento** al pasar de la aplicación original (entorno de Claude) a este proyecto y, más adelante, a PostgreSQL.

> **Importante:** quien preparó este proyecto **no tuvo acceso a tus datos reales** y no los incluyó en ningún archivo. Todas las
> pruebas usaron datos sintéticos. Tú debes generar el respaldo desde tu aplicación original, como se explica abajo.

## 1. Dónde están hoy tus datos

La aplicación original guarda todo en **un solo documento** en el navegador del dispositivo donde la uses (`localStorage`, clave `mis-cuentas-v2`).
La versión publicada en Claude, además, **sincroniza ese documento con tu cuenta de Claude** (almacenamiento privado del artefacto), de modo que
varios dispositivos con tu sesión ven lo mismo. Esa copia no se puede leer desde fuera de Claude: **la forma de sacarla es el respaldo de la propia app**.

## 2. Generar el respaldo desde la aplicación original

Haz esto en el dispositivo donde tengas los datos **más recientes**.

1. Abre la app original con tu sesión de Claude iniciada y espera a que bajo "Hoy" diga **Sincronizado** (así se asegura de traer lo último de tu cuenta). Si dice "Solo en este dispositivo", los datos son los de ese navegador.
2. Toca ⚙ **Ajustes** → **Datos** → **Respaldo**.
3. Toca **Descargar archivo de respaldo**. Se guarda `mis-cuentas-respaldo-AAAA-MM-DD.json`. (En el iPhone se abre el menú de compartir: elige *Guardar en Archivos* o Drive.)
4. Si no puedes descargar archivos: abre **Respaldo como texto**, copia todo el texto y pégalo en un archivo `.json`.
5. **Guarda ese archivo en al menos dos lugares** (por ejemplo, Drive y tu computadora) antes de seguir.
6. No uses "Borrar todo" ni "Restaurar" en la app original mientras no hayas verificado el respaldo.

Si tienes datos en **varios dispositivos o navegadores distintos sin sincronizar** (cada uno mostraba "Solo en este dispositivo"), genera un respaldo de cada uno y revisa cuál tiene más información (paso 3 de la sección 4).

## 3. Cargar el respaldo en este proyecto

1. Ejecuta la app (`npm start`, o abre `dist/index.html`). Si es la primera vez, te pedirá el saldo inicial: puedes poner 0, el respaldo lo reemplaza.
2. ⚙ **Ajustes** → **Datos** → **Respaldo** → **Cargar desde un archivo** → elige tu `.json`.
3. Verás cuántos movimientos y compras trae. Toca **Reemplazar mis datos** dos veces para confirmar.
4. La app **conserva los identificadores** (ids) de todos los registros y migra el esquema si el respaldo es de una versión anterior.

El formato del respaldo no cambió: `{ "app": "mis-cuentas", "version": 1, "exportedAt": "...", "state": { ... } }`. También se acepta el estado solo, sin sobre.

## 4. Verificaciones (sin modificar nada)

### 4.1. Verificar el archivo antes de cargarlo

```bash
node scripts/verify-backup.mjs mis-cuentas-respaldo-AAAA-MM-DD.json
```

Muestra: conteos y totales (movimientos, ingresos, gastos, compras, cuotas pagadas/pendientes, tarjetas, plantillas, ingresos fijos, categorías),
las cifras que calculan las reglas con la fecha de hoy (plata de hoy, comprometido, cuotas pendientes), una **huella SHA-256** del contenido y los
hallazgos de integridad. Termina con código de salida 1 si hay errores. Anota estos números.

Hallazgos que reconoce (`src/migration/integrity.js`): ids repetidos, tipos o montos inválidos, fechas mal formadas, compras con tarjeta inexistente
(`warning`: la app las muestra como "Tarjeta eliminada"), pagos de cuotas inexistentes, mes de primera cuota inválido, grupos que no existen y registros de ejemplo.

### 4.2. Verificar después de cargarlo

1. En la app nueva, descarga un respaldo nuevo (Respaldo → Descargar) y ejecuta `verify-backup` sobre él.
2. Compara con las cifras de 4.1: **deben coincidir** conteos, totales y cuotas pagadas/pendientes. Las cifras "de hoy" pueden variar solo si cambió el día.
3. Compara las huellas SHA-256: si el contenido es idéntico, coinciden (la huella ignora `updatedAt`).
4. Revisa a mano en pantalla: plata de hoy, deuda por tarjeta (Análisis → Deudas) y el último mes de movimientos.

### 4.3. Qué comprobar siempre

- [ ] Cantidad de movimientos y de compras iguales.
- [ ] Suma de ingresos y de gastos al contado iguales.
- [ ] Cuotas pagadas y pendientes iguales (cantidad y monto).
- [ ] Tarjetas, categorías, grupos, fuentes, ingresos fijos y plantillas iguales.
- [ ] Sin registros `sample` que no quieras conservar.

## 5. Preparar la migración a PostgreSQL (sin tocar nada)

```bash
node scripts/export-relational.mjs mis-cuentas-respaldo-AAAA-MM-DD.json salida/
```

Escribe en `salida/`: `tables.json`, un CSV por tabla y `reporte.txt` con la **conciliación**: para cada total, el valor del estado de la app y el de las
tablas generadas (`OK` / `DIFERENCIA`), más advertencias de transformación (p. ej., tarjetas eliminadas que se migran como archivadas). Termina con código 1 si
hay diferencias o errores. Detalle en [MIGRACION.md](MIGRACION.md) y [MODELO_DATOS.md](MODELO_DATOS.md).

## 6. Estrategia de preservación

- **Nunca borres el original** hasta haber operado un tiempo con la versión nueva y comprobado que coinciden.
- Conserva **varias copias** del archivo de respaldo (fecha en el nombre). Un respaldo por semana es razonable.
- El respaldo es **texto plano** con tus datos financieros: guárdalo en un lugar privado.
- La app no guarda el respaldo por sí sola ni lo sube a ningún sitio.
- Los datos locales viven **por navegador y por dirección**: `localhost:5173`, `dist/index.html` abierto como archivo y el sitio publicado son tres almacenes distintos. Usa el respaldo para moverlos entre ellos.
- Si borras los datos del navegador (o desinstalas), se pierden los datos locales: por eso el respaldo.
- **Datos dañados:** si lo guardado en el navegador no se puede leer, la app arranca vacía **pero conserva el texto original** en `localStorage['mis-cuentas-v2.corrupto']` (consulta con las herramientas del navegador) hasta que lo recuperes.
- Si al guardar el navegador se queda sin espacio, el error solo aparece en la consola (igual que el original): haz respaldos con regularidad.

## 7. Riesgos de pérdida de información que se identificaron

| Riesgo | Mitigación |
|---|---|
| "Restaurar" y "Borrar todo" reemplazan todos los datos | Confirmación con doble toque; respaldo previo. |
| Abrir la app en otro navegador/dirección parece "perder" datos | Cada almacén es independiente; usar el respaldo. |
| Dos copias con datos distintos (sin sincronización) | Generar respaldo de cada una y comparar con `verify-backup` antes de elegir o combinar (`src/domain/merge.js` ofrece una combinación por id, **no está conectada a la interfaz**). |
| Tarjeta eliminada con compras | Las compras se conservan y se muestran como "Tarjeta eliminada"; el migrador crea una tarjeta archivada. |
| Redondeo | Los montos se guardan con 2 decimales; la conciliación compara totales redondeados. |
| Ids fijos de tarjetas por defecto (`c-papa`, `c-mia`) | Se conservan; en PostgreSQL la clave es `(user_id, id)`. |
