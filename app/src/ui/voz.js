// Micrófono: reconocimiento de voz del navegador (Web Speech API) para navegar.
// No envía audio a nuestro servidor. Si el navegador no lo soporta, se ofrece escribir.
// Ojo: en Chrome el reconocimiento usa el servicio del navegador y necesita internet;
// sin red da el error 'network' y la pantalla de Inicio ofrece escribir.
import { normalizar } from '../shared/format.js';

const Reconocedor = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const hayVoz = !!Reconocedor;

/** Comandos de voz → ruta. Se buscan palabras clave, en español y algunas en maya. */
const COMANDOS = [
  { ruta: '#/opciones', palabras: ['que siembro', 'que sembrar', 'que siembra', 'que puedo sembrar', 'que le siembro', 'proximo ciclo', 'siguiente ciclo', 'descanso', 'canavalia', 'tierra cansada', 'opciones para'] },
  { ruta: '#/parcelas/nueva', palabras: ['agregar parcela', 'nueva parcela', 'registrar parcela', 'anadir parcela'] },
  { ruta: '#/informacion?registrar=1', palabras: ['registrar cosecha', 'termine', 'ya coseche', 'coseche'] },
  { ruta: '#/semillas', palabras: ['semilla', 'sembrar', 'temporada', 'ixi im', 'ixiim', 'sabucan'] },
  { ruta: '#/parcelas', palabras: ['parcela', 'terreno', 'milpa', 'lu um', 'luum', 'tierra'] },
  { ruta: '#/prediccion', palabras: ['prediccion', 'futuro', 'como le ira', 'como me ira', 'sequia', 'clima', 'lluvia', 'plaga'] },
  { ruta: '#/informacion', palabras: ['informacion', 'historial', 'cosecha', 'resultado', 'na at'] },
  { ruta: '#/menu', palabras: ['menu', 'opciones'] },
  { ruta: '#/inicio', palabras: ['inicio', 'calendario'] },
];

export function interpretar(texto) {
  const t = normalizar(texto);
  const c = COMANDOS.find((x) => x.palabras.some((p) => t.includes(p)));
  return c ? c.ruta : null;
}

// ---------------- Voz que habla (síntesis) ----------------
// Funciona sin internet si el teléfono tiene una voz en español instalada (Android y iPhone
// suelen traerla). Preferimos una voz local de México; si no hay, cualquier voz local en
// español y al final cualquier voz en español.
export const hayHabla = !!globalThis.speechSynthesis;
let vozElegida = null;

function elegirVoz() {
  try {
    const voces = speechSynthesis.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang));
    if (!voces.length) return null;
    const mx = (v) => /^es[-_]MX/i.test(v.lang);
    const us = (v) => /^es[-_](US|419)/i.test(v.lang);
    return voces.find((v) => mx(v) && v.localService)
      || voces.find((v) => us(v) && v.localService)
      || voces.find((v) => v.localService)
      || voces.find(mx) || voces.find(us) || voces[0];
  } catch { return null; }
}
if (hayHabla) {
  vozElegida = elegirVoz();
  try { speechSynthesis.addEventListener('voiceschanged', () => { vozElegida = elegirVoz(); }); } catch { /* navegador viejo */ }
}

/** ¿La voz que vamos a usar funciona sin internet? (null si no sabemos) */
export const vozSinInternet = () => (vozElegida ? !!vozElegida.localService : null);

/**
 * Lee un texto en voz alta. alFin() se llama al terminar, al detenerse o si falla.
 * Devuelve una función para detener la lectura.
 */
export function decir(texto, { alFin } = {}) {
  let terminado = false;
  const fin = () => { if (!terminado) { terminado = true; alFin?.(); } };
  try {
    if (!hayHabla || !texto) { fin(); return () => {}; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    if (!vozElegida) vozElegida = elegirVoz();
    if (vozElegida) { u.voice = vozElegida; u.lang = vozElegida.lang; } else u.lang = 'es-MX';
    u.rate = 0.95;
    u.onend = fin;
    u.onerror = fin;
    speechSynthesis.speak(u);
  } catch { fin(); }
  return () => { try { speechSynthesis.cancel(); } catch { /* ya callado */ } fin(); };
}

/** Calla cualquier lectura en curso. */
export function callar() {
  try { if (hayHabla) speechSynthesis.cancel(); } catch { /* sin síntesis */ }
}

/** Escucha una frase. alTexto(final) se llama con el resultado; alFin() siempre. */
export function escuchar({ alTexto, alParcial, alFin, alError }) {
  if (!Reconocedor) { alError?.('no_soportado'); alFin?.(); return () => {}; }
  const r = new Reconocedor();
  r.lang = 'es-MX';
  r.interimResults = true;
  r.maxAlternatives = 1;
  let final = '';
  r.onresult = (e) => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else parcial += e.results[i][0].transcript;
    }
    alParcial?.(final + parcial);
  };
  r.onerror = (e) => alError?.(e.error);
  r.onend = () => { if (final) alTexto?.(final); alFin?.(); };
  try { r.start(); } catch { alFin?.(); }
  return () => { try { r.stop(); } catch { /* ya detenido */ } };
}

/**
 * Marca un botón de micrófono como «escuchando» y le pone las ondas de eco (estilo de los
 * asistentes de voz: anillos que salen del botón mientras oye). Sirve para cualquier botón.
 */
export function marcarEscucha(boton, escuchando) {
  if (!boton) return;
  if (!boton.querySelector(':scope > .eco')) {
    const eco = document.createElement('span');
    eco.className = 'eco';
    eco.setAttribute('aria-hidden', 'true');
    eco.innerHTML = '<i></i><i></i><i></i>';
    boton.prepend(eco);
    boton.style.isolation = 'isolate'; // las ondas quedan detrás del ícono y dentro del botón
    if (getComputedStyle(boton).position === 'static') boton.style.position = 'relative';
  }
  boton.dataset.escuchando = escuchando ? 'true' : 'false';
  boton.setAttribute('aria-pressed', escuchando ? 'true' : 'false');
}
