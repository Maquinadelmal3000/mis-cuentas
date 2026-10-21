# Proyección de ahorro — Real + proyectado

## Funcionamiento

- Pestaña **Ahorro** y acceso desde **Hoy**.
- Muestra 6 meses por pantalla; permite avanzar/retroceder 6 meses.
- Selección libre de meses y total acumulado **de resultados mensuales**, no ahorro real depositado.
- **Cerrados**: ingresos y gastos al contado registrados + cuotas correspondientes a ese mes, sin considerar la compra total de la tarjeta como gasto adicional. La cifra refleja el registro contable, no el saldo real de cuentas.
- **Mes actual**: ingresos = mayor entre ingresos ya registrados e ingresos fijos configurados; gastos variables = mayor entre gastos al contado registrados y el presupuesto variable; cuotas previstas del mes se suman una sola vez.
- **Futuros**: ingresos fijos configurados + ingreso extraordinario proyectado; gastos = promedio variable + cuotas del mes + gasto extraordinario proyectado.
- Promedio variable: (gastos al contado de los últimos tres meses completos) / 3. No incluye cuotas porque estas se suman según el calendario real de compras.
- Ajustes por mes: presupuesto variable opcional, ingreso extraordinario y gasto extraordinario. No generan movimientos contables.
- Si faltan datos históricos o ingresos fijos, la interfaz muestra una advertencia. No se inventan importes.

## Requisito de despliegue

**ANTES de publicar** ejecutar en Supabase SQL Editor `docs/sql/002_savings_plan.sql`. Si no se aplica, la escritura de user_settings fallará al sincronizar.

## Limitaciones de esta versión

- La pantalla no incluye todavía metas de ahorro ni saldo inicial acumulado.
- Los ajustes mensuales y selección se guardan en `user_settings.savings_plan` (JSONB) y viajan en respaldos.
- Los gastos que se hayan registrado dos veces en la app (p. ej., como gasto al contado y compra con tarjeta) se reflejarán duplicados. La app no puede deducir que son el mismo pago.
- Los meses cerrados con movimientos incompletos no se pueden reconstruir automáticamente.
- Offline-first completo sigue pendiente; los guardados remotos requieren conectividad.
