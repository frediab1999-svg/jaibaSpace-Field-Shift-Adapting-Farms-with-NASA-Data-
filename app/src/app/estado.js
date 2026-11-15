// Estado de sesión (no persistente) y avisos rápidos.
const estado = {
  conexion: 'desconocida', // 'ok' | 'local' | 'desconocida'
  baseDatosLista: null,
};
const oyentes = new Set();

export const leer = () => estado;
export function poner(cambios) {
  Object.assign(estado, cambios);
  oyentes.forEach((fn) => fn(estado));
}
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

/** Aviso flotante breve (toast). */
export function avisar(texto) {
  const app = document.getElementById('app');
  if (!app) return;
  app.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = texto;
  app.appendChild(t);
  setTimeout(() => t.remove(), 2900);
}
