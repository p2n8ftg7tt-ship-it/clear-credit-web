// Contrato: specs/012-un-sistema-visual/contracts/visual-system-test.md
// Vigila que no vuelvan los restos de paletas viejas, los focos invisibles,
// los botones en píldora ni las MAYÚSCULAS, y que la cinta de arriba sea la
// misma en todas las páginas. El iframe Auto Coach (srcdoc de herramientas)
// queda fuera a propósito: el dueño decidió no tocarlo todavía.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const leer = nombre => fs.readFileSync(path.join(raiz, nombre), 'utf8');
const paginas = fs.readdirSync(raiz).filter(n => n.endsWith('.html')).sort();
const estilos = leer('styles.css');

// Sin comentarios ni el iframe Auto Coach (srcdoc="…").
const sinComentarios = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const sinSrcdoc = html => html.replace(/\ssrcdoc="[^"]*"/g, '');

function bloquesStyle(html) {
  const salida = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) salida.push(m[1]);
  return salida.join('\n');
}

// Reglas CSS {selector, cuerpo, enMedia}. Los @media se aplanan.
function reglas(css) {
  const salida = [];
  const texto = sinComentarios(css);
  let i = 0;
  let media = 0;
  const pila = [];
  let inicio = 0;
  for (; i < texto.length; i++) {
    const c = texto[i];
    if (c === '{') {
      const cabeza = texto.slice(inicio, i).trim();
      if (cabeza.startsWith('@')) {
        pila.push('at');
        if (/^@(media|supports|layer)/.test(cabeza)) media++;
        inicio = i + 1;
        continue;
      }
      const fin = texto.indexOf('}', i);
      salida.push({ selector: cabeza, cuerpo: texto.slice(i + 1, fin), enMedia: media > 0 });
      i = fin;
      inicio = i + 1;
    } else if (c === '}') {
      if (pila.pop() === 'at' && media > 0) media--;
      inicio = i + 1;
    }
  }
  return salida;
}

const fuentes = [{ nombre: 'styles.css', css: estilos }].concat(
  paginas.map(p => ({ nombre: p, css: bloquesStyle(sinSrcdoc(leer(p))) }))
);
const todasLasReglas = fuentes.flatMap(f => reglas(f.css).map(r => ({ ...r, archivo: f.nombre })));

// ---------- §A Contraste de los tokens de rol ----------
function tokensRaiz() {
  const bloque = /:root\s*\{([\s\S]*?)\}/.exec(sinComentarios(estilos))[1];
  const mapa = {};
  for (const m of bloque.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) mapa[m[1]] = m[2].trim();
  return mapa;
}
const tokens = tokensRaiz();
function hex(valor, vueltas = 0) {
  const v = valor.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(c => c + c).join('');
  if (v === '#fff' || v === 'white') return '#ffffff';
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  assert.ok(ref && vueltas < 8, `no se puede resolver el color "${valor}"`);
  assert.ok(tokens[ref[1]], `falta el token ${ref[1]}`);
  return hex(tokens[ref[1]], vueltas + 1);
}
function luminancia(h) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) {
  const [x, y] = [luminancia(hex(a)), luminancia(hex(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

test('§A contraste: foco, bordes de campo, texto de acento y texto suave', () => {
  const casos = [
    ['var(--focus-color)', ['var(--paper)', 'var(--paper-dim)', '#ffffff'], 3],
    ['var(--agua)', ['var(--tinta)'], 3],
    ['var(--borde-campo)', ['#ffffff'], 3],
    ['var(--texto-acento)', ['var(--paper)', 'var(--paper-dim)', '#ffffff', 'var(--copia-celeste)', 'var(--copia-verde)', 'var(--copia-lavanda)', 'var(--copia-rosa)'], 4.5],
    ['var(--muted)', ['var(--paper)', 'var(--paper-dim)'], 4.5],
    ['var(--accion)', ['var(--paper)'], 3],
  ];
  for (const [color, fondos, minimo] of casos) {
    for (const fondo of fondos) {
      const r = contraste(color, fondo);
      assert.ok(r >= minimo, `${color} sobre ${fondo}: ${r.toFixed(2)}:1 (mínimo ${minimo}:1)`);
    }
  }
});

test('§A ningún foco usa --gold ni --gold-light', () => {
  const malas = [];
  for (const r of todasLasReglas) {
    const esFoco = /:focus/.test(r.selector);
    for (const decl of r.cuerpo.split(';')) {
      const [prop] = decl.split(':');
      const esOutline = /^\s*outline(-color)?\s*$/.test(prop || '');
      if ((esFoco || esOutline) && /var\(--gold(-light)?\)/.test(decl) && /outline|box-shadow/.test(decl)) {
        malas.push(`${r.archivo} › ${r.selector} › ${decl.trim()}`);
      }
    }
  }
  assert.deepEqual(malas, []);
});

// ---------- §B Valores prohibidos ----------
const prohibidos = [
  /rgba\(\s*201\s*,\s*138\s*,\s*62\s*,/i,
  /rgba\(\s*184\s*,\s*134\s*,\s*59\s*,/i,
  /#171008/i,
  /linear-gradient\(\s*135deg\s*,\s*var\(--gold-light\)\s*,\s*var\(--gold\)\s*\)/i,
];
test('§B no quedan restos de la paleta marrón ni el degradado dorado', () => {
  const hallazgos = [];
  const textos = [{ nombre: 'styles.css', texto: sinComentarios(estilos) }]
    .concat(paginas.map(p => ({ nombre: p, texto: sinSrcdoc(leer(p)) })));
  for (const { nombre, texto } of textos) {
    texto.split('\n').forEach((linea, i) => {
      for (const re of prohibidos) if (re.test(linea)) hallazgos.push(`${nombre}:${i + 1} › ${re}`);
    });
  }
  assert.deepEqual(hallazgos, []);
});

// ---------- §C Forma de los botones ----------
const selectorBoton = /(^|[\s.,>+~])([\w-]*btn[\w-]*|[\w-]*-cta)(?![\w-])/;
const excepcionPildora = /(chip|pill|badge|track|fill|barra|coach-suggestion|credit-coach-input|acct-toggle|ct-process|nav-group-btn|nav-toggle|saved-item-meta)/;
test('§C los botones de acción usan la esquina de 6px', () => {
  const malas = [];
  for (const r of todasLasReglas) {
    if (!selectorBoton.test(r.selector) || excepcionPildora.test(r.selector)) continue;
    const m = /border-radius\s*:\s*([^;]+)/.exec(r.cuerpo);
    if (!m) continue;
    const valor = m[1].trim();
    const pildora = /999px|99px|var\(--radius-pill\)/.test(valor);
    const literalGrande = (valor.match(/(\d+(?:\.\d+)?)px/g) || []).some(px => parseFloat(px) > 6);
    if (pildora || literalGrande) malas.push(`${r.archivo} › ${r.selector} › border-radius:${valor}`);
  }
  assert.deepEqual(malas, []);
});

// ---------- §D MAYÚSCULAS ----------
// Cada excepción lleva su razón.
const mayusculasPermitidas = [];
test('§D ninguna etiqueta en MAYÚSCULAS', () => {
  const malas = todasLasReglas
    .filter(r => /text-transform\s*:\s*uppercase/.test(r.cuerpo))
    .filter(r => !mayusculasPermitidas.some(p => p.archivo === r.archivo && p.selector === r.selector))
    .map(r => `${r.archivo} › ${r.selector}`);
  assert.deepEqual(malas, []);
});

// ---------- §F Una sola definición por componente ----------
const componentes = ['.btn', '.btn-gold', '.btn-light', '.btn-outline', '.btn-outline-dark', '.eyebrow', '.eyebrow-dark'];
const selectoresSueltos = sel => sel.split(',').map(s => s.trim());
test('§F cada componente compartido se define una sola vez, y solo en styles.css', () => {
  for (const comp of componentes) {
    const enEstilos = reglas(estilos).filter(r => !r.enMedia && selectoresSueltos(r.selector).includes(comp));
    assert.equal(enEstilos.length, 1, `${comp} aparece en ${enEstilos.length} reglas de styles.css`);
    for (const p of paginas) {
      const enPagina = reglas(bloquesStyle(sinSrcdoc(leer(p)))).filter(r => selectoresSueltos(r.selector).includes(comp));
      assert.equal(enPagina.length, 0, `${p} redefine ${comp}`);
    }
  }
});

// ---------- §G La cifra legal del hero de credito sale de la misma fuente ----------
test('§G el «7 años» de la hoja de credito coincide con la ficha FCRA §605 de Zyron', () => {
  const credito = leer('credito.html');
  if (!credito.includes('class="papel-muestra')) return;
  const nota = /<div class="papel-muestra-nota">([\s\S]*?)<\/div>/.exec(credito);
  assert.ok(nota, 'la hoja de credito no tiene nota');
  assert.match(nota[1], /7 años/);
  const leyes = leer('zyron-leyes.js');
  assert.match(leyes, /605/);
  assert.match(leyes, /7 años/);
});

// ---------- §H Formularios de respaldo de Netlify ----------
test('§H los formularios de respaldo están ocultos del teclado y del lector de pantalla', () => {
  for (const p of ['agendar.html', 'formar-negocio.html', 'listar-negocio.html']) {
    const html = leer(p);
    const formas = html.match(/<form\b[^>]*data-netlify="true"[^>]*>/g) || [];
    assert.ok(formas.length > 0, `${p}: no hay formulario de Netlify`);
    for (const f of formas) {
      assert.ok(!/class="sr-only"/.test(f), `${p}: usa sr-only → ${f.slice(0, 90)}`);
      assert.match(f, /\shidden(\s|>|=)/, `${p}: falta hidden → ${f.slice(0, 90)}`);
    }
  }
});

// ---------- §I Cinta de arriba uniforme y sin saltos al cambiar de página ----------
test('§I el texto no se agranda ni se achica distinto en cada página del teléfono', () => {
  const html = reglas(estilos).find(r => r.selector === 'html' && !r.enMedia);
  assert.match(html.cuerpo, /-webkit-text-size-adjust\s*:\s*100%/);
  assert.match(html.cuerpo, /(^|;)\s*text-size-adjust\s*:\s*100%/);
});

test('§I transición suave entre páginas, con la cinta quieta y respetando movimiento reducido', () => {
  assert.match(sinComentarios(estilos), /@view-transition\s*\{\s*navigation\s*:\s*auto/);
  assert.match(sinComentarios(estilos), /view-transition-name\s*:\s*site-header/);
  assert.match(sinComentarios(estilos), /prefers-reduced-motion[\s\S]*::view-transition/);
});

test('§I la cinta tiene alto fijo y el logo tamaño fijo', () => {
  const nav = reglas(estilos).find(r => r.selector === '.nav' && !r.enMedia);
  assert.match(nav.cuerpo, /(^|;)\s*height\s*:\s*\d+px/, '.nav necesita height fijo');
  const img = /<img[^>]*class="brand-logo"[^>]*>/.exec(leer('index.html'))[0];
  assert.match(img, /\swidth="\d+"/);
  assert.match(img, /\sheight="\d+"/);
});

test('§I nav.js marca la sección actual aunque el enlace esté en un submenú', () => {
  const nav = leer('nav.js');
  assert.match(nav, /is-active/);
  assert.match(nav, /aria-current/);
});
