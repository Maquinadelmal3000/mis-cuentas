/** Máscara de montos: pone el punto de miles mientras se escribe en los campos de dinero. */

export const MASKED=['f-amt','f-inst','fx-amt','s-open'];

export function maskMoney(el,e){
  const prev=el._pv||'';
  let v=el.value,pos=el.selectionStart;
  if(typeof pos!=='number')pos=v.length;
  if(e&&e.data==='.'&&v.charAt(pos-1)==='.'){            // un punto tecleado cuenta como coma decimal
    const hasComma=v.indexOf(',')>-1;
    v=v.slice(0,pos-1)+(hasComma?'':',')+v.slice(pos);
    if(hasComma)pos-=1;
  }
  const sig=ch=>(ch>='0'&&ch<='9')||ch===',';
  let before=0;for(let i=0;i<pos&&i<v.length;i++)if(sig(v.charAt(i)))before++;
  let clean='';for(let i=0;i<v.length;i++)if(sig(v.charAt(i)))clean+=v.charAt(i);
  let prevSig=0;for(let i=0;i<prev.length;i++)if(sig(prev.charAt(i)))prevSig++;
  if(e&&e.inputType==='deleteContentBackward'&&clean.length===prevSig&&before>0){clean=clean.slice(0,before-1)+clean.slice(before);before--;}
  const ci=clean.indexOf(',');
  let ip=ci>-1?clean.slice(0,ci):clean;
  const dp=ci>-1?clean.slice(ci+1).replace(/,/g,'').slice(0,2):null;
  ip=ip.replace(/^0+(?=\d)/,'');
  if(ip===''&&dp!==null){ip='0';before++;}
  const out=ip.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(dp!==null?','+dp:'');
  let np=0,cnt=0;
  if(before>0){for(np=0;np<out.length&&cnt<before;np++){if(sig(out.charAt(np)))cnt++;}}
  el.value=out;el._pv=out;
  try{el.setSelectionRange(np,np);}catch(x){}
}
