// Rutas por hash (funcionan sin servidor de rutas y sin conexión).
// #/inicio · #/menu · #/semillas · #/parcelas · #/parcelas/nueva · #/parcelas/:id · #/parcelas/:id/editar
// #/parcelas/historial · #/prediccion · #/prediccion/:id · #/informacion
// #/opciones · #/opciones/:id (¿qué siembro el próximo ciclo?)
const rutas = [];
let limpiarActual = null;

export function ruta(patron, cargar) {
  const claves = [];
  const re = new RegExp('^' + patron.replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; }) + '$');
  rutas.push({ re, claves, cargar });
}

export function ir(hash) {
  if (location.hash === hash) despachar();
  else location.hash = hash;
}

async function despachar() {
  const hash = location.hash.replace(/^#/, '') || '/inicio';
  const [camino, query] = hash.split('?');
  const r = rutas.find((x) => x.re.test(camino)) || rutas[0];
  const m = camino.match(r.re) || [];
  const params = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
  params.query = new URLSearchParams(query || '');
  if (limpiarActual) { try { limpiarActual(); } catch (e) { console.error(e); } limpiarActual = null; }
  const app = document.getElementById('app');
  const pantalla = document.createElement('div');
  pantalla.className = 'pantalla entra-pantalla';
  app.replaceChildren(pantalla);
  try {
    const modulo = await r.cargar();
    limpiarActual = (await modulo.montar(pantalla, params)) || null;
  } catch (e) {
    console.error(e);
    pantalla.innerHTML = `<div class="scroll" style="padding-top:80px"><div class="tarjeta"><p><strong>Algo falló al abrir esta pantalla.</strong></p><p class="ayuda">${String(e.message || e)}</p><a class="btn btn--dorado" href="#/inicio" style="margin-top:12px">Volver al inicio</a></div></div>`;
  }
  sessionStorage.setItem('jaibaspace.navego', '1');
  const enfoque = pantalla.querySelector('h1, [data-enfoque]');
  if (enfoque) { enfoque.setAttribute('tabindex', '-1'); enfoque.focus({ preventScroll: true }); }
}

export function iniciar() {
  addEventListener('hashchange', despachar);
  despachar();
}

/** Vuelve a montar la pantalla actual (después de un cambio grande de datos). */
export const refrescar = () => despachar();
