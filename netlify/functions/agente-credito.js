/* =========================================================
   Agente de crédito con IA (spec 017) — una vuelta de Claude por llamada.
   El navegador dirige el ciclo (agente-credito-cliente.js); esta función:
   verifica la sesión, cuenta 1 uso al día (máx. 3, hora del Este) en la
   primera vuelta, firma un pase con el HMAC de la conversación, llama a
   Claude y valida el resultado antes de entregarlo.

   Variables de entorno: ANTHROPIC_API_KEY, AGENTE_CREDITO_SECRETO,
   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
   Ver INSTRUCCIONES-AGENTE-CREDITO.md.

   Nunca se registra el cuerpo, el reporte ni la respuesta: solo códigos.
   ========================================================= */
'use strict';

const crypto = require('crypto');
const { MANUAL, HERRAMIENTAS, ESQUEMA_RESULTADO } = require('./lib/agente-credito-manual');
const { barreraDatosPersonales, validarResultado } = require('./lib/agente-credito-validar');
const { firmarPase, leerPase, hmacConversacion } = require('./lib/agente-credito-pase');

const MODELO = 'claude-sonnet-5-5';
const LIMITE_DIARIO = 3;
const LIMITE_LLAMADAS_DIA = 24; // 3 análisis × (6 vueltas + 2 reintentos), FR-007a
const MAX_VUELTAS = 6;
const VIGENCIA_SEG = 15 * 60;
const TIEMPO_IA_MS = 8500;
const MAX_CUERPO = 256 * 1024;
const MAX_ETIQUETADO = 60 * 1024;
const MAX_RESULTADO_HERRAMIENTA = 20000;
const MARCA_CORRECCION = 'CORRECCION_DEL_SERVIDOR';
const NOMBRES_HERRAMIENTAS = new Set(HERRAMIENTAS.map((h) => h.name));

function hoyEste(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

const responder = (statusCode, cuerpo) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(cuerpo)
});
const respaldo = (statusCode, motivo, reintentable) => responder(statusCode, { estado: 'respaldo', motivo, reintentable: !!reintentable });

function crearHandler(dep) {
  const fetchFn = dep.fetch;
  const ahora = dep.ahora || (() => Date.now());
  const entorno = dep.entorno || process.env;
  const log = dep.log || ((...a) => console.error(...a));
  const base = () => String(entorno.SUPABASE_URL || '').replace(/\/$/, '');

  async function usuarioDeSesion(token) {
    if (!token) return null;
    try {
      const res = await fetchFn(base() + '/auth/v1/user', { headers: { Authorization: 'Bearer ' + token, apikey: entorno.SUPABASE_ANON_KEY } });
      if (!res.ok) return null;
      const u = await res.json();
      return u && typeof u.id === 'string' ? u.id : null;
    } catch (_) { return null; }
  }

  /* true = permitido, false = límite alcanzado, null = no se pudo verificar. */
  async function rpcContador(funcion, userId, dia, limite) {
    try {
      const res = await fetchFn(base() + '/rest/v1/rpc/' + funcion, {
        method: 'POST',
        headers: { apikey: entorno.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + entorno.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user: userId, p_dia: dia, p_limite: limite })
      });
      if (!res.ok) return null;
      return (await res.json()) === true;
    } catch (_) { return null; }
  }
  const consumirUso = (userId, dia) => rpcContador('credito_agente_consumir', userId, dia, LIMITE_DIARIO);
  const registrarLlamada = (userId, dia) => rpcContador('credito_agente_llamar', userId, dia, LIMITE_LLAMADAS_DIA);

  async function llamarClaude(messages) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), TIEMPO_IA_MS);
    try {
      const res = await fetchFn('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: control.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': entorno.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'server-side-fallback-2026-07-01'
        },
        body: JSON.stringify({
          model: MODELO,
          max_tokens: 4000,
          system: [{ type: 'text', text: MANUAL, cache_control: { type: 'ephemeral' } }],
          tools: HERRAMIENTAS,
          tool_choice: { type: 'auto' },
          output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA_RESULTADO } },
          fallbacks: 'default',
          messages
        })
      });
      if (!res.ok) {
        log('[agente-credito] anthropic_status', res.status);
        return { ok: false, statusCode: 502, reintentable: res.status === 429 || res.status >= 500 };
      }
      return { ok: true, data: await res.json() };
    } catch (err) {
      const tiempo = !!(err && err.name === 'AbortError');
      log('[agente-credito]', tiempo ? 'tiempo_agotado' : 'error_de_red');
      return { ok: false, statusCode: tiempo ? 504 : 502, reintentable: true };
    } finally {
      clearTimeout(reloj);
    }
  }

  const primerMensaje = (etiquetado, hoy) => ({ role: 'user', content: 'Hoy: ' + hoy + '\n<reporte>\n' + JSON.stringify(etiquetado) + '\n</reporte>' });

  function etiquetadoDe(messages) {
    try { return JSON.parse(String(messages[0].content).match(/<reporte>\n([\s\S]*)\n<\/reporte>/)[1]); } catch (_) { return null; }
  }

  function resultadosDe(messages) {
    const lista = [];
    messages.forEach((m) => {
      if (m && m.role === 'user' && Array.isArray(m.content)) {
        m.content.forEach((b) => {
          if (b && b.type === 'tool_result' && !b.is_error) {
            try { lista.push(JSON.parse(b.content)); } catch (_) { /* sin números que aportar */ }
          }
        });
      }
    });
    return lista;
  }

  /* El último mensaje trae exactamente un tool_result por cada tool_use pedido, y nada más. */
  function resultadosCompletos(messages) {
    const ultimo = messages[messages.length - 1], previo = messages[messages.length - 2];
    if (!ultimo || ultimo.role !== 'user' || !Array.isArray(ultimo.content)) return false;
    if (!previo || previo.role !== 'assistant' || !Array.isArray(previo.content)) return false;
    const pedidos = previo.content.filter((b) => b && b.type === 'tool_use').map((b) => b.id).sort();
    const dados = ultimo.content.map((b) => (b && b.type === 'tool_result' && typeof b.content === 'string' &&
      b.content.length <= MAX_RESULTADO_HERRAMIENTA ? b.tool_use_id : null));
    if (!pedidos.length || dados.includes(null)) return false;
    return JSON.stringify(dados.slice().sort()) === JSON.stringify(pedidos);
  }

  const nuevoPase = (b, extra, conversacion) => firmarPase(Object.assign(
    { v: 1, a: b.a, u: b.u, d: b.d, n: b.n + 1, e: b.e, c: 0, k: b.k },
    extra,
    { h: hmacConversacion(conversacion, entorno.AGENTE_CREDITO_SECRETO) }
  ), entorno.AGENTE_CREDITO_SECRETO);

  async function pasoClaude(messages, b) {
    const permitida = await registrarLlamada(b.u, b.d);
    if (permitida === null) return respaldo(503, 'ia_no_disponible', false);
    if (!permitida) return respaldo(429, 'limite_diario', false);
    const r = await llamarClaude(messages);
    if (!r.ok) {
      const cuerpo = { estado: 'respaldo', motivo: 'ia_no_disponible', reintentable: r.reintentable };
      if (r.reintentable) {
        // Pase de reintento: misma vuelta, sin mensajes nuevos, sin sumar uso (FR-024).
        cuerpo.pase = firmarPase({ v: 1, a: b.a, u: b.u, d: b.d, n: b.n, e: b.e, c: 1, k: b.k,
          h: hmacConversacion(messages, entorno.AGENTE_CREDITO_SECRETO) }, entorno.AGENTE_CREDITO_SECRETO);
        cuerpo.messages = messages;
      }
      return responder(r.statusCode, cuerpo);
    }
    const data = r.data || {};
    if (data.stop_reason === 'refusal') {
      log('[agente-credito] refusal');
      return respaldo(502, 'ia_no_disponible', false);
    }
    const contenido = Array.isArray(data.content) ? data.content : [];
    const conAsistente = messages.concat([{ role: 'assistant', content: contenido }]);

    if (data.stop_reason === 'tool_use') {
      const pedidos = contenido.filter((x) => x && x.type === 'tool_use').map((x) => ({ id: x.id, nombre: x.name, entrada: x.input || {} }));
      if (!pedidos.length || pedidos.some((p) => !NOMBRES_HERRAMIENTAS.has(p.nombre))) return respaldo(200, 'respuesta_no_valida', false);
      if (b.n >= MAX_VUELTAS) return respaldo(200, 'demasiadas_vueltas', false);
      return responder(200, { estado: 'herramientas', pase: nuevoPase(b, {}, conAsistente), messages: conAsistente, pedidos });
    }

    let problemas = ['respuesta_incompleta'];
    if (data.stop_reason === 'end_turn') {
      const texto = contenido.filter((x) => x && x.type === 'text').map((x) => x.text).join('');
      let resultado = null;
      try { resultado = JSON.parse(texto); } catch (_) { resultado = null; }
      problemas = resultado
        ? validarResultado(resultado, { etiquetado: etiquetadoDe(messages), resultadosHerramientas: resultadosDe(messages) }).problemas
        : ['json_no_valido'];
      if (!problemas.length) return responder(200, { estado: 'terminado', resultado, uso: { vueltas: b.n } });
    }
    log('[agente-credito] resultado_no_valido', problemas.length);
    if (b.k === 1 || b.n >= MAX_VUELTAS) return respaldo(200, 'respuesta_no_valida', false);
    const conCorreccion = conAsistente.concat([{
      role: 'user',
      content: MARCA_CORRECCION + '\nTu respuesta no pasó la validación: ' + problemas.join('; ') + '.\nCorrígela y responde de nuevo solo con el JSON del esquema.'
    }]);
    return responder(200, { estado: 'herramientas', pase: nuevoPase(b, { c: 1, k: 1 }, conCorreccion), messages: conCorreccion, pedidos: [] });
  }

  return async function handler(event) {
    if (!event || event.httpMethod !== 'POST') return respaldo(405, 'metodo_no_permitido', false);
    if (!entorno.ANTHROPIC_API_KEY || !entorno.AGENTE_CREDITO_SECRETO || !entorno.SUPABASE_URL ||
      !entorno.SUPABASE_ANON_KEY || !entorno.SUPABASE_SERVICE_ROLE_KEY) return respaldo(503, 'no_configurado', false);
    const crudo = String(event.body || '');
    if (crudo.length > MAX_CUERPO) return respaldo(400, 'datos_rechazados', false);
    let cuerpo;
    try { cuerpo = JSON.parse(crudo); } catch (_) { return respaldo(400, 'datos_rechazados', false); }
    if (!cuerpo || typeof cuerpo !== 'object') return respaldo(400, 'datos_rechazados', false);

    const userId = await usuarioDeSesion(String(cuerpo.accessToken || ''));
    if (!userId) return respaldo(401, 'sin_sesion', false);
    const ms = ahora();
    const seg = Math.floor(ms / 1000);
    const secreto = entorno.AGENTE_CREDITO_SECRETO;

    /* ---------- vuelta 1 ---------- */
    if (!cuerpo.pase) {
      const etiquetado = cuerpo.etiquetado;
      if (!etiquetado || typeof etiquetado !== 'object' || !Array.isArray(etiquetado.cuentas) ||
        JSON.stringify(etiquetado).length > MAX_ETIQUETADO) return respaldo(400, 'datos_rechazados', false);
      if (!barreraDatosPersonales(etiquetado).ok) { log('[agente-credito] datos_rechazados'); return respaldo(400, 'datos_rechazados', false); }
      const dia = hoyEste(ms);
      const permitido = await consumirUso(userId, dia);
      if (permitido === null) return respaldo(503, 'ia_no_disponible', false);
      if (!permitido) return respaldo(429, 'limite_diario', false);
      const b = { a: crypto.randomBytes(16).toString('base64url'), u: userId, d: dia, n: 1, e: seg + VIGENCIA_SEG, k: 0 };
      return pasoClaude([primerMensaje(etiquetado, dia)], b);
    }

    /* ---------- vueltas 2 a 6 ---------- */
    const pase = leerPase(String(cuerpo.pase), secreto, seg);
    const messages = cuerpo.messages;
    if (!pase || pase.u !== userId || !Number.isInteger(pase.n) || pase.n < 1 || pase.n > MAX_VUELTAS || !Array.isArray(messages)) {
      return respaldo(403, 'pase_invalido', false);
    }
    if (pase.c === 1) {
      if (hmacConversacion(messages, secreto) !== pase.h) return respaldo(403, 'pase_invalido', false);
    } else {
      if (hmacConversacion(messages.slice(0, -1), secreto) !== pase.h) return respaldo(403, 'pase_invalido', false);
      if (!resultadosCompletos(messages)) return respaldo(400, 'datos_rechazados', false);
      const contenidos = messages[messages.length - 1].content.map((x) => x.content);
      if (!barreraDatosPersonales(contenidos).ok) { log('[agente-credito] datos_rechazados'); return respaldo(400, 'datos_rechazados', false); }
    }
    if (messages.filter((m) => m && m.role === 'assistant').length !== pase.n - 1) return respaldo(403, 'pase_invalido', false);
    return pasoClaude(messages, { a: pase.a, u: pase.u, d: pase.d, n: pase.n, e: pase.e, k: pase.k === 1 ? 1 : 0 });
  };
}

exports.crearHandler = crearHandler;
exports.handler = crearHandler({ fetch: (...args) => fetch(...args) });
