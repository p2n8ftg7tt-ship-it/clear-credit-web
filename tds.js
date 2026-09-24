/* ===========================================================================
   Themora Digital Score (TDS) — Índice de Salud Digital de un negocio.

   Lo usan dos lados con la misma fórmula (una sola verdad):
     - netlify/functions/revisar-negocio.js, que calcula el resultado oficial
     - aparezco.html, para las acciones y el simulador ("¿y si…?") sin volver
       a buscar en Google

   Cinco pilares con peso (metodología inicial de Themora, todavía no
   validada contra resultados reales de negocios):
     Reputación 30 % · Visibilidad 25 % · Fundamentos 20 % ·
     Completitud 15 % · Actividad 10 %

   Reglas de honestidad (specs/007-themora-digital-score):
     - Lo que Google no nos da (si la ficha está reclamada, si respondes
       reseñas, tu última actividad) NUNCA cuenta como cero: el pilar queda
       "No lo pudimos comprobar" y su peso se reparte entre los demás.
     - Los textos describen solo lo que vimos en la búsqueda; no predicen
       clientes ni ventas.
     - Contratar a Themora nunca suma puntos.
   =========================================================================== */
(() => {
  'use strict';

  const PESOS = { reputacion: 0.30, visibilidad: 0.25, fundamentos: 0.20, completitud: 0.15, actividad: 0.10 };
  const ORDEN = ['reputacion', 'visibilidad', 'fundamentos', 'completitud', 'actividad'];
  const NOMBRES = {
    reputacion: 'Reputación', visibilidad: 'Visibilidad', fundamentos: 'Fundamentos',
    completitud: 'Completitud', actividad: 'Actividad',
  };
  const M = 10;                 // confianza de la calificación ajustada
  const META_RESENAS = 50;
  const LAMBDA = 0.05;
  const TOPE_FOTOS = 10;        // Google no cuenta más de 10 fotos por ficha
  const REFERENCIA_FIJA = 4.7;
  const MIN_COMPETENCIA = 3;
  const VIS_SOLO_NOMBRE = 30;

  const BANDAS = {
    invisible:  { nombre: 'Invisible',  color: 'rojo',     frase: 'En las búsquedas que hicimos, a tu negocio le cuesta aparecer y a tu ficha le faltan datos básicos.' },
    vulnerable: { nombre: 'Vulnerable', color: 'naranja',  frase: 'Tu ficha tiene lo básico, pero en las búsquedas que hicimos todavía hay pilares flojos.' },
    saludable:  { nombre: 'Saludable',  color: 'amarillo', frase: 'Tu ficha está bien encaminada; los pilares de abajo muestran qué queda por completar.' },
    fuerte:     { nombre: 'Fuerte',     color: 'verde',    frase: 'Tu ficha está muy completa y apareces bien en las búsquedas que hicimos.' },
    dominante:  { nombre: 'Dominante',  color: 'azul',     frase: 'En las búsquedas que hicimos, tu ficha cumple casi todo lo que medimos.' },
  };
  const FRASE_NO_ENCONTRADO = 'No encontramos una ficha de tu negocio buscando su nombre y ciudad. El primer paso es crearla.';

  const ACCIONES = [
    { clave: 'sitioweb', texto: 'Enlaza un sitio web en tu ficha de Google, aunque sea una página sencilla' },
    { clave: 'horario',  texto: 'Completa tu horario en Google: los 7 días, con hora de apertura y cierre' },
    { clave: 'fotos',    texto: 'Sube fotos de tu negocio hasta tener 10 o más (fachada, interior, productos)' },
    { clave: 'resenas',  texto: 'Pide a tus clientes que te dejen reseña hasta llegar a ' + META_RESENAS },
  ];

  const redondear1 = n => Math.round(n * 10) / 10;
  const estrellas = n => n.toFixed(1) + '★';
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

  /* Calificación de referencia (C): la de la competencia de la misma búsqueda
     si hay al menos 3 con calificación; si no, una fija de 4.7. */
  function referencia(competencia) {
    const cantidad = (competencia && competencia.cantidad) || 0;
    if (cantidad >= MIN_COMPETENCIA && typeof competencia.promedioCalificacion === 'number') {
      return { valor: Math.round(competencia.promedioCalificacion * 100) / 100, origen: 'competencia', cantidad };
    }
    return { valor: REFERENCIA_FIJA, origen: 'fija', cantidad };
  }

  function textoReferencia(ref) {
    return ref.origen === 'competencia'
      ? 'el promedio de ' + ref.cantidad + ' negocios de tu categoría (' + estrellas(ref.valor) + ')'
      : 'una referencia fija de ' + estrellas(ref.valor) + ', porque encontramos menos de ' + MIN_COMPETENCIA + ' negocios comparables';
  }

  /* ---------------- Pilares ---------------- */
  function pilarReputacion(e, ref) {
    const v = Math.max(0, e.totalResenas || 0);
    const R = typeof e.calificacion === 'number' ? e.calificacion : ref.valor;
    const C = ref.valor;
    const ajustada = (v / (v + M)) * R + (M / (v + M)) * C;
    const volumen = v === 0 ? 0 : Math.min(100, (100 * Math.log(v + 1)) / Math.log(META_RESENAS + 1));
    const valor = 0.6 * (ajustada / 5) * 100 + 0.4 * volumen;
    let razon;
    if (v === 0 || typeof e.calificacion !== 'number') {
      razon = 'Todavía no tienes reseñas en Google. Mientras no haya, contamos tu calificación igual a ' + textoReferencia(ref) + '.';
    } else if (v < META_RESENAS) {
      razon = 'Tienes ' + estrellas(R) + ' con ' + plural(v, 'reseña', 'reseñas') + '. Con pocas reseñas, tu calificación cuenta cerca de ' +
        textoReferencia(ref) + '; con más reseñas pesa más la tuya.';
    } else {
      razon = 'Tienes ' + estrellas(R) + ' con ' + v + ' reseñas: con tantas, tu calificación cuenta casi tal cual (comparada con ' + textoReferencia(ref) + ').';
    }
    return { valor, razon };
  }

  function pilarVisibilidad(e) {
    if (!e.giroMedible) {
      return { valor: null, razon: 'No lo pudimos comprobar: sin saber a qué se dedica tu negocio no pudimos buscarlo como lo buscaría un cliente nuevo.' };
    }
    const p = e.posicionGiro;
    if (p >= 1 && p <= 3) return { valor: 100, razon: 'Apareces en el lugar ' + p + ' buscando lo que vendes en tu ciudad. Los primeros 3 lugares cuentan completo.' };
    if (p >= 4 && p <= 10) {
      return { valor: Math.max(0, 100 - 15 * (p - 3)), razon: 'Apareces en el lugar ' + p + ' de 10 buscando lo que vendes en tu ciudad. Los primeros 3 lugares cuentan completo.' };
    }
    return { valor: VIS_SOLO_NOMBRE, razon: 'Te encontramos buscando tu nombre, pero no entre los primeros 10 resultados buscando lo que vendes en tu ciudad.' };
  }

  function pilarFundamentos(e) {
    const web = !!e.sitioWeb;
    const horario = !!e.horarioCompleto;
    const valor = ((web ? 100 : 0) + (horario ? 100 : 0)) / 2;
    const razon = 'Sitio web enlazado en tu ficha: ' + (web ? 'sí' : 'no') + ' · Horario completo: ' + (horario ? 'sí' : 'no') +
      '. Si tu ficha está reclamada por ti no lo podemos ver, así que eso no cuenta ni a favor ni en contra.';
    return { valor, razon };
  }

  function pilarCompletitud(e) {
    if (typeof e.fotos !== 'number') return { valor: null, razon: 'No lo pudimos comprobar: Google no nos dio el número de fotos de tu ficha.' };
    if (e.fotos >= TOPE_FOTOS) return { valor: 100, razon: 'Vimos ' + TOPE_FOTOS + ' fotos o más en tu ficha (es lo máximo que Google nos deja contar).' };
    return {
      valor: 100 * (1 - Math.exp(-LAMBDA * e.fotos)),
      razon: 'Vimos ' + plural(e.fotos, 'foto', 'fotos') + ' en tu ficha. Con ' + TOPE_FOTOS + ' o más cuenta completo.',
    };
  }

  function pilarActividad() {
    return { valor: null, razon: 'No lo pudimos comprobar: Google no nos deja ver si respondes reseñas ni cuándo actualizaste tu ficha por última vez.' };
  }

  /* ---------------- Resultado ---------------- */
  function banda(tds) {
    const n = Math.round(tds);
    if (n >= 95) return 'dominante';
    if (n >= 80) return 'fuerte';
    if (n >= 60) return 'saludable';
    if (n >= 40) return 'vulnerable';
    return 'invisible';
  }

  function calcular(entrada) {
    const e = entrada || {};
    const ref = e.referencia || referencia(null);
    let crudos;
    if (!e.encontrado) {
      const sinFicha = 'Sin una ficha en Google, este pilar todavía no puede sumar.';
      crudos = {
        reputacion: { valor: 0, razon: sinFicha }, visibilidad: { valor: 0, razon: sinFicha },
        fundamentos: { valor: 0, razon: sinFicha }, completitud: { valor: 0, razon: sinFicha },
        actividad: pilarActividad(),
      };
    } else {
      crudos = {
        reputacion: pilarReputacion(e, ref), visibilidad: pilarVisibilidad(e),
        fundamentos: pilarFundamentos(e), completitud: pilarCompletitud(e), actividad: pilarActividad(),
      };
    }

    const pesoMedido = ORDEN.reduce((s, k) => s + (crudos[k].valor == null ? 0 : PESOS[k]), 0);
    const multiplicador = e.encontrado ? 1 : 0;
    let total = 0;
    const pilares = ORDEN.map(k => {
      const medido = crudos[k].valor != null;
      const pesoAplicado = medido && pesoMedido > 0 ? PESOS[k] / pesoMedido : 0;
      if (medido) total += crudos[k].valor * pesoAplicado;
      return {
        clave: k, nombre: NOMBRES[k], peso: PESOS[k], pesoAplicado,
        valor: medido ? redondear1(crudos[k].valor) : null, razon: crudos[k].razon,
      };
    });

    const tds = Math.max(0, Math.min(100, Math.round(multiplicador * total)));
    const pilaresMedidos = pilares.filter(p => p.valor != null).length;
    return {
      tds, banda: banda(tds), pilares, parcial: pilaresMedidos < ORDEN.length,
      pilaresMedidos, multiplicador, referencia: ref,
    };
  }

  /* ---------------- Acciones y simulador ---------------- */
  function aplicarAccion(entrada, clave) {
    const e = Object.assign({}, entrada);
    if (clave === 'sitioweb') e.sitioWeb = true;
    else if (clave === 'horario') e.horarioCompleto = true;
    else if (clave === 'fotos') e.fotos = TOPE_FOTOS;
    else if (clave === 'resenas') {
      if (typeof e.calificacion !== 'number') e.calificacion = (e.referencia || referencia(null)).valor;
      e.totalResenas = META_RESENAS;
    }
    return e;
  }

  function aplica(e, clave) {
    if (clave === 'sitioweb') return !e.sitioWeb;
    if (clave === 'horario') return !e.horarioCompleto;
    if (clave === 'fotos') return typeof e.fotos === 'number' && e.fotos < TOPE_FOTOS;
    if (clave === 'resenas') return (e.totalResenas || 0) < META_RESENAS;
    return false;
  }

  function acciones(entrada) {
    const e = entrada || {};
    if (!e.encontrado) return [];
    const actual = calcular(e).tds;
    return ACCIONES
      .filter(a => aplica(e, a.clave))
      .map((a, i) => ({ clave: a.clave, texto: a.texto, puntos: calcular(aplicarAccion(e, a.clave)).tds - actual, orden: i }))
      .filter(a => a.puntos >= 1)
      .sort((a, b) => b.puntos - a.puntos || a.orden - b.orden)
      .slice(0, 3)
      .map(({ clave, texto, puntos }) => ({ clave, texto, puntos }));
  }

  function simular(entrada, cambios) {
    return calcular(Object.assign({}, entrada, cambios));
  }

  const API = {
    calcular, banda, referencia, acciones, aplicarAccion, simular,
    BANDAS, FRASE_NO_ENCONTRADO, PESOS, NOMBRES, ORDEN, META_RESENAS, TOPE_FOTOS, REFERENCIA_FIJA, MIN_COMPETENCIA,
  };
  if (typeof window !== 'undefined') window.ThemoraTDS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
