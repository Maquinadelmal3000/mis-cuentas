/** Pantalla de proyección de ahorro. No genera movimientos contables. */
import { savingMonth, savingsWindow, selectedSavings, planOf, variableAverage } from '../../domain/savings.js';
import { curYm, shiftYm, monthName } from '../../utils/dates.js';
import { esc, fmt, fmtIn, num } from '../../utils/format.js';
import { S, ctx, view } from '../ctx.js';
import { $app, openSheet, closeSheet } from '../dom.js';
import { head } from '../widgets.js';

const savingRange = () => savingsWindow(S(), view.savingFrom || shiftYm(curYm(), -1));
const signedSaving = n => `<span class="${n>=0?'pos':'neg'}">${fmt(n)}</span>`;

export function renderSavings() {
  const rows = savingRange(), plan = planOf(S()), selected = plan.selected || [];
  const total = selectedSavings(S(), rows), chosen = rows.filter(r => selected.includes(r.ym));
  const avg = variableAverage(S());
  let h = head('Ahorro', 'Resultado real y proyección mensual');
  h += `<div class="hero"><div class="lbl">Disponible en los meses seleccionados</div><div class="big ${total>=0?'pos':'neg'}">${fmt(total)}</div>
    <div class="mnote">${chosen.length} mes${chosen.length===1?'':'es'} seleccionado${chosen.length===1?'':'s'} · no es dinero efectivamente ahorrado</div></div>`;
  h += `<div class="sh"><h2>Meses</h2><button class="link" data-act="savingall">${rows.every(r=>selected.includes(r.ym))?'Quitar selección':'Seleccionar todos'}</button></div>`;
  h += `<div class="calnav"><button class="btn sm alt" data-act="savingprev" aria-label="Seis meses anteriores">‹ Anteriores</button><div class="calsel" style="justify-content:center;align-items:center;font-size:13px">${esc(monthName(rows[0].ym))} – ${esc(monthName(rows[rows.length-1].ym))}</div><button class="btn sm alt" data-act="savingnext" aria-label="Seis meses siguientes">Siguientes ›</button></div>`;
  h += `<div class="panel">`;
  for(const r of rows){
    const checked=selected.includes(r.ym), label=r.status==='real'?'Real':r.status==='mixto'?'Actual · estimado':'Proyectado';
    h+=`<div class="saving-row"><button class="saving-check" data-act="savingselect" data-id="${r.ym}" aria-pressed="${checked}" aria-label="${checked?'Quitar':'Seleccionar'} ${esc(monthName(r.ym))}">${checked?'☑':'□'}</button>
      <div class="saving-main"><b>${esc(monthName(r.ym))}</b><small>${label}</small>
      <small>Ingresos ${fmt(r.income)} · Gastos ${fmt(r.expenses)}</small></div>
      <div class="saving-side"><b class="${r.available>=0?'pos':'neg'}">${fmt(r.available)}</b><button class="link" data-act="savingedit" data-id="${r.ym}" ${r.status==='real'?'disabled title="Los meses cerrados reflejan los movimientos registrados"':''}>${r.status==='real'?'Cerrado':'Ajustar'}</button></div></div>`;
  }
  h+=`</div>`;
  h+=`<div class="block" style="margin-top:14px"><div class="lbl2">Detalle de la estimación</div><div class="line"><span>Gasto variable promedio (3 meses cerrados)</span><b>${fmt(avg.amount)}</b></div>
    ${!avg.hasHistory?'<div class="hint" style="color:var(--out)">Todavía no hay gastos registrados en los últimos tres meses completos. El promedio es 0 y la proyección puede sobreestimar el ahorro. Ajustá el presupuesto de cada mes.</div>':''}
    <div class="hint">Las cuotas se cuentan una sola vez en su mes. El mes actual combina ingresos y gastos registrados con los previstos. Los meses anteriores reflejan el resultado de los registros disponibles, no el saldo bancario.</div>
    ${rows.some(r=>r.missingIncome)?'<div class="hint" style="color:var(--out)">Hay meses sin ingreso fijo configurado. Agregalo desde Ajustes → Ingresos para una proyección útil.</div>':''}</div>`;
  h+=`<div class="block" style="margin-top:14px"><div class="lbl2">Evolución de los meses visibles</div><div class="saving-chart">`;
  const max=Math.max(1,...rows.map(r=>Math.abs(r.available)));
  for(const r of rows){const height=Math.max(3,Math.round(Math.abs(r.available)/max*100));h+=`<div class="saving-bar"><div class="saving-bar-space"><i style="height:${height}%;background:${r.available<0?'var(--out)':'var(--in)'}"></i></div><small>${esc(r.ym.slice(5))}</small></div>`;}
  h+=`</div><div class="hint">Verde: disponible positivo. Rojo: déficit previsto. Los valores exactos figuran arriba.</div></div>`;
  $app.innerHTML=h;
}

export function toggleSavingMonth(ym){
  const p=S().savingsPlan, set=new Set(p.selected || []);
  if(set.has(ym))set.delete(ym);else set.add(ym);
  p.selected=[...set].sort();ctx.store.commit();renderSavings();
}
export function selectSavingAll(){
  const p=S().savingsPlan, months=savingRange().map(r=>r.ym), set=new Set(p.selected||[]);
  const all=months.every(m=>set.has(m));months.forEach(m=>all?set.delete(m):set.add(m));
  p.selected=[...set].sort();ctx.store.commit();renderSavings();
}
export function shiftSavingWindow(n){view.savingFrom=shiftYm(view.savingFrom||shiftYm(curYm(),-1),n);renderSavings();}

let editingSavingYm=null;
export function openSavingEdit(ym){
  const r=savingMonth(S(),ym);if(r.status==='real')return;
  editingSavingYm=ym;const ov=planOf(S()).overrides?.[ym]||{};
  openSheet(`<h2>Ajustar ${esc(monthName(ym))}</h2>
    <div class="hint">Estos importes son solo para proyectar; no crean movimientos ni cambian tus saldos.</div>
    <div class="field"><label for="sav-variable">Presupuesto de gastos variables</label><input class="inp" id="sav-variable" inputmode="decimal" placeholder="${fmtIn(r.average)}" value="${ov.variable==null?'':fmtIn(ov.variable)}"><div class="hint">Si queda vacío, usa el promedio de los últimos tres meses cerrados (${fmt(r.average)}). No incluye cuotas de tarjetas.</div></div>
    <div class="field"><label for="sav-income">Ingreso extraordinario previsto</label><input class="inp" id="sav-income" inputmode="decimal" value="${fmtIn(ov.extraIncome||0)}"></div>
    <div class="field"><label for="sav-expense">Gasto extraordinario previsto</label><input class="inp" id="sav-expense" inputmode="decimal" value="${fmtIn(ov.extraExpense||0)}"></div>
    <div class="hint">Cuotas ya previstas para el mes: ${fmt(r.installments)}. No las agregues otra vez como gasto extraordinario.</div>
    <div class="err" id="sav-err" role="alert"></div>
    <div class="actions"><button class="btn" data-act="savingsave">Guardar ajuste</button></div>`);
}
export function saveSavingEdit(){
  if(!editingSavingYm)return;
  const get=id=>document.getElementById(id).value.trim();
  const fields=['sav-variable','sav-income','sav-expense'].map(get);
  if(fields.some(v=>v!==''&&(!Number.isFinite(num(v))||num(v)<0))){document.getElementById('sav-err').textContent='Ingresá importes válidos, mayores o iguales a cero.';return;}
  const [variable,extraIncome,extraExpense]=fields;
  const p=S().savingsPlan;
  p.overrides[editingSavingYm]={variable:variable===''?null:num(variable),extraIncome:extraIncome===''?0:num(extraIncome),extraExpense:extraExpense===''?0:num(extraExpense)};
  editingSavingYm=null;ctx.store.commit();closeSheet();renderSavings();
}
