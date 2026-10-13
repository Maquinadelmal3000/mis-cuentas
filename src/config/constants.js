/**
 * Constantes de configuración y valores por defecto de la aplicación.
 * No contiene lógica: solo datos que otras capas leen.
 */

/** Clave de almacenamiento local. Es la misma que usaba la versión original, para no perder datos locales. */
export const STORAGE_KEY = 'mis-cuentas-v2';

/** Versión del esquema de datos persistidos (ver models/schema.js → migrateState). */
export const SCHEMA_VERSION = 5;

/** Tipos de tarjeta. 'papa' = tarjeta prestada: sus cuotas se "devuelven" a quien la presta. */
export const KINDS = { credito: 'Tarjeta de crédito', papa: 'Tarjeta de papá' };

export const PALETTE = ['#5B6CFF', '#14A3A3', '#F5B301', '#E5624D', '#8A5CD6', '#2FA36B', '#D9488B', '#7A8599', '#C9A227', '#3D8BD9'];

/** Nombres de los días de la semana; el índice coincide con Date#getDay (0 = domingo). */
export const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Etiqueta para compras con tarjeta sin categoría. */
export const SINCAT = 'Sin categoría';

export const DEFAULT_CATEGORY_GROUPS = {
  'Comida en la calle': 'Comida', 'Comida en casa': 'Comida',
  'Gasolina': 'Moto', 'Mantenimiento': 'Moto', 'Seguro y papeles': 'Moto',
  'Peluquería': 'Personal', 'Ropa': 'Personal', 'Salud': 'Personal',
  'Salidas': 'Ocio', 'Juegos': 'Ocio', 'Suscripciones': 'Ocio', 'Regalos': 'Ocio',
  'Renta': 'Hogar', 'Servicios': 'Hogar', 'Celular e internet': 'Hogar'
};

export const DEFAULT_SOURCES = ['Uber', 'Trabajo', 'Otro'];

export const DEFAULT_CATEGORIES = [
  'Comida en la calle', 'Comida en casa', 'Gasolina', 'Mantenimiento', 'Seguro y papeles', 'Transporte',
  'Peluquería', 'Salidas', 'Juegos', 'Ropa', 'Salud', 'Celular e internet', 'Suscripciones', 'Renta',
  'Servicios', 'Compras', 'Regalos', 'Otro'
];

export const DEFAULT_GROUPS = ['Comida', 'Moto', 'Personal', 'Ocio', 'Hogar'];

export const DEFAULT_CARDS = [
  { id: 'c-papa', name: 'Tarjeta de papá', kind: 'papa' },
  { id: 'c-mia', name: 'Mi tarjeta', kind: 'credito' }
];

/** Días libres por defecto (0 = domingo). */
export const DEFAULT_OFF_DAYS = [0];

/** Renombres de categorías de versiones anteriores del esquema (migración a ver 5). */
export const LEGACY_CATEGORY_RENAMES = {
  'Moto: gasolina': 'Gasolina',
  'Moto: mantenimiento': 'Mantenimiento',
  'Moto: seguro y papeles': 'Seguro y papeles',
  'Mantenimiento del auto': 'Mantenimiento'
};
