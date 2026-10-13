/** Pantalla Análisis: resumen, categorías, evolución y deudas; detalle por categoría y grupo. */
import { KINDS, PALETTE } from '../../config/constants.js';
import { groupOf } from '../../domain/accessors.js';
import { accumulatedSum, expenses, groupBy, ingresos } from '../../domain/reports.js';
import { cardDebts, monthSummary } from '../../domain/summary.js';
import { S, view } from '../ctx.js';
import { $app, openSheet } from '../dom.js';
import { ICON } from '../icons.js';
import { head, pill, tabsHtml } from '../widgets.js';
import { dayLong, daysIn, monthName, monthOnly, monthShort, pad, shiftYm, todayS } from '../../utils/dates.js';
import { cap, esc, fmt, fmtNum } from '../../utils/format.js';
import { sum } from '../../utils/math.js';

export const baseItems=m=>view.catMode==='out'?expenses(S(),m,view.basis):ingresos(S(),m);

export const keyFn=()=>(view.catMode==='out'&&view.dim==='group')?(i=>groupOf(S(),i.cat)):(i=>i.cat);

export function histHtml(fn){
  const months=[];for(let i=5;i>=0;i--)months.push(shiftYm(view.ym,-i));
  const vals=months.map(m=>sum(baseItems(m).filter(fn).map(i=>i.amount)));
  const mx=Math.max(1,...vals),col=view.catMode==='out'?'var(--out)':'var(--in)';
  return `<div class="trend" style="height:130px">${months.map((m,i)=>`<div class="m"><div style="font-size:11px;font-family:var(--head);font-weight:700">${vals[i]?esc(fmtNum(vals[i],0)):''}</div><div class="bars"><i style="height:${vals[i]/mx*100}%;background:${col};width:24px"></i></div><small>${esc(monthShort(m))}</small></div>`).join('')}</div>`;
}

export function anSummary(c){
  const mx=Math.max(1,c.tIn,c.tOut),res=c.tIn-c.tOut;
  let h=`<div class="block"><div class="lbl2">Resultado de ${esc(monthOnly(c.ym))}</div><div class="big2 ${res>=0?'pos':'neg'}" style="font-size:38px">${fmt(res)}</div>
    <div class="cmp"><div class="cl"><span>Ingresos</span><b class="pos">${fmt(c.tIn)}</b></div><div class="cbar"><i class="in" style="width:${c.tIn/mx*100}%"></i></div>
    <div class="cl"><span>Gastos</span><b class="neg">${fmt(c.tOut)}</b></div><div class="cbar"><i class="out" style="width:${c.tOut/mx*100}%"></i></div></div></div>`;
  h+=`<div class="sh"><h2>Cómo se componen tus gastos</h2></div><div class="panel">
    <div class="row"><div class="main"><div class="t">Gastos al contado</div><div class="s">Efectivo y débito</div></div><div class="amt neg">${fmt(c.contado)}</div></div>
    ${c.basis==='cuota'
      ?`<div class="row"><div class="main"><div class="t">Cuotas de tarjeta</div><div class="s">${c.tIn>0?Math.round(c.cuotasMes/c.tIn*100)+'% de tus ingresos · ':''}ya pagaste ${fmt(c.pagadas)}</div></div><div class="amt neg">${fmt(c.cuotasMes)}</div></div>`
      :`<div class="row"><div class="main"><div class="t">Compras con tarjeta</div><div class="s">Hechas este mes, se pagan en cuotas</div></div><div class="amt neg">${fmt(c.compras)}</div></div>`}
    <div class="row"><div class="main"><div class="t">Total de gastos</div></div><div class="amt neg">${fmt(c.tOut)}</div></div></div>`;
  const byDay={};c.inn.forEach(i=>byDay[i.date]=(byDay[i.date]||0)+i.amount);
  const dk=Object.keys(byDay),best=dk.slice().sort((a,b)=>byDay[b]-byDay[a])[0],topCat=groupBy(c.out)[0];
  if(dk.length||topCat){
    h+=`<div class="sh"><h2>Datos útiles</h2></div><div class="panel">`;
    if(dk.length)h+=`<div class="row"><div class="main"><div class="t">Promedio por día con ingresos</div><div class="s">${dk.length} día${dk.length>1?'s':''} con ingresos</div></div><div class="amt pos">${fmt(c.tIn/dk.length)}</div></div>
      <div class="row"><div class="main"><div class="t">Mejor día</div><div class="s">${esc(cap(dayLong(best)))}</div></div><div class="amt pos">${fmt(byDay[best])}</div></div>`;
    if(topCat)h+=`<div class="row"><div class="main"><div class="t">Categoría que más pesa</div><div class="s">${esc(topCat[0])} · ${Math.round(topCat[1]/c.tOut*100)}% de tus gastos</div></div><div class="amt neg">${fmt(topCat[1])}</div></div>`;
    h+=`</div>`;
  }
  return h;
}

export function anCats(c){
  const mode=c.mode,items=mode==='out'?c.out:c.inn,total=mode==='out'?c.tOut:c.tIn,kf=keyFn(),groups=groupBy(items,kf),isG=mode==='out'&&view.dim==='group';
  let h=`<div class="seg" role="group"><button data-act="catmode" data-id="out" aria-pressed="${mode==='out'}">Gastos</button><button data-act="catmode" data-id="in" aria-pressed="${mode==='in'}">Ingresos</button></div>`;
  if(mode==='out')h+=`<div class="seg" style="margin-top:8px" role="group"><button data-act="dim" data-id="cat" aria-pressed="${view.dim==='cat'}">Por categoría</button><button data-act="dim" data-id="group" aria-pressed="${view.dim==='group'}">Por grupo</button></div>`;
  if(!groups.length)return h+`<div class="panel" style="margin-top:14px"><div class="empty">No hay ${mode==='out'?'gastos':'ingresos'} este mes.</div></div>`;
  const C=2*Math.PI*38;let off=0,svg=`<svg viewBox="0 0 100 100" role="img" aria-label="Distribución por ${isG?'grupo':'categoría'}"><g transform="rotate(-90 50 50)">`;
  groups.forEach(([k,v],i)=>{const len=v/total*C;svg+=`<circle cx="50" cy="50" r="38" fill="none" stroke="${PALETTE[i%PALETTE.length]}" stroke-width="14" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}"></circle>`;off+=len;});
  svg+=`</g></svg>`;
  h+=`<div class="block" style="margin-top:14px;padding:12px 0 4px"><div class="donut">${svg}<div class="dc"><span>Total</span><b class="${mode==='out'?'neg':'pos'}">${fmt(total)}</b></div></div>`;
  const mx=groups[0][1];
  groups.forEach(([k,v],i)=>{
    const col=PALETTE[i%PALETTE.length];
    const sub=isG?(new Set(items.filter(x=>groupOf(S(),x.cat)===k).map(x=>x.cat)).size+' categorías'):(mode==='out'&&groupOf(S(),k)!==k?groupOf(S(),k):'');
    h+=`<button class="rank" data-act="${isG?'groupdet':'catdet'}" data-id="${esc(k)}"><div class="rtop"><span class="dot" style="background:${col}"></span><span class="rn">${esc(k)}${sub?` <span class="tag">${esc(sub)}</span>`:''}</span><b class="amt ${mode==='out'?'neg':'pos'}">${fmt(v)}</b><span class="pct">${Math.round(v/total*100)}%</span></div><div class="rbar"><i style="width:${v/mx*100}%;background:${col}"></i></div></button>`;
  });
  return h+`</div><div class="hint" style="margin-top:8px">Toca una fila para ver los movimientos y los últimos 6 meses.</div>`;
}

export function anEvo(c){
  const ym=c.ym,byDay={};c.inn.forEach(i=>byDay[i.date]=(byDay[i.date]||0)+i.amount);
  const nd=daysIn(ym),vals=[];for(let d=1;d<=nd;d++)vals.push(byDay[ym+'-'+pad(d)]||0);
  const mx=Math.max(1,...vals),T=todayS(),dk=Object.keys(byDay).length,avg=dk?c.tIn/dk:0;
  let h=`<div class="sh" style="margin-top:4px"><h2>Ingresos por día</h2></div><div class="panel pad"><div class="chart">`;
  vals.forEach((v,i)=>{h+=`<div class="col"><i class="${ym+'-'+pad(i+1)===T?'today':''}" style="height:${v/mx*100}%" title="${esc(fmt(v))}"></i></div>`;});
  if(avg>0)h+=`<div class="avg" style="bottom:${avg/mx*100}%"></div>`;
  h+=`</div><div class="axis"><span>1</span><span>${Math.round(nd/2)}</span><span>${nd}</span></div>${avg>0?`<div class="note">La línea punteada es tu promedio por día con ingresos: <b class="pos">${fmt(avg)}</b></div>`:''}</div>`;

  const months=[];for(let i=5;i>=0;i--)months.push(shiftYm(ym,-i));
  const data=months.map(m=>({m,a:sum(ingresos(S(),m).map(i=>i.amount)),b:sum(expenses(S(),m,c.basis).map(i=>i.amount))}));
  const mm=Math.max(1,...data.map(d=>Math.max(d.a,d.b))),cur=data[5].b,prev=data[4].b;
  const delta=prev>0?Math.round((cur-prev)/prev*100):null;
  h+=`<div class="sh"><h2>Últimos 6 meses</h2></div><div class="panel pad"><div class="trend">`;
  data.forEach(d=>{h+=`<div class="m"><div class="bars"><i class="a" style="height:${d.a/mm*100}%"></i><i class="b" style="height:${d.b/mm*100}%"></i></div><small>${esc(monthShort(d.m))}</small></div>`;});
  h+=`</div><div class="legend"><span>Ingresos</span><span>Gastos</span></div>${delta!==null?`<div class="note">Tus gastos de ${esc(monthOnly(ym))} son ${Math.abs(delta)}% ${delta>=0?'más':'menos'} que los de ${esc(monthOnly(months[4]))}.</div>`:''}</div>`;

  const top=c.out.slice().sort((a,b)=>b.amount-a.amount).slice(0,5);
  if(top.length)h+=`<div class="sh"><h2>Mayores gastos del mes</h2></div><div class="panel">${top.map(i=>`<div class="row"><span class="ico out">${ICON.up}</span><div class="main"><div class="t">${esc(i.label)}</div><div class="s">${esc(i.cat)} · ${esc(i.when)} · ${esc(i.sub)}</div></div><div class="amt neg">${fmt(i.amount)}</div></div>`).join('')}</div>`;
  return h;
}

export function anDebt(){
  const ym=view.ym;
  const {total,rows}=cardDebts(S(),ym);
  if(!S().cards.length)return `<div class="panel"><div class="empty">Aún no tienes tarjetas.</div></div>`;
  const col=r=>PALETTE[r.i%PALETTE.length];
  let h=`<div class="block"><div class="lbl2">Debes en total en tus tarjetas</div><div class="big2 neg" style="font-size:38px">${fmt(total)}</div>`;
  if(total>0)h+=`<div class="stackbar" role="img" aria-label="Reparto de la deuda por tarjeta">${rows.filter(r=>r.debt>0).map(r=>`<i style="width:${r.debt/total*100}%;background:${col(r)}"></i>`).join('')}</div>
    <div class="leg2">${rows.filter(r=>r.debt>0).map(r=>`<span><span class="dot" style="background:${col(r)}"></span>${esc(r.cd.name)} ${Math.round(r.debt/total*100)}%</span>`).join('')}</div>`;
  else h+=`<div class="note">No tienes cuotas pendientes en ninguna tarjeta.</div>`;
  h+=`</div><div class="sh"><h2>Cuánto debes a cada tarjeta</h2></div>`;
  rows.forEach(r=>{
    const pct=r.sumAll>0?r.paid/r.sumAll*100:0;
    h+=`<div class="block card" style="--kc:${col(r)};margin-top:12px">
      <button class="chead" data-act="cdet" data-id="${r.cd.id}"><span class="cn">${esc(r.cd.name)}<small>${KINDS[r.cd.kind]}${r.cd.kind==='papa'?' · se la devuelves a papá':''}</small></span><span class="debt"><b class="neg" style="font-family:var(--head);font-size:20px">${fmt(r.debt)}</b> ›</span></button>
      <div style="padding:0 16px"><div class="gauge" role="img" aria-label="Cuánto de esta tarjeta ya pagaste"><i class="n" style="width:${pct}%"></i></div>
      <div class="gnote">Pagado ${fmt(r.paid)} de ${fmt(r.sumAll)} (${Math.round(pct)}%)</div>
      <div class="line"><span>Cuotas pendientes</span><b>${r.pe.length}</b></div>
      <div class="line"><span>Cuotas de ${esc(monthOnly(ym))}</span><b class="neg">${fmt(r.mDue)}</b></div>
      <div class="line"><span>Próxima cuota</span><b>${r.nxt?esc(cap(monthOnly(r.nxt.due)))+' · '+fmt(r.nxtAmt):'—'}</b></div>
      <div class="line"><span>Terminas de pagar en</span><b>${r.lst?esc(cap(monthName(r.lst.due))):'—'}</b></div></div>
      <div style="padding:6px 16px 14px"><button class="btn alt sm" data-act="cdet" data-id="${r.cd.id}">Ver detalle y compras</button></div></div>`;
  });
  return h;
}

export function renderCats(){
  const ym=view.ym,basis=view.basis;
  const c=monthSummary(S(),ym,basis,view.catMode);
  const out=c.out,inn=c.inn;
  let h=head('Análisis')+pill()+tabsHtml(view.an,[['sum','Resumen'],['cat','Categorías'],['evo','Evolución'],['debt','Deudas']],'an');
  if(view.an==='debt')h+=anDebt();
  else{
    h+=`<div class="seg sm wide" role="group" aria-label="Cómo contar las compras con tarjeta"><button data-act="basis" data-id="cuota" aria-pressed="${basis==='cuota'}">Cuotas del mes</button><button data-act="basis" data-id="total" aria-pressed="${basis==='total'}">Compra completa</button></div>
    <div class="hint" style="margin:6px 2px 14px">${basis==='cuota'?'Las compras con tarjeta cuentan por la cuota que te toca pagar este mes.':'Las compras con tarjeta cuentan completas, en el mes en que las hiciste.'}</div>`;
    if(!inn.length&&!out.length)h+=`<div class="panel"><div class="empty">Este mes aún no tiene movimientos, así que no hay gráficos para mostrar.<div style="margin-top:14px"><button class="btn sm" data-act="sample">Ver con datos de ejemplo</button></div></div></div>`;
    else h+=view.an==='sum'?anSummary(c):(view.an==='cat'?anCats(c):anEvo(c));
  }
  $app.innerHTML=h;
}

export function openCatDetail(cat){
  const items=baseItems(view.ym).filter(i=>i.cat===cat).sort((a,b)=>b.date.localeCompare(a.date));
  const total=sum(items.map(i=>i.amount)),ever=everSum(i=>i.cat===cat),g=groupOf(S(),cat);
  let h=`<h2>${esc(cat)}</h2><div class="callout" style="margin-top:0"><div class="s" style="text-transform:capitalize">${esc(monthName(view.ym))}</div><div class="v ${view.catMode==='out'?'neg':'pos'}">${fmt(total)}</div>
    <div class="s">${items.length} movimiento${items.length===1?'':'s'} · acumulado hasta hoy ${fmt(ever)}${g!==cat?' · grupo '+esc(g):''}</div></div>
  <section style="margin-top:18px"><h2>Últimos 6 meses</h2><div class="panel">${histHtml(i=>i.cat===cat)}</div></section>
  <section><h2>Movimientos del mes</h2><div class="panel">`;
  if(!items.length)h+=`<div class="empty">Sin movimientos este mes.</div>`;
  items.forEach(i=>{h+=`<div class="row"><div class="main"><div class="t">${esc(i.label)}</div><div class="s">${esc(i.when)} · ${esc(i.sub)}</div></div><div class="amt ${view.catMode==='out'?'neg':'pos'}">${fmt(i.amount)}</div></div>`;});
  h+=`</div></section><div class="actions"><button class="btn alt" data-act="close">Cerrar</button></div>`;
  openSheet(h);
}

export function openGroupDetail(g){
  const items=baseItems(view.ym).filter(i=>groupOf(S(),i.cat)===g),total=sum(items.map(i=>i.amount)),cats=groupBy(items,i=>i.cat);
  const ever=everSum(i=>groupOf(S(),i.cat)===g);
  let h=`<h2>${esc(g)}</h2><div class="callout" style="margin-top:0"><div class="s" style="text-transform:capitalize">${esc(monthName(view.ym))}</div><div class="v ${view.catMode==='out'?'neg':'pos'}">${fmt(total)}</div><div class="s">acumulado hasta hoy ${fmt(ever)}</div></div>
  <section style="margin-top:18px"><h2>Categorías del grupo</h2><div class="panel">`;
  cats.forEach(([k,v],i)=>{h+=`<button class="row" data-act="catdet" data-id="${esc(k)}"><span class="dot" style="background:${PALETTE[i%PALETTE.length]}"></span><div class="main"><div class="t">${esc(k)}</div><div class="bar"><i style="width:${total?v/total*100:0}%"></i></div></div><div class="amt ${view.catMode==='out'?'neg':'pos'}">${fmt(v)}</div></button>`;});
  h+=`</div></section><section><h2>Últimos 6 meses</h2><div class="panel">${histHtml(i=>groupOf(S(),i.cat)===g)}</div></section><div class="actions"><button class="btn alt" data-act="close">Cerrar</button></div>`;
  openSheet(h);
}

/** Acumulado hasta hoy de los movimientos que cumplen fn, según el modo (gastos/ingresos) y la base elegidos en pantalla. */
const everSum=fn=>accumulatedSum(S(),view.catMode,view.basis,fn);

