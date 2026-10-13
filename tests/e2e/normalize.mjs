/**
 * Normaliza el HTML capturado para poder compararlo con el de la aplicación original.
 * Solo se neutralizan los textos que cambiaron A PROPÓSITO al independizar la app de la plataforma de Claude:
 *   - el bloque de estado de sincronización de Ajustes → Datos,
 *   - la leyenda de "Borrar todo",
 *   - la etiqueta transitoria "Conectando…" del primer dibujado.
 */
export function normalize(html) {
  return html
    .replace(/data-st="connecting"/g, 'data-st="off"').replace(/Conectando…/g, 'Solo en este dispositivo')
    .replace(/<div class="line" style="border-top:0;padding-top:0"><span>Sincronización[\s\S]*?(?=<div class="chips" style="margin-top:14px">)/g, '[[BLOQUE-SYNC]]')
    .replace('“Borrar todo” también borra lo guardado en tu cuenta.', '“Borrar todo” elimina todos los datos guardados en este dispositivo.');
}

export function sortKeys(o) {
  if (Array.isArray(o)) return o.map(sortKeys);
  if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).sort().map(k => [k, sortKeys(o[k])]));
  return o;
}
