/** Acciones de la interfaz (patrón Command). */
import { cardName } from '../domain/accessors.js';
import { cuotas } from '../domain/installments.js';
import { refreshSheet, refreshSyncUi, render } from './app.js';
import { S, ctx, ui, view } from './ctx.js';
import { closeSheet } from './dom.js';
import { navigateTab } from './navigation.js';
import { defFirst, isDraftDirty, openAdd, openEditPur, openEditTx, readDraft, renderAdd, syncCalc } from './views/addForm.js';
import { openCatDetail, openGroupDetail } from './views/analysis.js';
import { downloadBackup, openBackup } from './views/backup.js';
import { openCardDetail, openDueList, openNewCard, openPurchase, openTx } from './views/details.js';
import { openSetup, renderSettings } from './views/settings.js';
import { openSavingEdit, saveSavingEdit, toggleSavingMonth, selectSavingAll, changeSavingVisibleCount } from './views/savings.js';
import { curYm, monthName, shiftYm } from '../utils/dates.js';
import { inStr, num } from '../utils/format.js';

const $=id=>document.getElementById(id);

/** Plantilla de movimiento a partir del borrador del formulario. */
function templateFromDraft(d,name){
  return {name,mode:d.mode,cat:d.cat||'',amount:d.amount,note:d.note.trim(),cardId:d.mode==='card'?d.cardId:null,n:d.n,inst:d.inst,src:d.src};
}
/** Si el borrador pide "Guardar como plantilla", la guarda. */
function saveTemplateIf(d){
  if(!d.tpl)return;
  const nm=(d.tname||'').trim()||d.note.trim()||d.cat||(d.mode==='in'?'Ingreso':d.mode==='card'?'Compra con tarjeta':'Gasto');
  ctx.catalog.saveTemplate(templateFromDraft(d,nm));
}
/** Primer toque: arma el botón y pide confirmar; devuelve true si ya estaba armado. */
function confirmTap(b,text){
  if(!b.dataset.arm){b.dataset.arm='1';b.textContent=text;return false;}
  return true;
}
function applyBackup(p){ctx.backup.restore(p);closeSheet();render();}

/** Guarda los cambios de un movimiento o una compra existente (mismo registro, sin duplicar). */
function saveEdit(d,err){
  try{
    if(d.editKind==='pur'){
      const tot=num(d.amount),inst=num(d.inst);
      if(!(tot>0)||!(inst>0)){err.textContent='Escribe el total de la compra o el valor de la cuota.';return;}
      if(!d.cardId){err.textContent='Elige una tarjeta.';return;}
      ctx.ledger.updatePurchase(d.editId,{cardId:d.cardId,cat:d.cat||'',total:tot,n:d.n,inst,date:d.date,note:d.note.trim(),first:d.first});
    }else{
      const amt=num(d.amount);
      if(!(amt>0)){err.textContent='Escribe un monto mayor a 0.';return;}
      ctx.ledger.updateTransaction(d.editId,{type:d.mode,cat:d.cat,amount:amt,date:d.date,note:d.note.trim()});
    }
  }catch(e){
    if(e&&e.name==='ValidationError'){err.textContent=e.message;return;}
    throw e;
  }
  view.ym=d.date.slice(0,7);ui.draft=null;closeSheet();render();
}

/**
 * Acciones de la interfaz (patrón Command): cada botón con data-act="nombre" ejecuta actions[nombre].
 * Cada acción valida lo que escribió la persona, llama a un servicio y vuelve a dibujar.
 */
export const actions={
  savingedit({id}){openSavingEdit(id);},
  savingsave(){saveSavingEdit();},
  savingselect({id}){toggleSavingMonth(id);},
  savingall(){selectSavingAll();},
  savingmore(){changeSavingVisibleCount(6);},
  savingless(){changeSavingVisibleCount(0);},
  prev(){view.ym=shiftYm(view.ym,-1);ui.armPay=null;render();},
  next(){view.ym=shiftYm(view.ym,1);ui.armPay=null;render();},
  filter({id}){view.filter=id;render();},
  catmode({id}){view.catMode=id;render();},
  basis({id}){view.basis=id;render();},
  dim({id}){view.dim=id;render();},
  an({id}){view.an=id;render();},
  ct({id}){view.ct=id;render();},
  cf({id}){view.cf=id;render();},
  cm({id}){view.cm=id;render();},
  calprev(){view.calYm=shiftYm(view.calYm||curYm(),-1);render();},
  calnext(){view.calYm=shiftYm(view.calYm||curYm(),1);render();},
  calcard({id}){view.calCard=id;render();},
  newcard(){ui.sheetCtx=null;openNewCard();},
  nstep({id}){readDraft();ui.draft.n=Math.max(1,Math.min(60,ui.draft.n+parseInt(id)));syncCalc();renderAdd();},
  addfixed(){
    const amt=num($('fx-amt').value);
    if(!(amt>0)){$('fx-err').textContent='Escribe el monto que cobras cada mes.';return;}
    ctx.catalog.addFixedIncome({name:$('fx-name').value,amount:amt,from:$('fx-from').value});
    renderSettings();render();
  },
  rmfixed({id}){ctx.catalog.removeFixedIncome(parseInt(id));renderSettings();render();},
  savetplnow(){
    readDraft();
    const d=ui.draft,nm=(d.tname||'').trim()||d.note.trim()||d.cat||'';
    if(!nm){$('f-tmsg').textContent='Escribe un nombre para la plantilla.';return;}
    const r=ctx.catalog.saveTemplate(templateFromDraft(d,nm));
    d.tname=nm;d.tmsg=r==='updated'?'Plantilla actualizada.':'Plantilla guardada.';renderAdd();
  },
  edittx({id}){ui.sheetCtx=null;openEditTx(id);},
  editpur({id}){ui.sheetCtx=null;openEditPur(id);},
  usetpl({id}){
    const t=S().templates.find(x=>x.id===id);if(!t)return;
    readDraft();
    const d=ui.draft;
    d.mode=t.mode;d.cat=t.cat;d.amount=t.amount?inStr(t.amount):'';d.note=t.note||'';d.cardId=t.cardId||null;d.n=t.n||1;d.inst=t.inst?inStr(t.inst):'';d.src=t.src||'total';
    d.firstManual=false;d.first=defFirst(d.date);d.tpl=false;d.tname='';
    if(t.mode==='card')syncCalc();
    renderAdd();
  },
  newtpl(){ui.sheetCtx=null;openAdd('out');ui.draft.tplOnly=true;renderAdd();},
  closetpl(){ui.draft=null;renderSettings();},
  savetplonly(){
    readDraft();
    const d=ui.draft,nm=(d.tname||'').trim(),err=$('ferr');
    if(!nm){err.textContent='Ponle un nombre a la plantilla.';return;}
    ctx.catalog.saveTemplate(templateFromDraft(d,nm));ui.draft=null;renderSettings();
  },
  rmtpl({id}){ctx.catalog.removeTemplate(parseInt(id));renderSettings();},
  groupdet({id}){ui.sheetCtx=null;openGroupDetail(id);},
  hm({id}){view.hm=id;render();},
  gotab({id}){view.ym=curYm();navigateTab(id);},
  catdet({id}){ui.sheetCtx=null;openCatDetail(id);},
  cdet({id}){openCardDetail(id);},
  close(){if(isDraftDirty()&&!(typeof window.confirm==='function'?window.confirm('Tenés cambios sin guardar. ¿Descartarlos?'):true))return;ui.draft=null;ui.sheetCtx=null;ui.wipeArm=false;closeSheet();},
  settings(){ui.sheetCtx=null;ui.wipeArm=false;renderSettings();},
  dtx({id}){ui.sheetCtx=null;openTx(id);},
  dpur({id}){openPurchase(id);},
  duem({id}){
    ui.sheetCtx={type:'due',title:monthName(id)+(view.cm!=='all'?' · '+cardName(S(),view.cm):''),fn:()=>cuotas(S()).filter(c=>c.due===id&&(view.cm==='all'||c.p.cardId===view.cm))};
    openDueList(ui.sheetCtx.title,ui.sheetCtx.fn());
  },
  dueov(){
    ui.sheetCtx={type:'due',title:'Meses anteriores sin pagar',fn:()=>cuotas(S()).filter(c=>c.due<curYm()&&!c.paid&&(view.cm==='all'||c.p.cardId===view.cm))};
    openDueList(ui.sheetCtx.title,ui.sheetCtx.fn());
  },
  pay({id,b,T}){if(ctx.ledger.payInstallment(id,b.dataset.i,T)){render();refreshSheet();}},
  unpay({id,b}){if(ctx.ledger.unpayInstallment(id,b.dataset.i)){render();refreshSheet();}},
  paycard({id,T}){
    if(ui.armPay!==id){ui.armPay=id;render();return;}
    ctx.ledger.payCardUpTo(id,view.ym,T);ui.armPay=null;render();
  },
  delpur({id,b}){
    if(!confirmTap(b,'Toca otra vez para eliminar'))return;
    ctx.ledger.deletePurchase(id);ui.sheetCtx=null;closeSheet();render();
  },
  deltx({id,b}){
    if(!confirmTap(b,'Toca otra vez para eliminar'))return;
    ctx.ledger.deleteTransaction(id);closeSheet();render();
  },
  /* registrar */
  dmode({id}){readDraft();ui.draft.mode=id;ui.draft.cat=null;renderAdd();},
  dcard({id}){readDraft();ui.draft.cardId=id;renderAdd();},
  dn({id}){readDraft();ui.draft.n=parseInt(id);syncCalc();renderAdd();},
  savetx(){
    readDraft();
    const d=ui.draft,err=$('ferr');
    if(!d.date){err.textContent='Elige una fecha.';return;}
    if(d.editId)return saveEdit(d,err);
    if(d.mode==='card'){
      const tot=num(d.amount),inst=num(d.inst);
      if(!(tot>0)||!(inst>0)){err.textContent='Escribe el total de la compra o el valor de la cuota.';return;}
      if(!d.cardId){err.textContent='Elige una tarjeta. Si no tienes, agrégala en la pestaña Tarjetas.';return;}
      ctx.store.batch(()=>{
        ctx.ledger.addPurchase({cardId:d.cardId,cat:d.cat||'',total:tot,n:d.n,inst,date:d.date,note:d.note.trim(),first:d.first});
        saveTemplateIf(d);
      });
    }else{
      const amt=num(d.amount);
      if(!(amt>0)){err.textContent='Escribe un monto mayor a 0.';return;}
      ctx.store.batch(()=>{
        ctx.ledger.addTransaction({type:d.mode,cat:d.cat,amount:amt,date:d.date,note:d.note.trim()});
        saveTemplateIf(d);
      });
    }
    view.ym=d.date.slice(0,7);ui.draft=null;closeSheet();render();
  },
  /* tarjetas */
  kind({id}){const n=$('cname').value;ui.newKind=id;openNewCard();$('cname').value=n;},
  addcard(){
    const name=$('cname').value.trim();
    if(!name){$('cerr').textContent='Escribe un nombre para la tarjeta.';return;}
    ctx.catalog.addCard(name,ui.newKind);closeSheet();render();
  },
  delcard({id,b}){
    if(!confirmTap(b,'Toca otra vez para quitar'))return;
    ctx.catalog.removeCard(id);closeSheet();render();
  },
  /* ajustes */
  startapp(){ctx.catalog.startApp(num($('s-open').value));closeSheet();render();},
  manualtoggle(){ctx.catalog.setManualInstallments(!S().manualInstallments);renderSettings();render();},
  offday({id}){ctx.catalog.toggleOffDay(parseInt(id));renderSettings();render();},
  addlist({b}){ctx.catalog.addToList(b.dataset.key,$('add-'+b.dataset.key).value.trim());renderSettings();},
  rmlist({id,b}){ctx.catalog.removeFromList(b.dataset.key,parseInt(id));renderSettings();},
  sample(){ctx.samples.load();view.tab='cats';view.ym=curYm();ui.sheetCtx=null;closeSheet();render();},
  unsample(){ctx.samples.remove();renderSettings();render();},
  backup(){openBackup();},
  applyrestore({b}){
    if(!confirmTap(b,'Toca otra vez para reemplazar'))return;
    if(ui.BKP)applyBackup(ui.BKP);
  },
  dlbackup(){downloadBackup();},
  syncnow(){ctx.store.reload().then(()=>{render();refreshSyncUi();},refreshSyncUi);},
  async logout(){await ctx.api.signOut();location.reload();},
  restore(){
    const p=ctx.backup.parse($('bk-in').value);
    if(!p){$('bk-err').textContent='Ese texto no es un respaldo válido.';return;}
    applyBackup(p);
  },
  wipe(){
    if(!ui.wipeArm){ui.wipeArm=true;renderSettings();return;}
    ctx.catalog.wipe();ui.wipeArm=false;closeSheet();render();openSetup();
  }
};

