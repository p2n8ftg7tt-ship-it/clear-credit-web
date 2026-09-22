/* =========================================================
   Agente de tasas hipotecarias — todo el texto que ve la gente
   (specs/004-mortgage-rate-agent)

   Funciona en el navegador (window.TasasTexto) y en Node (para las pruebas),
   igual que zyron-leyes.js. TODA frase que se muestra sobre las tasas sale de
   aquí, construida a partir de datos estructurados (plazo, dirección, tamaño,
   fecha, fuente). Así las reglas de honestidad viven en un solo lugar y se
   prueban (tests/tasas-texto.test.js):

   - Se dice SOLO lo que cambió: plazo, dirección, tamaño, fecha y fuente.
   - Nada de consejos, predicciones ni prisa (constitución, Principio I).
   - Los números de Freddie Mac se muestran como los publicó.

   TODO(NATIVE_REVIEW): por ahora solo existe el español. Si se agrega otro
   idioma escrito con ayuda de IA, debe revisarlo una persona hablante nativa
   antes de publicarse (constitución, Principio V).
   ========================================================= */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.TasasTexto = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TEXTOS = {
    titulo: 'Agente de tasas',
    subtitulo: 'Tasas hipotecarias de referencia en EE. UU.',
    avisoLegal: 'Promedios nacionales de referencia para fines educativos. No son una oferta, una aprobación ni la tasa que te darían a ti.',
    pill: { al_dia: 'Al día', sin_actualizar: 'Sin actualizar', sin_datos: 'Aún sin datos' },
    obsoleto: 'No pudimos actualizar las tasas en la última revisión programada. Estas son las últimas cifras verificadas, con su fecha original.',
    vacio: 'Todavía no está disponible. Cuando el agente publique su primera lectura verificada, la verás aquí.',
    noDisponible: 'No disponible ahora. El resto de la página funciona con normalidad.',
    soloUnaFuente: 'Las cifras principales salen de una sola fuente: Freddie Mac. El rendimiento del Tesoro y el rango de la Reserva Federal son solo señales que pueden activar un aviso; no cambian esas cifras.',
    fuentes: 'De dónde salen los números',
    revisamos: 'Qué revisa el agente',
    verDetalle: 'Ver detalle',
    cerrar: 'Cerrar aviso',
    plazo30: 'Hipoteca fija a 30 años',
    plazo15: 'Hipoteca fija a 15 años',
    // Casas flotantes de Comprar casa (specs/006-floating-rate-houses)
    casa: {
      grupo: 'Tasas hipotecarias de referencia',
      plazo30: '30 años',
      plazo15: '15 años',
      estadoActivo: 'Activo',
      estadoSinActualizar: 'Sin actualizar',
      aviso: 'Aviso',
      cerrar: 'Ocultar las casas de tasas',
      abrir: 'Abrir detalles',
      cerrarPanel: 'Cerrar detalles',
      ultimaRevision: 'Última revisión del agente',
      verDetalleCompleto: 'Ver el detalle completo',
      fuentesTitulo: 'De dónde salen los números',
      prestamistasTitulo: 'Ver las tasas de cada prestamista',
      prestamistasAviso: 'Estas páginas muestran las tasas propias de cada prestamista, que varían según la persona.',
    },
  };

  // La casa dice «Activo» solo si el agente revisó sus fuentes hace MENOS de estas horas.
  const REVISION_ATRASADA_HORAS = 48;

  /* ---------- Palabras que nunca deben aparecer en un texto generado ---------- */
  const PALABRAS_PROHIBIDAS = [
    'compra ya', 'aprovecha', 'no esperes', 'espera', 'debes', 'deberías', 'te conviene',
    'buen momento', 'mal momento', 'bajarán', 'subirán', 'seguirán', 'pronto',
    'garantiz', 'asegur', 'ilegal', 'urgente',
    'lock now', 'you should', 'good time',
    // Las cifras de Freddie Mac son semanales: nunca se presentan como «en vivo».
    'en vivo', 'en tiempo real', 'live', 'real time',
  ];
  const TRONCOS = new Set(['garantiz', 'asegur']);   // se detectan también con sufijo (garantizamos, aseguramos)

  const sinAcentos = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ER_PROHIBIDAS = PALABRAS_PROHIBIDAS.map(p => {
    const n = sinAcentos(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { palabra: p, er: new RegExp('(^|[^a-z])' + n + (TRONCOS.has(p) ? '' : '($|[^a-z])')) };
  });

  // Devuelve la primera palabra prohibida que encuentre, o null si el texto está limpio.
  function contieneProhibida(texto) {
    const t = sinAcentos(texto);
    for (const { palabra, er } of ER_PROHIBIDAS) if (er.test(t)) return palabra;
    return null;
  }

  /* ---------- Formato ---------- */
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const formatoTasa = n => Number(n).toFixed(2);
  const formatoPp = n => String(Number(Math.abs(n).toFixed(3)));

  function partesFecha(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return null;
    return { anio: +m[1], mes: +m[2], dia: +m[3] };
  }
  function fechaCorta(iso) {
    const p = partesFecha(iso);
    return p ? `${p.dia} ${MESES[p.mes - 1]}` : '';
  }
  // Día de la semana según la fecha en UTC (13:00 UTC cae el mismo día en EE. UU.).
  function diaYFecha(iso) {
    const p = partesFecha(iso);
    if (!p) return '';
    const d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
    return `${DIAS[d.getUTCDay()]} ${p.dia} ${MESES[p.mes - 1]}`;
  }

  /* ---------- Bloque de Comprar casa ---------- */
  function textoCifra(termino, dato) {
    return {
      etiqueta: termino === '15' ? TEXTOS.plazo15 : TEXTOS.plazo30,
      valor: `${formatoTasa(dato.valor)} %`,
    };
  }

  function textoCambio(cambioPp) {
    const c = Number(cambioPp);
    if (!c) return '= sin cambio';
    return `${c > 0 ? '▲ sube' : '▼ baja'} ${formatoPp(c)} puntos porcentuales`;
  }

  function textoFechaFuente(iso) {
    return `publicado por Freddie Mac el ${fechaCorta(iso)}`;
  }

  function pillTexto(frescura) {
    return TEXTOS.pill[frescura] || TEXTOS.pill.sin_datos;
  }

  function textoFrescura(frescura, datos) {
    if (frescura === 'sin_actualizar') {
      const f = datos && datos.fechaFuente ? ` Última lectura publicada por Freddie Mac el ${fechaCorta(datos.fechaFuente)}.` : '';
      return TEXTOS.obsoleto + f;
    }
    if (frescura === 'sin_datos') return TEXTOS.vacio;
    return '';
  }

  const textoProximaRevision = iso => `Próxima revisión: ${diaYFecha(iso)}`;
  const textoRevisado = iso => `Revisado: ${diaYFecha(iso)}`;

  /* ---------- Casas flotantes de Comprar casa (specs/006-floating-rate-houses) ---------- */
  // Todo sale de las mismas funciones que el bloque (textoCifra, textoCambio, textoFechaFuente):
  // así la casa y el bloque jamás muestran una cifra distinta.
  function textoCasa(termino, dato) {
    const c = TEXTOS.casa;
    const cifra = textoCifra(termino, dato);
    const valor = cifra.valor;
    const cambio = textoCambio(dato.cambioPp);
    const fecha = textoFechaFuente(dato.fechaFuente);
    return {
      plazo: termino === '15' ? c.plazo15 : c.plazo30,
      valor,
      cambio,
      fecha,
      nombreAccesible: `${cifra.etiqueta}: ${valor}, ${cambio}, ${fecha}. ${c.abrir}.`,
    };
  }

  /* ---------- Alertas y banner ---------- */
  const NOMBRE_CORTO = { 'freddie-pmms': 'Freddie Mac', 'tesoro-10a': 'Tesoro de EE. UU.', 'nyfed-objetivo': 'Reserva Federal' };
  const PENDIENTE = 'El promedio semanal de Freddie Mac todavía no se ha vuelto a publicar.';
  const FED_NO_FIJA = 'Las tasas hipotecarias no las fija directamente la Reserva Federal.';

  const verbo = a => (a.direccion === 'baja' ? 'baja' : 'sube');

  // Frase principal de una alerta (sin la fecha en que se detectó).
  function frasePrincipal(a) {
    const fecha = fechaCorta(a.fechaFuente);
    const tam = `${formatoPp(a.magnitudPp)} puntos porcentuales`;
    if (a.tipo === 'fed_objetivo') {
      const d = a.datos || {};
      return `La Reserva Federal cambió su rango objetivo de ${d.desde} % a ${d.hasta} % (${fecha}).`;
    }
    if (a.tipo === 'tesoro_10a') {
      return `El rendimiento del Tesoro a 10 años ${verbo(a)} ${tam} (${NOMBRE_CORTO['tesoro-10a']}, ${fecha}).`;
    }
    return `La tasa a ${a.termino === '15' ? '15' : '30'} años ${verbo(a)} ${tam} (${NOMBRE_CORTO['freddie-pmms']}, ${fecha}).`;
  }

  function notasDeAlerta(a) {
    const notas = [];
    if (a.tipo === 'fed_objetivo') notas.push(FED_NO_FIJA);
    if (a.tipo !== 'movimiento_semanal') notas.push(PENDIENTE);
    return notas;
  }

  function textoBanner(a) {
    return [frasePrincipal(a), ...notasDeAlerta(a)].join(' ');
  }

  function textoAlerta(a) {
    const detectada = a.detectadaEn ? `Detectado el ${fechaCorta(a.detectadaEn)}.` : '';
    return [frasePrincipal(a), ...notasDeAlerta(a), detectada].filter(Boolean).join(' ');
  }

  /* ---------- Fuentes ---------- */
  function textoFuentes(lista) {
    return (lista || []).map(f => ({
      nombre: f.nombre, mide: f.mide, frecuencia: f.frecuencia, url: f.url, atribucion: f.atribucion || '',
    }));
  }

  return {
    TEXTOS, PALABRAS_PROHIBIDAS, contieneProhibida, REVISION_ATRASADA_HORAS,
    formatoTasa, formatoPp, fechaCorta,
    textoCifra, textoCambio, textoFechaFuente, pillTexto, textoFrescura, textoCasa,
    textoProximaRevision, textoRevisado,
    textoAlerta, textoBanner, textoFuentes,
  };
}));
