// Configuración de Vite. Lo único extra: al terminar `npm run build`, escribe en dist/sw.js
// la lista de todos los archivos del build para que el service worker los guarde al
// instalarse. Así, después de abrir la app una vez con red, funciona completa sin internet.
import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

function listar(dir) {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    return statSync(ruta).isDirectory() ? listar(ruta) : [ruta];
  });
}

function precargaServiceWorker() {
  let salida;
  return {
    name: 'jaibaspace-precarga-sw',
    apply: 'build',
    configResolved(config) { salida = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const sw = join(salida, 'sw.js');
      if (!existsSync(sw)) return;
      const archivos = listar(salida)
        .map((f) => './' + relative(salida, f).split(sep).join('/'))
        .filter((f) => f !== './sw.js' && !f.endsWith('.map'))
        .sort();
      const huella = createHash('sha1');
      archivos.forEach((f) => huella.update(f).update(String(statSync(join(salida, f)).size)));
      const version = `milpa-${huella.digest('hex').slice(0, 10)}`;
      const texto = readFileSync(sw, 'utf8')
        .replace(/const PRECARGA = \/\*PRECARGA\*\/[\s\S]*?\/\*FIN\*\/;/, `const PRECARGA = /*PRECARGA*/${JSON.stringify(archivos)}/*FIN*/;`)
        .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
      writeFileSync(sw, texto);
      console.log(`\n[sw] ${archivos.length} archivos para usar sin internet (versión ${version})`);
    },
  };
}

export default defineConfig({
  plugins: [precargaServiceWorker()],
});
