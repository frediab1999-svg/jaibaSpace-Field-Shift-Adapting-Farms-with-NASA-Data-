// Arranque de la PWA jaibaSpace · Milpa.
import * as repos from './storage/repos.js';
import * as catalogo from './modules/crops/catalogo.js';
import * as climaMod from './modules/climate/clima.js';
import * as climaPunto from './modules/climate/climaPunto.js';
import * as reglasMod from './modules/strategies/reglas.js';
import * as cola from './services/sync/cola.js';
import * as api from './services/api/endpoints.js';
import * as contenido from './services/contenido.js';
import { origenDatos } from './shared/datos.js';
import { poner, avisar } from './app/estado.js';
import { ruta, iniciar } from './app/router.js';
import { precargar } from './app/precarga.js';

// Pantallas (se cargan al entrar y se precargan para usarlas sin internet)
const PANTALLAS = {
  inicio: () => import('./ui/pantallas/inicio.js'),
  menu: () => import('./ui/pantallas/menu.js'),
  semillas: () => import('./ui/pantallas/semillas.js'),
  parcelas: () => import('./ui/pantallas/parcelas.js'),
  parcelaForm: () => import('./ui/captura/parcela-form.js'),
  prediccion: () => import('./ui/resultados/prediccion.js'),
  informacion: () => import('./ui/resultados/informacion.js'),
  opciones: () => import('./ui/resultados/opciones.js'),
  diagnostico: () => import('./ui/resultados/diagnostico.js'),
};

// Rutas (la primera es la de respaldo)
ruta('/inicio', PANTALLAS.inicio);
ruta('/menu', PANTALLAS.menu);
ruta('/semillas', PANTALLAS.semillas);
ruta('/parcelas', PANTALLAS.parcelas);
ruta('/parcelas/nueva', PANTALLAS.parcelaForm);
ruta('/parcelas/:id/editar', PANTALLAS.parcelaForm);
ruta('/parcelas/:id', PANTALLAS.parcelas);
ruta('/prediccion', PANTALLAS.prediccion);
ruta('/prediccion/:id', PANTALLAS.prediccion);
ruta('/informacion', PANTALLAS.informacion);
ruta('/opciones', PANTALLAS.opciones);
ruta('/opciones/:id', PANTALLAS.opciones);
ruta('/diagnostico/:id', PANTALLAS.diagnostico);

async function revisarServidor() {
  try {
    await api.salud();
    poner({ conexion: 'ok' });
  } catch {
    poner({ conexion: 'local' });
  }
}

async function arrancar() {
  await repos.cargar();
  // Primero se decide de dónde salen los datos (paquete del servidor o respaldo local);
  // después se cargan catálogos, zonas y reglas, todos de la misma fuente.
  const [, datos] = await Promise.all([revisarServidor(), contenido.iniciar()]);
  poner({ datos });
  // Para comprobar en la consola qué datos consumió la app: __jaibaspace.datos()
  globalThis.__jaibaspace = { datos: origenDatos, descarga: contenido.estadoContenido };
  console.info('[jaibaSpace] datos:', origenDatos().origen, origenDatos().version || '(respaldo local)', '· descarga:', datos.resultado);
  await Promise.all([catalogo.cargar(), climaMod.zonas(), reglasMod.reglas()]);
  iniciar();
  cola.iniciar();
  // Clima del punto exacto de cada parcela: se completa en segundo plano si falta (ver climaPunto.js)
  climaPunto.asegurarTodas();
  addEventListener('online', async () => {
    revisarServidor();
    climaPunto.asegurarTodas();
    // Al volver la red se buscan datos nuevos. No cambian a media sesión: se ofrecen para recargar.
    const r = await contenido.buscarActualizacion();
    poner({ datos: contenido.estadoContenido() });
    if (r.version) avisar('Hay datos nuevos. Se usarán al volver a abrir la app.');
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* sin SW: la app funciona igual mientras haya red */ });
  }
  precargar(Object.values(PANTALLAS));
}

arrancar().catch((e) => {
  console.error(e);
  const app = document.getElementById('app');
  app.innerHTML = `<div style="padding:60px 24px;color:#fff;font-family:system-ui"><h1 style="font-size:24px">No pudimos abrir la app</h1><p style="margin-top:12px">${String(e.message || e)}</p><p style="margin-top:12px;opacity:.8">Ábrela con un servidor local (npm run dev), no con doble clic en el archivo.</p></div>`;
});
