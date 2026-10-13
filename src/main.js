/** Raíz de composición: autenticación + repositorio Supabase + servicios + interfaz. */
import { SupabaseApi } from './repositories/SupabaseApi.js';
import { LocalStorageRepository } from './repositories/LocalStorageRepository.js';
import { SupabaseRepository } from './repositories/SupabaseRepository.js';
import { BackupService } from './services/BackupService.js';
import { CatalogService } from './services/CatalogService.js';
import { LedgerService } from './services/LedgerService.js';
import { SampleDataService } from './services/SampleDataService.js';
import { Store } from './store/Store.js';
import { startUi } from './ui/app.js';
import { showAuth } from './ui/auth.js';
import { ctx } from './ui/ctx.js';
import { bindEvents } from './ui/events.js';

async function main(){
  if(typeof document==='undefined')return;
  const isTest=typeof window!=='undefined'&&!window.location;
  const api=isTest?null:new SupabaseApi();
  if(api&&!await api.ensureSession())await showAuth(api);
  const repository=isTest?new LocalStorageRepository():new SupabaseRepository(api);
  const store=new Store(repository,{onPersistError:e=>{console.error('No se pudo sincronizar:',e);}});
  try{await store.load();}catch(e){document.getElementById('app').innerHTML=`<div class="block"><h2>No se pudo conectar</h2><p>${String(e.message||e)}</p><button class="btn" onclick="location.reload()">Reintentar</button></div>`;return;}
  Object.assign(ctx,{api,repository,store,ledger:new LedgerService(store),catalog:new CatalogService(store),backup:new BackupService(store),samples:new SampleDataService(store)});
  bindEvents();startUi();
}
main();
