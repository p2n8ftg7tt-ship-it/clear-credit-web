/* =========================================================
   Agente de tasas hipotecarias — lógica pura (specs/004-mortgage-rate-agent)

   Aquí vive todo lo que decide algo: leer los archivos de las fuentes,
   revisar que un dato sea creíble, calcular el cambio, decidir cuándo hay una
   alerta, cuándo está "al día" y cómo se arma la respuesta pública. No usa red
   ni base de datos, por eso se puede probar entera (tests/tasas-*.test.js).

   Lo usan tres funciones de Netlify:
   - tasas-agente.js      (programada: lee las fuentes y guarda)
   - tasas-hipoteca.js    (pública: entrega el resumen que ven los visitantes)
   - tasas-admin.js       (solo el dueño: estado del agente)

   Reglas que no se rompen (constitución, Principio I):
   - Los números de Freddie Mac se guardan y se muestran tal cual salen de su
     archivo. Lo único que calculamos nosotros es el cambio (valor − previo) y
     así se rotula en la página.
   - Si una fuente falla o cambia de formato, se devuelve un error; nunca se
     adivina ni se estima un valor.
   - Ninguna señal (Tesoro, Fed) cambia la cifra titular; solo puede avisar.

   Igual que leyes-digest.js, este archivo vive junto a las funciones pero no
   es una función: solo exporta piezas para las demás.
   ========================================================= */

/* ---------------------------------------------------------
   1. Catálogo de fuentes (versión 1)
   ---------------------------------------------------------
   Mortgage News Daily y MBA NO están a propósito: no se pudo comprobar que
   sus términos permitan este uso. Agregar una es un cambio visible aquí y lo
   vigila tests/tasas-hipoteca-logica.test.js. */
const FUENTES = [
  {
    id: 'freddie-pmms',
    nombre: 'Freddie Mac · Primary Mortgage Market Survey',
    mide: 'Promedio nacional semanal de las tasas que ofrecen los prestamistas, para hipotecas fijas a 30 y 15 años',
    frecuencia: 'Semanal, los jueves',
    url: 'https://www.freddiemac.com/pmms',
    atribucion: 'Fuente: Freddie Mac PMMS',
    rol: 'titular',
    mostrar_cifras: true,
  },
  {
    id: 'tesoro-10a',
    nombre: 'Tesoro de EE. UU. · rendimiento a 10 años',
    mide: 'Rendimiento diario del bono del Tesoro a 10 años, una referencia que las tasas hipotecarias suelen seguir',
    frecuencia: 'Diaria, en días hábiles',
    url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve',
    atribucion: 'Fuente: Departamento del Tesoro de EE. UU.',
    rol: 'senal',
    mostrar_cifras: false,
  },
  {
    id: 'nyfed-objetivo',
    nombre: 'Reserva Federal · rango objetivo',
    mide: 'Rango objetivo de la tasa de fondos federales que fija la Reserva Federal',
    frecuencia: 'Cuando la Reserva Federal decide un cambio',
    url: 'https://www.federalreserve.gov/monetarypolicy/openmarket.htm',
    atribucion: 'Fuente: Reserva Federal / Banco de la Reserva Federal de Nueva York',
    rol: 'senal',
    mostrar_cifras: false,
  },
];

const FUENTE_TITULAR = FUENTES.find(f => f.rol === 'titular');

/* ---------------------------------------------------------
   2. Constantes
   --------------------------------------------------------- */
const UMBRAL_POR_DEFECTO = 0.125;      // puntos porcentuales; el dueño lo cambia en tasas_config
const SALTO_MAXIMO_PP = 1.0;           // un PMMS que se mueve más que esto entre semanas se retiene
const RANGOS = { pmms: [1, 15], dgs10: [0, 15], fed: [0, 20] };
const HORA_PUBLICACION_UTC = 13;       // 9 a. m. en verano de EE. UU. (8 a. m. en invierno)
const GRACIA_HORAS = 3;                // margen antes de decir "sin actualizar"
const DIAS_PUBLICACION = [1, 2];       // lunes y martes (getUTCDay)

function redondear3(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
}

/* ---------------------------------------------------------
   3. Freddie Mac PMMS (titular)
   ---------------------------------------------------------
   Archivo: date,pmms30,pmms30p,pmms15,pmms15p,... con fechas M/D/YYYY y la fila
   más nueva al final. Se toman las DOS ÚLTIMAS filas que traen 30 y 15 años
   con números; la última es la lectura actual y la anterior es la previa. */
function fechaMDYaIso(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(texto || '').trim());
  if (!m) return null;
  const mes = Number(m[1]);
  const dia = Number(m[2]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function numeroOnull(texto) {
  const t = String(texto == null ? '' : texto).trim();
  if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

function parsePmms(csvText) {
  const ERROR = { ok: false, error: 'formato inesperado' };
  if (typeof csvText !== 'string' || !csvText.trim()) return ERROR;
  const lineas = csvText.split(/\r?\n/);
  const cabecera = (lineas.shift() || '').split(',').map(c => c.trim());
  const iFecha = cabecera.indexOf('date');
  const i30 = cabecera.indexOf('pmms30');
  const i15 = cabecera.indexOf('pmms15');
  if (iFecha < 0 || i30 < 0 || i15 < 0) return ERROR;

  const filas = [];
  for (const linea of lineas) {
    if (!linea.trim()) continue;
    const c = linea.split(',');
    const fechaFuente = fechaMDYaIso(c[iFecha]);
    const pmms30 = numeroOnull(c[i30]);
    const pmms15 = numeroOnull(c[i15]);
    if (fechaFuente && pmms30 !== null && pmms15 !== null) filas.push({ fechaFuente, pmms30, pmms15 });
  }
  if (filas.length < 2) return ERROR;
  return { ok: true, actual: filas[filas.length - 1], previa: filas[filas.length - 2] };
}

/* Un dato es creíble si cae dentro de un rango razonable y (solo el PMMS) no
   salta más de 1.0 punto respecto a la lectura anterior. Lo que no lo es se
   RETIENE: no se publica y el dueño lo ve en su vista. */
function evaluarPlausibilidad(serie, valor, previo) {
  const rango = /^pmms/.test(serie) ? RANGOS.pmms : serie === 'dgs10' ? RANGOS.dgs10 : RANGOS.fed;
  if (typeof valor !== 'number' || !isFinite(valor) || valor < rango[0] || valor > rango[1]) {
    return { ok: false, nota: 'fuera de rango' };
  }
  if (/^pmms/.test(serie) && typeof previo === 'number' && isFinite(previo)) {
    if (redondear3(Math.abs(valor - previo)) > SALTO_MAXIMO_PP) return { ok: false, nota: 'salto > 1.0 pp' };
  }
  return { ok: true };
}

function calcularCambio(valor, previo) {
  return redondear3(valor - previo);
}

/* Cifra titular por plazo. Solo entra lo que salió de Freddie Mac. */
function construirSnapshotTitular(pmms) {
  const un = (v, p, f) => ({ valor: v, previo: p, cambioPp: calcularCambio(v, p), fechaFuente: f });
  return {
    '30': un(pmms.actual.pmms30, pmms.previa.pmms30, pmms.actual.fechaFuente),
    '15': un(pmms.actual.pmms15, pmms.previa.pmms15, pmms.actual.fechaFuente),
  };
}

/* ---------------------------------------------------------
   4. Calendario y frescura
   --------------------------------------------------------- */
function tipoDeCorrida(fechaUtc, forzar) {
  if (forzar === 'publicacion' || forzar === 'vigilancia') return forzar;
  return DIAS_PUBLICACION.includes(fechaUtc.getUTCDay()) ? 'publicacion' : 'vigilancia';
}

function ranuraDelDia(fecha, diasAtras) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate() + diasAtras, HORA_PUBLICACION_UTC, 0, 0));
}

// El siguiente lunes o martes a las 13:00 UTC, estrictamente después de "ahora".
function proximaActualizacion(ahora) {
  for (let d = 0; d <= 8; d++) {
    const c = ranuraDelDia(ahora, d);
    if (c.getTime() > ahora.getTime() && DIAS_PUBLICACION.includes(c.getUTCDay())) return c;
  }
  return null;
}

// La ranura de publicación más reciente que ya pasó (lunes o martes, 13:00 UTC).
function ultimaRanura(ahora) {
  for (let d = 0; d >= -8; d--) {
    const c = ranuraDelDia(ahora, d);
    if (c.getTime() <= ahora.getTime() && DIAS_PUBLICACION.includes(c.getUTCDay())) return c;
  }
  return null;
}

function calcularFrescura(publicadoEn, ahora) {
  if (!publicadoEn) return 'sin_datos';
  const publicado = new Date(publicadoEn).getTime();
  if (!isFinite(publicado)) return 'sin_datos';
  const ranura = ultimaRanura(ahora);
  if (!ranura) return 'al_dia';
  if (publicado >= ranura.getTime()) return 'al_dia';
  const limite = ranura.getTime() + GRACIA_HORAS * 3600 * 1000;
  return ahora.getTime() <= limite ? 'al_dia' : 'sin_actualizar';
}

function resultadoDeCorrida(estadoPorFuente) {
  const estados = Object.values(estadoPorFuente || {});
  if (!estados.length) return 'fallo';
  const buenas = estados.filter(e => e === 'ok').length;
  if (buenas === estados.length) return 'ok';
  if (buenas === 0) return 'fallo';
  return 'parcial';
}

/* ---------------------------------------------------------
   5. Tesoro (10 años) y Reserva Federal (rango objetivo)
   --------------------------------------------------------- */
// Feed Atom del Tesoro: por entrada, NEW_DATE y BC_10YEAR. Se lee con expresiones
// simples (sin librería). Si el formato cambia, devuelve error y no se guarda nada.
function parseTesoro(xmlText) {
  const ERROR = { ok: false, error: 'formato inesperado' };
  if (typeof xmlText !== 'string' || !xmlText.trim()) return ERROR;
  const filas = [];
  const entradas = xmlText.match(/<entry[\s>][\s\S]*?<\/entry>/g) || [];
  for (const e of entradas) {
    const f = /<(?:\w+:)?NEW_DATE[^>]*>\s*(\d{4}-\d{2}-\d{2})/.exec(e);
    const v = /<(?:\w+:)?BC_10YEAR[^>]*>\s*(-?\d+(?:\.\d+)?)\s*</.exec(e);
    if (f && v) filas.push({ fecha: f[1], valor: Number(v[1]) });
  }
  if (!filas.length) return ERROR;
  filas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  return { ok: true, filas };
}

// NY Fed: refRates[] con effectiveDate, targetRateFrom, targetRateTo (viene del más nuevo al más viejo).
function parseNyFed(jsonText) {
  const ERROR = { ok: false, error: 'formato inesperado' };
  let data;
  try { data = JSON.parse(jsonText); } catch (_) { return ERROR; }
  const lista = data && Array.isArray(data.refRates) ? data.refRates : null;
  if (!lista) return ERROR;
  const filas = lista
    .filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.effectiveDate) && typeof r.targetRateFrom === 'number' && typeof r.targetRateTo === 'number')
    .map(r => ({ fechaFuente: r.effectiveDate, desde: r.targetRateFrom, hasta: r.targetRateTo }))
    .sort((a, b) => (a.fechaFuente < b.fechaFuente ? -1 : 1));
  if (!filas.length) return ERROR;
  return { ok: true, actual: filas[filas.length - 1] };
}

// Meses (AAAAMM) del feed del Tesoro que hay que pedir: el actual, y también el
// anterior cuando la fecha base (último PMMS) cae en él. Ej.: corrida del lunes 4
// de mayo con base el jueves 30 de abril necesita abril además de mayo.
function mesesATraer(ahora, fechaBase) {
  const aaaamm = (y, m) => `${y}${String(m).padStart(2, '0')}`;
  const actual = aaaamm(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1);
  const meses = [actual];
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(fechaBase || ''));
  if (m) {
    const base = aaaamm(m[1], Number(m[2]));
    if (base !== actual && base < actual) meses.push(base);
  }
  return meses;
}

// La fila del Tesoro en la fecha base o, si no hay, la más cercana anterior.
function baseTesoro(filas, fechaBase) {
  let mejor = null;
  for (const f of filas || []) {
    if (f.fecha <= fechaBase && (!mejor || f.fecha > mejor.fecha)) mejor = f;
  }
  return mejor ? { fecha: mejor.fecha, valor: mejor.valor } : null;
}

/* ---------------------------------------------------------
   6. Alertas
   --------------------------------------------------------- */
function claveAlerta({ tipo, termino, direccion, baseId, magnitud, umbral }) {
  const pasos = Math.floor(redondear3(magnitud) / redondear3(umbral) + 1e-9);
  return [tipo, termino || '-', direccion, baseId, pasos].join(':');
}

function semanalPendiente(alerta) {
  return alerta.tipo !== 'movimiento_semanal';
}

const rango = (a, b) => `${Number(a).toFixed(2)}–${Number(b).toFixed(2)}`;

/* Decide qué alertas nacen, cuáles quedan superadas y cuáles se despejan.
   Entradas:
   - umbral               puntos porcentuales (tasas_config.umbral_pp)
   - pmms                 { actual, previa } de parsePmms, ya verificados, o null
   - tesoro               { actual: {fecha, valor}, base: {fecha, valor}|null } o null
   - fed                  { actual: {fechaFuente, desde, hasta}, previo: {desde, hasta}|null } o null
   - alertasActivas       filas activas de tasas_alertas ({id, tipo, datos, ...})
   - clavesExistentes     TODAS las claves ya guardadas (activas o cerradas): nunca se repite una
   - tipoCorrida          'publicacion' supera todas las alertas activas (FR-013) */
function evaluarAlertas({ umbral, pmms, tesoro, fed, alertasActivas, clavesExistentes, tipoCorrida }) {
  const T = redondear3(umbral > 0 ? umbral : UMBRAL_POR_DEFECTO);
  const activas = alertasActivas || [];
  const existentes = new Set(clavesExistentes || []);
  const nuevas = [];
  const superadas = [];
  const despejadas = [];

  const agregar = (a) => {
    if (existentes.has(a.clave)) return;
    existentes.add(a.clave);
    nuevas.push(a);
  };

  const publicando = tipoCorrida === 'publicacion';
  if (publicando) activas.forEach(a => superadas.push(a.id));

  // Movimiento semanal del PMMS, por plazo.
  if (pmms) {
    for (const [termino, campo] of [['30', 'pmms30'], ['15', 'pmms15']]) {
      const delta = calcularCambio(pmms.actual[campo], pmms.previa[campo]);
      if (Math.abs(delta) >= T) {
        const direccion = delta > 0 ? 'sube' : 'baja';
        const magnitudPp = redondear3(Math.abs(delta));
        agregar({
          tipo: 'movimiento_semanal', termino, direccion, magnitudPp,
          datos: null, fechaFuente: pmms.actual.fechaFuente, fuenteId: 'freddie-pmms',
          clave: claveAlerta({ tipo: 'movimiento_semanal', termino, direccion, baseId: pmms.actual.fechaFuente, magnitud: magnitudPp, umbral: T }),
        });
      }
    }
  }

  // Señal del Tesoro: 10 años hoy contra su valor en la fecha del último PMMS.
  if (tesoro) {
    const delta = tesoro.base ? calcularCambio(tesoro.actual.valor, tesoro.base.valor) : null;

    if (!publicando) {
      for (const a of activas.filter(x => x.tipo === 'tesoro_10a')) {
        const baseDeLaAlerta = a.datos && a.datos.baseFecha;
        const cambioDeBase = !tesoro.base || tesoro.base.fecha !== baseDeLaAlerta;
        if (cambioDeBase || Math.abs(delta) <= redondear3(T / 2)) despejadas.push(a.id);
      }
    }

    if (tesoro.base && Math.abs(delta) >= T) {
      const direccion = delta > 0 ? 'sube' : 'baja';
      const magnitudPp = redondear3(Math.abs(delta));
      agregar({
        tipo: 'tesoro_10a', termino: null, direccion, magnitudPp,
        datos: { baseFecha: tesoro.base.fecha, baseValor: tesoro.base.valor, actualFecha: tesoro.actual.fecha, actualValor: tesoro.actual.valor },
        fechaFuente: tesoro.actual.fecha, fuenteId: 'tesoro-10a',
        clave: claveAlerta({ tipo: 'tesoro_10a', termino: null, direccion, baseId: tesoro.base.fecha, magnitud: magnitudPp, umbral: T }),
      });
    }
  }

  // Reserva Federal: solo un CAMBIO del objetivo alerta. Mantenerlo no avisa nada,
  // y la primera vez que se lee (sin valor previo) solo se guarda.
  if (fed && fed.previo && redondear3(fed.actual.hasta) !== redondear3(fed.previo.hasta)) {
    const delta = redondear3(fed.actual.hasta - fed.previo.hasta);
    const direccion = delta > 0 ? 'sube' : 'baja';
    const magnitudPp = redondear3(Math.abs(delta));
    agregar({
      tipo: 'fed_objetivo', termino: null, direccion, magnitudPp,
      datos: { desde: rango(fed.previo.desde, fed.previo.hasta), hasta: rango(fed.actual.desde, fed.actual.hasta) },
      fechaFuente: fed.actual.fechaFuente, fuenteId: 'nyfed-objetivo',
      clave: claveAlerta({ tipo: 'fed_objetivo', termino: null, direccion, baseId: `${Number(fed.previo.hasta).toFixed(2)}>${Number(fed.actual.hasta).toFixed(2)}`, magnitud: magnitudPp, umbral: T }),
    });
  }

  return { nuevas, superadas, despejadas };
}

// Para el banner: Fed > semanal 30 > semanal 15 > Tesoro; a igual prioridad, la más nueva.
function prioridadBanner(alertas) {
  const peso = a => (a.tipo === 'fed_objetivo' ? 0 : a.tipo === 'movimiento_semanal' ? (a.termino === '30' ? 1 : 2) : 3);
  return (alertas || []).slice().sort((a, b) => peso(a) - peso(b) || (b.id || 0) - (a.id || 0));
}

/* ---------------------------------------------------------
   7. Respuesta pública (contrato: contracts/snapshot-public.md)
   ---------------------------------------------------------
   Solo sale lo que un visitante puede ver. Nunca la clave interna de una
   alerta, ni el registro de corridas, ni el umbral, ni lecturas retenidas. */
function alertaPublica(fila) {
  const fuente = FUENTES.find(f => f.id === fila.fuente_id) || FUENTE_TITULAR;
  const datosPublicos = fila.tipo === 'fed_objetivo' && fila.datos
    ? { desde: fila.datos.desde, hasta: fila.datos.hasta }
    : null;
  return {
    id: fila.id,
    tipo: fila.tipo,
    termino: fila.termino || null,
    direccion: fila.direccion,
    magnitudPp: Number(fila.magnitud_pp),
    detectadaEn: fila.detectada_en,
    fechaFuente: fila.fecha_fuente,
    fuente: { id: fuente.id, nombre: fuente.nombre, url: fuente.url },
    semanalPendiente: semanalPendiente(fila),
    datos: datosPublicos,
  };
}

function construirRespuestaPublica({ config, publicado, alertas, ahora }) {
  if (!config || config.activo !== true) return { version: 1, activo: false };

  const frescura = calcularFrescura(publicado && publicado.publicado_en, ahora);
  const activas = prioridadBanner((alertas || []).filter(a => a.estado === 'activa').map(a => ({ ...a, _p: alertaPublica(a) })))
    .map(a => a._p);
  const prox = proximaActualizacion(ahora);

  return {
    version: 1,
    activo: true,
    generadoEn: ahora.toISOString(),
    frescura,
    publicadoEn: publicado && publicado.publicado_en ? new Date(publicado.publicado_en).toISOString() : null,
    proximaActualizacion: prox ? prox.toISOString() : null,
    fuente: {
      id: FUENTE_TITULAR.id,
      nombre: FUENTE_TITULAR.nombre,
      url: FUENTE_TITULAR.url,
      atribucion: FUENTE_TITULAR.atribucion,
      frecuencia: FUENTE_TITULAR.frecuencia,
      mide: FUENTE_TITULAR.mide,
    },
    terminos: publicado && publicado.snapshot ? publicado.snapshot : null,
    alertas: activas,
    fuentesSenal: FUENTES.filter(f => f.rol === 'senal').map(f => ({
      id: f.id, nombre: f.nombre, mide: f.mide, frecuencia: f.frecuencia, url: f.url,
    })),
  };
}

/* ---------------------------------------------------------
   8. Vista del dueño
   --------------------------------------------------------- */
const diaIso = d => d.toISOString().slice(0, 10);

// Últimos N días con lo que se esperaba de cada uno y si hubo corrida. El día de
// hoy solo cuenta cuando ya pasó la hora de la corrida (13:30 UTC), para no marcar
// como falta algo que todavía no le toca.
function diasEsperados(ahora, corridas, n) {
  const hechos = new Set((corridas || []).map(c => String(c.corrida_en).slice(0, 10)));
  const hoyCuenta = ahora.getUTCHours() * 60 + ahora.getUTCMinutes() >= HORA_PUBLICACION_UTC * 60 + 30;
  const inicio = hoyCuenta ? 0 : 1;
  const dias = [];
  for (let i = inicio; dias.length < n; i++) {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() - i));
    dias.push({
      dia: diaIso(d),
      esperada: DIAS_PUBLICACION.includes(d.getUTCDay()) ? 'publicacion' : 'vigilancia',
      hubo: hechos.has(diaIso(d)),
    });
  }
  return dias;
}

function horasDesdeUltimaOk(corridas, ahora) {
  const buenas = (corridas || []).filter(c => c.resultado === 'ok' || c.resultado === 'parcial');
  if (!buenas.length) return null;
  const ultima = Math.max(...buenas.map(c => new Date(c.corrida_en).getTime()));
  return Math.floor((ahora.getTime() - ultima) / 3600000);
}

// Deja solo una categoría corta: nunca una URL, una llave ni una traza de error.
function sanearErrorFuente(error) {
  const t = String((error && error.message) || error || '');
  if (/abort|timeout|timed out/i.test(t)) return 'timeout';
  const http = /\bhttp\s*(\d{3})\b/i.exec(t);
  if (http) return `http ${http[1]}`;
  return 'formato inesperado';
}

module.exports = {
  FUENTES, FUENTE_TITULAR,
  UMBRAL_POR_DEFECTO, SALTO_MAXIMO_PP, RANGOS, HORA_PUBLICACION_UTC, GRACIA_HORAS,
  redondear3,
  parsePmms, evaluarPlausibilidad, calcularCambio, construirSnapshotTitular,
  tipoDeCorrida, proximaActualizacion, calcularFrescura, resultadoDeCorrida,
  parseTesoro, parseNyFed, mesesATraer, baseTesoro,
  claveAlerta, semanalPendiente, evaluarAlertas, prioridadBanner,
  construirRespuestaPublica,
  diasEsperados, horasDesdeUltimaOk, sanearErrorFuente,
};
