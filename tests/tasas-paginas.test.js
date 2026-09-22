/* Pruebas estáticas del agente de tasas: qué páginas cargan el banner, que el
   bloque de Comprar casa no lleve cifras escritas a mano, que la CSP no cambie,
   que la función quede programada y —clave— que el sitio no mencione la función
   antes del lanzamiento. Solo leen archivos; no usan red.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const leer = nombre => fs.readFileSync(path.join(raiz, nombre), 'utf8');
const T = require('../tasas-texto.js');

const PAGINAS_CON_BANNER = [
  'index', 'herramientas', 'credito', 'comprar-auto', 'cartas-claras', 'contrato-auto',
  'agendar', 'contacto', 'aparezco', 'formar-negocio', 'listar-negocio', 'quienes-somos',
].map(n => n + '.html');
const PAGINAS_SIN_BANNER = ['login', 'cuenta', 'admin', 'privacidad', 'terminos'].map(n => n + '.html');

/* ---------------- bloque de Comprar casa (US1) ---------------- */
function seccionTasas() {
  const html = leer('comprar-casa.html');
  const ini = html.indexOf('<section id="tasas"');
  assert.ok(ini >= 0, 'comprar-casa.html debe tener <section id="tasas"');
  const fin = html.indexOf('</section>', ini);
  assert.ok(fin > ini, 'la sección #tasas debe cerrarse');
  const abre = html.slice(ini, html.indexOf('>', ini) + 1);
  return { abre, marcado: html.slice(ini, fin + '</section>'.length) };
}

test('Comprar casa tiene #tasas oculto y con los estilos del bloque ya existentes', () => {
  const { abre } = seccionTasas();
  assert.match(abre, /\bhidden\b/);
  assert.match(abre, /class="[^"]*\brate-watch-section\b/);
});

test('el marcado de #tasas no lleva ninguna tasa escrita a mano', () => {
  const { marcado } = seccionTasas();
  assert.doesNotMatch(marcado, /\d+\.\d+ ?%/);
  assert.equal((marcado.match(/<section/g) || []).length, 1, 'sin secciones anidadas');
});

test('el aviso legal del HTML es exactamente el de tasas-texto.js (una sola verdad)', () => {
  const { marcado } = seccionTasas();
  assert.ok(marcado.includes(T.TEXTOS.avisoLegal), 'el HTML debe repetir el aviso legal tal cual');
});

test('Comprar casa carga los dos scripts con defer', () => {
  const html = leer('comprar-casa.html');
  assert.match(html, /<script src="tasas-texto\.js" defer><\/script>/);
  assert.match(html, /<script src="tasas-hipoteca\.js" defer><\/script>/);
});

test('los comparadores conservan sus tasas de ejemplo (no se tocan)', () => {
  const html = leer('comprar-casa.html');
  assert.match(html, /id="cmpTasaFha" value="6\.5"/);
  assert.match(html, /id="cmpTasaConv" value="6\.9"/);
  assert.match(html, /Las tasas son ejemplos, no ofertas/);
});

/* ---------------- banner en las otras páginas (US3, SC-003b) ---------------- */
test('el banner se carga exactamente en las 12 páginas acordadas', () => {
  for (const p of PAGINAS_CON_BANNER) {
    const html = leer(p);
    assert.match(html, /<script src="tasas-texto\.js" defer><\/script>/, `${p} debe cargar tasas-texto.js`);
    assert.match(html, /<script src="tasas-hipoteca\.js" defer><\/script>/, `${p} debe cargar tasas-hipoteca.js`);
    const nav = html.indexOf('src="nav.js"');
    const tasas = html.indexOf('src="tasas-hipoteca.js"');
    const analitica = html.indexOf('src="analytics.js"');
    assert.ok(nav >= 0 && analitica >= 0, `${p} tiene nav.js y analytics.js`);
    assert.ok(tasas > nav && tasas < analitica, `${p}: el script va después de nav.js y antes de analytics.js`);
  }
});

test('el banner NO se carga en login, cuenta, admin, privacidad ni términos', () => {
  for (const p of PAGINAS_SIN_BANNER) {
    const html = leer(p);
    assert.doesNotMatch(html, /tasas-hipoteca\.js/, `${p} no debe cargar el banner`);
    assert.doesNotMatch(html, /tasas-texto\.js/, `${p} no debe cargar tasas-texto.js`);
  }
});

test('todas las páginas del sitio están en una de las dos listas', () => {
  const todas = fs.readdirSync(raiz).filter(f => f.endsWith('.html')).sort();
  const conocidas = [...PAGINAS_CON_BANNER, ...PAGINAS_SIN_BANNER, 'comprar-casa.html'].sort();
  assert.deepEqual(todas, conocidas, 'una página nueva debe decidirse: ¿lleva banner o no?');
});

test('styles.css define el banner', () => {
  assert.match(leer('styles.css'), /\.tasas-aviso\b/);
});

/* ---------------- script del navegador ---------------- */
test('tasas-hipoteca.js declara TASAS_LANZADO y lo revisa antes de cualquier fetch', () => {
  const js = leer('tasas-hipoteca.js');
  const decl = /const TASAS_LANZADO\s*=\s*(true|false)\s*;/.exec(js);
  assert.ok(decl, 'debe declarar const TASAS_LANZADO = true|false;');
  const revision = js.search(/TASAS_LANZADO\s*!==\s*true/);
  const primerFetch = js.indexOf('fetch(');
  assert.ok(revision >= 0, 'debe salir si TASAS_LANZADO no es true');
  assert.ok(primerFetch === -1 || revision < primerFetch, 'la revisión va antes del primer fetch(');
});

test('la llave de localStorage del banner solo se usa dentro de try/catch', () => {
  const js = leer('tasas-hipoteca.js');
  assert.match(js, /themora_tasas_aviso_cerrado/);
  const lineas = js.split('\n');
  lineas.forEach((l, i) => {
    if (/localStorage\./.test(l)) {
      const contexto = lineas.slice(Math.max(0, i - 6), i + 1).join('\n');
      assert.match(contexto, /\btry\b/, `localStorage sin try cerca de la línea ${i + 1}`);
    }
  });
});

test('la analítica del bloque usa solo eventos categóricos de la lista (SC-008)', () => {
  const js = leer('tasas-hipoteca.js');
  const permitidos = new Set(['tasas-bloque-visto', 'tasas-alerta-vista', 'tasas-aviso-visto', 'tasas-aviso-cerrado', 'tasas-aviso-enlace', 'tasas-fuente-abierta',
    'tasas-casa-vista', 'tasas-casa-abierta', 'tasas-casas-cerradas']);
  const usados = [...js.matchAll(/evento\(\s*'([^']+)'/g)].map(m => m[1]);
  assert.ok(usados.length > 0, 'debe mandar al menos un evento');
  for (const e of usados) assert.ok(permitidos.has(e), `evento no permitido: ${e}`);
  // Las únicas propiedades permitidas son `tipo` (categoría de alerta) y `termino` (30 o 15); nunca cifras, fechas ni ids.
  for (const m of js.matchAll(/evento\(\s*'[^']+'\s*,\s*(\{[^}]*\})/g)) {
    assert.match(m[1], /^\{\s*(tipo|termino)(\s*:\s*[\w.]+)?\s*\}$/, `propiedades no permitidas: ${m[1]}`);
  }
});

/* ---------------- configuración de Netlify ---------------- */
test('la CSP no ganó ningún origen nuevo', () => {
  const toml = leer('netlify.toml');
  const linea = toml.split('\n').find(l => /^\s*Content-Security-Policy\s*=/.test(l));
  assert.ok(linea, 'debe existir la línea de Content-Security-Policy');
  assert.match(linea, /^\s*Content-Security-Policy = "default-src 'self'/);
  const connect = /connect-src ([^;]*);/.exec(linea);
  assert.ok(connect);
  assert.equal(connect[1], "'self' https://*.supabase.co https://cloud.umami.is https://gateway.umami.is");
});

test('el agente está programado a diario a las 13:00 UTC', () => {
  const toml = leer('netlify.toml');
  assert.match(toml, /\[functions\."tasas-agente"\]\s*\n\s*schedule = "0 13 \* \* \*"/);
});

test('INSTRUCCIONES-TASAS.md existe y no se puede descargar desde el sitio', () => {
  assert.ok(fs.existsSync(path.join(raiz, 'INSTRUCCIONES-TASAS.md')));
  const toml = leer('netlify.toml');
  assert.match(toml, /from = "\/INSTRUCCIONES-TASAS\.md"\s*\n\s*to = "\/index\.html"\s*\n\s*status = 404\s*\n\s*force = true/);
});

/* ---------------- nada público antes del lanzamiento ---------------- */
test('antes del lanzamiento el sitio no menciona la función; después, sí (privacidad y buscador)', () => {
  const js = leer('tasas-hipoteca.js');
  const lanzado = /const TASAS_LANZADO\s*=\s*(true|false)/.exec(js)[1] === 'true';
  const privacidad = leer('privacidad.html');
  const buscador = leer('site-search-index.js');
  const menciones = {
    privacidad: privacidad.includes('aviso de tasas hipotecarias'),
    buscador: buscador.includes('comprar-casa.html#tasas'),
  };
  if (!lanzado) {
    assert.equal(menciones.privacidad, false, 'privacidad.html no debe mencionar el aviso antes del lanzamiento (T057)');
    assert.equal(menciones.buscador, false, 'el buscador no debe apuntar a #tasas antes del lanzamiento (T058)');
  } else {
    assert.equal(menciones.privacidad, true, 'al lanzar, privacidad.html debe llevar la línea del aviso (T057)');
    assert.equal(menciones.buscador, true, 'al lanzar, el buscador debe tener la entrada de tasas (T058)');
  }
});

/* =========================================================
   Casas flotantes (specs/006-floating-rate-houses) — US1
   ========================================================= */
const INI_CSS_CASAS = '/* ===== Casas flotantes';
const FIN_CSS_CASAS = '/* ===== fin casas flotantes';

function cssCasas() {
  const html = leer('comprar-casa.html');
  const ini = html.indexOf(INI_CSS_CASAS);
  const fin = html.indexOf(FIN_CSS_CASAS);
  assert.ok(ini >= 0 && fin > ini, 'comprar-casa.html debe delimitar el CSS de las casas con comentarios /* ===== Casas flotantes … fin casas flotantes */');
  return html.slice(ini, fin);
}

// Quita del CSS el bloque @media(prefers-reduced-motion:no-preference){...} (con llaves anidadas).
function sinMediaSinPreferencia(css) {
  const clave = '@media(prefers-reduced-motion:no-preference){';
  let resto = css.replace(/\s+/g, '');
  let i = resto.indexOf(clave);
  while (i >= 0) {
    let nivel = 1;
    let j = i + clave.length;
    while (j < resto.length && nivel > 0) { if (resto[j] === '{') nivel++; else if (resto[j] === '}') nivel--; j++; }
    resto = resto.slice(0, i) + resto.slice(j);
    i = resto.indexOf(clave);
  }
  return resto;
}

test('casas: el CSS fija el grupo abajo a la izquierda, por debajo del asistente (z-index 140 < 200)', () => {
  const css = cssCasas().replace(/\s+/g, '');
  const regla = /\.casas-flotantes\{([^}]*)\}/.exec(css);
  assert.ok(regla, 'falta la regla .casas-flotantes{…}');
  assert.match(regla[1], /position:fixed/);
  assert.match(regla[1], /z-index:140\b/);
  assert.match(regla[1], /bottom:/);
  assert.match(regla[1], /left:/);
  assert.match(css, /\.casas-flotantes\[hidden\]\{display:none/);
  const asistente = /\.credit-coach-launcher\{[^}]*z-index:(\d+)/.exec(leer('styles.css').replace(/\s+/g, ''));
  assert.ok(asistente && Number(asistente[1]) > 140, 'el asistente debe quedar por encima de las casas');
});

test('casas: la animación solo existe dentro de prefers-reduced-motion:no-preference', () => {
  const css = cssCasas();
  assert.match(css.replace(/\s+/g, ''), /@media\(prefers-reduced-motion:no-preference\)\{/, 'debe declarar la animación en no-preference');
  assert.equal(/animation/.test(sinMediaSinPreferencia(css)), false, 'hay «animation» fuera de no-preference');
});

test('casas: el HTML no trae ningún elemento de las casas (solo CSS) ni cifras escritas a mano', () => {
  const html = leer('comprar-casa.html');
  const cuerpo = html.slice(html.indexOf('<body'));
  assert.equal(/class="[^"]*\bcasas-flotantes\b/.test(cuerpo), false);
  assert.equal(/class="[^"]*\bcasa\b/.test(cuerpo), false);
  assert.equal(/\d+\.\d+ ?%/.test(cssCasas()), false, 'no debe haber una tasa escrita en el CSS de las casas');
  const js = leer('tasas-hipoteca.js');
  const ini = js.indexOf('pintarCasas');
  assert.ok(ini >= 0, 'tasas-hipoteca.js debe definir pintarCasas');
  const codigo = js.slice(ini).split('\n').filter(l => !/^\s*(\/\/|\/?\*)/.test(l)).join('\n');
  assert.equal(/['"`]\d+\.\d+ ?%/.test(codigo), false, 'no debe haber una tasa escrita en el código de las casas');
});
