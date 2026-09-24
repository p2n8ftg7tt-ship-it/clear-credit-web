/* ===========================================================================
   Ciudad sugerida para "¿Aparezco?" — reglas en un solo lugar.

   La página llena "Ciudad y estado" con la ciudad del perfil (si hay sesión)
   o con la que Netlify deduce de la conexión (netlify/functions/ubicacion.mjs).
   Aquí vive lo que decide si esa ciudad sirve: formato "Ciudad, ST", solo los
   50 estados + DC, leer el perfil guardado y clasificar para las estadísticas
   (solo una categoría, nunca la ciudad).
   =========================================================================== */
(() => {
  'use strict';

  // Código → nombres aceptados (inglés y español), sin acentos y en minúsculas.
  const NOMBRES = {
    AL: ['alabama'], AK: ['alaska'], AZ: ['arizona'], AR: ['arkansas'],
    CA: ['california'], CO: ['colorado'], CT: ['connecticut'], DE: ['delaware'],
    DC: ['district of columbia', 'distrito de columbia', 'washington dc', 'washington d.c.'],
    FL: ['florida'], GA: ['georgia'], HI: ['hawaii'], ID: ['idaho'], IL: ['illinois'],
    IN: ['indiana'], IA: ['iowa'], KS: ['kansas'], KY: ['kentucky'], LA: ['louisiana', 'luisiana'],
    ME: ['maine'], MD: ['maryland'], MA: ['massachusetts'], MI: ['michigan'], MN: ['minnesota'],
    MS: ['mississippi', 'misisipi'], MO: ['missouri', 'misuri'], MT: ['montana'], NE: ['nebraska'],
    NV: ['nevada'], NH: ['new hampshire', 'nuevo hampshire'], NJ: ['new jersey', 'nueva jersey'],
    NM: ['new mexico', 'nuevo mexico'], NY: ['new york', 'nueva york'],
    NC: ['north carolina', 'carolina del norte'], ND: ['north dakota', 'dakota del norte'],
    OH: ['ohio'], OK: ['oklahoma'], OR: ['oregon'], PA: ['pennsylvania', 'pensilvania'],
    RI: ['rhode island'], SC: ['south carolina', 'carolina del sur'], SD: ['south dakota', 'dakota del sur'],
    TN: ['tennessee', 'tennesi'], TX: ['texas'], UT: ['utah'], VT: ['vermont'], VA: ['virginia'],
    WA: ['washington'], WV: ['west virginia', 'virginia occidental'], WI: ['wisconsin'], WY: ['wyoming'],
  };
  const ESTADOS = Object.keys(NOMBRES);

  const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  function codigoEstado(texto) {
    const t = normal(texto).replace(/\s+/g, ' ');
    if (!t) return null;
    const primero = t.split(/[\s,]+/)[0].toUpperCase();
    if (primero.length === 2 && NOMBRES[primero]) return primero;
    // Nombre completo al principio; el más largo gana ("west virginia" antes que "virginia").
    let mejor = null;
    let largo = 0;
    for (const codigo of ESTADOS) {
      for (const nombre of NOMBRES[codigo]) {
        if ((t === nombre || t.startsWith(nombre + ' ') || t.startsWith(nombre + ',')) && nombre.length > largo) {
          mejor = codigo;
          largo = nombre.length;
        }
      }
    }
    return mejor;
  }

  function formatear(ciudad, estado) {
    const c = String(ciudad || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const e = String(estado || '').trim().toUpperCase();
    if (!c || !NOMBRES[e]) return null;
    return c + ', ' + e;
  }

  function desdePerfil(metadata) {
    if (!metadata) return null;
    return formatear(metadata.city, codigoEstado(metadata.state_zip));
  }

  function clasificar({ valor, sugerido, origen }) {
    const v = String(valor || '').trim();
    if (!v) return 'vacia';
    if (!sugerido) return 'escrita';
    return v === String(sugerido).trim() ? origen : 'editada';
  }

  const API = { formatear, desdePerfil, codigoEstado, clasificar, ESTADOS };
  if (typeof window !== 'undefined') window.ThemoraCiudad = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
