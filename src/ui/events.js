/** Eventos del documento. */
import { actions } from './actions.js';
import { render } from './app.js';
import { S, ctx, ui, view } from './ctx.js';
import { closeSheet } from './dom.js';
import { MASKED, maskMoney } from './moneyMask.js';
import { defFirst, openAdd, readDraft, renderAdd, syncCalc } from './views/addForm.js';
import { handleBackupFile } from './views/backup.js';
import { listBoxHtml } from './views/list.js';
import { todayS } from '../utils/dates.js';
import { num } from '../utils/format.js';

/** Entrada del usuario: registra los eventos del documento y los delega en las acciones. */

function onInput(e){
  const id=e.target.id;
  if(MASKED.indexOf(id)>-1)maskMoney(e.target,e);
  if(id==='q'){view.q=e.target.value;const bx=document.getElementById('listbox');if(bx)bx.innerHTML=listBoxHtml();return;}
  if(!ui.draft||ui.draft.mode!=='card'||!['f-amt','f-n','f-inst'].includes(id))return;
  const d=ui.draft,g=x=>document.getElementById(x);
  if(id==='f-amt')d.src='total';
  if(id==='f-inst')d.src='inst';
  d.n=Math.max(1,Math.min(60,parseInt(g('f-n').value)||1));
  d.amount=g('f-amt').value;d.inst=g('f-inst').value;
  syncCalc();
  if(id!=='f-amt')g('f-amt').value=d.amount;
  if(id!=='f-inst')g('f-inst').value=d.inst;
}

function onChange(e){
  const id=e.target.id,s=e.target.dataset&&e.target.dataset.set;
  if(id==='bk-file'){handleBackupFile(e.target);return;}
  if(ui.draft){
    if(id==='f-first'){ui.draft.firstManual=true;ui.draft.first=e.target.value;return;}
    if(id==='f-date'&&ui.draft.mode==='card'&&!ui.draft.firstManual){readDraft();ui.draft.first=defFirst(ui.draft.date);renderAdd();return;}
  }
  if(e.target.dataset&&e.target.dataset.setgroup!==undefined){ctx.catalog.setCategoryGroup(parseInt(e.target.dataset.setgroup),e.target.value);return;}
  if(!s)return;
  if(s==='open')ctx.catalog.setOpening(num(e.target.value));
  render();
}

function onClick(e){
  const b=e.target.closest('[data-act]');if(!b)return;
  const fn=actions[b.dataset.act];
  if(fn)fn({b,id:b.dataset.id,T:todayS()});
}

export function bindEvents(){
  document.getElementById('scrim').addEventListener('click',()=>{if(S().setup.done){ui.sheetCtx=null;closeSheet();}});
  document.getElementById('fab').addEventListener('click',()=>{ui.sheetCtx=null;openAdd(view.tab==='cards'?'card':'out');});
  document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(!b)return;view.tab=b.dataset.tab;ui.armPay=null;render();window.scrollTo(0,0);});
  document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('acc')&&d.dataset.sec)view.sopen[d.dataset.sec]=d.open;},true);
  document.addEventListener('input',onInput);
  document.addEventListener('change',onChange);
  document.addEventListener('click',onClick);
}

