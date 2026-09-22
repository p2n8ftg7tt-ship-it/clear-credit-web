/* Vista previa local de las casas flotantes de tasas (specs/006-floating-rate-houses).
   Herramienta DESECHABLE de revisión a ojo: nunca se despliega (tests/ ya está bloqueada
   con una regla 404 en netlify.toml).

   Uso:   node tests/preview-casas.js        → http://localhost:8888
   Abrir: http://localhost:8888/comprar-casa.html?caso=al-dia
          casos: al-dia, alerta-30, alerta-fed, sin-actualizar, revision-vieja, sin-datos, caido
          &refresco=0.1  → repite la consulta cada 0.1 minutos (para ver la actualización en vivo)

   Qué hace:
   - Sirve los archivos de la raíz del repositorio.
   - Responde /.netlify/functions/tasas-hipoteca con tests/fixtures/tasas/snapshot-casas.json.
   - Cambia TASAS_LANZADO a true SOLO en la copia que envía al navegador; el archivo del
     disco no se toca jamás. */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const PUERTO = 8888;
const CASOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'tasas', 'snapshot-casas.json'), 'utf8'));

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

let casoActual = 'al-dia';
let refrescoMin = null;

function iso(horasAtras) {
  return new Date(Date.now() - horasAtras * 3600 * 1000).toISOString();
}

// Sustituye los marcadores de hora del fixture por horas reales.
function conHoras(cuerpo) {
  return JSON.parse(JSON.stringify(cuerpo)
    .replace('"__AHORA_MENOS_2H__"', JSON.stringify(iso(2)))
    .replace('"__AHORA_MENOS_72H__"', JSON.stringify(iso(72))));
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/.netlify/functions/tasas-hipoteca') {
    const caso = CASOS[casoActual] || CASOS['al-dia'];
    res.writeHead(caso.estado, { 'Content-Type': TIPOS['.json'], 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(conHoras(caso.cuerpo)));
    return;
  }

  if (url.pathname === '/comprar-casa.html') {
    const pedido = url.searchParams.get('caso');
    if (pedido && CASOS[pedido]) casoActual = pedido;
    const r = url.searchParams.get('refresco');
    refrescoMin = r && Number(r) > 0 ? Number(r) : null;
  }

  const relativa = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const archivo = path.normalize(path.join(RAIZ, relativa));
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403); res.end('no'); return; }

  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); res.end('no encontrado'); return; }
    let cuerpo = datos;
    if (path.basename(archivo) === 'tasas-hipoteca.js' && path.dirname(archivo) === RAIZ) {
      let texto = datos.toString('utf8').replace('const TASAS_LANZADO = false;', 'const TASAS_LANZADO = true;');
      if (refrescoMin) texto = texto.replace('const REFRESCO_MINUTOS = 15;', `const REFRESCO_MINUTOS = ${refrescoMin};`);
      cuerpo = Buffer.from(texto, 'utf8');
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(cuerpo);
  });
});

servidor.listen(PUERTO, () => {
  console.log(`Vista previa en http://localhost:${PUERTO}/comprar-casa.html?caso=al-dia`);
  console.log('Casos: ' + Object.keys(CASOS).join(', '));
});
