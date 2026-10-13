/** Formulario de registro de ingresos, gastos y compras con tarjeta (y de plantillas). */
import { SINCAT } from '../../config/constants.js';
import { cardOf } from '../../domain/accessors.js';
import { linkedAmounts } from '../../domain/installmentCalc.js';
import { S, ui } from '../ctx.js';
import { openSheet } from '../dom.js';
import { curYm, monthName, shiftYm, todayS } from '../../utils/dates.js';
import { cap, esc, fmt, num } from '../../utils/format.js';

export const defFirst=date=>shiftYm(date.slice(0,7),1);

export function openAdd(mode){
  ui.draft={mode:mode||'out',amount:'',cat:null,date:todayS(),note:'',cardId:null,n:1,inst:'',src:'total',first:null,firstManual:false,tpl:false,tname:'',tplOnly:false};
  ui.draft.first=defFirst(ui.draft.date);renderAdd();
  const fa=document.getElementById('f-amt');if(fa)fa.focus();
}

export function readDraft(){
  const g=id=>document.getElementById(id);if(!g('f-amt'))return;
  ui.draft.amount=g('f-amt').value;if(g('f-date'))ui.draft.date=g('f-date').value||ui.draft.date;ui.draft.note=g('f-note').value;
  if(g('f-tname'))ui.draft.tname=g('f-tname').value;
  if(g('f-cat'))ui.draft.cat=g('f-cat').value;
  if(g('f-n'))ui.draft.n=Math.max(1,Math.min(60,parseInt(g('f-n').value)||1));
  if(g('f-inst'))ui.draft.inst=g('f-inst').value;
  if(g('f-first'))ui.draft.first=g('f-first').value;
}

export function monthOptions(sel){
  const base=curYm(),arr=[];for(let i=-6;i<=24;i++)arr.push(shiftYm(base,i));
  if(!arr.includes(sel))arr.push(sel);arr.sort();
  return arr.map(m=>`<option value="${m}" ${m===sel?'selected':''}>${esc(cap(monthName(m)))}</option>`).join('');
}

export function catOptions(sel){
  const byG={},none=[];
  S().cats.forEach(c=>{const g=S().catGroups[c];if(g&&S().groups.includes(g))(byG[g]=byG[g]||[]).push(c);else none.push(c);});
  const o=c=>`<option value="${esc(c)}" ${sel===c?'selected':''}>${esc(c)}</option>`;
  return S().groups.filter(g=>byG[g]).map(g=>`<optgroup label="${esc(g)}">${byG[g].map(o).join('')}</optgroup>`).join('')+none.map(o).join('');
}

export function tplChips(){
  if(!S().templates.length)return '';
  return `<div style="font-size:14px;color:var(--muted);font-weight:600;margin:0 0 6px">Plantillas</div><div class="filters" style="margin-bottom:12px">${S().templates.map(t=>`<button class="chip" data-act="usetpl" data-id="${t.id}"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${t.mode==='in'?'var(--in)':'var(--out)'}"></span>${esc(t.name)}${t.amount&&num(t.amount)>0?' · '+fmt(num(t.amount)):''}</button>`).join('')}</div>`;
}

export function tplNameField(){
  return `<div class="field" style="margin-top:0;margin-bottom:12px"><label for="f-tname">Nombre de la plantilla</label><input class="inp" id="f-tname" maxlength="30" placeholder="Ej. Gasolina de la moto" value="${esc(ui.draft.tname)}"></div>`;
}

export function renderAdd(){
  const isCard=ui.draft.mode==='card',m=ui.draft.mode,list=m==='in'?S().sources:S().cats;
  if(isCard){if(ui.draft.cat===null||(ui.draft.cat!==''&&!list.includes(ui.draft.cat)))ui.draft.cat='';}
  else if(!list.includes(ui.draft.cat))ui.draft.cat=list[0];
  if(isCard&&!cardOf(S(),ui.draft.cardId)&&S().cards.length)ui.draft.cardId=S().cards[0].id;
  const tone=m==='in'?'in':'out';
  let h=`<h2>${ui.draft.tplOnly?'Nueva plantilla':'Nuevo movimiento'}</h2>${ui.draft.tplOnly?tplNameField():tplChips()}
  <div class="seg mode" data-m="${m}" role="group" aria-label="Tipo de movimiento">
    <button data-act="dmode" data-id="in" aria-pressed="${m==='in'}">Ingreso</button>
    <button data-act="dmode" data-id="out" aria-pressed="${m==='out'}">Gasto</button>
    <button data-act="dmode" data-id="card" aria-pressed="${isCard}">Con tarjeta</button></div>`;
  if(!isCard)h+=`<div class="amtbox ${tone}"><label for="f-amt">Monto</label><div class="amtin"><span>$</span><input id="f-amt" inputmode="decimal" placeholder="0.00" value="${esc(ui.draft.amount)}"></div></div>`;
  if(isCard){
    h+=`<div class="field"><div class="lab">Tarjeta</div><div class="chips">${S().cards.map(c=>`<button class="chip" aria-pressed="${ui.draft.cardId===c.id}" data-act="dcard" data-id="${c.id}">${esc(c.name)}</button>`).join('')||'<span class="hint">Primero agrega una tarjeta en la pestaña Tarjetas.</span>'}</div></div>
    <div class="field"><div class="lab">Cuotas (meses)</div>
      <div class="stepper"><button data-act="nstep" data-id="-1" aria-label="Menos cuotas">−</button><input id="f-n" inputmode="numeric" value="${ui.draft.n}" aria-label="Número de cuotas"><button data-act="nstep" data-id="1" aria-label="Más cuotas">+</button></div>
      <div class="chips" style="margin-top:8px">${[1,3,6,12,24].map(n=>`<button class="chip" aria-pressed="${ui.draft.n===n}" data-act="dn" data-id="${n}">${n}</button>`).join('')}</div></div>
    <div class="cols"><div class="amtbox out"><label for="f-amt">Total de la compra</label><div class="amtin sm"><span>$</span><input id="f-amt" inputmode="decimal" placeholder="0.00" value="${esc(ui.draft.amount)}"></div></div>
    <div class="amtbox out"><label for="f-inst">Valor de la cuota</label><div class="amtin sm"><span>$</span><input id="f-inst" inputmode="decimal" placeholder="0.00" value="${esc(ui.draft.inst)}"></div></div></div>
    <div class="hint">Escribe el total o la cuota: el otro valor se calcula solo. Si tu cuota tiene intereses, escribe la cuota.</div>`;
    if(!ui.draft.tplOnly)h+=`<div class="field"><label for="f-first">Mes de la primera cuota</label><select class="inp" id="f-first">${monthOptions(ui.draft.first)}</select></div>`;
  }
  h+=`<div class="field"><label for="f-cat">${m==='in'?'¿De dónde viene?':(isCard?'Categoría (opcional)':'Categoría')}</label>
    <select class="inp" id="f-cat">${isCard?`<option value="" ${ui.draft.cat===''?'selected':''}>${SINCAT}</option>`:''}${m==='in'?list.map(c=>`<option value="${esc(c)}" ${ui.draft.cat===c?'selected':''}>${esc(c)}</option>`).join(''):catOptions(ui.draft.cat)}</select></div>`;
  if(!ui.draft.tplOnly)h+=`<div class="field"><label for="f-date">${isCard?'Día de la compra':'Fecha'}</label><input class="inp" type="date" id="f-date" value="${esc(ui.draft.date)}"></div>`;
  h+=`<div class="field"><label for="f-note">Nota (opcional)</label><input class="inp" id="f-note" maxlength="60" placeholder="Ej. Tanque lleno" value="${esc(ui.draft.note)}"></div>`;
  if(ui.draft.tplOnly)h+=`<div class="hint">El monto es opcional: déjalo vacío si cambia cada vez.</div>`;
  else h+=`<div class="field"><button class="chip" data-act="dtpl" aria-pressed="${!!ui.draft.tpl}">Guardar como plantilla</button>${ui.draft.tpl?`<div style="margin-top:8px"><input class="inp" id="f-tname" maxlength="30" placeholder="Nombre de la plantilla" value="${esc(ui.draft.tname)}"></div>`:''}</div>`;
  h+=`<div class="err" id="ferr" role="alert"></div>
  <div class="actions"><button class="btn alt" data-act="${ui.draft.tplOnly?'closetpl':'close'}">Cancelar</button><button class="btn ${ui.draft.tplOnly?'':tone}" data-act="${ui.draft.tplOnly?'savetplonly':'savetx'}">${ui.draft.tplOnly?'Guardar plantilla':'Guardar'}</button></div>`;
  openSheet(h);
}

/** Calcula el campo que la persona no escribió (total ↔ cuota) según domain/installmentCalc.js. */
export function syncCalc(){
  const r=linkedAmounts({src:ui.draft.src,amount:ui.draft.amount,inst:ui.draft.inst,n:ui.draft.n});
  ui.draft.amount=r.amount;ui.draft.inst=r.inst;
}

