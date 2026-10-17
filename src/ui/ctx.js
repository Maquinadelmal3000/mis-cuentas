/** Contexto compartido de la interfaz: servicios, estado de vista y estado efímero de la UI. */
import { curYm } from '../utils/dates.js';

/** Servicios y repositorio (los asigna main.js al iniciar). */
export const ctx={store:null,ledger:null,catalog:null,backup:null,samples:null,repository:null,api:null};
/** Estado de datos actual (lectura). */
export const S=()=>ctx.store.state;
/** Estado del repositorio de sincronización. */
export const syncStatus=()=>ctx.repository.getSyncStatus();

/** Estado de navegación y filtros de la pantalla. */
export const view={tab:'home',hm:'day',ym:curYm(),filter:'all',catMode:'out',basis:'cuota',dim:'cat',an:'sum',ct:'sum',cf:'all',cm:'all',q:'',sopen:{},calYm:null,calCard:'all'};

/** Estado efímero de la interfaz (se reasigna, por eso va dentro de un objeto). */
export const ui={sheetCtx:null,draft:null,armPay:null,newKind:'credito',wipeArm:false,BKP:null};
