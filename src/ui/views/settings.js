/** Configuración inicial y Ajustes (secciones plegables). */
import { DAYS } from '../../config/constants.js';
import { S, ctx, syncStatus, ui, view } from '../ctx.js';
import { openSheet } from '../dom.js';
import { monthOptions } from './addForm.js';
import { syncLabel } from '../widgets.js';
import { curYm, monthName } from '../../utils/dates.js';
import { esc, fmt, fmtIn, num } from '../../utils/format.js';

export function openSetup(){
  openSheet(`<h2>Antes de empezar</h2>
  <div class="hint" style="margin:0 0 4px">Escribe cuánta plata tienes hoy (efectivo, débito y lo que tengas disponible). Es el punto de partida: los movimientos que registres después, con la fecha que sea, suman o restan a esta plata.</div>
  <div class="field"><label for="s-open">Plata que tienes hoy</label><input class="inp amount" id="s-open" inputmode="decimal" placeholder="0.00"></div>
  <div class="actions"><button class="btn" data-act="startapp">Empezar</button></div>`);
}

export function renderSettings(){
  const so=view.sopen;
  const list=(arr,key)=>`<div class="chips">${arr.map((x,i)=>`<span class="chip" style="display:inline-flex;align-items:center;gap:8px">${esc(x)}<button data-act="rmlist" data-key="${key}" data-id="${i}" aria-label="Quitar ${esc(x)}" style="border:0;background:none;font-size:18px;line-height:1;padding:0 2px">×</button></span>`).join('')}</div>
  <div class="inline" style="margin-top:8px"><input class="inp" id="add-${key}" maxlength="24" placeholder="Agregar"><button class="btn sm" data-act="addlist" data-key="${key}">Agregar</button></div>`;
  const hasSample=S().tx.some(t=>t.sample)||S().purchases.some(p=>p.sample);
  const sec=(id,title,sub,b)=>`<details class="acc" data-sec="${id}" ${so[id]?'open':''}><summary><span>${title}<small>${sub}</small></span></summary><div class="accb">${b}</div></details>`;
  openSheet(`<h2>Ajustes</h2>`+
  sec('plata','Mi plata','Saldo inicial y días libres',
    `<div class="field" style="margin-top:0"><label for="s-open">Saldo inicial</label><input class="inp" id="s-open" inputmode="decimal" data-set="open" value="${fmtIn(S().setup.opening||0)}"><div class="hint">Lo que tenías antes de empezar a registrar. Todos tus movimientos, sin importar su fecha, suman o restan a esta plata.</div></div>
    <div class="field"><div class="lab">Días libres (no cuentan para la meta)</div><div class="chips">${DAYS.map((d,i)=>`<button class="chip" aria-pressed="${S().off.includes(i)}" data-act="offday" data-id="${i}">${d}</button>`).join('')}</div></div>`)+
  sec('ing','Ingresos','Fuentes e ingresos fijos',
    `<div class="field" style="margin-top:0"><div class="lab">Fuentes de ingreso</div>${list(S().sources,'sources')}</div>
    <div class="field"><div class="lab">Ingresos fijos (se repiten cada mes)</div>${fixedRows()}<div class="hint">Sirven para proyectar cuánto te queda cada mes tras pagar las cuotas. No cambian tu plata de hoy: sigue registrando lo que cobras como ingreso.</div></div>`)+
  sec('gas','Gastos','Categorías y grupos',
    `<div class="field" style="margin-top:0"><div class="lab">Grupos de gasto</div>${list(S().groups,'groups')}<div class="hint">Un grupo junta varias categorías para ver su total (por ejemplo, Moto). Al registrar sigues eligiendo la categoría exacta, como Gasolina.</div></div>
    <div class="field"><div class="lab">Categorías y su grupo</div>${catRows()}</div>`)+
  sec('tpl','Plantillas','Movimientos frecuentes',
    `${tplRows()}<div class="hint">También puedes crear una al registrar, con “Guardar como plantilla”. Aparecen arriba en el formulario de registro.</div>`)+
  sec('dat','Datos','Sincronización, respaldo y borrado',
    `${syncBlock()}<div class="chips" style="margin-top:14px"><button class="chip" data-act="${hasSample?'unsample':'sample'}">${hasSample?'Quitar datos de ejemplo':'Cargar datos de ejemplo'}</button>
    <button class="chip" data-act="backup">Respaldo</button>
    <button class="chip" data-act="wipe">${ui.wipeArm?'Toca otra vez para borrar todo':'Borrar todo'}</button></div>
    <div class="hint">Los datos de ejemplo sirven para ver cómo se ven los gráficos. Quítalos cuando termines. “Borrar todo” elimina todos los datos guardados en este dispositivo.</div>`)+
  `<div class="actions"><button class="btn" data-act="close">Listo</button></div>`);
}

export function tplRows(){
  const rows=S().templates.map((t,i)=>`<div class="row" style="padding:10px 12px"><span class="stripe" style="background:${t.mode==='in'?'var(--in)':'var(--out)'}"></span><div class="main"><div class="t">${esc(t.name)}</div><div class="s">${t.mode==='in'?'Ingreso':t.mode==='card'?'Con tarjeta':'Gasto'}${t.cat?' · '+esc(t.cat):''}</div></div>${t.amount&&num(t.amount)>0?`<div class="amt ${t.mode==='in'?'pos':'neg'}">${fmt(num(t.amount))}</div>`:''}<button data-act="rmtpl" data-id="${i}" aria-label="Quitar ${esc(t.name)}" style="border:0;background:none;font-size:20px;padding:0 4px">×</button></div>`).join('');
  return `${rows?`<div class="panel">${rows}</div>`:`<div class="hint" style="margin:0 0 8px">Aún no tienes plantillas.</div>`}
  <div style="margin-top:8px"><button class="btn sm alt" data-act="newtpl">Nueva plantilla</button></div>`;
}

export function fixedRows(){
  const rows=S().fixed.map((f,i)=>`<div class="row" style="padding:10px 12px"><div class="main"><div class="t">${esc(f.name)} · <span class="pos">${fmt(f.amount)}</span></div><div class="s">cada mes, desde ${esc(monthName(f.from))}</div></div><button data-act="rmfixed" data-id="${i}" aria-label="Quitar ${esc(f.name)}" style="border:0;background:none;font-size:20px;padding:0 4px">×</button></div>`).join('');
  return `${rows?`<div class="panel">${rows}</div>`:`<div class="hint" style="margin:0 0 8px">Aún no agregas ingresos fijos.</div>`}
  <div class="cols" style="margin-top:8px"><div class="field" style="margin-top:0"><select class="inp" id="fx-name" aria-label="Fuente">${S().sources.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>
  <div class="field" style="margin-top:0"><input class="inp" id="fx-amt" inputmode="decimal" placeholder="Monto mensual" aria-label="Monto mensual"></div></div>
  <div class="inline" style="margin-top:8px"><select class="inp" id="fx-from" aria-label="Desde qué mes">${monthOptions(curYm())}</select><button class="btn sm" data-act="addfixed">Agregar</button></div>
  <div class="err" id="fx-err" role="alert"></div>`;
}

export function catRows(){
  const opts=sel=>`<option value="">Sin grupo</option>`+S().groups.map(g=>`<option value="${esc(g)}" ${sel===g?'selected':''}>${esc(g)}</option>`).join('');
  return `<div class="panel">${S().cats.map((c,i)=>`<div class="row" style="padding:8px 12px"><div class="main"><div class="t">${esc(c)}</div></div><select class="inp" style="width:auto;min-height:40px;padding:6px 10px" data-setgroup="${i}" aria-label="Grupo de ${esc(c)}">${opts(S().catGroups[c])}</select><button data-act="rmlist" data-key="cats" data-id="${i}" aria-label="Quitar ${esc(c)}" style="border:0;background:none;font-size:20px;padding:0 4px">×</button></div>`).join('')}</div>
  <div class="inline" style="margin-top:8px"><input class="inp" id="add-cats" maxlength="24" placeholder="Nueva categoría"><button class="btn sm" data-act="addlist" data-key="cats">Agregar</button></div>`;
}

/** Bloque de estado de sincronización dentro de Ajustes → Datos. */
export function syncBlock(){
  const line=`<div class="line" style="border-top:0;padding-top:0"><span>Sincronización entre dispositivos</span><b data-sync data-st="${syncStatus()}">${esc(syncLabel())}</b></div>`;
  if(!ctx.repository.supportsSync)return line+`<div class="hint" style="margin:0 0 10px">Esta copia guarda los datos solo en este dispositivo. Usa el respaldo en archivo para llevarlos a otro.</div>`;
  return line+`<div class="hint" style="margin:0 0 10px">Tus datos se sincronizan con Supabase${ctx.api&&ctx.api.user&&ctx.api.user.email?' · '+esc(ctx.api.user.email):''}.</div><div class="chips"><button class="chip" data-act="syncnow">Sincronizar ahora</button><button class="chip" data-act="logout">Cerrar sesión</button></div>`;
}

