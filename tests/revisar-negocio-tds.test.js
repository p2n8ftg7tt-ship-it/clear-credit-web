/* La función revisar-negocio con Google falso: la respuesta trae el TDS
   (calculado solo por tds.js) y su entrada, ya no el puntaje viejo, y la
   entrada no lleva datos que identifiquen al negocio.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const T = require('../tds.js');

const FICHA = {
  id: 'propio', displayName: { text: 'Guajiro Llc' }, formattedAddress: '123 Main St, Roanoke, VA',
  rating: 5, userRatingCount: 1, googleMapsUri: 'https://maps.google.com/?cid=1', businessStatus: 'OPERATIONAL',
  nationalPhoneNumber: '(540) 555-0100',
};
const json = cuerpo => ({ ok: true, status: 200, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) });

function googleFalso({ encontrado = true, competidores = [] } = {}) {
  return async (url, opts) => {
    if (url.includes('places:searchText')) {
      const mascara = opts.headers['X-Goog-FieldMask'];
      if (mascara.includes('formattedAddress')) return json({ places: encontrado ? [FICHA] : [] });
      return json({ places: competidores });
    }
    if (url.includes('/v1/places/')) return json({ photos: [], reviews: [] });
    throw new Error('URL inesperada: ' + url);
  };
}

async function llamar(opts = {}, cuerpo = { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: 'comida cubana' }) {
  const antes = { fetch: global.fetch, env: { ...process.env } };
  global.fetch = googleFalso(opts);
  process.env.GOOGLE_PLACES_API_KEY = 'prueba';
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'APPLE_MAPS_TEAM_ID', 'APPLE_MAPS_KEY_ID', 'APPLE_MAPS_PRIVATE_KEY']) {
    delete process.env[k];
  }
  delete require.cache[require.resolve('../netlify/functions/revisar-negocio.js')];
  const f = require('../netlify/functions/revisar-negocio.js');
  try {
    const r = await f.handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(cuerpo) });
    return JSON.parse(r.body);
  } finally {
    global.fetch = antes.fetch;
    process.env = antes.env;
  }
}

test('la respuesta trae tds y entradaTDS, y ya no trae puntaje', async () => {
  const c = await llamar();
  assert.equal(c.ok, true);
  assert.equal('puntaje' in c, false);
  assert.equal(c.tds.tds, 30);
  assert.equal(c.tds.banda, 'invisible');
  assert.equal(c.tds.pilaresMedidos, 4);
  assert.deepEqual(c.tds, T.calcular(c.entradaTDS));
});

test('entradaTDS no lleva nombre, dirección, teléfono ni reseñas', async () => {
  const c = await llamar();
  const texto = JSON.stringify(c.entradaTDS);
  for (const dato of ['Guajiro', 'Main St', '555', 'Roanoke', 'cubana']) assert.equal(texto.includes(dato), false, dato);
  assert.deepEqual(Object.keys(c.entradaTDS).sort(),
    ['calificacion', 'encontrado', 'fotos', 'giroMedible', 'horarioCompleto', 'posicionGiro', 'referencia', 'sitioWeb', 'totalResenas']);
});

test('la competencia (3 o más con calificación) es la referencia', async () => {
  const competidores = [
    { id: 'a', rating: 4.4, userRatingCount: 30 }, { id: 'b', rating: 4.6, userRatingCount: 80 },
    { id: 'propio', rating: 5, userRatingCount: 1 }, { id: 'c', rating: 4.8, userRatingCount: 12 },
  ];
  const c = await llamar({ competidores });
  assert.equal(c.entradaTDS.referencia.origen, 'competencia');
  assert.equal(c.entradaTDS.referencia.cantidad, 3);
  assert.equal(c.entradaTDS.posicionGiro, 3);
});

test('sin "a qué se dedica", Visibilidad no se mide', async () => {
  const c = await llamar({}, { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: '' });
  assert.equal(c.entradaTDS.giroMedible, false);
  assert.equal(c.tds.pilares.find(p => p.clave === 'visibilidad').valor, null);
});

test('no encontrado: TDS 0', async () => {
  const c = await llamar({ encontrado: false });
  assert.equal(c.tds.tds, 0);
  assert.equal(c.entradaTDS.encontrado, false);
});

test('los parámetros de "Lo que encontramos" siguen, sin pesos', async () => {
  const c = await llamar();
  assert.ok(c.parametros.length >= 6);
  for (const f of c.parametros) assert.equal('peso' in f, false);
});
