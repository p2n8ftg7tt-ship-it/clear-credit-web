const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const paginas = fs.readdirSync(raiz).filter(nombre => nombre.endsWith('.html') && nombre !== 'admin.html').sort();
const leer = nombre => fs.readFileSync(path.join(raiz, nombre), 'utf8');

function extraer(html, tag) {
  const bloque = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i').exec(html);
  assert.ok(bloque, `falta <${tag}>`);
  return bloque[0];
}

function normalizar(bloque) {
  return bloque
    .replace(/\sclass="active"/g, '')
    .replace(/\saria-current="page"/g, '')
    .replace(/\bis-active\b/g, '')
    .replace(/<div class="wrap revision-legal">[\s\S]*?<\/div>\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function diferencia(esperado, actual) {
  let i = 0;
  while (i < esperado.length && esperado[i] === actual[i]) i++;
  return `diferencia en ${i}: esperado "${esperado.slice(i, i + 80)}" recibido "${actual.slice(i, i + 80)}"`;
}

const referencia = leer('index.html');
const cabecera = normalizar(extraer(referencia, 'header'));
const pie = normalizar(extraer(referencia, 'footer'));

for (const pagina of paginas) {
  test(`header igual a index.html: ${pagina}`, () => {
    const actual = normalizar(extraer(leer(pagina), 'header'));
    assert.equal(actual, cabecera, `${pagina}: ${diferencia(cabecera, actual)}`);
  });

  test(`footer igual a index.html: ${pagina}`, () => {
    const actual = normalizar(extraer(leer(pagina), 'footer'));
    assert.equal(actual, pie, `${pagina}: ${diferencia(pie, actual)}`);
  });
}

test('toda página pública incluye estilos y scripts compartidos', () => {
  for (const pagina of paginas) {
    const html = leer(pagina);
    for (const archivo of ['styles.css', 'nav.js', 'empresa.js']) {
      assert.ok(html.includes(archivo), `${pagina}: falta ${archivo}`);
    }
  }
});

// credit-coach.js los carga cuando alguien abre a Zyron (ensureBrain); cargarlos
// con la página son ~185 KB que casi nadie usa.
test('ninguna página carga el cerebro de Zyron de entrada', () => {
  for (const pagina of paginas) {
    const html = leer(pagina);
    for (const archivo of ['zyron-brain.js', 'zyron-leyes.js']) {
      assert.ok(!html.includes(`src="${archivo}"`), `${pagina}: carga ${archivo} de forma estática`);
    }
  }
});

test('cuenta y login no se indexan', () => {
  for (const pagina of ['cuenta.html', 'login.html']) {
    assert.ok(leer(pagina).includes('<meta name="robots" content="noindex">'), `${pagina}: falta noindex`);
  }
});
