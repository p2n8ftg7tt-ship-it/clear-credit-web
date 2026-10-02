/* Interfaz del lector en credito.html: «Tus cuentas, una por una» (spec 013, Fase 1;
   specs/013-lector-credito-metodologia/contracts/ui-cuentas.md).
   Ejecutar:  node --test tests/credito-lector-ui.test.js

   Además de revisar el marcado y el CSS, recorta del script de la página las funciones que dibujan
   las fichas (desde «const MESES_ES=» hasta «function setProgress(») y las ejecuta en Node con los
   reportes SINTÉTICOS de tests/fixtures/credito. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'credito.html'), 'utf8');
const Lector = require('../lector-credito.js');

/* El editor puede reformatear credito.html (espacios, sangrado, una regla CSS por línea). Las
   búsquedas toleran ese formato: el CSS se compacta antes de compararlo y las anclas del script se
   buscan con expresiones que admiten espacios. Lo que se comprueba no cambia. */
const compactarCss = (css) => css.replace(/\s+/g, ' ').replace(/\s*([{};:,()])\s*/g, '$1');
const estilo = compactarCss(html.slice(html.indexOf('<style>'), html.indexOf('</style>')));
const reglasLc = estilo.split('}').filter((r) => r.includes('.lc-'));
const buscar = (patron, desde = 0) => { const i = html.slice(desde).search(patron); return i < 0 ? -1 : desde + i; };

function cuerpoDe(nombre) {
  const inicio = html.indexOf('function ' + nombre + '(');
  assert.ok(inicio >= 0, 'no se encontró la función ' + nombre);
  const siguiente = buscar(/\n[ \t]*function /, inicio + 10);
  return html.slice(inicio, siguiente);
}

/* Carga renderCuentas con un DOM mínimo: cada id es un objeto con innerHTML, textContent y hidden. */
function cargarFichas() {
  const desde = buscar(/[ \t]*const MESES_ES\s*=/);
  const hasta = buscar(/[ \t]*function setProgress\(/, desde);
  assert.ok(desde > 0 && hasta > desde, 'no se encontró el bloque de las fichas');
  const escapar = html.match(/const escapeHtml\s*=[^\n]+/)[0];
  const buros = html.slice(buscar(/[ \t]*const CREDIT_BUREAUS\s*=\s*\{/), buscar(/[ \t]*const US_STATES\s*=/));
  const nodos = {};
  const $ = (id) => (nodos[id] = nodos[id] || { id, innerHTML: '', textContent: '', hidden: true, style: {} });
  const fuente = escapar + '\n' + buros + html.slice(desde, hasta) + '\nreturn {renderCuentas,documentSentence,summaryFromReport};';
  const api = new Function('window', '$', fuente.replace('return {renderCuentas,documentSentence,summaryFromReport};', 'return {renderCuentas,documentSentence,summaryFromReport,renderReportSummary};'))({ ThemoraLector: Lector }, $);
  return { api, nodos, $ };
}

const cargarFixture = (nombre) => JSON.parse(fs.readFileSync(path.join(raiz, 'tests', 'fixtures', 'credito', nombre), 'utf8'));
const FIXTURES = ['equifax.json', 'experian.json', 'transunion.json', 'generico.json'];

/* ----------------------------------------------------------------- marcado */

test('los perfiles cargan antes que el motor, y ambos antes del analizador', () => {
  const perfiles = html.indexOf('<script defer src="lector-credito-perfiles.js">');
  const motor = html.indexOf('<script defer src="lector-credito.js">');
  const analizador = html.indexOf('function evaluateDocument(');
  assert.ok(perfiles > 0, 'falta lector-credito-perfiles.js');
  assert.ok(motor > perfiles, 'lector-credito.js debe cargar después de los perfiles');
  assert.ok(analizador > motor, 'el analizador debe ir después de los módulos');
});

test('existen los ids del contrato §4 dentro de #crResults', () => {
  const resultados = html.slice(html.indexOf('id="crResults"'));
  ['crCuentas', 'crCuentasTitulo', 'crResumenFrase', 'crAvisosLectura', 'crFichas'].forEach((id) => {
    assert.ok(resultados.includes('id="' + id + '"'), 'falta #' + id);
  });
  assert.ok(/<nav class="lc-indice"[^>]*aria-label="Cuentas del reporte"/.test(html));
  assert.ok(html.indexOf('id="crCuentas"') < html.indexOf('<h4>Puntos negativos</h4>'), 'las cuentas van antes de los puntos negativos');
});

test('el botón dice «Leer mi reporte», sin flecha, y la zona de carga ya no tiene el círculo', () => {
  const boton = html.match(/<button class="cr-analyze-btn"[^>]*>([^<]*(?:<span>[^<]*<\/span>)?)<\/button>/);
  assert.ok(boton, 'no se encontró el botón de analizar');
  assert.strictEqual(boton[1], 'Leer mi reporte');
  assert.ok(!html.includes('cr-upload-icon'), 'quedó el círculo con icono');
  assert.ok(!html.includes('cr-spinner'), 'quedó el círculo giratorio');
  assert.ok(html.includes('Sube tu reporte de Equifax, Experian o TransUnion'));
});

test('renderCuentas usa escapeHtml y ni render ni las fichas arman textos con « · »', () => {
  const bloque = html.slice(buscar(/[ \t]*const MESES_ES\s*=/), buscar(/[ \t]*function setProgress\(/));
  assert.ok(cuerpoDe('lcFicha').includes('escapeHtml('));
  assert.ok(!bloque.includes(' · '), 'las fichas usan « · »');
  assert.ok(!cuerpoDe('render').includes(' · '), 'render usa « · »');
  assert.ok(!cuerpoDe('renderFinding').includes(' · '), 'renderFinding usa « · »');
});

test('las reglas .lc- usan solo tokens: sin colores hex y sin tamaños de letra nuevos', () => {
  assert.ok(reglasLc.length > 10, 'no se encontró el CSS .lc-*');
  reglasLc.forEach((regla) => {
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(regla), 'color suelto en: ' + regla.trim().slice(0, 90));
    assert.ok(!/rgba?\(/i.test(regla), 'color rgba suelto en: ' + regla.trim().slice(0, 90));
    const tamanos = regla.match(/font-size:\s*([^;]+)/g) || [];
    tamanos.forEach((t) => assert.ok(/var\(--text-[a-z-]+\)/.test(t), 'tamaño nuevo en: ' + regla.trim().slice(0, 90)));
  });
});

test('movimiento reducido, impresión y teléfono están cubiertos', () => {
  assert.ok(/prefers-reduced-motion:\s*reduce\)\{[^@]*lc-resaltado[^}]*animation:none/.test(estilo), 'el resaltador no respeta movimiento reducido');
  assert.ok(/@media print\{[^@]*\.lc-ficha,\.lc-bloque\{break-inside:avoid/.test(estilo), 'las fichas se pueden cortar al imprimir');
  assert.ok(/max-width:759px\)\{[^@]*\.lc-indice-movil\{display:block/.test(estilo), 'el índice no pasa a desplegable en el teléfono');
});

/* ----------------------------------------------- dibujo con los fixtures */

FIXTURES.forEach((nombre) => {
  test('fichas de ' + nombre + ': una por cuenta, con estado y sin datos sensibles', () => {
    const { api, nodos } = cargarFichas();
    const reporte = Lector.leerReporte(cargarFixture(nombre));
    api.renderCuentas(reporte);
    const fichas = nodos.crFichas.innerHTML;
    assert.strictEqual(nodos.crCuentas.hidden, false);
    assert.strictEqual((fichas.match(/<article class="lc-ficha/g) || []).length, reporte.cuentas.length);
    assert.strictEqual((fichas.match(/ lc-pasada"/g) || []).length, reporte.cuentas.length ? 1 : 0, 'solo la primera ficha se anima');
    reporte.cuentas.forEach((c) => {
      const estado = c.esCobranza ? 'cobranza' : c.cerrada ? 'cerrada' : 'abierta';
      assert.ok(fichas.includes('data-estado="' + estado + '"'));
    });
    assert.ok(!fichas.includes('9999') && !fichas.includes('1976'), 'aparecen el SSN o la fecha de nacimiento');
    assert.ok(!/\d{9,}/.test(fichas), 'aparece un número largo sin enmascarar');
    assert.match(nodos.crResumenFrase.textContent, /^(Encontramos \d+ cuentas?|No encontramos)/);
  });
});

test('el resaltador solo marca DOFD, charge-off y vencido mayor que cero', () => {
  const { api, nodos } = cargarFichas();
  api.renderCuentas(Lector.leerReporte(cargarFixture('equifax.json')));
  const resaltados = [...nodos.crFichas.innerHTML.matchAll(/<dt>([^<]+)<\/dt><dd class="lc-resaltado">/g)].map((m) => m[1]);
  assert.ok(resaltados.length > 0);
  resaltados.forEach((r) => assert.ok(['primer atraso (DOFD)', 'charge-off', 'vencido', 'monto del charge-off'].includes(r), r));
  assert.ok(!/<dt>vencido<\/dt><dd class="lc-resaltado"><span>\$0</.test(nodos.crFichas.innerHTML), 'se resaltó un vencido de $0');
});

test('los campos vacíos dicen «no reportado» y las fechas salen tal como están impresas', () => {
  const { api, nodos } = cargarFichas();
  api.renderCuentas(Lector.leerReporte(cargarFixture('equifax.json')));
  const fichas = nodos.crFichas.innerHTML;
  assert.ok(fichas.includes('<dt>primer atraso (DOFD)</dt><dd class="lc-vacio">no reportado</dd>'));
  assert.ok(fichas.includes('<span>08/18/2019</span>'));
  assert.ok(fichas.includes('De dónde salió cada dato'));
});

test('historial: celdas con mes y estado en palabras, y nota para el mes no verificable', () => {
  const { api, nodos } = cargarFichas();
  api.renderCuentas(Lector.leerReporte(cargarFixture('equifax.json')));
  assert.ok(nodos.crFichas.innerHTML.includes('aria-label="marzo de 2026: 30 días de atraso"'));
  assert.ok(/data-codigo="atraso_30"[^>]*>30<\/span>/.test(nodos.crFichas.innerHTML), 'el atraso no muestra su número dentro');
  api.renderCuentas(Lector.leerReporte(cargarFixture('transunion.json')));
  assert.ok(nodos.crFichas.innerHTML.includes('En 2024 hay un atraso de 30 días cuyo mes no se pudo ubicar.'));
  assert.ok(nodos.crAvisosLectura.hidden === false);
});

test('el texto del reporte se escapa antes de insertarse', () => {
  const { api, nodos } = cargarFichas();
  const reporte = Lector.leerReporte([{ numero: 1, lineas: [
    { texto: 'Experian Credit Report' }, { texto: 'Accounts' },
    { texto: 'Account Name: <img src=x onerror=alert(1)>' }, { texto: 'Balance: $10' }
  ] }]);
  api.renderCuentas(reporte);
  assert.ok(!nodos.crFichas.innerHTML.includes('<img'), 'se insertó HTML del reporte');
  assert.ok(nodos.crFichas.innerHTML.includes('&lt;img'));
});

test('encabezado del documento en una frase, sin « · »', () => {
  const { api } = cargarFichas();
  const reporte = Lector.leerReporte(cargarFixture('equifax.json'));
  const frase = api.documentSentence({ detail: '3 páginas' }, { name: 'Equifax' }, reporte, { esPdf: true });
  assert.strictEqual(frase, 'Reporte de Equifax del 24 de mayo de 2026. Leímos las 3 páginas.');
  const generico = Lector.leerReporte(cargarFixture('generico.json'));
  assert.strictEqual(api.documentSentence({ detail: '' }, { name: '' }, generico, null), 'Reporte de un buró que no reconocimos, con fecha 15 de mayo de 2026.');
});

test('el resumen que se guarda en la cuenta solo lleva números (FR-053)', () => {
  const { api } = cargarFichas();
  const resumen = api.summaryFromReport(Lector.leerReporte(cargarFixture('equifax.json')));
  assert.deepStrictEqual(Object.keys(resumen.accountsSummary), ['count', 'cardCount', 'byType']);
  assert.strictEqual(resumen.accountsSummary.count, 6);
  assert.deepStrictEqual(resumen.inquiriesSummary, { hard: 4, soft: 3, total: 7 });
  assert.ok(!JSON.stringify(resumen).includes('EJEMPLO'), 'el resumen guardado lleva nombres del reporte');
});

test('el resumen del lector dibuja la tabla por tipo y no inventa cero si falló la lectura', () => {
  assert.ok(html.includes('Evaluación del reporte de crédito'));
  const { api } = cargarFichas();
  const resumen = api.renderReportSummary(Lector.leerReporte(cargarFixture('experian-tabla.json')), {}, { name: 'Experian' });
  assert.ok(resumen.includes('<table class="cr-summary-table">'));
  assert.ok(resumen.includes('<caption>Cuentas por tipo</caption>'));
  const incompleto = Lector.leerReporte([{ numero: 1, lineas: [{ texto: 'Experian Credit Report' }, { texto: 'Accounts' }] }]);
  assert.ok(api.renderReportSummary(incompleto, {}, { name: 'Experian' }).includes('No pudimos leer las cuentas'));
});
