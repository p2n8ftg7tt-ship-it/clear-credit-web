/* Agente de crédito, lado del navegador (spec 017). Ejecutar: node --test tests/agente-credito-cliente.test.js
   Todos los reportes son SINTÉTICOS. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../agente-credito-cliente.js');
const V = require('../netlify/functions/lib/agente-credito-validar.js');

const FIX = path.join(__dirname, 'fixtures', 'credito');
const cargar = (rel) => JSON.parse(fs.readFileSync(path.join(FIX, rel), 'utf8'));
const valorDe = (v) => (v && v.valor !== undefined && v.valor !== null ? String(v.valor) : null);

/* Todo dato personal crudo que trae un reporte normalizado. */
function datosPersonalesDe(r) {
  const id = r.identidad || {};
  const lista = [].concat(id.nombres || [], id.direcciones || [], id.telefonos || [], id.empleadores || []).map(valorDe);
  lista.push(id.ssnUltimos4 || null);
  r.cuentas.forEach((c) => { lista.push(valorDe(c.numero), valorDe(c.contacto)); });
  return lista.filter((x) => x && x.length >= 4);
}

test('etiquetar: los 5 reportes esperados no dejan salir ningún dato personal (SC-002)', () => {
  const archivos = fs.readdirSync(path.join(FIX, 'esperado')).filter((f) => f.endsWith('.json'));
  let revisados = 0;
  archivos.forEach((f) => {
    const r = cargar('esperado/' + f);
    if (!Array.isArray(r.cuentas)) return; // experian-tabla.json es un resumen, no un Reporte
    const { etiquetado } = C.etiquetarReporte(r);
    const enviado = JSON.stringify(etiquetado);
    datosPersonalesDe(r).forEach((dato) => assert.ok(!enviado.includes(dato), f + ' filtró: ' + dato));
    assert.deepStrictEqual(V.barreraDatosPersonales(etiquetado), { ok: true }, f + ' no debe disparar la barrera');
    revisados++;
  });
  assert.ok(revisados >= 5, 'reportes revisados: ' + revisados);
});

test('etiquetar: identidad con etiquetas y diferencias (equifax)', () => {
  const { etiquetado } = C.etiquetarReporte(cargar('esperado/equifax.json'));
  assert.deepStrictEqual(etiquetado.identidad, {
    nombres: [{ etiqueta: 'Nombre 1', diferencias: [] }, { etiqueta: 'Nombre 2', diferencias: ['solo_inicial_o_tilde'] }],
    direcciones: [{ etiqueta: 'Dirección 1', diferencias: ['actual'] }, { etiqueta: 'Dirección 2', diferencias: ['anterior', 'mismo_estado'] }],
    telefonos: [{ etiqueta: 'Teléfono 1', diferencias: [] }],
    ssnDistintos: 1,
    fechasNacimientoDistintas: 1
  });
});

test('etiquetar: diferencias de nombre, estado y código de área (Review Focus 2)', () => {
  const v = (valor, extra) => Object.assign({ valor, texto: valor }, extra || {});
  const r = {
    cuentas: [],
    identidad: {
      nombres: [v('JOSÉ PÉREZ'), v('JOSE PEREZ'), v('LUIS PEREZ'), v('JOSE GARCIA'), v('CHER')],
      direcciones: [v('1 MAIN ST, MIAMI, FL 33101', { tipo: 'actual' }), v('2 OAK RD, DALLAS, TX 75201', { tipo: 'anterior' }), v('PO BOX SIN ZIP')],
      telefonos: [v('1-305-555-0100'), v('(305) 555-0199'), v('(212) 555-0100')]
    }
  };
  const id = C.etiquetarReporte(r).etiquetado.identidad;
  assert.deepStrictEqual(id.nombres.map((n) => n.diferencias), [[], ['solo_inicial_o_tilde'], ['nombre_de_pila_distinto'], ['apellido_distinto'], ['nombre_de_pila_distinto', 'apellido_distinto']]);
  assert.deepStrictEqual(id.direcciones.map((d) => d.diferencias), [['actual'], ['anterior', 'otro_estado'], ['estado_desconocido']]);
  assert.deepStrictEqual(id.telefonos.map((t) => t.diferencias), [[], ['mismo_codigo_de_area'], ['otro_codigo_de_area']]);
});

test('etiquetar: cuentas con letra, valores simples y sin número ni contacto (ACME/ZETA)', () => {
  const { etiquetado, paraHerramientas } = C.etiquetarReporte(cargar('agente/acme-zeta.json'));
  assert.deepStrictEqual(etiquetado.cuentas.map((c) => c.letra), ['A', 'B', 'C', 'D']);
  const a = etiquetado.cuentas[0];
  assert.strictEqual(a.acreedor, 'ACME BANK');
  assert.strictEqual(a.saldo, 1284);
  assert.strictEqual(a.dofd, '2021-03');
  assert.strictEqual(a.cerrada, true);
  assert.deepStrictEqual(a.comentarios, ['Account sold to another lender']);
  assert.strictEqual(etiquetado.cuentas[1].acreedorOriginal, 'ACME BANK');
  assert.strictEqual(etiquetado.cuentas[2].limite, 1000);
  etiquetado.cuentas.forEach((c) => ['id', 'numero', 'contacto', 'origen'].forEach((k) => assert.ok(!(k in c), k)));
  assert.ok(!JSON.stringify(etiquetado).includes('"origen"'));
  assert.deepStrictEqual(paraHerramientas.cuentas.map((c) => c.id), ['A', 'B', 'C', 'D']);
  assert.strictEqual(etiquetado.consultas.length, 5);
  assert.deepStrictEqual(etiquetado.consultas[0], { empresa: 'CAPITAL DEMO', fecha: '2026-02-14', tipo: 'dura' });
});

test('etiquetar: enmascara números largos, teléfonos y correos en comentarios (Review Focus 1)', () => {
  const r = cargar('agente/acme-zeta.json');
  r.cuentas[0].comentarios = [
    { valor: 'ACCT 4417123412341234 sold', texto: 'x' },
    { valor: 'Call (800) 555-0199 or mail cobros@demo.com', texto: 'x' },
    { valor: 'Ref 123-45-6789', texto: 'x' }
  ];
  const { etiquetado } = C.etiquetarReporte(r);
  assert.deepStrictEqual(etiquetado.cuentas[0].comentarios, ['ACCT [número] sold', 'Call [teléfono] or mail [correo]', 'Ref [número]']);
  assert.deepStrictEqual(V.barreraDatosPersonales(etiquetado), { ok: true });
});

test('etiquetar: rechaza lo que no es un Reporte', () => {
  assert.throws(() => C.etiquetarReporte(null), TypeError);
  assert.throws(() => C.etiquetarReporte({ cuentas: 5 }), TypeError);
});
/* ---------------------------------------------------- ciclo y respaldo (Task 6) */
const AY = require('./agente-credito-ayuda.js');

const haciaFuncion = (handler) => async (url, init) => {
  const r = await handler({ httpMethod: 'POST', body: init.body });
  return { status: r.statusCode, json: async () => JSON.parse(r.body) };
};
const EVENTO = /^(etiquetando|enviando:[1-6]|reintentando:[1-6]|herramienta:[A-Za-z]+(:[A-Z]{1,3})?|terminado|respaldo:[a-z_]+)$/;

test('ciclo completo ACME/ZETA con la función y una IA simulada (SC-001)', async () => {
  const e = AY.crearEntorno({ respuestasIA: [AY.pideHerramientas(AY.PEDIDOS_ACME), AY.termina(AY.RESULTADO_VALIDO)] });
  const eventos = [];
  const r = await C.analizarConAgente(AY.acme(), { accessToken: 'bueno', fetch: haciaFuncion(e.handler), onEvento: (x) => eventos.push(x) });
  assert.deepStrictEqual(r, Object.assign({ modo: 'ia', hoy: '2026-10-01' }, AY.RESULTADO_VALIDO));
  assert.deepStrictEqual(eventos, ['etiquetando', 'enviando:1', 'herramienta:calcularFechaSalida:A', 'herramienta:calcularFechaSalida:B',
    'herramienta:calcularUtilizacion', 'herramienta:buscarPosiblesDuplicados', 'herramienta:contarConsultasDuras', 'enviando:2', 'terminado']);
  eventos.forEach((x) => assert.match(x, EVENTO));
});

test('sin sesión → análisis local sin llamar al servidor', async () => {
  let llamadas = 0;
  const r = await C.analizarConAgente(AY.acme(), { fetch: async () => { llamadas++; }, onEvento: () => {} });
  assert.strictEqual(llamadas, 0);
  assert.strictEqual(r.modo, 'local');
  assert.strictEqual(r.motivo, 'sin_sesion');
  assert.strictEqual(r.herramientas.utilizacion.total.porcentaje, 89);
  assert.strictEqual(r.herramientas.duplicados.length, 1);
});

test('cada respaldo del servidor termina en análisis local con su motivo (SC-003)', async () => {
  for (const [opc, motivo] of [[{ rpc: false }, 'limite_diario'], [{ entorno: { AGENTE_CREDITO_SECRETO: '' } }, 'no_configurado'],
    [{ respuestasIA: [{ stop_reason: 'refusal', content: [] }] }, 'ia_no_disponible']]) {
    const e = AY.crearEntorno(opc);
    const r = await C.analizarConAgente(AY.acme(), { accessToken: 'bueno', fetch: haciaFuncion(e.handler) });
    assert.strictEqual(r.modo, 'local', motivo);
    assert.strictEqual(r.motivo, motivo);
    assert.ok(r.herramientas.fechasSalida.length === 4);
  }
});

test('IA lenta: reintenta una vez sin sumar uso y luego responde (FR-024)', async () => {
  const lenta = () => { const err = new Error('x'); err.name = 'AbortError'; throw err; };
  const e = AY.crearEntorno({ respuestasIA: [lenta, AY.pideHerramientas(AY.PEDIDOS_ACME), AY.termina(AY.RESULTADO_VALIDO)] });
  const eventos = [];
  const r = await C.analizarConAgente(AY.acme(), { accessToken: 'bueno', fetch: haciaFuncion(e.handler), onEvento: (x) => eventos.push(x) });
  assert.strictEqual(r.modo, 'ia');
  assert.ok(eventos.includes('reintentando:1'));
  assert.strictEqual(e.llamadas.rpc, 1, 'el reintento usa el pase de reintento: un solo uso');
});

test('respuesta que no es JSON o red caída → reintento y luego ia_no_disponible (Review Focus 5)', async () => {
  let intentos = 0;
  const html = async () => { intentos++; return { status: 502, json: async () => { throw new SyntaxError('<html>'); } }; };
  const r = await C.analizarConAgente(AY.acme(), { accessToken: 'bueno', fetch: html });
  assert.deepStrictEqual([r.modo, r.motivo, r.reintentable, intentos], ['local', 'ia_no_disponible', true, 2]);
  const caida = async () => { throw new TypeError('Failed to fetch'); };
  const r2 = await C.analizarConAgente(AY.acme(), { accessToken: 'bueno', fetch: caida });
  assert.deepStrictEqual([r2.modo, r2.motivo], ['local', 'ia_no_disponible']);
});

test('herramienta para una cuenta que no existe → tool_result con error y el ciclo sigue (Review Focus 4)', async () => {
  // Z no existe; el resto son los pedidos de ACME, que el resultado válido necesita como fuente de sus números.
  const e = AY.crearEntorno({ respuestasIA: [AY.pideHerramientas([['calcularFechaSalida', { cuenta: 'Z' }]].concat(AY.PEDIDOS_ACME)), AY.termina(AY.RESULTADO_VALIDO)] });
  const r = await C.analizarConAgente(AY.acme(), { accessToken: 'bueno', fetch: haciaFuncion(e.handler) });
  assert.strictEqual(r.modo, 'ia');
  const enviados = e.llamadas.anthropic[1].body.messages.slice(-1)[0].content;
  assert.strictEqual(enviados[0].is_error, true);
  assert.match(enviados[0].content, /^error:/);
  assert.ok(!enviados[1].is_error);
});

test('nunca se rechaza: reporte inválido → análisis local', async () => {
  const r = await C.analizarConAgente(null, { accessToken: 'bueno', fetch: async () => ({}) });
  assert.deepStrictEqual([r.modo, r.motivo], ['local', 'datos_rechazados']);
  assert.deepStrictEqual(r.herramientas, { fechasSalida: null, utilizacion: null, duplicados: null, consultasDuras: null });
});

test('analisisLocal usa el «hoy» dado y limpia textos', () => {
  const { paraHerramientas } = C.etiquetarReporte(AY.acme());
  const r = C.analisisLocal(paraHerramientas, { hoy: '2026-10-01', motivo: 'limite_diario' });
  assert.strictEqual(r.hoy, '2026-10-01');
  assert.strictEqual(r.herramientas.consultasDuras.total, 2);
  assert.strictEqual(r.herramientas.fechasSalida[0].fechas[0].salida, '2028-09');
});
