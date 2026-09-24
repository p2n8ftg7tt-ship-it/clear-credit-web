/* La función ubicacion (ciudad aproximada por la conexión, de context.geo de
   Netlify): solo ciudad + estado de EE. UU., nada más, sin caché compartida
   y sin romperse nunca.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = () => import(pathToFileURL(path.join(__dirname, '..', 'netlify', 'functions', 'ubicacion.mjs')).href);

const GEO_US = {
  city: 'Houston', subdivision: { code: 'TX', name: 'Texas' }, country: { code: 'US', name: 'United States' },
  latitude: 29.76, longitude: -95.37, postalCode: '77002', timezone: 'America/Chicago',
};

async function llamar(geo, metodo = 'GET') {
  const { default: funcion } = await cargar();
  const r = await funcion(new Request('https://mithemora.com/.netlify/functions/ubicacion', { method: metodo }), { geo });
  return { status: r.status, headers: r.headers, cuerpo: await r.json() };
}

test('EE. UU. con ciudad y estado: solo { ciudad, estado }', async () => {
  const r = await llamar(GEO_US);
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, { ciudad: 'Houston', estado: 'TX' });
});

test('nunca devuelve coordenadas, ZIP, zona horaria ni país', async () => {
  const r = await llamar(GEO_US);
  const texto = JSON.stringify(r.cuerpo);
  for (const dato of ['29.76', '95.37', '77002', 'Chicago', 'United States']) assert.equal(texto.includes(dato), false, dato);
});

test('sin caché compartida y en JSON', async () => {
  const r = await llamar(GEO_US);
  assert.equal(r.headers.get('Cache-Control'), 'private, no-store');
  assert.match(r.headers.get('Content-Type'), /application\/json/);
});

test('fuera de EE. UU., sin ciudad, sin estado o sin geo: nulos', async () => {
  const nulos = { ciudad: null, estado: null };
  assert.deepEqual((await llamar({ ...GEO_US, country: { code: 'MX' } })).cuerpo, nulos);
  assert.deepEqual((await llamar({ ...GEO_US, city: '' })).cuerpo, nulos);
  assert.deepEqual((await llamar({ ...GEO_US, subdivision: {} })).cuerpo, nulos);
  assert.deepEqual((await llamar(undefined)).cuerpo, nulos);
});

test('estado con forma rara o ciudad larguísima', async () => {
  assert.deepEqual((await llamar({ ...GEO_US, subdivision: { code: 'US-TX' } })).cuerpo, { ciudad: null, estado: null });
  const larga = (await llamar({ ...GEO_US, city: 'x'.repeat(200) })).cuerpo;
  assert.equal(larga.ciudad.length, 80);
});

test('otro método: 405', async () => {
  const r = await llamar(GEO_US, 'POST');
  assert.equal(r.status, 405);
});

test('si algo falla por dentro, responde 200 con nulos', async () => {
  const geoRoto = {};
  Object.defineProperty(geoRoto, 'country', { get() { throw new Error('boom'); } });
  const r = await llamar(geoRoto);
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, { ciudad: null, estado: null });
});
