/** Pantalla Hoy: plata actual, meta diaria, tarjetas y movimientos del día/mes. */
import { homeSummary } from '../../domain/summary.js';
import { S, syncStatus, view } from '../ctx.js';
import { $app } from '../dom.js';
import { groupedList, head, movementItems, sumLine, syncLabel } from '../widgets.js';
import { dayLong, monthOnly } from '../../utils/dates.js';
import { cap, esc, fmt } from '../../utils/format.js';
import { sum } from '../../utils/math.js';

export function renderHome(){
  const {T,Y,cNow,comp,libre,mTotal,mPaid,overdue,inToday,outToday,falta,wd,perDay,isOff,perCard,fixedLeft,fixed}=homeSummary(S());
  const pct=perDay>0?Math.min(100,inToday/perDay*100):100;

  let h=head('Hoy',cap(dayLong(T)),'<div class="sync" data-sync data-st="'+syncStatus()+'">'+esc(syncLabel())+'</div>');
  h+=`<div class="hero"><div class="lbl">Plata que tienes hoy</div><div class="big">${fmt(cNow)}</div>
    <div class="duo"><span><b class="g">+${fmt(inToday)}</b> entró hoy</span><span><b class="r">-${fmt(outToday)}</b> salió hoy</span></div>`;
  if(falta<=0)h+=`<div class="meta">Ya cubres las cuotas de ${esc(monthOnly(Y))}. Lo que ganes es plata libre.</div>`;
  else h+=`<div class="meta"><div class="mrow"><span>Meta ${isOff?'por día de trabajo':'de hoy'}</span><b>${fmt(perDay)}</b></div>
    <div class="prog" role="img" aria-label="Progreso de la meta de hoy"><i style="width:${pct}%"></i></div>
    <div class="mnote">Llevas ${fmt(inToday)} · faltan ${fmt(falta)} para cubrir el mes · ${wd} día${wd===1?'':'s'} de trabajo</div></div>`;
  h+=`</div>`;

  // Tarjetas, por aparte
  const cover=comp>0?Math.max(0,Math.min(100,cNow/comp*100)):100;
  const per=perCard;
  h+=`<div class="sh"><h2>Tarjetas de ${esc(monthOnly(Y))}</h2><button class="link" data-act="gotab" data-id="cards">Ver todo ›</button></div>
  <div class="block"><div class="kv"><span>A pagar este mes</span><b class="big2 neg">${fmt(comp)}</b></div>
  <div class="gauge" role="img" aria-label="Qué parte de lo que debes cubre tu plata de hoy"><i class="${cover>=100?'ok':''}" style="width:${cover}%"></i></div>
  <div class="gnote">${comp<=0?'No tienes cuotas pendientes.':(cover>=100?'Tu plata de hoy cubre todo lo que debes este mes.':'Tu plata de hoy cubre el '+Math.round(cover)+'% de lo que debes este mes.')}</div>
  <div class="line"><span>Pagado este mes</span><b class="neg">${fmt(mPaid)} de ${fmt(mTotal)}</b></div>`;
  if(overdue>0)h+=`<div class="line"><span>Incluye de meses anteriores</span><b class="neg">${fmt(overdue)}</b></div>`;
  per.forEach(x=>h+=`<div class="line"><span>${esc(x.cd.name)}</span><b class="neg">${fmt(x.v)}</b></div>`);
  if(fixed>0){h+=`<div class="line"><span>Con tu ingreso fijo te quedaría</span><b class="${fixedLeft>=0?'pos':'neg'}">${fmt(fixedLeft)}</b></div>`;}
  h+=`<div class="line strong"><span>Te quedaría libre</span><b class="${libre>=0?'pos':'neg'}">${fmt(libre)}</b></div></div>`;

  // Movimientos del día o del mes
  const prefix=view.hm==='day'?T:Y,items=movementItems(prefix,'all','');
  h+=`<div class="sh"><h2>Movimientos</h2><div class="seg sm" role="group" aria-label="Periodo"><button data-act="hm" data-id="day" aria-pressed="${view.hm==='day'}">Hoy</button><button data-act="hm" data-id="month" aria-pressed="${view.hm==='month'}">Este mes</button></div></div>`;
  if(items.length)h+=sumLine(sum(items.map(i=>i.inc)),sum(items.map(i=>i.out)))+groupedList(items,view.hm==='month');
  else h+=`<div class="panel"><div class="empty">${view.hm==='day'?'Aún no registras nada hoy. Toca + para anotar un ingreso o un gasto.':'Aún no hay movimientos este mes.'}</div></div>`;
  $app.innerHTML=h;
}
