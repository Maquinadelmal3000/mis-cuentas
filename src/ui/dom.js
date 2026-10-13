/** Referencias al DOM y control de la hoja inferior (bottom sheet). */

export const $app=document.getElementById('app'),$sheet=document.getElementById('sheet'),$scrim=document.getElementById('scrim');

export function openSheet(h){
  let body=h,foot='';
  const i=h.lastIndexOf('<div class="actions');
  if(i>-1){
    const f=h.slice(i);
    if(f.indexOf('<div',5)===-1&&/<\/div>\s*$/.test(f)){
      body=h.slice(0,i);foot=f;
      const m=body.match(/<div class="err"[^>]*><\/div>\s*$/);
      if(m){body=body.slice(0,m.index);foot=m[0]+foot;}
    }
  }
  $sheet.innerHTML=`<div class="grab"></div><div class="sbody">${body}</div>${foot?`<div class="sfoot">${foot}</div>`:''}`;
  $sheet.classList.add('on');$scrim.classList.add('on');
  const sb=$sheet.querySelector('.sbody');if(sb)sb.scrollTop=0;
}

export function closeSheet(){$sheet.classList.remove('on');$scrim.classList.remove('on');$sheet.innerHTML='';}
