/* El agente dentro de credito.html (spec 019, Tasks 4 y 5).
   Ejecutar:  node --test tests/credito-agente-ui.test.js

   Lee la página como texto y, además, recorta el bloque «019-agente:inicio» … «019-agente:fin» para
   ejecutarlo en Node con un DOM mínimo y los módulos reales del agente. Datos SINTÉTICOS. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'credito.html'), 'utf8');
const Vista = require('../agente-credito-vista.js');
const CartasAgente = require('../cartas-agente.js');
const Cliente = require('../agente-credito-cliente.js');
const AY = require('./agente-credito-ayuda.js');

const compactarCss = (texto) => texto.replace(/\s+/g, ' ').replace(/\s*([{};:,()])\s*/g, '$1');
const estilo = compactarCss(html.slice(html.indexOf('<style>'), html.indexOf('</style>')));

function bloque() {
  const desde = html.indexOf('/* 019-agente:inicio */');
  const hasta = html.indexOf('/* 019-agente:fin */');
  assert.ok(desde > 0 && hasta > desde, 'no se encontró el bloque 019-agente');
  return html.slice(desde, hasta);
}

/* DOM mínimo: nodos por id con innerHTML/hidden/atributos; #crPasos acepta hijos. */
function crearEntornoPagina(opc) {
  const o = opc || {};
  const nodos = {};
  const nodo = (id) => (nodos[id] = nodos[id] || { id, innerHTML: '', textContent: '', hidden: true, disabled: false, hijos: [], attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(h) { this.hijos.push(h); }, querySelectorAll(sel) { return sel === '[data-agente]' ? this.hijos.slice() : []; } });
  const $ = (id) => nodo(id);
  const document = { createElement: () => ({ dataset: {}, textContent: '', remove() { const l = nodo('crPasos').hijos; l.splice(l.indexOf(this), 1); } }) };
  const llamadas = { agente: [], eventos: [], copiado: [] };
  const window = {
    ThemoraAgenteVista: Vista,
    ThemoraCartasAgente: CartasAgente,
    ThemoraAgenteCredito: Object.assign({}, Cliente, {
      analizarConAgente: o.analizarConAgente || (async (reporte, op) => {
        llamadas.agente.push(op);
        ['etiquetando', 'enviando:1', 'herramienta:calcularFechaSalida:A', 'terminado'].forEach((e) => op.onEvento(e));
        return Object.assign({ modo: 'ia', hoy: '2026-10-01' }, AY.RESULTADO_VALIDO);
      })
    }),
    CCAuth: { getAccessToken: () => (o.token === undefined ? 'bueno' : o.token) },
    ThemoraStats: { evento: (e) => llamadas.eventos.push(e) }
  };
  const navigator = { clipboard: { writeText: async (t) => { llamadas.copiado.push(t); } } };
  const api = new Function('$', 'document', 'window', 'navigator', bloque() + '\nreturn { iniciarAgente, limpiarAgente, alPedirAgente, alConfirmarMarcas, alCancelarMarcas, alCambiarCampo, alConfirmar, alCopiar, seccionAgenteParaCuenta, estadoAgente };')($, document, window, navigator);
  return { api, nodos, llamadas, window };
}

const REM = { givenNames: 'ANA', firstSurname: 'RUIZ', secondSurname: '', street: '1 MAIN ST', city: 'MIAMI', state: 'FL', postalCode: '33101', currentPhone: '3055550100' };

/* ----------------------------------------------------------------- marcado y scripts */

test('scripts del agente con defer, en orden y después del analista (D2)', () => {
  const pos = ['analista-credito.js', 'herramientas-credito.js', 'agente-credito-cliente.js', 'cartas-agente.js', 'agente-credito-vista.js']
    .map((f) => html.indexOf('<script defer src="' + f + '"></script>'));
  pos.forEach((p, i) => assert.ok(p > 0, 'falta el script ' + i));
  pos.reduce((a, b) => { assert.ok(b > a, 'orden de carga'); return b; });
});

test('marcado del agente dentro de #crResults', () => {
  const r = html.slice(html.indexOf('id="crResults"'), html.indexOf('id="crResetButton"'));
  assert.match(r, /<section class="cr-agente" id="crAgente" aria-labelledby="crAgenteT"/);
  assert.match(r, /<h3 id="crAgenteT">Análisis con el agente<\/h3>/);
  assert.match(r, /<button type="button"[^>]*id="crAgenteBoton"[^>]*data-umami-event="agente-pedido"[^>]*>Analizar con el agente<\/button>/);
  ['id="crAgenteSesion"', 'id="crMarcar"', 'id="crAgenteResultado"', 'id="crCartasLista"'].forEach((x) => assert.ok(r.includes(x), x));
  assert.match(r, /<section class="cr-cartas-agente" id="crCartasAgente" aria-labelledby="crCartasAgenteT" hidden>/);
  assert.match(r, /<h3 id="crCartasAgenteT">Tus cartas<\/h3>/);
  assert.match(r, /Gratis, hasta 3 análisis por día/);
});

test('el bloque usa los módulos del agente y nunca envía nada por su cuenta', () => {
  const b = bloque();
  ['analizarConAgente(', 'CCAuth.getAccessToken', 'letrasDe(', 'crearBorradores(', 'actualizarDatos(', 'confirmar(', 'textoFinal(', 'renderAgenteEnCirculo(', 'navigator.clipboard'].forEach((x) => assert.ok(b.includes(x), x));
  assert.ok(!/mailto:|fetch\(/.test(b));
  (b.match(/innerHTML = [^;]+;/g) || []).forEach((l) => assert.ok(/V\(\)\.render|= ''/.test(l), 'innerHTML sin pasar por la vista: ' + l));
});

test('CSS del agente con tokens y en una columna en el teléfono', () => {
  const reglas = estilo.split('}').filter((r) => /\.cr-agente|\.cr-marcar|\.cr-fuente|\.cr-carta-agente/.test(r)).join('}');
  assert.ok(reglas.length > 0);
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(reglas), 'sin colores sueltos');
  assert.match(estilo, /@media\(max-width:600px\)\{[^@]*\.cr-carta-agente/);
});

/* ----------------------------------------------------------------- comportamiento */

const reporteAcme = () => AY.acme();

test('sin sesión: invita a iniciar sesión y no llama al agente (SC-004)', () => {
  const { api, nodos, llamadas } = crearEntornoPagina({ token: null });
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  assert.strictEqual(nodos.crAgenteSesion.hidden, false);
  assert.strictEqual((nodos.crMarcar || { hidden: true }).hidden, true);
  assert.strictEqual(llamadas.agente.length, 0);
});

test('con sesión: lista de marcas; cancelar no llama; confirmar llama una sola vez aunque se envíe dos veces', async () => {
  const { api, nodos, llamadas } = crearEntornoPagina();
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  assert.strictEqual(nodos.crMarcar.hidden, false);
  assert.match(nodos.crMarcar.innerHTML, /¿Hay algo que no reconoces\?/);
  api.alCancelarMarcas();
  assert.strictEqual(nodos.crMarcar.hidden, true);
  assert.strictEqual(llamadas.agente.length, 0);
  api.alPedirAgente();
  await Promise.all([api.alConfirmarMarcas(['B'], []), api.alConfirmarMarcas(['B'], [])]);
  assert.strictEqual(llamadas.agente.length, 1, 'una sola llamada (Review Focus 2)');
  assert.deepStrictEqual(llamadas.agente[0].marcadas, { cuentaIds: ['B'], datos: [] });
  assert.strictEqual(llamadas.agente[0].accessToken, 'bueno');
});

test('resultado: pasos en #crPasos, «Lo que encontró el agente» y una tarjeta de carta', async () => {
  const { api, nodos, llamadas } = crearEntornoPagina();
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  await api.alConfirmarMarcas([], []);
  const pasos = nodos.crPasos.hijos.map((h) => h.textContent);
  assert.deepStrictEqual(pasos, ['Quitando tus datos personales antes de enviar', 'Enviando tu reporte sin datos personales al agente',
    'Calculando hasta cuándo puede aparecer la cuenta A (ACME BANK)', 'Listo']);
  assert.strictEqual(nodos.crAgenteResultado.hidden, false);
  assert.match(nodos.crAgenteResultado.innerHTML, /Lo que encontró el agente/);
  assert.strictEqual(nodos.crCartasAgente.hidden, false);
  assert.strictEqual((nodos.crCartasLista.innerHTML.match(/class="cr-carta-agente"/g) || []).length, 1);
  assert.ok(llamadas.eventos.includes('agente-terminado'));
  assert.match(api.seccionAgenteParaCuenta('A'), /Lo que dice el agente/);
  assert.strictEqual(api.seccionAgenteParaCuenta('D'), '');
});

test('volver a pedir el agente avisa que gasta otro análisis', async () => {
  const { api, nodos } = crearEntornoPagina();
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  await api.alConfirmarMarcas([], []);
  api.alPedirAgente();
  assert.strictEqual(nodos.crAgenteAviso.hidden, false);
  assert.match(nodos.crAgenteAviso.textContent, /otro de tus 3 análisis/);
});

test('limpiarAgente vacía el resultado, las marcas y las cartas (Review Focus 3)', async () => {
  const { api, nodos } = crearEntornoPagina();
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  await api.alConfirmarMarcas([], []);
  api.limpiarAgente();
  ['crMarcar', 'crAgenteResultado', 'crCartasAgente'].forEach((id) => assert.strictEqual(nodos[id].hidden, true, id));
  assert.strictEqual(nodos.crAgenteResultado.innerHTML, '');
  assert.strictEqual(nodos.crCartasLista.innerHTML, '');
  assert.strictEqual(nodos.crPasos.hijos.length, 0);
  assert.deepStrictEqual(api.estadoAgente.borradores, []);
});

test('respaldo local: motivo en español y sin tarjetas de cartas', async () => {
  const { api, nodos, llamadas } = crearEntornoPagina({ analizarConAgente: async (r, op) => { op.onEvento('respaldo:limite_diario'); return Cliente.analisisLocal(Cliente.etiquetarReporte(r).paraHerramientas, { hoy: '2026-10-01', motivo: 'limite_diario' }); } });
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  await api.alConfirmarMarcas([], []);
  assert.match(nodos.crAgenteResultado.innerHTML, /Ya usaste tus 3 análisis con IA de hoy/);
  assert.strictEqual(nodos.crCartasAgente.hidden, true);
  assert.ok(llamadas.eventos.includes('agente-respaldo'));
});

/* ----------------------------------------------------------------- Task 5: recorrido completo (SC-001) */

test('recorrido completo con la función real y la IA simulada: carta aprobada y copiada solo en inglés', async () => {
  const e = AY.crearEntorno({ respuestasIA: [AY.pideHerramientas(AY.PEDIDOS_ACME), AY.termina(AY.RESULTADO_VALIDO)] });
  const fetchF = async (url, init) => { const r = await e.handler({ httpMethod: 'POST', body: init.body }); return { status: r.statusCode, json: async () => JSON.parse(r.body) }; };
  const { api, nodos, llamadas } = crearEntornoPagina({ analizarConAgente: (reporte, op) => Cliente.analizarConAgente(reporte, Object.assign({}, op, { fetch: fetchF })) });
  api.iniciarAgente(reporteAcme(), null);
  api.alPedirAgente();
  await api.alConfirmarMarcas([], []);
  const id = api.estadoAgente.borradores[0].id;
  Object.keys(REM).forEach((k) => api.alCambiarCampo(id, 'remitente.' + k, REM[k]));
  api.alConfirmar(id, 'inexacta', true);
  api.alConfirmar(id, 'yoEnvio', true);
  assert.match(nodos.crCartasLista.innerHTML, /data-estado="aprobada"/);
  assert.match(nodos.crCartasLista.innerHTML, /ACCOUNTS I AM DISPUTING/);
  assert.ok(llamadas.eventos.includes('carta-aprobada'));
  await api.alCopiar(id);
  assert.strictEqual(llamadas.copiado.length, 1);
  assert.ok(llamadas.copiado[0].includes('Equifax Information Services LLC'));
  assert.ok(!llamadas.copiado[0].includes('CUENTAS QUE DISPUTO'), 'se copia solo el inglés');
  assert.ok(llamadas.eventos.includes('carta-copiada'));
  api.alCambiarCampo(id, 'remitente.street', '2 OAK RD');
  assert.match(nodos.crCartasLista.innerHTML, /data-estado="borrador"/);
});
