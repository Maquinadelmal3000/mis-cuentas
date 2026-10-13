# Modelo de datos

Documenta cómo guarda la aplicación sus datos **hoy** (un único documento JSON) y propone un modelo relacional para
PostgreSQL. Lo descrito como "hoy" sale del código (`src/models/schema.js`, `src/domain/*`, `src/services/*`); la propuesta
PostgreSQL es **solo una propuesta: no se ejecutó contra ningún servidor** (ver al final).

## 1. Estado actual: un documento JSON

Todo el estado es un objeto, guardado completo en `localStorage` (clave `mis-cuentas-v2`) en cada cambio.

| Campo | Tipo | Descripción |
|---|---|---|
| `ver` | entero | Versión del esquema. Actual: **5**. Si es menor, `migrateState` lo actualiza al cargar. |
| `updatedAt` | entero (ms desde 1970), opcional | Marca de la última modificación (la pone el `Store`). No se exporta en el respaldo. |
| `setup` | objeto | `done` (bool), `opening` (saldo inicial, número), `start` (fecha o `null`; **heredado, ya no se usa**). |
| `off` | entero[] | Días libres de la semana (0 = domingo … 6 = sábado). |
| `sources` | texto[] | Fuentes de ingreso (p. ej. Uber, Trabajo). Siempre queda al menos una. |
| `cats` | texto[] | Categorías de gasto. Siempre queda al menos una. |
| `groups` | texto[] | Grupos de categorías (p. ej. Moto, Ocio). Pueden quedar vacíos. |
| `catGroups` | objeto `{categoría → grupo}` | Grupo de cada categoría. |
| `fixed` | lista de **IngresoFijo** | Ingresos que se repiten cada mes. |
| `templates` | lista de **Plantilla** | Movimientos frecuentes. |
| `cards` | lista de **Tarjeta** | Tarjetas. |
| `tx` | lista de **Movimiento** | Ingresos y gastos **al contado**. |
| `purchases` | lista de **Compra** | Compras con tarjeta en cuotas. |

### Entidades

**Movimiento** (`tx[]`) — un ingreso o un gasto al contado (efectivo/débito).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | Identificador (ver "Identificadores"). |
| `type` | `'in'` \| `'out'` | Ingreso o gasto. |
| `cat` | texto | Fuente (si `in`) o categoría (si `out`) **por nombre**; no es una referencia. |
| `amount` | número > 0 | Redondeado a 2 decimales. |
| `date` | `YYYY-MM-DD` | Fecha del movimiento (puede ser pasada o futura). |
| `note` | texto | Puede ser vacío. |
| `sample` | bool, opcional | `true` en datos de ejemplo. |

**Compra** (`purchases[]`) — una compra con tarjeta en `n` cuotas.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | |
| `cardId` | texto | Referencia a `cards[].id` (puede quedar huérfana, ver reglas). |
| `cat` | texto | Categoría por nombre; `''` = sin categoría. |
| `total` | número > 0 | Valor de la compra. |
| `n` | entero 1–60 | Número de cuotas. |
| `inst` | número > 0 | Valor de **cada** cuota (puede incluir intereses: no tiene por qué ser `total / n`). |
| `date` | `YYYY-MM-DD` | Día de la compra. |
| `note` | texto | |
| `first` | `YYYY-MM` | Mes de la primera cuota. |
| `paid` | objeto `{índice → fecha de pago}` | Cuotas pagadas. Índice 0 = primera cuota. |
| `sample` | bool, opcional | |

**Cuota** — **derivada, no se guarda**. Para cada compra y cada `i` de 0 a `n-1`:
`vence = first + i meses`, `monto = inst`, `pagada = paid[i]` (o ninguna). Función: `domain/installments.js → cuotas()`.

**Tarjeta** (`cards[]`): `id`, `name`, `kind` (`'credito'` | `'papa'`). `'papa'` es una tarjeta prestada: sus cuotas se "devuelven" a quien la presta. Por defecto existen `c-papa` ("Tarjeta de papá") y `c-mia` ("Mi tarjeta").

**IngresoFijo** (`fixed[]`): `id`, `name` (nombre de una fuente), `amount` > 0, `from` (`YYYY-MM`, primer mes en que rige).

**Plantilla** (`templates[]`): `id`, `name`, `mode` (`'in'` | `'out'` | `'card'`), `cat`, `amount` (**texto** tal como se escribió, p. ej. `"1.500"`; puede ser vacío), `note`, `cardId` (o `null`), `n`, `inst` (texto), `src` (`'total'` | `'inst'`: cuál de los dos valores escribió la persona).

### Identificadores

- Los `id` se generan con `uid()`: marca de tiempo en base 36 + 4 caracteres aleatorios (p. ej. `mv2cdxc0gies`). Son únicos **para un usuario**, no globalmente.
- Las tarjetas por defecto usan ids fijos (`c-papa`, `c-mia`), **iguales para todos los usuarios**.
- Consecuencia para PostgreSQL: la clave primaria debe ser `(user_id, id)` con `id` de tipo texto, para conservar los identificadores actuales.

### Relaciones

```
Tarjeta 1 ──< Compra 1 ──< Cuota (derivada) ── 0..1 Pago (paid[i])
Movimiento  (sin relaciones; categoría/fuente por nombre)
Categoría >── 0..1 Grupo        (catGroups)
IngresoFijo ── fuente por nombre
Plantilla   ── tarjeta por id (opcional), categoría por nombre
```

### Datos persistidos y datos calculados

| Persistido | Calculado (nunca se guarda) |
|---|---|
| movimientos, compras (con sus pagos), tarjetas, categorías, grupos, fuentes, ingresos fijos, plantillas, saldo inicial, días libres | **cuotas**, plata disponible, compromisos, libre, meta diaria, "te queda", gastos por categoría/grupo, deuda por tarjeta, totales y gráficos |

## 2. Reglas de negocio (idénticas a la versión original)

Verificadas contra la aplicación original (ver PRUEBAS.md). "Hoy" = la fecha local del dispositivo.

1. **Plata disponible** = `saldo inicial + Σ ingresos − Σ gastos al contado − Σ cuotas pagadas`.
   - Cuenta **todos** los movimientos sin importar su fecha (también los de fechas pasadas registrados después), **excepto**: los de fecha **futura** (cuentan cuando llega el día) y los marcados `sample`.
   - Una cuota pagada resta de la plata **en la fecha de pago** (no en la de vencimiento).
   - **Una compra con tarjeta no afecta la plata** hasta que se paga cada cuota.
2. **Plata al empezar el día** = lo mismo pero excluyendo lo de hoy.
3. **Comprometido hasta el mes M** = `Σ monto de cuotas sin pagar con vencimiento ≤ M` (incluye meses anteriores atrasados). Una cuota pagada **hoy** cuenta como pendiente al empezar el día.
4. **Libre** = `plata disponible − comprometido (mes actual)`.
5. **Meta diaria**: `faltante = max(0, comprometido al empezar el día − plata al empezar el día)`; `días de trabajo` = días desde hoy hasta fin de mes que no son días libres; `meta = faltante / días` (si no quedan días de trabajo, la meta es el faltante completo). Si `faltante = 0` no hay meta.
6. **Ingreso fijo del mes M** = `Σ amount` de los ingresos fijos con `from ≤ M`. **"Te quedaría"** = `ingreso fijo del mes − Σ cuotas del mes` (pagadas o no).
7. **Gastos de un mes** (para análisis), según la base elegida: *cuota* = gastos al contado + cuotas que vencen ese mes; *compra completa* = gastos al contado + compras hechas ese mes por su total. Las compras sin categoría se agrupan como "Sin categoría".
8. **Total ↔ cuota** al registrar: si la persona escribió el total, `cuota = total / n`; si escribió la cuota, `total = cuota × n`. Cada campo vacío se calcula; ambos se guardan.
9. **Primera cuota por defecto**: el mes siguiente al de la compra (editable).
10. **Grupo de una categoría**: el asignado si existe en `groups`; si no, la categoría cuenta como su propio grupo.

### Restricciones de integridad que aplica la aplicación

- `amount`, `total`, `inst` > 0; `n` entero entre 1 y 60; fechas válidas.
- `sources` y `cats` conservan siempre al menos un elemento; al quitar un grupo se desasignan sus categorías; al quitar una categoría se borra su asignación de grupo.
- Eliminar una **compra** elimina con ella todas sus cuotas y pagos (están incluidos en la compra).
- Eliminar una **tarjeta** **no** elimina sus compras: quedan con `cardId` huérfano y la app las muestra como "Tarjeta eliminada".
- Renombrar o quitar una categoría **no** cambia los movimientos ya registrados (guardan el nombre como texto).
- Se puede pagar/deshacer una cuota individual; "Pagar hasta el mes M" paga todas las pendientes de una tarjeta hasta ese mes.

## 3. Propuesta PostgreSQL (preliminar, no ejecutada)

Principios: clave primaria `(user_id, id)` para **conservar los ids actuales**; `numeric(14,2)` para dinero; meses como `date` (primer día del mes);
`user_id` en todas las tablas para autenticación y varios dispositivos; seguridad por filas (RLS). Los nombres de columnas
coinciden con lo que produce `scripts/export-relational.mjs`, de modo que su salida (CSV/JSON) se carga directamente.

```sql
-- Compatible con PostgreSQL 15+ (las claves foráneas con "on delete set null (columna)" lo requieren).
-- Pensado para Supabase: auth.users existe. Para PostgreSQL sin Supabase, reemplazar auth.users por una tabla propia.

create table user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  schema_version  int           not null default 5,
  setup_done      boolean       not null default false,
  opening_balance numeric(14,2) not null default 0,
  setup_start     date,                                   -- heredado; la app ya no lo usa
  off_days        smallint[]    not null default '{0}',   -- 0 = domingo
  app_updated_at  timestamptz,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create table income_sources (
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  position int  not null default 0,
  primary key (user_id, name)
);

create table expense_groups (
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  position int  not null default 0,
  primary key (user_id, name)
);

create table categories (
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  group_name text,
  primary key (user_id, name),
  foreign key (user_id, group_name) references expense_groups (user_id, name)
    on update cascade on delete set null (group_name)
);

create table cards (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  name       text not null,
  kind       text not null check (kind in ('credito', 'papa')),
  archived   boolean not null default false,   -- sustituye al borrado físico: permite conservar el historial
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table fixed_incomes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  name       text not null,
  amount     numeric(14,2) not null check (amount > 0),
  from_month date not null check (extract(day from from_month) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table templates (
  user_id            uuid not null references auth.users(id) on delete cascade,
  id                 text not null,
  name               text not null,
  mode               text not null check (mode in ('in', 'out', 'card')),
  category           text,
  amount             numeric(14,2),
  note               text not null default '',
  card_id            text,                               -- sin FK: la plantilla puede apuntar a una tarjeta ya eliminada
  installments       smallint not null default 1 check (installments between 1 and 60),
  installment_amount numeric(14,2),
  source_field       text not null default 'total' check (source_field in ('total', 'inst')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, id)
);

create table transactions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  type        text not null check (type in ('in', 'out')),
  category    text not null,                             -- nombre (fuente o categoría); sin FK a propósito (ver reglas)
  amount      numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  note        text not null default '',
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index on transactions (user_id, occurred_on);

create table purchases (
  user_id            uuid not null references auth.users(id) on delete cascade,
  id                 text not null,
  card_id            text not null,
  category           text,                               -- null = sin categoría
  total              numeric(14,2) not null check (total > 0),
  installments       smallint not null check (installments between 1 and 60),
  installment_amount numeric(14,2) not null check (installment_amount > 0),
  purchased_on       date not null,
  note               text not null default '',
  first_due_month    date not null check (extract(day from first_due_month) = 1),
  is_sample          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, card_id) references cards (user_id, id)
);
create index on purchases (user_id, purchased_on);

create table installment_payments (
  user_id           uuid not null,
  purchase_id       text not null,
  installment_index smallint not null check (installment_index >= 0),
  paid_on           date not null,
  primary key (user_id, purchase_id, installment_index),
  foreign key (user_id, purchase_id) references purchases (user_id, id) on delete cascade
);
-- Regla no expresable como CHECK: installment_index < purchases.installments (hacer cumplir con un trigger o en la capa de servicio).

-- Las cuotas siguen siendo derivadas: una vista las expande como lo hace domain/installments.js
create view v_installments as
select p.user_id, p.id as purchase_id, g.i as installment_index,
       (p.first_due_month + make_interval(months => g.i))::date as due_month,
       p.installment_amount as amount, pay.paid_on
from purchases p
cross join lateral generate_series(0, p.installments - 1) as g(i)
left join installment_payments pay
  on pay.user_id = p.user_id and pay.purchase_id = p.id and pay.installment_index = g.i;

-- Seguridad por filas (repetir para cada tabla)
alter table transactions enable row level security;
create policy "solo mis filas" on transactions
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### Decisiones y alternativas

| Tema | Decisión propuesta | Motivo / alternativa |
|---|---|---|
| Tarjeta eliminada | `archived = true` en lugar de borrar | Mantiene la clave foránea de las compras y el historial. Hoy la app borra la tarjeta y deja compras huérfanas ("Tarjeta eliminada"); el migrador crea una tarjeta archivada con ese nombre para cada huérfana. Requiere cambiar el servicio `removeCard` cuando se migre. |
| Categorías en movimientos | Texto, sin clave foránea | La app permite quitar/renombrar categorías sin tocar el historial. Una FK lo impediría. Alternativa futura: tabla con `id` y renombrado en cascada (cambia el comportamiento). |
| Cuotas | Vista derivada + tabla de pagos | Evita duplicar datos y mantiene las reglas actuales. Alternativa: materializar la tabla `installments` (más rápida de consultar, exige mantenerla coherente). |
| Montos de plantillas | `numeric` (se convierte desde el texto) | En el documento son texto escrito por la persona. |
| Sincronización entre dispositivos | `updated_at` por fila y, si hace falta, `deleted_at` | La app actual guarda un documento completo con `updatedAt` global. Ver MIGRACION.md. |
| Datos de ejemplo | Columna `is_sample` | Conserva el comportamiento (no afectan la plata). Se pueden excluir al migrar. |

### Límites de esta propuesta

- **No se ejecutó** en PostgreSQL (no había un servidor disponible en el entorno de trabajo): hay que probarla y ajustarla.
- La transformación del respaldo a estas tablas (`src/migration/toRelational.js`) **sí** se probó, pero solo hasta producir CSV/JSON; la carga a la base no se realizó.
- El modelo no define aún funciones SQL para plata disponible, compromisos o meta diaria: hoy se calculan en `src/domain/`.
