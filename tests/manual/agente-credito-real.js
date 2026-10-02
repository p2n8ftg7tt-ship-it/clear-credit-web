/* Prueba REAL del agente de crédito contra Claude (spec 017, SC-006).
   CUESTA DINERO (centavos). Ejecutar SOLO con aprobación del dueño:
     ANTHROPIC_API_KEY=... node tests/manual/agente-credito-real.js
   Simula Supabase (sesión y contador); la IA es la de verdad.
   No termina en .test.js: no corre con la suite. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { crearHandler } = require('../../netlify/functions/agente-credito.js');
const C = require('../../agente-credito-cliente.js');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Falta ANTHROPIC_API_KEY. Esta prueba gasta dinero: córrela solo si el dueño la aprobó.');
  process.exit(1);
}

// Precios de Claude Sonnet 5.5 por token (USD): entrada $2/M, salida $10/M, lectura de caché $0.20/M, escritura de caché ≈ $2.50/M.
const PRECIO = { entrada: 2 / 1e6, salida: 10 / 1e6, cacheLectura: 0.2 / 1e6, cacheEscritura: 2.5 / 1e6 };

const reporte = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'credito', 'agente', 'acme-zeta.json'), 'utf8'));
const medidas = [];

async function fetchMedido(url, init) {
  if (url.startsWith('https://supabase.local')) {
    if (url.endsWith('/auth/v1/user')) return { ok: true, status: 200, json: async () => ({ id: 'prueba-real' }) };
    return { ok: true, status: 200, json: async () => true };
  }
  const inicio = Date.now();
  const res = await fetch(url, init);
  const datos = await res.clone().json().catch(() => null);
  medidas.push({ ms: Date.now() - inicio, status: res.status, stop: datos && datos.stop_reason, usage: datos && datos.usage });
  return res;
}

const handler = crearHandler({
  fetch: fetchMedido,
  entorno: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    AGENTE_CREDITO_SECRETO: crypto.randomBytes(32).toString('base64url'),
    SUPABASE_URL: 'https://supabase.local',
    SUPABASE_ANON_KEY: 'prueba',
    SUPABASE_SERVICE_ROLE_KEY: 'prueba'
  }
});
const fetchCliente = async (url, init) => {
  const r = await handler({ httpMethod: 'POST', body: init.body });
  return { status: r.statusCode, json: async () => JSON.parse(r.body) };
};

(async () => {
  const eventos = [];
  const resultado = await C.analizarConAgente(reporte, { accessToken: 'prueba', fetch: fetchCliente, onEvento: (e) => eventos.push(e) });
  const costo = medidas.reduce((total, m) => {
    const u = m.usage || {};
    return total + (u.input_tokens || 0) * PRECIO.entrada + (u.output_tokens || 0) * PRECIO.salida +
      (u.cache_read_input_tokens || 0) * PRECIO.cacheLectura + (u.cache_creation_input_tokens || 0) * PRECIO.cacheEscritura;
  }, 0);
  console.log(JSON.stringify({
    modo: resultado.modo,
    motivo: resultado.motivo || null,
    vueltas: medidas.length,
    msPorVuelta: medidas.map((m) => m.ms),
    stopPorVuelta: medidas.map((m) => m.stop),
    costoUSD: Math.round(costo * 10000) / 10000,
    eventos
  }, null, 2));
  console.log(JSON.stringify(resultado, null, 2));
})();
