// Rutas de imágenes resueltas con import.meta.url: funcionan igual con Vite
// (dev y build) que con un servidor estático sin compilación.

const img = (nombre) => new URL(`../assets/img/${nombre}`, import.meta.url).href;

export const IMG = {
  fondo: img('fondo-milpa.jpg'),
  bordado: img('bordado.webp'),
  mapa: img('mapa-peninsula.webp'),
  nodos: {
    semillas: img('nodo-semillas.webp'),
    parcelas: img('nodo-parcelas.webp'),
    prediccion: img('nodo-prediccion.webp'),
    informacion: img('nodo-informacion.webp'),
  },
  fotos: {
    manos: img('foto-manos.jpg'),
    plantula: img('foto-plantula.jpg'),
    campesino: img('foto-campesino.jpg'),
  },
  iconos: {
    nube: img('ico-nube.jpg'),
    sol: img('ico-sol.jpg'),
    plaga: img('ico-plaga.jpg'),
    semilla: img('ico-semilla.jpg'),
    cosecha: img('ico-cosecha.jpg'),
  },
  letreros: {
    bien: img('letrero-bien.webp'),
    atencion: img('letrero-atencion.webp'),
    riesgo: img('letrero-riesgo.webp'),
  },
  porNombre: img,
};

/** Imagen de un cultivo o semilla según el catálogo (campo imagen). */
export function imagenCultivo(nombreArchivo) {
  return nombreArchivo ? img(nombreArchivo) : IMG.iconos.semilla;
}

/** Letrero de mano según nivel: bien | atencion | riesgo. */
export function letrero(nivel) {
  return IMG.letreros[nivel] || IMG.letreros.atencion;
}
