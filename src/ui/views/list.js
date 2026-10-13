/** Pantalla Movimientos: historial con búsqueda y filtros. */
import { view } from '../ctx.js';
import { $app } from '../dom.js';
import { ICON } from '../icons.js';
import { groupedList, head, movementItems, pill, sumLine } from '../widgets.js';
import { esc } from '../../utils/format.js';
import { sum } from '../../utils/math.js';

export function listBoxHtml(){
  const items=movementItems(view.ym,view.filter,view.q);
  if(!items.length)return `<div class="empty">${view.q?'Nada coincide con tu búsqueda.':'No hay movimientos este mes con este filtro.'}</div>`;
  return sumLine(sum(items.map(i=>i.inc)),sum(items.map(i=>i.out)))+groupedList(items,true);
}

export function renderList(){
  let h=head('Movimientos')+pill();
  h+=`<div class="search"><span class="si">${ICON.search}</span><input id="q" type="search" placeholder="Buscar por nota o categoría" value="${esc(view.q)}" aria-label="Buscar movimientos"></div>`;
  h+=`<div class="filters" role="group" aria-label="Filtrar">`;
  [['all','Todos'],['in','Ingresos'],['out','Gastos al contado'],['card','Tarjetas']].forEach(([id,n])=>h+=`<button class="chip" aria-pressed="${view.filter===id}" data-act="filter" data-id="${id}">${n}</button>`);
  h+=`</div><div id="listbox">${listBoxHtml()}</div>`;
  $app.innerHTML=h;
}
