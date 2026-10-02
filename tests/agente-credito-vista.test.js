/* Vista del agente en credito.html (spec 019). Ejecutar: node --test tests/agente-credito-vista.test.js. Datos SINTÉTICOS. */
const test = require('node:test');
const assert = require('node:assert');
const V = require('../agente-credito-vista.js');
const AY = require('./agente-credito-ayuda.js');
const C = require('../agente-credito-cliente.js');

const PROHIBIDAS = /\bdebes\b|ilegal|garantiz|debe eliminarse|subir[aá] tu puntaje|\bclientes?\b/i;
const privado = () => C.etiquetarReporte(AY.acme()).privado;
const IA = () => Object.assign({ modo: 'ia', hoy: '2026-10-01' }, AY.RESULTADO_VALIDO);

test('textoEvento: tabla del contrato, con el acreedor de la cuenta', () => {
  const p = privado();
  assert.strictEqual(V.textoEvento('etiquetando', p), 'Quitando tus datos personales antes de enviar');
  assert.strictEqual(V.textoEvento('enviando:1', p), 'Enviando tu reporte sin datos personales al agente');
  assert.strictEqual(V.textoEvento('enviando:3', p), 'El agente sigue revisando (paso 3)');
  assert.strictEqual(V.textoEvento('herramienta:calcularFechaSalida:B', p), 'Calculando hasta cuándo puede aparecer la cuenta B (ZETA COLLECTIONS)');
  assert.strictEqual(V.textoEvento('herramienta:calcularFechaSalida:Z', p), 'Calculando hasta cuándo puede aparecer la cuenta Z');
  assert.strictEqual(V.textoEvento('respaldo:limite_diario', p), V.MOTIVO_RESPALDO.limite_diario);
  assert.strictEqual(V.textoEvento('terminado', p), 'Listo');
  assert.strictEqual(V.textoEvento('raro', p), 'Trabajando…');
});

test('renderMarcar: casillas sin marcar, valores escapados (Review Focus 1)', () => {
  const html = V.renderMarcar({ cuentas: [{ id: 'A', acreedor: 'ACME <script>x</script>', frase: 'Charge-off, mar. 2021' }], datos: [{ etiqueta: 'Nombre 2', tipo: 'Nombre', valor: 'ANA "R"' }] });
  assert.match(html, /name="marca-cuenta" value="A"/);
  assert.match(html, /name="marca-dato" value="Nombre 2"/);
  assert.ok(!/checked/.test(html));
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('&quot;R&quot;'));
  assert.match(html, /¿Hay algo que no reconoces\?/);
  assert.match(html, /data-accion="cancelar-marcar"/);
});

test('renderResultado ia: seis partes, cuentas con nombre, fuente de cada hecho y aviso', () => {
  const html = V.renderResultado(IA(), privado());
  ['Lo que encontró el agente', 'Cuenta A (ACME BANK)', 'Disputar', 'Pagar', 'Esperar', 'data-fuente="reporte"', 'data-fuente="herramienta"',
    'del reporte', 'calculado', 'Preguntas para ti', 'Para verificar', V.AVISO].forEach((x) => assert.ok(html.includes(x), x));
  assert.ok(!PROHIBIDAS.test(html.replace(V.AVISO, '')));
});

test('renderResultado ia: listas vacías no pintan su título (Review Focus 4)', () => {
  const r = IA(); r.despues = []; r.datosPersonales = [];
  const html = V.renderResultado(r, privado());
  assert.ok(!html.includes('Después') && !html.includes('Datos personales para revisar'));
});

test('renderResultado local: motivo y las cuatro herramientas', () => {
  const { paraHerramientas } = C.etiquetarReporte(AY.acme());
  const local = C.analisisLocal(paraHerramientas, { hoy: '2026-10-01', motivo: 'limite_diario' });
  const html = V.renderResultado(local, privado());
  [V.MOTIVO_RESPALDO.limite_diario, 'Fechas de salida', '2028-09', 'estimada', 'Uso de tus tarjetas', '89%', 'Posibles deudas repetidas', 'Consultas duras en 12 meses', V.AVISO]
    .forEach((x) => assert.ok(html.includes(x), x));
  const sinDatos = Object.assign({}, local, { herramientas: { fechasSalida: null, utilizacion: null, duplicados: null, consultasDuras: null } });
  assert.ok(V.renderResultado(sinDatos, privado()).includes('No se pudo calcular'));
});

test('renderAgenteEnCirculo: solo los pasos de esa cuenta', () => {
  const html = V.renderAgenteEnCirculo(IA(), 'A', privado());
  assert.ok(html.includes('Lo que dice el agente') && html.includes('Disputar') && !html.includes('Pagar'));
  assert.strictEqual(V.renderAgenteEnCirculo(IA(), 'D', privado()), '');
  assert.strictEqual(V.renderAgenteEnCirculo({ modo: 'local' }, 'A', privado()), '');
});

test('escapar cubre & < > " \'', () => {
  assert.strictEqual(V.escapar('a&b<c>"d\'e'), 'a&amp;b&lt;c&gt;&quot;d&#39;e');
});
