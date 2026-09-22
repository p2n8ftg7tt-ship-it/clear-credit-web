/* Prueba de humo de la corrida del agente (netlify/functions/tasas-agente.js)
   con un "fetch" falso: no hay red ni base de datos. Verifica lo que la corrida
   ESCRIBE (lecturas, alertas, publicación, registro) y lo que NO escribe cuando
   algo falla. Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const agente = require('../netlify/functions/tasas-agente.js');

const fx = nombre => fs.readFileSync(path.join(__dirname, 'fixtures', 'tasas', nombre), 'utf8');
const resp = (status, texto) => ({ ok: status >= 200 && status < 400, status, text: async () => texto });
const BASE = 'https://x.supabase.co/rest/v1/';
const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_prueba' };

// Crea un fetch falso. "bd" decide qué devuelven las lecturas de Supabase (por defecto: tablas vacías).
function crear({ pmms = 'pmms-ok.csv', tesoro = 'tesoro-ok.xml', nyfed = 'nyfed-sin-cambio.json', fallaPmms = false, bd = () => [] } = {}) {
  const llamadas = [];
  const f = async (url, opts = {}) => {
    url = String(url);
    if (url.includes('freddiemac.com')) return fallaPmms ? resp(503, '') : resp(200, fx(pmms));
    if (url.includes('home.treasury.gov')) return resp(200, fx(tesoro));
    if (url.includes('newyorkfed.org')) return resp(200, fx(nyfed));
    if (url.startsWith(BASE)) {
      const ruta = url.slice(BASE.length);
      const metodo = opts.method || 'GET';
      llamadas.push({ metodo, ruta, tabla: ruta.split('?')[0], cuerpo: opts.body ? JSON.parse(opts.body) : null, headers: opts.headers || {} });
      if (metodo !== 'GET') return resp(201, '');
      if (ruta.startsWith('tasas_config')) return resp(200, JSON.stringify([{ umbral_pp: 0.125 }]));
      return resp(200, JSON.stringify(bd(ruta)));
    }
    throw new Error('URL inesperada en la prueba: ' + url);
  };
  const escrituras = (tabla, metodo = 'POST') => llamadas.filter(l => l.tabla === tabla && l.metodo === metodo);
  return { f, llamadas, escrituras };
}
const LUNES = new Date('2026-09-21T13:00:00Z');
const JUEVES = new Date('2026-09-24T13:00:00Z');

test('lunes: publica las cifras titulares exactas, guarda lecturas y deja el registro', async () => {
  const s = crear();
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  assert.equal(r.ok, true);
  assert.equal(r.tipo, 'publicacion');
  assert.equal(r.resultado, 'ok');

  const pub = s.escrituras('tasas_publicado');
  assert.equal(pub.length, 1);
  assert.equal(pub[0].cuerpo[0].id, 'actual');
  assert.equal(pub[0].cuerpo[0].snapshot['30'].valor, 6.95);
  assert.equal(pub[0].cuerpo[0].snapshot['15'].cambioPp, 0.17);
  assert.equal(pub[0].cuerpo[0].publicado_en, LUNES.toISOString());

  const lecturas = s.escrituras('tasas_lecturas')[0].cuerpo;
  const p30 = lecturas.find(x => x.serie === 'pmms30');
  assert.deepEqual([p30.valor, p30.fecha_fuente, p30.estado, p30.fuente_id], [6.95, '2026-09-17', 'verificada', 'freddie-pmms']);
  assert.ok(lecturas.find(x => x.serie === 'dgs10' && x.valor === 5.07 && x.fecha_fuente === '2026-09-18'));

  const corrida = s.escrituras('tasas_corridas')[0].cuerpo[0];
  assert.equal(corrida.tipo, 'publicacion');
  assert.equal(corrida.resultado, 'ok');
  assert.deepEqual(corrida.fuentes, { 'freddie-pmms': 'ok', 'tesoro-10a': 'ok', 'nyfed-objetivo': 'ok' });
  assert.equal(corrida.publicadas, 2);
});

test('la llave nueva (sb_...) va solo en apikey, sin Authorization', async () => {
  const s = crear();
  await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  const h = s.llamadas[0].headers;
  assert.equal(h.apikey, 'sb_secret_prueba');
  assert.equal(h.Authorization, undefined);
});

test('lunes: el movimiento semanal y el Tesoro crean alertas con su clave', async () => {
  const s = crear();
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  assert.equal(r.alertaNueva, true);
  const filas = s.escrituras('tasas_alertas')[0].cuerpo;
  const tipos = filas.map(a => a.tipo + ':' + (a.termino || '-')).sort();
  assert.deepEqual(tipos, ['movimiento_semanal:15', 'movimiento_semanal:30', 'tesoro_10a:-']);
  for (const a of filas) {
    assert.equal(a.estado, 'activa');
    assert.ok(a.clave && a.fecha_fuente && a.fuente_id && a.direccion && a.magnitud_pp > 0);
  }
  assert.equal(s.escrituras('tasas_alertas')[0].ruta, 'tasas_alertas?on_conflict=clave');
});

test('jueves (vigilancia): registra y puede alertar, pero NO publica', async () => {
  const s = crear();
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: JUEVES });
  assert.equal(r.tipo, 'vigilancia');
  assert.equal(s.escrituras('tasas_publicado').length, 0);
  assert.equal(s.escrituras('tasas_corridas')[0].cuerpo[0].tipo, 'vigilancia');
  assert.equal(s.escrituras('tasas_corridas')[0].cuerpo[0].publicadas, 0);
});

test('el interruptor de prueba fuerza la publicación un jueves', async () => {
  const s = crear();
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: JUEVES, forzar: 'publicacion' });
  assert.equal(r.tipo, 'publicacion');
  assert.equal(s.escrituras('tasas_publicado').length, 1);
});

test('lunes: una corrida de publicación supera las alertas activas', async () => {
  const s = crear({ bd: ruta => (ruta.startsWith('tasas_alertas?estado=eq.activa') ? [{ id: 7, tipo: 'movimiento_semanal', clave: 'a' }, { id: 8, tipo: 'tesoro_10a', clave: 'b', datos: { baseFecha: '2026-09-10' } }] : []) });
  await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  const parche = s.escrituras('tasas_alertas', 'PATCH').find(l => l.ruta.includes('id=in.(7,8)'));
  assert.ok(parche, 'debe marcar 7 y 8 como superadas');
  assert.equal(parche.cuerpo.estado, 'superada');
  assert.ok(parche.cuerpo.cerrada_en);
});

test('si Freddie Mac falla: no publica, conserva lo anterior y lo anota (sin inventar nada)', async () => {
  const s = crear({ fallaPmms: true });
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  assert.equal(s.escrituras('tasas_publicado').length, 0);
  assert.equal(r.resultado, 'parcial');
  assert.equal(r.fuentes['freddie-pmms'], 'http 503');
  const corrida = s.escrituras('tasas_corridas')[0].cuerpo[0];
  assert.equal(corrida.fuentes['freddie-pmms'], 'http 503');
  assert.equal(corrida.publicadas, 0);
  const lecturas = s.escrituras('tasas_lecturas')[0].cuerpo;
  assert.ok(!lecturas.some(x => x.serie === 'pmms30'), 'no se guarda ningún PMMS');
});

test('un PMMS con salto de más de 1 punto se retiene y no se publica', async () => {
  const s = crear({ pmms: 'pmms-salto.csv' });
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  assert.equal(s.escrituras('tasas_publicado').length, 0);
  assert.equal(r.retenidas, 2);
  const lecturas = s.escrituras('tasas_lecturas')[0].cuerpo.filter(x => x.serie.startsWith('pmms'));
  for (const l of lecturas) {
    assert.equal(l.estado, 'retenida');
    assert.equal(l.nota, 'salto > 1.0 pp');
  }
  // Un PMMS retenido no puede disparar un aviso de movimiento semanal (FR-019). La señal del
  // Tesoro es independiente: solo usa la FECHA de esa lectura como base, no su valor.
  const alertas = s.escrituras('tasas_alertas').flatMap(l => l.cuerpo);
  assert.ok(!alertas.some(a => a.tipo === 'movimiento_semanal'), 'un dato retenido no dispara el movimiento semanal');
});

test('el dueño puede liberar una lectura retenida (estado verificada en la tabla) y entonces se publica', async () => {
  const s = crear({
    pmms: 'pmms-salto.csv',
    bd: ruta => (ruta.includes('fuente_id=eq.freddie-pmms') ? [{ serie: 'pmms30', estado: 'verificada' }, { serie: 'pmms15', estado: 'verificada' }] : []),
  });
  await agente.ejecutarCorrida({ fetch: s.f, env: ENV, ahora: LUNES });
  assert.equal(s.escrituras('tasas_publicado').length, 1);
  assert.equal(s.escrituras('tasas_publicado')[0].cuerpo[0].snapshot['30'].valor, 8.10);
});

test('Fed: un cambio del rango objetivo contra lo guardado crea la alerta; sin lectura previa no avisa', async () => {
  const conPrevio = crear({
    nyfed: 'nyfed-cambio.json',
    bd: ruta => (ruta.includes('serie=eq.fed_hasta') ? [{ valor: 3.75 }] : ruta.includes('serie=eq.fed_desde') ? [{ valor: 3.5 }] : []),
  });
  await agente.ejecutarCorrida({ fetch: conPrevio.f, env: ENV, ahora: JUEVES });
  const fed = conPrevio.escrituras('tasas_alertas')[0].cuerpo.find(a => a.tipo === 'fed_objetivo');
  assert.ok(fed);
  assert.equal(fed.direccion, 'sube');
  assert.deepEqual(fed.datos, { desde: '3.50–3.75', hasta: '3.75–4.00' });

  const primera = crear({ nyfed: 'nyfed-cambio.json' });
  await agente.ejecutarCorrida({ fetch: primera.f, env: ENV, ahora: JUEVES });
  const alertas = primera.escrituras('tasas_alertas')[0];
  assert.ok(!alertas || !alertas.cuerpo.some(a => a.tipo === 'fed_objetivo'), 'la primera lectura solo se guarda');
});

test('Tesoro: si el mes de la base es el anterior, la corrida pide también ese mes', async () => {
  const visitadas = [];
  const s = crear({ pmms: 'pmms-ok.csv' });
  const original = s.f;
  const f = async (url, opts) => { visitadas.push(String(url)); return original(url, opts); };
  // Lunes 21 sep con base 17 sep: solo septiembre.
  await agente.ejecutarCorrida({ fetch: f, env: ENV, ahora: LUNES });
  const meses = visitadas.filter(u => u.includes('home.treasury.gov')).map(u => /month=(\d{6})/.exec(u)[1]);
  assert.deepEqual(meses, ['202609']);
});

test('sin variables de entorno no hace nada y no lanza', async () => {
  const s = crear();
  const r = await agente.ejecutarCorrida({ fetch: s.f, env: {}, ahora: LUNES });
  assert.equal(r.ok, false);
  assert.equal(s.llamadas.length, 0);
});

test('el handler de Netlify nunca lanza aunque falte todo', async () => {
  const antes = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SERVICE_ROLE_KEY };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const r = await agente.handler();
    assert.equal(r.statusCode, 200);
  } finally {
    if (antes.u !== undefined) process.env.SUPABASE_URL = antes.u;
    if (antes.k !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = antes.k;
  }
});
