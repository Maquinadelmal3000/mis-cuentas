/** Historial interno de la PWA: una entrada por pantalla y por hoja. */
import { ui, view } from './ctx.js';
import { render } from './app.js';
import { isDraftDirty } from './views/addForm.js';

let active=false;
let sheetOpen=false;
let suppress=false;
const marker='misCuentasNav';
const entry=(tab,sheet)=>({[marker]:true,tab,sheet});

export function initNavigation(){
  if(active||typeof window==='undefined'||!window.history)return;
  active=true;
  history.replaceState(entry('home',false),'',location.href);
  window.addEventListener('popstate',event=>{
    if(suppress){suppress=false;return;}
    const target=event.state&&event.state[marker]?event.state:entry('home',false);
    if(sheetOpen&&!target.sheet&&isDraftDirty()&&!(typeof window.confirm==='function'?window.confirm('Tenés cambios sin guardar. ¿Descartarlos?'):true)){
      history.pushState(entry(view.tab,true),'',location.href);
      return;
    }
    if(sheetOpen&&!target.sheet){
      sheetOpen=false;
      ui.draft=null;ui.sheetCtx=null;
      const sh=document.getElementById('sheet'),sc=document.getElementById('scrim');
      sh.classList.remove('on');sc.classList.remove('on');sh.innerHTML='';
    }
    view.tab=target.tab||'home';
    render();
    window.scrollTo(0,0);
  });
}

export function navigateTab(tab){
  if(tab===view.tab)return;
  view.tab=tab;
  if(active)history.pushState(entry(tab,false),'',location.href);
  render();window.scrollTo(0,0);
}

export function sheetOpened(){
  if(!active||sheetOpen)return;
  sheetOpen=true;
  history.pushState(entry(view.tab,true),'',location.href);
}

export function sheetClosed(){
  if(!sheetOpen)return;
  sheetOpen=false;
  if(active&&history.state?.[marker]&&history.state.sheet){
    // Volver a la entrada anterior sin ejecutar dos veces el cierre.
    suppress=true;
    history.back();
  }
}
