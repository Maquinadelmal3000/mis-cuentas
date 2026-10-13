/** Pantalla Tarjetas: resumen, meses y compras. */
import { KINDS } from '../../config/constants.js';
import { cardName, cardOf, pLabel } from '../../domain/accessors.js';
import { fixedFor } from '../../domain/cash.js';
import { cardStats, cuotas } from '../../domain/installments.js';
import { S, ui, view } from '../ctx.js';
import { $app } from '../dom.js';
import { ICON } from '../icons.js';
import { head, kindColor, pill, tabsHtml } from '../widgets.js';
import { curYm, dayShort, monthName, monthOnly, monthShort, shiftYm } from '../../utils/dates.js';
import { esc, fmt } from '../../utils/format.js';
import { sum } from '../../utils/math.js';

export function cardsSummary(all){
  const ym=view.ym,mc=all.filter(c=>c.due===ym),mTotal=sum(mc.map(c=>c.amount)),mPaid=sum(mc.filter(c=>c.paid).map(c=>c.amount));
  const pct=mTotal>0?mPaid/mTotal*100:0,fxm=fixedFor(S(),ym),leftm=fxm-mTotal;
  let h=pill();
  h+=`<div class="block"><div class="kv"><span>Cuotas de ${esc(monthOnly(ym))}</span><b class="big2 neg">${fmt(mTotal)}</b></div>
    <div class="gauge" role="img" aria-label="Cuotas pagadas del mes"><i class="n" style="width:${pct}%"></i></div>
    <div class="gnote">Pagado <b class="neg">${fmt(mPaid)}</b> · pendiente <b class="neg">${fmt(mTotal-mPaid)}</b></div></div>`;
  if(S().fixed.length)h+=`<div class="callout" style="border-left-color:${leftm>=0?'var(--in)':'var(--out)'}"><div class="s">Te quedaría en ${esc(monthOnly(ym))}</div><div class="v ${leftm>=0?'pos':'neg'}">${fmt(leftm)}</div><div class="s">Ingreso fijo ${fmt(fxm)} − cuotas ${fmt(mTotal)}</div></div>`;
  h+=`<div class="sh"><h2>Por tarjeta</h2></div>`;
  if(!S().cards.length)h+=`<div class="panel"><div class="empty">Agrega tu primera tarjeta.</div></div>`;
  S().cards.forEach(cd=>{
    const st=cardStats(S(),cd.id,ym);
    h+=`<div class="block card" style="--kc:${kindColor(cd.kind)};margin-top:12px">
      <button class="chead" data-act="cdet" data-id="${cd.id}"><span class="cn">${esc(cd.name)}<small>${KINDS[cd.kind]}</small></span><span class="debt">debes <b class="neg">${fmt(st.pending)}</b> ›</span></button>
      <div class="stats3"><div><div class="v neg">${fmt(st.spentMonth)}</div><div class="l">Gastado en ${esc(monthOnly(ym))}</div></div>
      <div><div class="v neg">${fmt(st.dueMonth)}</div><div class="l">Cuotas del mes</div></div>
      <div><div class="v neg">${fmt(st.spentTotal)}</div><div class="l">Gastado en total</div></div></div>
      ${st.pendingUpTo>0?`<div style="padding:0 16px 14px"><button class="btn sm ${ui.armPay===cd.id?'':'alt'}" data-act="paycard" data-id="${cd.id}">${ui.armPay===cd.id?'¿Confirmar pago?':'Pagar '+fmt(st.pendingUpTo)+' hasta '+esc(monthShort(ym))}</button></div>`:''}</div>`;
  });
  h+=`<button class="btn alt block" data-act="newcard">+ Agregar tarjeta</button>`;
  return h;
}

export function cardsMonths(all,pend){
  if(view.cm!=='all'&&!cardOf(S(),view.cm))view.cm='all';
  const f=view.cm,sel=x=>f==='all'||x.p.cardId===f;
  const od=pend.filter(c=>c.due<curYm()&&sel(c)),odSum=sum(od.map(c=>c.amount));
  const months=[];for(let i=0;i<12;i++)months.push(shiftYm(curYm(),i));
  const anyFixed=S().fixed.length>0,showFixed=anyFixed&&f==='all';
  const dus=months.map(m=>sum(all.filter(c=>c.due===m&&sel(c)).map(c=>c.amount)));
  const mxc=Math.max(1,odSum,...dus);
  let h=`<div class="filters" role="group" aria-label="Filtrar por tarjeta"><button class="chip" aria-pressed="${f==='all'}" data-act="cm" data-id="all">Todas</button>${S().cards.map(c=>`<button class="chip" aria-pressed="${f===c.id}" data-act="cm" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>`;
  h+=`<div class="sh" style="margin-top:4px"><h2>${f==='all'?(showFixed?'Cuotas y lo que te queda por mes':'Lo que debes por mes'):'Cuotas de '+esc(cardName(S(),f))}</h2></div>`;
  if(f!=='all')h+=`<div class="sumline"><span>Por pagar en esta tarjeta</span><b class="neg">${fmt(cardStats(S(),f,curYm()).pending)}</b></div>`;
  if(f==='all'&&!anyFixed)h+=`<div class="hint" style="margin:-4px 2px 10px">Agrega tu ingreso fijo en Ajustes (⚙) para ver cuánto te queda cada mes después de pagar las cuotas.</div>`;
  if(f!=='all'&&anyFixed)h+=`<div class="hint" style="margin:-4px 2px 10px">Con una tarjeta elegida ves solo sus cuotas. Elige “Todas” para ver lo que te queda cada mes.</div>`;
  h+=`<div class="panel">`;
  if(od.length)h+=`<button class="row" data-act="dueov"><div class="main"><div class="t neg">Meses anteriores sin pagar</div><div class="s">Se suman al mes actual</div></div><div class="amt neg">${fmt(odSum)}</div></button>`;
  months.forEach((m,k)=>{
    const du=dus[k],fx=fixedFor(S(),m),left=fx-du;
    if(showFixed){
      h+=`<button class="row" data-act="duem" data-id="${m}" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div class="t" style="text-transform:capitalize">${esc(monthName(m))}</div><div style="text-align:right"><span style="font-size:12px;color:var(--muted)">te queda </span><span class="amt ${left>=0?'pos':'neg'}">${fmt(left)}</span></div></div>
        <div class="bar"><i style="width:${du/mxc*100}%"></i></div>
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--muted);margin-top:5px"><span>Cuotas <b class="amt neg">${fmt(du)}</b></span><span>Ingreso fijo <b class="amt pos">${fmt(fx)}</b></span></div></button>`;
    }else{
      h+=`<button class="row" data-act="duem" data-id="${m}"><div class="main"><div class="t" style="text-transform:capitalize">${esc(monthName(m))}</div><div class="bar"><i style="width:${du/mxc*100}%"></i></div></div><div class="amt ${du?'neg':'mut'}">${fmt(du)}</div></button>`;
    }
  });
  return h+`</div>`;
}

export function cardsBuys(){
  if(view.cf!=='all'&&!cardOf(S(),view.cf))view.cf='all';
  let h=`<div class="filters" role="group" aria-label="Filtrar por tarjeta"><button class="chip" aria-pressed="${view.cf==='all'}" data-act="cf" data-id="all">Todas</button>${S().cards.map(c=>`<button class="chip" aria-pressed="${view.cf===c.id}" data-act="cf" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>`;
  const ps=S().purchases.filter(p=>view.cf==='all'||p.cardId===view.cf).sort((a,b)=>b.date.localeCompare(a.date));
  if(!ps.length)return h+`<div class="panel"><div class="empty">Aún no registras compras con tarjeta.</div></div>`;
  h+=`<div class="panel">`;
  ps.forEach(p=>{const paidN=Object.keys(p.paid||{}).length;
    h+=`<button class="row" data-act="dpur" data-id="${p.id}"><span class="ico out">${ICON.card}</span><div class="main"><div class="t">${esc(pLabel(p))}</div><div class="s">${esc(cardName(S(),p.cardId))} · ${esc(dayShort(p.date))} · ${paidN}/${p.n} pagadas</div><div class="bar"><i style="width:${paidN/p.n*100}%"></i></div></div><div class="amt neg">${fmt(p.total)}</div></button>`;});
  return h+`</div>`;
}

export function renderCards(){
  const all=cuotas(S()),pend=all.filter(c=>!c.paid);
  let h=head('Tarjetas')+tabsHtml(view.ct,[['sum','Resumen'],['mon','Meses'],['buy','Compras']],'ct');
  h+=view.ct==='sum'?cardsSummary(all):(view.ct==='mon'?cardsMonths(all,pend):cardsBuys());
  $app.innerHTML=h;
}
