/* La función revisar-negocio con Google falso: la respuesta trae el TDS del
   motor 0.1 (tds.js + models/tds-0.1.0.json) y su entrada, la entrada no
   lleva datos que identifiquen al negocio, y la malla de Visibilidad
   (2 consultas × 9 puntos) solo pide ids a Google.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const T = require('../tds.js');

const FICHA = {
  id: 'propio', displayName: { text: 'Guajiro Llc' }, formattedAddress: '123 Main St, Roanoke, VA',
  rating: 5, userRatingCount: 1, googleMapsUri: 'https://maps.google.com/?cid=1', businessStatus: 'OPERATIONAL',
  nationalPhoneNumber: '(540) 555-0100', location: { latitude: 37.27, longitude: -79.94 },
  primaryType: 'cuban_restaurant', primaryTypeDisplayName: { text: 'Cuban restaurant' },
};
const json = cuerpo => ({ ok: true, status: 200, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) });

function googleFalso({ encontrado = true, competidores = [], ficha = FICHA, rankMalla = () => null, mallaFalla = false, web = 200 } = {}, registro = []) {
  return async (url, opts) => {
    if (url.includes('places:searchText')) {
      const mascara = opts.headers['X-Goog-FieldMask'];
      const cuerpo = JSON.parse(opts.body);
      registro.push({ mascara, cuerpo });
      if (mascara.includes('formattedAddress')) return json({ places: encontrado ? [ficha] : [] });
      if (mascara === 'places.id') {
        if (mallaFalla) throw new Error('Google caído');
        const rank = rankMalla(cuerpo);
        const lugares = Array.from({ length: 20 }, (_, i) => ({ id: 'otro' + i }));
        if (rank) lugares[rank - 1] = { id: ficha.id };
        return json({ places: lugares });
      }
      return json({ places: competidores });
    }
    if (url.includes('/v1/places/')) return json({ photos: [], reviews: [] });
    if (url.startsWith('https://guajiro.example')) return { status: web, ok: web < 400, body: null };
    throw new Error('URL inesperada: ' + url);
  };
}

async function llamar(opts = {}, cuerpo = { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: 'comida cubana' }, registro = []) {
  const antes = { fetch: global.fetch, env: { ...process.env } };
  global.fetch = googleFalso(opts, registro);
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
const comp = (r, code) => r.components.find(c => c.code === code);

test('la respuesta trae el TDS del motor 0.1 y es el mismo que da tds.js con esa entrada', async () => {
  const c = await llamar();
  assert.equal(c.ok, true);
  assert.equal(c.tds.model_version, '0.1.0');
  assert.equal(c.tds.parameters_hash, T.loadModel().parameters_hash);
  assert.deepEqual(c.tds, T.score(c.entradaTDS));
});

test('malla: 18 búsquedas que solo piden el id, 2 consultas × 9 puntos', async () => {
  const registro = [];
  const c = await llamar({}, undefined, registro);
  const malla = registro.filter(r => r.mascara === 'places.id');
  assert.equal(malla.length, 18);
  assert.equal(new Set(malla.map(r => r.cuerpo.textQuery)).size, 2);
  assert.equal(new Set(malla.map(r => JSON.stringify(r.cuerpo.locationBias.circle.center))).size, 9);
  for (const r of malla) assert.equal(r.cuerpo.pageSize, 20);
  const obs = c.entradaTDS.business.visibility_observations.filter(o => o.query_type === 'category');
  assert.equal(obs.length, 18);
  assert.equal(comp(c.tds, 'V').observed, true);
  assert.equal(comp(c.tds, 'V').score, 0);
});

test('apareciendo 1.º en todos los puntos, Visibilidad es 100', async () => {
  const c = await llamar({ rankMalla: () => 1 });
  assert.equal(comp(c.tds, 'V').score, 100);
});

test('si la malla falla, Visibilidad queda sin medir (no cuenta como cero)', async () => {
  const c = await llamar({ mallaFalla: true });
  assert.equal(comp(c.tds, 'V').observed, false);
  assert.equal(c.entradaTDS.business.visibility_observations.filter(o => o.query_type === 'category').length, 0);
});

test('lo que Google no da va como null; sin cohorte usa referencias por defecto', async () => {
  const c = await llamar();
  const b = c.entradaTDS.business;
  assert.equal(b.reviews.responded, null);
  assert.equal(b.days_since_owner_activity, null);
  assert.equal(b.contact_channels.messaging, null);
  assert.equal(b.contact_channels.book_or_order, null);
  assert.equal(b.info_checks.consistent_across_sources, null);
  assert.equal(comp(c.tds, 'A').observed, false);
  assert.ok(c.tds.flags.includes('default_references'));
  assert.equal(c.tds.coverage, 0.9);
  assert.equal(c.tds.status, 'complete');
  assert.ok(c.tds.category);
});

test('"No sé" si está reclamada: compuerta 1 y bandera; "no" aplica 0,85', async () => {
  const noSe = await llamar();
  assert.equal(noSe.entradaTDS.business.listing.claimed, null);
  assert.equal(noSe.tds.gate, 1);
  assert.ok(noSe.tds.flags.includes('claimed_unknown'));
  const no = await llamar({}, { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: 'comida cubana', reclamada: 'no' });
  assert.equal(no.tds.gate, 0.85);
  const si = await llamar({}, { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: 'comida cubana', reclamada: 'si' });
  assert.equal(si.tds.gate, 1);
  assert.equal(si.tds.flags.includes('claimed_unknown'), false);
});

test('sitio web: se comprueba que abra', async () => {
  const conWeb = { ...FICHA, websiteUri: 'https://guajiro.example/' };
  const abre = await llamar({ ficha: conWeb, web: 200 });
  assert.equal(abre.entradaTDS.business.contact_channels.website_reachable, true);
  const noExiste = await llamar({ ficha: conWeb, web: 404 });
  assert.equal(noExiste.entradaTDS.business.contact_channels.website_reachable, false);
  const bloqueado = await llamar({ ficha: conWeb, web: 403 });
  assert.equal(bloqueado.entradaTDS.business.contact_channels.website_reachable, null);
  const sinWeb = await llamar();
  assert.equal(sinWeb.entradaTDS.business.contact_channels.website_reachable, false);
  assert.equal(sinWeb.tds.reasons[0].code, 'link_website');
});

test('entradaTDS no lleva nombre, dirección, teléfono, ciudad ni giro', async () => {
  const c = await llamar();
  const texto = JSON.stringify(c.entradaTDS);
  for (const dato of ['Guajiro', 'Main St', '555', 'Roanoke', 'cubana', 'Cuban', '37.27']) assert.equal(texto.includes(dato), false, dato);
  assert.equal('malla' in c.google, false);
  assert.equal('sitioAccesible' in c.google, false);
});

test('sin "a qué se dedica", la malla usa la categoría de Google', async () => {
  const registro = [];
  const c = await llamar({}, { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: '' }, registro);
  const consultas = new Set(registro.filter(r => r.mascara === 'places.id').map(r => r.cuerpo.textQuery));
  assert.deepEqual([...consultas], ['Cuban restaurant', 'Cuban restaurant cerca de mí']);
  assert.equal(comp(c.tds, 'V').observed, true);
});

test('no encontrado: no evaluable, sin número', async () => {
  const c = await llamar({ encontrado: false });
  assert.equal(c.tds.status, 'not_evaluable');
  assert.equal(c.tds.tds, null);
  assert.equal(c.entradaTDS.business.listing.locatable, false);
});

test('los parámetros de "Lo que encontramos" siguen, sin pesos', async () => {
  const c = await llamar();
  assert.ok(c.parametros.length >= 6);
  for (const f of c.parametros) assert.equal('peso' in f, false);
});
