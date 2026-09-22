/* Pruebas de la función de autocompletado de direcciones.
   Ejecutar:  node --test tests/autocompletar-direccion.test.js
   Google se simula: aquí no sale ninguna petición real ni se gasta cuota. */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const RUTA = path.join(__dirname, '..', 'netlify', 'functions', 'autocompletar-direccion.js');
const LLAVE = 'LLAVE-SECRETA-DE-PRUEBA';
const SESION = 'sesion-de-prueba-0123456789';

process.env.GOOGLE_PLACES_API_KEY = LLAVE;
const modulo = require(RUTA);
const { handler } = modulo;
const prueba = modulo.__prueba;

let llamadas = [];
let respuestaGoogle = null;
const fetchReal = global.fetch;
const consolaReal = { error: console.error };
let errores = [];

test.beforeEach(() => {
  llamadas = [];
  errores = [];
  prueba.porIp.clear();
  prueba.porSesion.clear();
  process.env.GOOGLE_PLACES_API_KEY = LLAVE;
  respuestaGoogle = { ok: true, status: 200, json: async () => ({}) };
  global.fetch = async (url, opciones) => { llamadas.push({ url: String(url), opciones: opciones || {} }); return respuestaGoogle; };
  console.error = (...a) => { errores.push(a.join(' ')); };
});
test.afterEach(() => { global.fetch = fetchReal; console.error = consolaReal.error; });

function evento(cuerpo, extra) {
  return Object.assign({
    httpMethod: 'POST',
    headers: { origin: 'https://mithemora.com', 'x-nf-client-connection-ip': '203.0.113.7' },
    body: JSON.stringify(cuerpo)
  }, extra || {});
}
const sugerir = (texto, sesion) => handler(evento({ accion: 'sugerir', texto, sesion: sesion || SESION }));
const detalle = (id) => handler(evento({ accion: 'detalle', id, sesion: SESION }));

/* ---------- lo que sale hacia Google ---------- */

test('sugerir: pide solo Estados Unidos, con el token de sesión, y la llave va en la cabecera', async () => {
  respuestaGoogle.json = async () => ({ suggestions: [] });
  const r = await sugerir('1600 Pennsylvania');
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(llamadas.length, 1);
  const c = llamadas[0];
  assert.match(c.url, /places\.googleapis\.com\/v1\/places:autocomplete$/);
  assert.ok(!c.url.includes(LLAVE), 'la llave no puede ir en la URL');
  assert.strictEqual(c.opciones.headers['X-Goog-Api-Key'], LLAVE);
  const enviado = JSON.parse(c.opciones.body);
  assert.deepStrictEqual(enviado.includedRegionCodes, ['us']);
  assert.strictEqual(enviado.sessionToken, SESION);
  assert.strictEqual(enviado.input, '1600 Pennsylvania');
});

test('la respuesta nunca contiene la llave y no se cachea', async () => {
  respuestaGoogle.json = async () => ({ suggestions: [] });
  const r = await sugerir('1600 Pennsylvania');
  assert.ok(!r.body.includes(LLAVE));
  assert.strictEqual(r.headers['Cache-Control'], 'no-store');
});

test('con menos de 4 caracteres no se llama a Google', async () => {
  const r = await sugerir('12');
  assert.strictEqual(r.statusCode, 200);
  assert.deepStrictEqual(JSON.parse(r.body).sugerencias, []);
  assert.strictEqual(llamadas.length, 0);
});

test('un seguro social o una tarjeta en el campo NO viajan a Google', async () => {
  for (const texto of ['123-45-6789 calle', '4111 1111 1111 1111', '123456789 main']) {
    const r = await sugerir(texto);
    assert.strictEqual(r.statusCode, 400, texto);
  }
  assert.strictEqual(llamadas.length, 0);
});

/* ---------- sugerencias ---------- */

test('las sugerencias dejan las direcciones y quitan negocios, ciudades y calles sin número', async () => {
  const p = (id, tipos, principal) => ({ placePrediction: { placeId: id, types: tipos,
    structuredFormat: { mainText: { text: principal }, secondaryText: { text: 'Washington, DC, USA' } } } });
  respuestaGoogle.json = async () => ({ suggestions: [
    p('ChIJ-direccion-uno', ['street_address'], '1600 Pennsylvania Avenue NW'),
    p('ChIJ-negocio-dos-xx', ['cafe', 'establishment', 'point_of_interest'], 'Starbucks'),
    p('ChIJ-ciudad-tres-xx', ['locality', 'political'], 'Washington'),
    p('ChIJ-ruta-cuatro-xx', ['route'], 'Pennsylvania Avenue'),
    p('ChIJ-unidad-cinco-x', ['subpremise'], '1600 Pennsylvania Ave NW #4'),
    p('ChIJ-sin-tipos-seis', undefined, '1601 Pennsylvania Ave')
  ] });
  const r = await sugerir('1600 Pennsylvania');
  const s = JSON.parse(r.body).sugerencias;
  assert.deepStrictEqual(s.map((x) => x.principal),
    ['1600 Pennsylvania Avenue NW', '1600 Pennsylvania Ave NW #4', '1601 Pennsylvania Ave']);
  assert.strictEqual(s[0].secundario, 'Washington, DC, USA');
});

test('nunca se devuelven más de 5 sugerencias', async () => {
  const muchas = Array.from({ length: 9 }, (_, i) => ({ placePrediction: { placeId: 'ChIJ-lugar-numero-' + i, types: ['street_address'],
    text: { text: i + ' Main St' } } }));
  respuestaGoogle.json = async () => ({ suggestions: muchas });
  assert.strictEqual(JSON.parse((await sugerir('main street')).body).sugerencias.length, 5);
});

/* ---------- detalle ---------- */

const componentes = (extra) => ({ addressComponents: [
  { longText: '1600', shortText: '1600', types: ['street_number'] },
  { longText: 'Pennsylvania Avenue Northwest', shortText: 'Pennsylvania Ave NW', types: ['route'] },
  { longText: 'Washington', shortText: 'Washington', types: ['locality', 'political'] },
  { longText: 'District of Columbia', shortText: 'DC', types: ['administrative_area_level_1', 'political'] },
  { longText: '20500', shortText: '20500', types: ['postal_code'] }
].concat(extra || []) });

test('detalle: separa calle, ciudad, estado (2 letras) y código postal', async () => {
  respuestaGoogle.json = async () => componentes();
  const r = await detalle('ChIJ-direccion-uno');
  const d = JSON.parse(r.body).direccion;
  assert.deepStrictEqual(d, { calle: '1600 Pennsylvania Avenue Northwest', ciudad: 'Washington', estado: 'DC', cp: '20500', completa: true });
  const c = llamadas[0];
  assert.match(c.url, /\/v1\/places\/ChIJ-direccion-uno\?sessionToken=/);
  assert.strictEqual(c.opciones.headers['X-Goog-FieldMask'], 'addressComponents');
});

test('detalle: agrega la unidad y el sufijo del código postal si vienen', async () => {
  respuestaGoogle.json = async () => componentes([
    { longText: '4', shortText: '4', types: ['subpremise'] },
    { longText: '0004', shortText: '0004', types: ['postal_code_suffix'] }
  ]);
  const d = JSON.parse((await detalle('ChIJ-direccion-uno')).body).direccion;
  assert.strictEqual(d.calle, '1600 Pennsylvania Avenue Northwest #4');
  assert.strictEqual(d.cp, '20500-0004');
});

test('detalle: si falta la ciudad usa las alternativas y marca la dirección como incompleta si falta algo', async () => {
  respuestaGoogle.json = async () => ({ addressComponents: [
    { longText: '5', shortText: '5', types: ['street_number'] },
    { longText: 'Ocean Dr', shortText: 'Ocean Dr', types: ['route'] },
    { longText: 'Brooklyn', shortText: 'Brooklyn', types: ['sublocality_level_1'] },
    { longText: 'New York', shortText: 'NY', types: ['administrative_area_level_1'] }
  ] });
  const d = JSON.parse((await detalle('ChIJ-direccion-uno')).body).direccion;
  assert.strictEqual(d.ciudad, 'Brooklyn');
  assert.strictEqual(d.cp, '');
  assert.strictEqual(d.completa, false);
});

/* ---------- protecciones ---------- */

test('solo acepta POST', async () => {
  assert.strictEqual((await handler(evento({}, { httpMethod: 'GET' }))).statusCode, 405);
});

test('rechaza peticiones que no vienen del propio sitio', async () => {
  for (const headers of [{ origin: 'https://sitio-malo.example' }, {}, { origin: 'no-es-una-url' }]) {
    const r = await handler(evento({ accion: 'sugerir', texto: '123 main', sesion: SESION }, { headers }));
    assert.strictEqual(r.statusCode, 403, JSON.stringify(headers));
  }
  assert.strictEqual(llamadas.length, 0);
});

test('acepta el sitio principal, www y la URL de Netlify', async () => {
  respuestaGoogle.json = async () => ({ suggestions: [] });
  process.env.URL = 'https://themora.netlify.app';
  for (const origin of ['https://mithemora.com', 'https://www.mithemora.com', 'https://themora.netlify.app']) {
    const r = await handler(evento({ accion: 'sugerir', texto: '123 main', sesion: SESION }, { headers: { origin, 'x-nf-client-connection-ip': '198.51.100.9' } }));
    assert.strictEqual(r.statusCode, 200, origin);
  }
  delete process.env.URL;
});

test('sin llave de Google responde noConfigurado (503) y no llama a nadie', async () => {
  delete process.env.GOOGLE_PLACES_API_KEY; delete process.env.GOOGLE_MAPS_API_KEY;
  const r = await sugerir('123 main');
  assert.strictEqual(r.statusCode, 503);
  assert.strictEqual(JSON.parse(r.body).noConfigurado, true);
  assert.strictEqual(llamadas.length, 0);
});

test('token de sesión y lugar con formato raro se rechazan', async () => {
  assert.strictEqual((await sugerir('123 main', 'corto')).statusCode, 400);
  assert.strictEqual((await sugerir('123 main', 'con espacios y símbolos <script>')).statusCode, 400);
  assert.strictEqual((await detalle('../../etc/passwd')).statusCode, 400);
  assert.strictEqual(llamadas.length, 0);
});

test('acción desconocida', async () => {
  assert.strictEqual((await handler(evento({ accion: 'otra', sesion: SESION }))).statusCode, 400);
});

test('tope por sesión: la consulta 31 de una misma dirección se frena', async () => {
  respuestaGoogle.json = async () => ({ suggestions: [] });
  let ultimo;
  for (let i = 0; i < 31; i++) ultimo = await handler(evento({ accion: 'sugerir', texto: '123 main ' + i, sesion: SESION }));
  assert.strictEqual(ultimo.statusCode, 429);
  assert.strictEqual(llamadas.length, 30);
});

test('tope por IP: se frena aunque cambien de sesión', async () => {
  respuestaGoogle.json = async () => ({ suggestions: [] });
  let ultimo;
  for (let i = 0; i < 61; i++) ultimo = await handler(evento({ accion: 'sugerir', texto: '123 main', sesion: 'sesion-numero-' + String(i).padStart(6, '0') + 'xx' }));
  assert.strictEqual(ultimo.statusCode, 429);
});

/* ---------- privacidad y errores ---------- */

test('si Google falla: 502 "no disponible", sin la llave, y el registro no contiene lo escrito', async () => {
  respuestaGoogle = { ok: false, status: 403, json: async () => ({ error: 'eco: 742 Evergreen Terrace' }) };
  const r = await sugerir('742 Evergreen Terrace');
  assert.strictEqual(r.statusCode, 502);
  assert.strictEqual(JSON.parse(r.body).noDisponible, true);
  assert.ok(!r.body.includes(LLAVE));
  assert.ok(errores.length > 0, 'debe registrar el fallo');
  errores.forEach((e) => {
    assert.ok(!/Evergreen|742/.test(e), 'el registro no puede contener la dirección: ' + e);
    assert.ok(!e.includes(LLAVE));
  });
});

test('si la red revienta, el registro solo dice el tipo de error', async () => {
  global.fetch = async () => { throw Object.assign(new Error('fallo con 742 Evergreen Terrace'), { name: 'TimeoutError' }); };
  const r = await sugerir('742 Evergreen Terrace');
  assert.strictEqual(r.statusCode, 502);
  errores.forEach((e) => assert.ok(!/Evergreen|742/.test(e), e));
});

test('en un funcionamiento normal no se escribe nada en el registro', async () => {
  respuestaGoogle.json = async () => ({ suggestions: [] });
  await sugerir('742 Evergreen Terrace');
  assert.strictEqual(errores.length, 0);
});

/* ---------- acción «estado»: comprobar que el servicio está publicado y configurado ---------- */

const estado = (extra) => handler(evento({ accion: 'estado' }, extra));

test('estado sin llave: responde vivo y no configurado, sin llamar a nadie', async () => {
  delete process.env.GOOGLE_PLACES_API_KEY; delete process.env.GOOGLE_MAPS_API_KEY;
  const r = await estado();
  assert.strictEqual(r.statusCode, 200);
  assert.deepStrictEqual(JSON.parse(r.body), { vivo: true, configurado: false });
  assert.strictEqual(llamadas.length, 0);
});

test('estado con llave: responde configurado, sin llamar a Google y sin mostrar la llave', async () => {
  const r = await estado();
  assert.strictEqual(r.statusCode, 200);
  assert.deepStrictEqual(JSON.parse(r.body), { vivo: true, configurado: true });
  assert.strictEqual(llamadas.length, 0);
  assert.ok(!r.body.includes(LLAVE), 'la respuesta no puede contener la llave');
  assert.strictEqual(r.headers['Cache-Control'], 'no-store');
});

test('estado no necesita token de sesión', async () => {
  const r = await handler(evento({ accion: 'estado', sesion: 'x' }));
  assert.strictEqual(r.statusCode, 200);
});

test('estado también exige POST y origen del propio sitio', async () => {
  assert.strictEqual((await estado({ httpMethod: 'GET' })).statusCode, 405);
  assert.strictEqual((await estado({ headers: { origin: 'https://sitio-malo.example' } })).statusCode, 403);
  assert.strictEqual((await estado({ headers: {} })).statusCode, 403);
});

test('estado cuenta contra el tope por IP', async () => {
  let ultimo;
  for (let i = 0; i < 61; i++) ultimo = await estado();
  assert.strictEqual(ultimo.statusCode, 429);
});

test('estado con cuerpo inválido sigue siendo 400 y las demás acciones no cambian', async () => {
  assert.strictEqual((await handler(evento({}, { body: 'no es json' }))).statusCode, 400);
  respuestaGoogle.json = async () => ({ suggestions: [] });
  assert.strictEqual((await sugerir('123 main')).statusCode, 200);
});
