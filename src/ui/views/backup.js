/** Hoja de respaldo (texto y archivo). */
import { ctx, ui } from '../ctx.js';
import { openSheet } from '../dom.js';
import { todayS } from '../../utils/dates.js';
import { esc } from '../../utils/format.js';

export function openBackup(){
  ui.BKP=null;
  openSheet(`<h2>Respaldo</h2>
  <div class="hint" style="margin:0 0 12px">Guarda un archivo con todos tus datos, por ejemplo en Drive, y cárgalo cuando quieras en este u otro dispositivo.</div>
  <button class="btn block" style="margin-top:0" data-act="dlbackup">Descargar archivo de respaldo</button>
  <div class="field"><label for="bk-file">Cargar desde un archivo</label><input class="inp" type="file" id="bk-file" accept=".json,application/json,text/plain"></div>
  <div id="bk-confirm"></div>
  <div class="err" id="bk-err" role="alert"></div>
  <details class="acc" style="margin-top:14px"><summary><span>Respaldo como texto<small>Copiar y pegar, si no puedes usar archivos</small></span></summary><div class="accb">
    <textarea class="inp" id="bk-out" readonly>${esc(ctx.backup.exportJson())}</textarea>
    <div class="field"><label for="bk-in">Restaurar desde texto</label><textarea class="inp" id="bk-in" placeholder="Pega aquí tu respaldo"></textarea></div>
    <div class="actions"><button class="btn" data-act="restore">Restaurar</button></div></div></details>
  <div class="actions"><button class="btn alt" data-act="close">Cerrar</button></div>`);
  const o=document.getElementById('bk-out');if(o)o.addEventListener('focus',()=>o.select());
}

export async function handleBackupFile(inp){
  const err=document.getElementById('bk-err'),box=document.getElementById('bk-confirm');
  if(err){err.style.color='';err.textContent='';}if(box)box.innerHTML='';
  const f=inp.files&&inp.files[0];if(!f)return;
  try{
    const p=ctx.backup.parse(await f.text());
    if(!p){if(err)err.textContent='Ese archivo no es un respaldo de Mis cuentas.';return;}
    ui.BKP=p;
    if(box)box.innerHTML=`<div class="callout"><div class="t">Archivo listo para cargar</div><div class="s">${p.tx.length} movimientos y ${(p.purchases||[]).length} compras con tarjeta. Esto reemplaza los datos actuales de esta app.</div><button class="btn danger sm" style="margin-top:10px" data-act="applyrestore">Reemplazar mis datos</button></div>`;
  }catch(e){if(err)err.textContent='No pude leer ese archivo.';}
}

/** Descarga el respaldo como archivo JSON (descarga normal del navegador). */
export async function downloadBackup(){
  const err=document.getElementById('bk-err');if(err){err.style.color='';err.textContent='';}
  try{
    const url=URL.createObjectURL(new Blob([ctx.backup.exportJson()],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='mis-cuentas-respaldo-'+todayS()+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    if(err){err.style.color='var(--in)';err.textContent='Listo. Guarda el archivo descargado en Drive.';}
  }catch(e){
    if(err)err.textContent='No se pudo descargar. Usa el respaldo como texto.';
  }
}

