import { tablesToState, TABLES } from '../sync/relational.js';
import { StateRepository } from './StateRepository.js';
import { toRelational } from '../migration/toRelational.js';

const enc=v=>encodeURIComponent(String(v));
const repoClone=x=>JSON.parse(JSON.stringify(x));
const month=d=>d?String(d).slice(0,7):null;
const rowKey=(table,r)=>({
  user_settings:'user_id',income_sources:'name',expense_groups:'name',categories:'name',cards:'id',fixed_incomes:'id',templates:'id',transactions:'id',purchases:'id',installment_payments:'purchase_id,installment_index'
}[table].split(',').map(k=>`${k}:${r[k]}`).join('|'));

/** Repositorio remoto: convierte el estado de la app al modelo relacional de Supabase y viceversa. */
export class SupabaseRepository extends StateRepository {
  constructor(api){super();this.api=api;this.status='connecting';this.snapshot=null;this._queue=Promise.resolve();}
  get supportsSync(){return true;}
  getSyncStatus(){return this.status;}
  async _all(){const out={};await Promise.all(TABLES.map(async t=>{out[t]=await this.api.request(t,{query:'select=*'});}));return out;}
  _state(t){return tablesToState(t);}
  async load(){try{this.status='connecting';const t=await this._all();this.snapshot=t;this.status='ok';return this._state(t);}catch(e){this.status='error';throw e;}}
  async _upsert(table,rows){if(!rows.length)return;await this.api.request(table,{method:'POST',body:rows,prefer:'resolution=merge-duplicates,return=minimal'});}
  async _deleteRow(table,row){const keys={user_settings:['user_id'],income_sources:['user_id','name'],expense_groups:['user_id','name'],categories:['user_id','name'],cards:['user_id','id'],fixed_incomes:['user_id','id'],templates:['user_id','id'],transactions:['user_id','id'],purchases:['user_id','id'],installment_payments:['user_id','purchase_id','installment_index']}[table];const q=keys.map(k=>`${k}=eq.${enc(row[k])}`).join('&');await this.api.request(table,{method:'DELETE',query:q});}
  async _saveNow(state){this.status='pending';const uid=this.api.user&&this.api.user.id;if(!uid)throw new Error('No hay usuario autenticado.');const next=toRelational(state,uid).tables;const prev=this.snapshot||Object.fromEntries(TABLES.map(t=>[t,[]]));
    // Altas/actualizaciones respetando dependencias.
    for(const t of ['user_settings','income_sources','expense_groups','categories','cards','fixed_incomes','templates','transactions','purchases','installment_payments'])await this._upsert(t,next[t]);
    // Bajas en orden inverso para no romper claves foráneas.
    for(const t of ['installment_payments','purchases','transactions','templates','fixed_incomes','categories','expense_groups','income_sources','cards']){const keep=new Set(next[t].map(r=>rowKey(t,r)));for(const r of prev[t]||[])if(!keep.has(rowKey(t,r)))await this._deleteRow(t,r);}
    this.snapshot=repoClone(next);this.status='ok';
  }
  async save(state){const copy=repoClone(state);this._queue=this._queue.catch(()=>{}).then(()=>this._saveNow(copy));try{await this._queue;}catch(e){this.status='error';throw e;}}
  async clear(){const uid=this.api.user&&this.api.user.id;if(!uid)return;this.status='pending';for(const t of ['installment_payments','purchases','transactions','templates','fixed_incomes','categories','expense_groups','income_sources','cards','user_settings'])await this.api.request(t,{method:'DELETE',query:`user_id=eq.${enc(uid)}`});this.snapshot=null;this.status='ok';}
  async syncNow(){await this.load();}
}
