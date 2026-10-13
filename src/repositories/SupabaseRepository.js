import { StateRepository } from './StateRepository.js';
import { toRelational } from '../migration/toRelational.js';

const TABLES=['user_settings','income_sources','expense_groups','categories','cards','fixed_incomes','templates','transactions','purchases','installment_payments'];
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
  _state(t){const s=t.user_settings[0];if(!s)return null;const cards=t.cards.filter(c=>!c.archived).map(c=>({id:c.id,name:c.name,kind:c.kind}));const paid={};t.installment_payments.forEach(x=>{(paid[x.purchase_id]||(paid[x.purchase_id]={}))[x.installment_index]=x.paid_on;});return {
    ver:s.schema_version||5,updatedAt:s.app_updated_at?new Date(s.app_updated_at).getTime():undefined,
    setup:{done:!!s.setup_done,opening:Number(s.opening_balance)||0,start:s.setup_start||null},off:s.off_days||[0],
    sources:t.income_sources.sort((a,b)=>a.position-b.position).map(x=>x.name),groups:t.expense_groups.sort((a,b)=>a.position-b.position).map(x=>x.name),
    cats:t.categories.sort((a,b)=>a.position-b.position).map(x=>x.name),catGroups:Object.fromEntries(t.categories.filter(x=>x.group_name).map(x=>[x.name,x.group_name])),
    cards,fixed:t.fixed_incomes.map(x=>({id:x.id,name:x.name,amount:Number(x.amount),from:month(x.from_month)})),
    templates:t.templates.map(x=>({id:x.id,name:x.name,mode:x.mode,cat:x.category||'',amount:x.amount==null?'':String(x.amount),note:x.note||'',cardId:x.card_id||null,n:x.installments||1,inst:x.installment_amount==null?'':String(x.installment_amount),src:x.source_field||'total'})),
    tx:t.transactions.map(x=>({id:x.id,type:x.type,cat:x.category,amount:Number(x.amount),date:x.occurred_on,note:x.note||'',...(x.is_sample?{sample:true}:{})})),
    purchases:t.purchases.map(x=>({id:x.id,cardId:x.card_id,cat:x.category||'',total:Number(x.total),n:x.installments,inst:Number(x.installment_amount),date:x.purchased_on,note:x.note||'',first:month(x.first_due_month),paid:paid[x.id]||{},...(x.is_sample?{sample:true}:{})}))
  };}
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
