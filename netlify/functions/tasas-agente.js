/* =========================================================
   Agente de tasas hipotecarias — la corrida diaria (función PROGRAMADA)
   (specs/004-mortgage-rate-agent)

   Netlify la ejecuta sola todos los días a las 13:00 UTC (ver netlify.toml,
   [functions."tasas-agente"]). No tiene dirección web: nadie puede llamarla
   desde fuera. Solo corre en el deploy publicado, no en vistas previas.

   Cada corrida:
   1. Lee tres fuentes públicas a la vez (8 segundos de límite cada una):
        - Freddie Mac PMMS      → las tasas a 30 y 15 años (titular, semanal)
        - Tesoro de EE. UU.     → rendimiento a 10 años (señal diaria)
        - NY Fed                → rango objetivo de la Reserva Federal (señal)
   2. Guarda las lecturas (las poco creíbles se RETIENEN, no se publican).
   3. Decide si hay alertas nuevas y cierra las que ya no aplican.
   4. Si es lunes o martes, PUBLICA las cifras titulares. Los demás días solo vigila.
   5. Deja una fila en tasas_corridas para que el dueño vea cómo le fue.

   Si una fuente falla, todo lo demás sigue: se conservan las últimas cifras
   publicadas y no se inventa ningún número.

   Variables de entorno (las mismas que ya usa el panel de administrador):
   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
   Opcional y solo para probar: TASAS_FORZAR_TIPO = publicacion | vigilancia
   (fuerza el tipo de corrida un día que no es lunes ni martes; quítala después).
   ========================================================= */

const L = require('./tasas-hipoteca-logica.js');

const TIMEOUT_MS = 8000;
const USER_AGENT = 'Themora-tasas-agente/1.0 (lectura de tasas publicas para fines educativos)';

const URL_PMMS = 'https://www.freddiemac.com/pmms/docs/PMMS_history.csv';
const URL_NYFED = 'https://markets.newyorkfed.org/api/rates/unsecured/effr/last/2.json';
const urlTesoro = aaaamm =>
  'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml' +
  `?data=daily_treasury_yield_curve&field_tdr_date_value_month=${aaaamm}`;

/* Supabase tiene dos formatos de llave secreta (ver admin-data.js): la heredada
   (JWT, va en apikey y en Authorization) y la nueva "sb_..." (solo en apikey). */
function cabecerasServicio(serviceKey) {
  const esNueva = String(serviceKey || '').startsWith('sb_');
  return esNueva
    ? { apikey: serviceKey }
    : { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
}

async function ejecutarCorrida({ fetch: f = fetch, env = process.env, ahora = new Date(), forzar } = {}) {
  const inicio = Date.now();
  const url = env.SUPABASE_URL;
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) {
    console.error('[tasas-agente] faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY; no se hizo nada.');
    return { ok: false, error: 'faltan variables de entorno' };
  }

  const tipo = L.tipoDeCorrida(ahora, forzar === undefined ? env.TASAS_FORZAR_TIPO : forzar);
  const estados = {};          // resultado por fuente para el registro de la corrida
  let publicadas = 0;
  let retenidas = 0;
  let alertaNueva = false;

  /* ---------- Supabase (REST con llave de servicio) ---------- */
  const rest = url.replace(/\/$/, '') + '/rest/v1/';
  const cab = cabecerasServicio(llave);
  async function sb(metodo, ruta, cuerpo, prefer) {
    const res = await f(rest + ruta, {
      method: metodo,
      headers: Object.assign({}, cab, { 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}),
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (!res.ok) throw new Error('http ' + res.status);
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }
  // Un paso de base de datos que falla no debe tumbar la corrida: se anota y se sigue.
  async function intentar(nombre, fn, porDefecto) {
    try { return await fn(); } catch (e) {
      estados['base-de-datos:' + nombre] = L.sanearErrorFuente(e);
      return porDefecto;
    }
  }

  /* ---------- Fuentes externas ---------- */
  async function pedirTexto(direccion) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
    try {
      const res = await f(direccion, { headers: { 'User-Agent': USER_AGENT }, signal: control.signal });
      if (!res.ok) throw new Error('http ' + res.status);
      return await res.text();
    } finally { clearTimeout(reloj); }
  }
  async function leer(id, direccion, parser) {
    try {
      const r = parser(await pedirTexto(direccion));
      if (!r.ok) throw new Error(r.error || 'formato inesperado');
      estados[id] = 'ok';
      return r;
    } catch (e) {
      estados[id] = L.sanearErrorFuente(e);
      return null;
    }
  }

  const umbral = await intentar('config', async () => {
    const filas = await sb('GET', 'tasas_config?id=eq.principal&select=umbral_pp');
    const n = filas && filas[0] ? Number(filas[0].umbral_pp) : NaN;
    return n > 0 ? n : L.UMBRAL_POR_DEFECTO;
  }, L.UMBRAL_POR_DEFECTO);

  const mesActual = L.mesesATraer(ahora, null)[0];
  const [pmms, tesoroMes, fedFeed] = await Promise.all([
    leer('freddie-pmms', URL_PMMS, L.parsePmms),
    leer('tesoro-10a', urlTesoro(mesActual), L.parseTesoro),
    leer('nyfed-objetivo', URL_NYFED, L.parseNyFed),
  ]);

  // Fecha base de las señales: el último PMMS (de esta corrida o, si falló, el último guardado).
  let fechaBase = pmms ? pmms.actual.fechaFuente : null;
  if (!fechaBase) {
    fechaBase = await intentar('fecha-base', async () => {
      const filas = await sb('GET', 'tasas_lecturas?serie=eq.pmms30&estado=eq.verificada&order=fecha_fuente.desc&limit=1&select=fecha_fuente');
      return filas && filas[0] ? filas[0].fecha_fuente : null;
    }, null);
  }

  // Si la fecha base cae en el mes anterior, también se pide ese mes del Tesoro.
  let filasTesoro = tesoroMes ? tesoroMes.filas.slice() : null;
  if (tesoroMes) {
    for (const mes of L.mesesATraer(ahora, fechaBase).slice(1)) {
      const extra = await leer('tesoro-10a', urlTesoro(mes), L.parseTesoro);
      if (extra) {
        const vistas = new Set(filasTesoro.map(x => x.fecha));
        extra.filas.forEach(x => { if (!vistas.has(x.fecha)) filasTesoro.push(x); });
      }
    }
  }

  /* ---------- Lecturas: PMMS (titular) ---------- */
  const ahoraIso = ahora.toISOString();
  const lecturasNuevas = [];
  let pmmsVerificado = null;
  if (pmms) {
    const previas = { pmms30: pmms.previa.pmms30, pmms15: pmms.previa.pmms15 };
    const existentes = await intentar('pmms-existentes', () =>
      sb('GET', `tasas_lecturas?fuente_id=eq.freddie-pmms&fecha_fuente=eq.${pmms.actual.fechaFuente}&select=serie,estado`), []);
    const yaVerificada = serie => (existentes || []).some(x => x.serie === serie && x.estado === 'verificada');
    let alguna = false;
    for (const serie of ['pmms30', 'pmms15']) {
      const valor = pmms.actual[serie];
      const p = L.evaluarPlausibilidad(serie, valor, previas[serie]);
      const verificada = p.ok || yaVerificada(serie);   // el dueño puede liberar una lectura retenida
      if (!verificada) { retenidas++; alguna = true; }
      lecturasNuevas.push({
        fuente_id: 'freddie-pmms', serie, valor, fecha_fuente: pmms.actual.fechaFuente,
        obtenida_en: ahoraIso, estado: verificada ? 'verificada' : 'retenida', nota: verificada ? null : p.nota,
      });
    }
    if (!alguna) pmmsVerificado = pmms;
  }

  /* ---------- Lecturas: Tesoro (señal) ---------- */
  let tesoroEntrada = null;
  if (filasTesoro && filasTesoro.length) {
    filasTesoro.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const actual = filasTesoro[filasTesoro.length - 1];
    const p = L.evaluarPlausibilidad('dgs10', actual.valor, null);
    lecturasNuevas.push({
      fuente_id: 'tesoro-10a', serie: 'dgs10', valor: actual.valor, fecha_fuente: actual.fecha,
      obtenida_en: ahoraIso, estado: p.ok ? 'verificada' : 'retenida', nota: p.ok ? null : p.nota,
    });
    if (!p.ok) retenidas++;
    else if (fechaBase) {
      const baseFila = L.baseTesoro(filasTesoro, fechaBase);
      if (baseFila) tesoroEntrada = { actual, base: baseFila };
      else estados['tesoro-10a'] = 'sin base';     // sin base no hay alerta, y queda anotado
    }
  }

  /* ---------- Lecturas: Reserva Federal (señal) ---------- */
  let fedEntrada = null;
  if (fedFeed) {
    const a = fedFeed.actual;
    const previo = await intentar('fed-previo', async () => {
      const h = await sb('GET', 'tasas_lecturas?serie=eq.fed_hasta&order=fecha_fuente.desc&limit=1&select=valor');
      const d = await sb('GET', 'tasas_lecturas?serie=eq.fed_desde&order=fecha_fuente.desc&limit=1&select=valor');
      return h && h[0] && d && d[0] ? { desde: Number(d[0].valor), hasta: Number(h[0].valor) } : null;
    }, null);
    const ph = L.evaluarPlausibilidad('fed_hasta', a.hasta, null);
    const pd = L.evaluarPlausibilidad('fed_desde', a.desde, null);
    const ok = ph.ok && pd.ok;
    for (const [serie, valor, p] of [['fed_hasta', a.hasta, ph], ['fed_desde', a.desde, pd]]) {
      lecturasNuevas.push({
        fuente_id: 'nyfed-objetivo', serie, valor, fecha_fuente: a.fechaFuente,
        obtenida_en: ahoraIso, estado: p.ok ? 'verificada' : 'retenida', nota: p.ok ? null : p.nota,
      });
      if (!p.ok) retenidas++;
    }
    if (ok) fedEntrada = { actual: a, previo };
  }

  if (lecturasNuevas.length) {
    await intentar('lecturas', () =>
      sb('POST', 'tasas_lecturas?on_conflict=fuente_id,serie,fecha_fuente', lecturasNuevas, 'resolution=ignore-duplicates,return=minimal'));
  }

  /* ---------- Alertas ---------- */
  const activas = await intentar('alertas-activas', () => sb('GET', 'tasas_alertas?estado=eq.activa&select=id,tipo,datos,clave'), []);
  const claves = await intentar('alertas-claves', async () => (await sb('GET', 'tasas_alertas?select=clave') || []).map(x => x.clave), []);
  const decision = L.evaluarAlertas({
    umbral, pmms: pmmsVerificado, tesoro: tesoroEntrada, fed: fedEntrada,
    alertasActivas: activas || [], clavesExistentes: claves || [], tipoCorrida: tipo,
  });

  const cerrar = async (ids, estado) => {
    if (!ids.length) return;
    await intentar('alertas-cerrar', () =>
      sb('PATCH', `tasas_alertas?id=in.(${ids.join(',')})`, { estado, cerrada_en: ahoraIso }, 'return=minimal'));
  };
  await cerrar(decision.superadas, 'superada');
  await cerrar(decision.despejadas, 'despejada');

  if (decision.nuevas.length) {
    alertaNueva = true;
    await intentar('alertas-nuevas', () => sb('POST', 'tasas_alertas?on_conflict=clave',
      decision.nuevas.map(a => ({
        tipo: a.tipo, termino: a.termino, direccion: a.direccion, magnitud_pp: a.magnitudPp, datos: a.datos,
        fecha_fuente: a.fechaFuente, fuente_id: a.fuenteId, detectada_en: ahoraIso, clave: a.clave, estado: 'activa',
      })), 'resolution=ignore-duplicates,return=minimal'));
  }

  /* ---------- Publicación (solo lunes y martes) ---------- */
  if (tipo === 'publicacion' && pmmsVerificado) {
    const ok = await intentar('publicar', async () => {
      await sb('POST', 'tasas_publicado?on_conflict=id',
        [{ id: 'actual', snapshot: L.construirSnapshotTitular(pmmsVerificado), publicado_en: ahoraIso }],
        'resolution=merge-duplicates,return=minimal');
      return true;
    }, false);
    if (ok) publicadas = 2;
  }

  /* ---------- Registro de la corrida ---------- */
  const resultado = L.resultadoDeCorrida(estados);
  await intentar('corrida', () => sb('POST', 'tasas_corridas', [{
    corrida_en: ahoraIso, tipo, resultado, fuentes: estados,
    publicadas, retenidas, alerta_nueva: alertaNueva, duracion_ms: Date.now() - inicio,
  }], 'return=minimal'));

  return { ok: true, tipo, resultado, publicadas, retenidas, alertaNueva, fuentes: estados };
}

// Punto de entrada de Netlify. Nunca lanza: una corrida rota no debe romper nada más.
exports.handler = async () => {
  try {
    const r = await ejecutarCorrida();
    console.log('[tasas-agente]', JSON.stringify({ tipo: r.tipo, resultado: r.resultado, publicadas: r.publicadas, retenidas: r.retenidas, alertaNueva: r.alertaNueva }));
    return { statusCode: 200, body: JSON.stringify({ ok: r.ok, tipo: r.tipo, resultado: r.resultado }) };
  } catch (e) {
    console.error('[tasas-agente] error inesperado:', L.sanearErrorFuente(e));
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
};

exports.ejecutarCorrida = ejecutarCorrida;
