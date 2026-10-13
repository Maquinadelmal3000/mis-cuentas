/** Dibujado principal: elige la pantalla según la navegación y refresca la hoja abierta. */
import { S, syncStatus, ui, view } from './ctx.js';
import { renderCats } from './views/analysis.js';
import { renderCards } from './views/cards.js';
import { openDueList, openPurchase } from './views/details.js';
import { renderHome } from './views/home.js';
import { renderList } from './views/list.js';
import { openSetup } from './views/settings.js';
import { syncLabel } from './widgets.js';

export function render(){
  document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===view.tab?'page':'false'));
  ({home:renderHome,list:renderList,cats:renderCats,cards:renderCards})[view.tab]();
}

export function refreshSheet(){
  if(!ui.sheetCtx)return;
  if(ui.sheetCtx.type==='pur')openPurchase(ui.sheetCtx.id);
  else if(ui.sheetCtx.type==='due')openDueList(ui.sheetCtx.title,ui.sheetCtx.fn());
}

/** Actualiza los indicadores de estado de sincronización visibles. */
export function refreshSyncUi(){
  document.querySelectorAll('[data-sync]').forEach(el=>{el.textContent=syncLabel();if(el.setAttribute)el.setAttribute('data-st',syncStatus());});
}

/** Primer dibujado: pantalla actual y, si es la primera vez, la configuración inicial. */
export function startUi(){
  render();
  if(!S().setup.done)openSetup();
}

