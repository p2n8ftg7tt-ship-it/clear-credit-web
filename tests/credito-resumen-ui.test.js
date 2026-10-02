/* Vista del resumen del consumidor en credito.html (especificación 014; contracts/ui-resumen.md).
   Ejecutar:  node --test tests/credito-resumen-ui.test.js

   Revisa el marcado y el CSS, y además recorta del script de la página el bloque entre
   «014-resumen:inicio» y «014-resumen:fin» para ejecutarlo en Node con un DOM mínimo y con
   reportes SINTÉTICOS de tests/fixtures/credito. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'credito.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'styles.css'), 'utf8');
const Lector = require('../lector-credito.js');
const Analista = require('../analista-credito.js');

const compactarCss = (texto) => texto.replace(/\s+/g, ' ').replace(/\s*([{};:,()])\s*/g, '$1');
const estilo = compactarCss(html.slice(html.indexOf('<style>'), html.indexOf('</style>')));
const reglasDe = (prefijo) => estilo.split('}').filter((r) => r.includes(prefijo));
const cargarFixture = (nombre) => JSON.parse(fs.readFileSync(path.join(raiz, 'tests', 'fixtures', 'credito', nombre), 'utf8'));
const analizar = (nombre) => Analista.analizar(Lector.leerReporte(cargarFixture(nombre)));

/* Carga el bloque del resumen con un $ mínimo: cada id es un objeto con innerHTML, textContent y hidden. */
function cargarResumen() {
  const desde = html.indexOf('/* 014-resumen:inicio */');
  const hasta = html.indexOf('/* 014-resumen:fin */');
  assert.ok(desde > 0 && hasta > desde, 'no se encontró el bloque 014-resumen');
  const escapar = html.match(/const escapeHtml\s*=[^\n]+/)[0];
  const nodos = {};
  const $ = (id) => (nodos[id] = nodos[id] || { id, innerHTML: '', textContent: '', hidden: true, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const api = new Function('$', escapar + '\n' + html.slice(desde, hasta) + '\nreturn { renderResumen };')($);
  return { api, nodos };
}

/* ----------------------------------------------------------------- marcado */

test('US1: existen los ids del contrato dentro de #crResults', () => {
  const resultados = html.slice(html.indexOf('id="crResults"'));
  ['crDatosGenerales', 'crDgTitulo', 'crDgFuente', 'crDgLista', 'crConsultasDuras', 'crConsultasBlandas',
    'crCartelDuras', 'crCartelBlandas', 'crAbiertas'].forEach((id) => {
    assert.ok(resultados.includes('id="' + id + '"'), 'falta #' + id);
  });
  ['crConsultasDuras', 'crConsultasBlandas'].forEach((id) => {
    const boton = html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))[0];
    assert.ok(/aria-expanded="false"/.test(boton) && /aria-controls="crCartel(Duras|Blandas)"/.test(boton), id);
  });
  ['crCartelDuras', 'crCartelBlandas'].forEach((id) => {
    const cartel = html.match(new RegExp('<div[^>]*id="' + id + '"[^>]*>'))[0];
    assert.ok(/\bpopover\b/.test(cartel) && /role="dialog"/.test(cartel) && /\bhidden\b/.test(cartel), id);
  });
});

test('US1: analista-credito.js carga después del lector', () => {
  const lector = html.indexOf('<script defer src="lector-credito.js">');
  const analista = html.indexOf('<script defer src="analista-credito.js">');
  assert.ok(lector > 0 && analista > lector);
});

test('US1: el CSS nuevo usa solo tokens y el cartel tiene desplazamiento propio (Review Focus #5)', () => {
  const reglas = [...reglasDe('.cr-dg'), ...reglasDe('.cr-consulta'), ...reglasDe('.cr-cartel'), ...reglasDe('.cr-abiertas')];
  assert.ok(reglas.length > 6, 'no se encontró el CSS del resumen');
  reglas.forEach((regla) => {
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(regla), 'color suelto en: ' + regla.slice(0, 90));
    assert.ok(!/rgba?\(/i.test(regla), 'color rgba suelto en: ' + regla.slice(0, 90));
    assert.ok(!/text-transform:uppercase/.test(regla), 'mayúsculas sostenidas en: ' + regla.slice(0, 90));
  });
  assert.ok(/\.cr-cartel\{[^}]*max-height:[^;}]+;[^}]*overflow:auto/.test(estilo), 'el cartel debe desplazarse por dentro');
});

/* ----------------------------------------------- dibujo con los fixtures */

test('US1: datos generales de experian-resumen.json', () => {
  const { api, nodos } = cargarResumen();
  api.renderResumen(analizar('experian-resumen.json'));
  const lista = nodos.crDgLista.innerHTML;
  assert.strictEqual(nodos.crDgTitulo.textContent, 'Ana Prueba Ejemplo');
  assert.strictEqual(nodos.crDgFuente.textContent, 'Reporte de Experian del 20 de mayo de 2026');
  assert.ok(lista.includes('xxx-xx-4321'));
  assert.ok(lista.includes('(555) 010-0001') && lista.includes('y 1 más'));
  assert.ok(lista.includes('100 Calle Falsa, Ciudad Ejemplo, FL 00000') && lista.includes('y 2 más'));
  assert.ok(lista.includes('5 en total: 2 abiertas, 2 cerradas y 1 en cobranza'));
  assert.ok(!/No visible/.test(lista));
  assert.ok(nodos.crConsultasDuras.innerHTML.includes('<strong>3</strong>'));
  assert.ok(nodos.crConsultasBlandas.innerHTML.includes('<strong>5</strong>'));
  assert.ok(nodos.crCartelDuras.innerHTML.includes('BANCO DEMO') && nodos.crCartelDuras.innerHTML.includes('05/12/2026, 12/20/2025'));
  assert.ok(nodos.crAbiertas.innerHTML.includes('Tarjetas') && nodos.crAbiertas.innerHTML.includes('<strong>2</strong>'));
});

test('US1: sin SSN impreso se dice con franqueza, sin inventar dígitos', () => {
  const { api, nodos } = cargarResumen();
  api.renderResumen(analizar('experian.json'));
  assert.ok(nodos.crDgLista.innerHTML.includes('Este reporte no muestra tu número de Seguro Social'));
  assert.ok(!/xxx-xx-/.test(nodos.crDgLista.innerHTML));
});

test('US1 (Review Focus #3): con el SSN completo impreso solo se pintan los últimos 4', () => {
  const { api, nodos } = cargarResumen();
  const reporte = Lector.leerReporte([{ numero: 1, lineas: ['Experian Credit Report', 'Personal Information', 'Name: ANA PRUEBA', 'Social Security Number: 123-45-6789'].map((texto) => ({ texto })) }]);
  api.renderResumen(Analista.analizar(reporte));
  const todo = Object.values(nodos).map((n) => n.innerHTML + n.textContent).join(' ');
  assert.ok(todo.includes('xxx-xx-6789'));
  assert.ok(!todo.includes('123-45') && !todo.includes('123456789'));
});

test('US1: el texto del reporte se escapa antes de insertarse', () => {
  const { api, nodos } = cargarResumen();
  const reporte = Lector.leerReporte([{ numero: 1, lineas: ['Experian Credit Report', 'Personal Information', 'Address: <img src=x onerror=alert(1)>', 'Hard Inquiries', '<b>BANCO</b>', 'Inquired on: 05/12/2026'].map((texto) => ({ texto })) }]);
  api.renderResumen(Analista.analizar(reporte));
  const todo = Object.values(nodos).map((n) => n.innerHTML).join(' ');
  assert.ok(!todo.includes('<img') && !todo.includes('<b>BANCO'), 'se insertó HTML del reporte');
});
