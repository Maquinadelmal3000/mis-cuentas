/** Hojas de detalle: nueva tarjeta, detalle de tarjeta, cuotas por mes, compra y movimiento. */
import { KINDS } from '../../config/constants.js';
import { cardName, cardOf, catOf, pLabel } from '../../domain/accessors.js';
import { cardStats, cuotas } from '../../domain/installments.js';
import { S, ui, view } from '../ctx.js';
import { openSheet } from '../dom.js';
import { ICON } from '../icons.js';
import { cuotaRow } from '../widgets.js';
import { dayLong, dayShort, monthName } from '../../utils/dates.js';
import { esc, fmt } from '../../utils/format.js';
import { sum } from '../../utils/math.js';

export function openNewCard(){
  openSheet(`<h2>Agregar tarjeta</h2>
  <div class="field" style="margin-top:0"><label for="cname">Nombre</label><input class="inp" id="cname" maxlength="30" placeholder="Ej. Visa del banco"></div>
  <div class="field"><div class="lab">Tipo</div><div class="chips">${Object.entries(KINDS).map(([k,n])=>`<button class="chip" aria-pressed="${ui.newKind===k}" data-act="kind" data-id="${k}">${n}</button>`).join('')}</div>
  <div class="hint">Con “Tarjeta de papá” ves cuánto le debes devolver.</div></div>
  <div class="err" id="cerr" role="alert"></div>
  <div class="actions"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-act="addcard">Agregar</button></div>`);
}

export function openCardDetail(id){
  const cd=cardOf(S(),id);if(!cd)return;ui.sheetCtx=null;
  const ps=S().purchases.filter(p=>p.cardId===id),cs=cuotas(S()).filter(c=>c.p.cardId===id),s=cardStats(S(),id,view.ym);
  const ms=new Set();ps.forEach(p=>ms.add(p.date.slice(0,7)));cs.forEach(c=>ms.add(c.due));
  const list=[...ms].sort();
  const pp=ps.map(p=>{const ex=cs.filter(c=>c.p.id===p.id),pe=ex.filter(c=>!c.paid);return {p,left:sum(pe.map(c=>c.amount)),paidN:ex.length-pe.length,pendN:pe.length};}).filter(x=>x.pendN>0).sort((a,b)=>b.left-a.left);
  const debtSec=pp.length?`<section style="margin-top:18px"><h2>Compras con deuda</h2><div class="panel">${pp.map(x=>`<button class="row" data-act="dpur" data-id="${x.p.id}"><span class="ico out">${ICON.card}</span><div class="main"><div class="t">${esc(pLabel(x.p))}</div><div class="s">${x.paidN}/${x.p.n} cuotas pagadas · ${esc(dayShort(x.p.date))}</div><div class="bar"><i style="width:${x.paidN/x.p.n*100}%"></i></div></div><div style="text-align:right"><div class="amt neg">${fmt(x.left)}</div><div style="font-size:12px;color:var(--muted)">por pagar</div></div></button>`).join('')}</div></section>`:'';
  let h=`<h2>${esc(cd.name)}</h2><div class="panel">
    <div class="row"><div class="main"><div class="t">Gastado en total</div><div class="s">${ps.length} compra${ps.length===1?'':'s'}</div></div><div class="amt neg">${fmt(s.spentTotal)}</div></div>
    <div class="row"><div class="main"><div class="t">Ya pagado</div></div><div class="amt neg">${fmt(s.paidTotal)}</div></div>
    <div class="row"><div class="main"><div class="t">${cd.kind==='papa'?'Por devolver a papá':'Falta por pagar'}</div></div><div class="amt neg">${fmt(s.pending)}</div></div></div>
  ${debtSec}<section style="margin-top:18px"><h2>Mes a mes</h2><div class="panel">`;
  if(!list.length)h+=`<div class="empty">Esta tarjeta aún no tiene compras.</div>`;
  list.forEach(m=>{
    const sp=sum(ps.filter(p=>p.date.startsWith(m)).map(p=>p.total)),du=sum(cs.filter(c=>c.due===m).map(c=>c.amount));
    h+=`<div class="row"><div class="main"><div class="t" style="text-transform:capitalize">${esc(monthName(m))}</div><div class="s">Gastado ${fmt(sp)}</div></div><div style="text-align:right"><div class="amt neg">${fmt(du)}</div><div style="font-size:12px;color:var(--muted)">cuotas</div></div></div>`;
  });
  h+=`</div></section><div class="actions stack"><button class="btn danger" data-act="delcard" data-id="${id}">Quitar tarjeta</button><button class="btn alt" data-act="close">Cerrar</button></div>`;
  openSheet(h);
}

export function openDueList(title,list){
  let h=`<h2 style="text-transform:capitalize">${esc(title)}</h2><div class="panel">`;
  if(!list.length)h+=`<div class="empty">No hay cuotas.</div>`;
  list.sort((a,b)=>a.due.localeCompare(b.due)).forEach(c=>h+=cuotaRow(c));
  h+=`</div><div class="actions"><button class="btn alt" data-act="close">Cerrar</button></div>`;
  openSheet(h);
}

export function openPurchase(id){
  const p=S().purchases.find(x=>x.id===id);if(!p)return;
  ui.sheetCtx={type:'pur',id};
  const cs=cuotas(S()).filter(c=>c.p.id===id);
  openSheet(`<h2>${esc(pLabel(p))}</h2><div class="panel">
  <div class="row"><div class="main"><div class="s">Total de la compra</div></div><div class="amt neg">${fmt(p.total)}</div></div>
  <div class="row"><div class="main"><div class="s">Tarjeta</div></div><div>${esc(cardName(S(),p.cardId))}</div></div>
  <div class="row"><div class="main"><div class="s">Día de la compra</div></div><div>${esc(dayLong(p.date))}</div></div>
  <div class="row"><div class="main"><div class="s">Primera cuota</div></div><div style="text-transform:capitalize">${esc(monthName(p.first))}</div></div>
  <div class="row"><div class="main"><div class="s">Categoría</div></div><div>${esc(catOf(p))}</div></div></div>
  <section style="margin-top:18px"><h2>Cuotas</h2><div class="panel">${cs.map(cuotaRow).join('')}</div></section>
  <div class="actions stack"><button class="btn danger" data-act="delpur" data-id="${p.id}">Eliminar compra</button><button class="btn alt" data-act="close">Cerrar</button></div>`);
}

export function openTx(id){
  const t=S().tx.find(x=>x.id===id);if(!t)return;
  openSheet(`<h2>${esc(t.cat)}</h2><div class="panel">
  <div class="row"><div class="main"><div class="s">Monto</div></div><div class="amt ${t.type==='in'?'pos':'neg'}">${t.type==='in'?'+':'-'}${fmt(t.amount)}</div></div>
  <div class="row"><div class="main"><div class="s">Fecha</div></div><div>${esc(dayLong(t.date))}</div></div>
  <div class="row"><div class="main"><div class="s">Tipo</div></div><div>${t.type==='in'?'Ingreso':'Gasto al contado'}</div></div>
  ${t.note?`<div class="row"><div class="main"><div class="s">Nota</div></div><div>${esc(t.note)}</div></div>`:''}</div>
  <div class="actions stack"><button class="btn danger" data-act="deltx" data-id="${t.id}">Eliminar</button><button class="btn alt" data-act="close">Cerrar</button></div>`);
}
