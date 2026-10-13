/**
 * Guion de la prueba extremo a extremo (se ejecuta en un navegador real con tests/e2e/run.mjs).
 * Recorre pantallas y flujos con un reloj fijo (2026-10-10 12:00) y un generador aleatorio determinista,
 * y captura el HTML de cada paso para compararlo con tests/e2e/golden.json.
 */
export const FIXED_JS=`(()=>{try{if(!sessionStorage.getItem('__c')){localStorage.clear();sessionStorage.setItem('__c','1');}}catch(e){}const FIXED=new Date(2026,9,10,12,0,0).getTime();const R=Date;
class FD extends R{constructor(...a){if(a.length===0)super(FIXED);else super(...a);}static now(){return FIXED;}}
window.Date=FD;let seed=1;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};})();`;

export const scenario=async h=>{
  const {page,snap,act,tab,typeIn,setSel,setVal,fab}=h;
  await snap('01 inicio (configuración inicial)');
  await typeIn('#s-open','1500');
  await snap('02 máscara de miles al escribir');
  await act('startapp');await snap('03 hoy (día)');
  await act('hm','month');await snap('04 hoy (mes)');await act('hm','day');
  // ingreso
  await fab();await snap('05 formulario (gasto por defecto)');
  await act('dmode','in');await typeIn('#f-amt','250,5');await setSel('#f-cat','Uber');await act('dtpl');await snap('06 ingreso listo');
  await act('savetx');await snap('07 hoy tras ingreso');
  // gasto
  await fab();await typeIn('#f-amt','12.345');await setSel('#f-cat','Gasolina');await setVal('#f-note','Tanque lleno');await snap('08 gasto listo');
  await act('savetx');await snap('09 hoy tras gasto');
  // compra con tarjeta
  await fab();await act('dmode','card');await snap('10 compra tarjeta');
  await act('dn','6');await typeIn('#f-amt','600');await snap('11 total → cuota');
  await typeIn('#f-inst','120');await snap('12 cuota → total');
  await setSel('#f-cat','Ropa');await act('dcard','c-mia');await setVal('#f-note','Zapatillas');await snap('13 compra lista');
  await act('savetx');await snap('14 hoy tras compra');
  // otra compra en tarjeta de papá sin categoría
  await fab();await act('dmode','card');await act('dcard','c-papa');await act('dn','3');await typeIn('#f-amt','150');await act('nstep','1');await snap('15 compra papá');
  await act('savetx');
  // movimientos
  await tab('list');await snap('16 movimientos');
  await act('filter','card');await snap('17 filtro tarjetas');await act('filter','all');
  await page.type('#q','zapa');await snap('18 búsqueda');
  await page.click('#q',{clickCount:3});await page.keyboard.press('Backspace');
  await act('prev');await snap('19 mes anterior');await act('next');
  // análisis
  await tab('cats');await snap('20 análisis resumen');
  for(const t of ['cat','evo','debt'])await act('an',t),await snap('21 análisis '+t);
  await act('an','cat');await act('dim','group');await snap('22 por grupo');await act('groupdet','Moto');await snap('23 detalle grupo');await act('close');
  await act('dim','cat');await act('catdet','Gasolina');await snap('24 detalle categoría');await act('close');
  await act('catmode','in');await snap('25 ingresos por categoría');await act('catmode','out');
  await act('an','sum');await act('basis','total');await snap('26 compra completa');await act('basis','cuota');
  // tarjetas
  await tab('cards');await snap('27 tarjetas resumen');
  await act('ct','mon');await snap('28 meses');await act('cm','c-mia');await snap('29 meses filtro tarjeta');await act('duem','2026-11');await snap('30 cuotas de un mes');await act('close');await act('cm','all');
  await act('ct','buy');await snap('31 compras');await act('cf','c-papa');await snap('32 compras filtro');await act('cf','all');
  await act('ct','sum');await act('cdet','c-mia');await snap('33 detalle tarjeta');
  await act('close');
  // pagar cuotas (las cuotas empiezan el mes siguiente)
  await act('next');await snap('33b tarjetas mes siguiente');
  await act('paycard','c-mia');await snap('34 confirmar pago');await act('paycard','c-mia');await snap('35 pagado');
  await tab('home');await snap('36 hoy tras pago');
  await act('hm','month');await snap('37 hoy mes con pagos');await act('hm','day');
  // ajustes
  await act('settings');await snap('38 ajustes');
  for(const sec of ['plata','ing','gas','tpl','dat']){await page.evaluate(s=>{const d=document.querySelector('details[data-sec="'+s+'"]');d.open=true;d.dispatchEvent(new Event('toggle'));},sec);}
  await snap('39 ajustes abiertos');
  await act('offday','1');await snap('40 día libre');
  await typeIn('#add-sources','Delivery');await act('addlist',undefined,'[data-key="sources"]');await snap('41 fuente agregada');
  await typeIn('#fx-amt','1200');await act('addfixed');await snap('42 ingreso fijo');
  await act('newtpl');await snap('43 nueva plantilla');await typeIn('#f-tname','Gasolina moto');await act('savetplonly');await snap('44 plantillas');
  await act('close');
  await tab('cards');await snap('45 tarjetas con ingreso fijo');await act('ct','mon');await snap('46 meses con ingreso fijo');
  await tab('home');await snap('47 hoy con ingreso fijo');
  // plantilla en formulario
  await fab();await snap('48 formulario con plantilla');await act('usetpl',undefined,'');await snap('49 plantilla usada');await act('close');
  // tarjeta nueva
  await tab('cards');await act('ct','sum');await act('newcard');await snap('50 nueva tarjeta');await act('kind','papa');await typeIn('#cname','Visa banco');await act('addcard');await snap('51 tarjeta agregada');
  // ejemplo
  await act('settings');await act('sample');await snap('52 datos de ejemplo');
  await tab('list');await snap('53 lista con ejemplo');await tab('home');await snap('54 hoy con ejemplo');
  // respaldo
  await act('settings');await act('backup');await snap('55 respaldo');await act('close');
  // eliminar
  await tab('list');
  await page.evaluate(()=>document.querySelector('[data-act="dtx"]').click());await snap('56 detalle movimiento');
  await act('deltx');await snap('57 confirmar borrar');await act('deltx');await snap('58 tras borrar');
};
