/** Piezas de interfaz reutilizables: encabezado, selector de mes, pestañas, filas de movimientos y listas agrupadas. */
import { cardName, pLabel } from '../domain/accessors.js';
import { isManual } from '../domain/installments.js';
import { listMovements } from '../domain/movements.js';
import { S, syncStatus, view } from './ctx.js';
import { ICON } from './icons.js';
import { addDays, dayLong, dayShort, monthName, monthOnly, todayS } from '../utils/dates.js';
import { cap, esc, fmt } from '../utils/format.js';

export const kindColor=k=>'var(--k-'+k+')';

export const head=(t,sub,extra)=>`<header class="head"><div><h1>${esc(t)}</h1>${sub?`<div class="sub">${esc(sub)}</div>`:''}${extra||''}</div><button class="iconbtn" data-act="settings" aria-label="Ajustes">${ICON.set}</button></header>`;

export const pill=()=>`<div class="pill"><button data-act="prev" aria-label="Mes anterior">‹</button><span>${esc(cap(monthName(view.ym)))}</span><button data-act="next" aria-label="Mes siguiente">›</button></div>`;

export const tabsHtml=(cur,items,act)=>`<div class="tabs" role="tablist">${items.map(([id,n])=>`<button role="tab" aria-selected="${cur===id}" data-act="${act}" data-id="${id}">${n}</button>`).join('')}</div>`;

export const dayLabel=s=>{const T=todayS();return s===T?'Hoy':(s===addDays(T,-1)?'Ayer':cap(dayLong(s)));};

export const signed=n=>(n>=0?'+':'-')+fmt(Math.abs(n));

export const sumLine=(i,o)=>`<div class="sumline"><span><b class="pos">+${fmt(i)}</b> entró</span><span><b class="neg">-${fmt(o)}</b> salió</span></div>`;

export function txRow(t){
  const inn=t.type==='in';
  return `<button class="row" data-act="dtx" data-id="${t.id}"><span class="ico ${inn?'in':'out'}">${inn?ICON.down:ICON.up}</span>
  <div class="main"><div class="t">${esc(t.cat)}</div><div class="s">${t.note?esc(t.note)+' · ':''}${inn?'Ingreso':'Al contado'}</div></div>
  <div class="amt ${inn?'pos':'neg'}">${inn?'+':'-'}${fmt(t.amount)}</div></button>`;
}

export function payRow(c){
  return `<button class="row" data-act="dpur" data-id="${c.p.id}"><span class="ico out">${ICON.check}</span>
  <div class="main"><div class="t">Pago de cuota ${c.i+1}/${c.p.n}</div><div class="s">${esc(cardName(S(),c.p.cardId))} · ${esc(pLabel(c.p))}</div></div>
  <div class="amt neg">-${fmt(c.amount)}</div></button>`;
}

export function purRow(p){
  return `<button class="row" data-act="dpur" data-id="${p.id}"><span class="ico out">${ICON.card}</span>
  <div class="main"><div class="t">${esc(pLabel(p))}</div><div class="s">${esc(cardName(S(),p.cardId))} · ${p.n} cuota${p.n>1?'s':''} de ${fmt(p.inst)}</div></div>
  <div class="amt neg">${fmt(p.total)}</div></button>`;
}

export function cuotaRow(c){
  const manual=isManual(S());
  const status=c.paid?'pagada el '+dayShort(c.paid):(c.done?'pagada por calendario':'cuota de '+monthOnly(c.due));
  return `<div class="row"><span class="ico out">${c.done?ICON.check:ICON.card}</span>
  <div class="main"><div class="t">${esc(pLabel(c.p))} · cuota ${c.i+1}/${c.p.n}</div>
  <div class="s">${esc(cardName(S(),c.p.cardId))} · ${esc(status)}</div></div>
  <div class="amt neg"${c.done?' style="opacity:.6"':''}>${fmt(c.amount)}</div>
  ${manual?`<button class="btn sm ${c.paid?'alt':''}" data-act="${c.paid?'unpay':'pay'}" data-id="${c.p.id}" data-i="${c.i}">${c.paid?'Deshacer':'Pagar'}</button>`:''}</div>`;
}

export function groupedList(items,withHeaders){
  if(!items.length)return '';
  if(!withHeaders)return `<div class="panel">${items.map(i=>i.html).join('')}</div>`;
  const nets={};items.forEach(i=>nets[i.date]=(nets[i.date]||0)+i.net);
  let h='',cur='';
  items.forEach(it=>{
    if(it.date!==cur){if(cur)h+=`</div>`;cur=it.date;const n=nets[it.date];
      h+=`<div class="day"><span>${esc(dayLabel(it.date))}</span>${n?`<span class="amt ${n>0?'pos':'neg'}">${signed(n)}</span>`:''}</div><div class="panel">`;}
    h+=it.html;
  });
  return h+`</div>`;
}

/** Etiqueta del estado de sincronización (el repositorio local siempre informa 'off'). */
export const syncLabel=()=>({off:'Solo en este dispositivo',connecting:'Conectando…',pending:'Guardando…',ok:'Sincronizado',error:'Sin conexión con el servidor'})[syncStatus()]||'';

/** Movimientos del dominio con su fila HTML lista para mostrar. */
export function movementItems(prefix,filter,q){
  return listMovements(S(),prefix,filter,q).map(it=>Object.assign({},it,{html:it.kind==='tx'?txRow(it.ref):(it.kind==='purchase'?purRow(it.ref):payRow(it.ref))}));
}

