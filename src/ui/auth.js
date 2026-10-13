/** Pantalla de acceso previa a la aplicación. */
export function showAuth(api){
  return new Promise(resolve=>{
    const nav=document.querySelector('nav');if(nav)nav.style.display='none';
    const app=document.getElementById('app');
    const draw=(msg='',register=false)=>{app.innerHTML=`<div style="min-height:88vh;display:grid;place-items:center"><div class="block" style="width:100%;max-width:420px"><h1 style="font-size:30px;margin-bottom:6px">Mis cuentas</h1><div class="hint" style="margin-bottom:18px">${register?'Crea tu cuenta para sincronizar tus datos.':'Inicia sesión para usar tus datos en todos tus dispositivos.'}</div><div class="field"><label for="auth-email">Correo</label><input class="inp" id="auth-email" type="email" autocomplete="email"></div><div class="field"><label for="auth-pass">Contraseña</label><input class="inp" id="auth-pass" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="6"></div><div class="err" id="auth-err" style="margin-top:12px">${msg}</div><button class="btn block" id="auth-go">${register?'Crear cuenta':'Entrar'}</button><button class="link" id="auth-mode" style="width:100%;margin-top:10px">${register?'Ya tengo cuenta':'Crear una cuenta'}</button></div></div>`;
      document.getElementById('auth-mode').onclick=()=>draw('',!register);
      document.getElementById('auth-go').onclick=async()=>{const email=document.getElementById('auth-email').value.trim(),password=document.getElementById('auth-pass').value,err=document.getElementById('auth-err'),btn=document.getElementById('auth-go');if(!email||password.length<6){err.textContent='Escribe un correo válido y una contraseña de al menos 6 caracteres.';return;}btn.disabled=true;err.textContent='';try{if(register){const r=await api.signUp(email,password);if(!r.access_token){draw('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.',false);return;}}else await api.signIn(email,password);if(nav)nav.style.display='';resolve();}catch(e){err.textContent=e.message||'No se pudo iniciar sesión.';btn.disabled=false;}};
    };draw();
  });
}
