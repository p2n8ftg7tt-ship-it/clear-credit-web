/* =========================================================
   ¿Cuál de las fichas de Google es el negocio de la persona?
   ---------------------------------------------------------
   revisar-negocio.js pedía 3 resultados por nombre y se quedaba siempre con
   el primero. Si Google pone primero una ficha parecida (otra sucursal, otro
   giro, un nombre casi igual), todo el TDS se calcula sobre el negocio
   equivocado. Aquí Jev (TypeSafe, modelo System One) hace una sola
   pregunta de elección con los datos de las fichas y devuelve cuál encaja.

   El TDS NO cambia: sigue calculándolo tds.js. Jev solo ayuda a escoger la
   ficha correcta antes de medir. Funciona sin IA (constitución III): sin
   TYPESAFE_API_KEY, con JEV_APARECZO=off, con un error o con poca confianza
   se queda la primera ficha, como siempre.

   Variables de entorno (Netlify):
     TYPESAFE_API_KEY   ← opcional. Sin ella, todo sigue igual que antes.
     JEV_APARECZO=off   ← interruptor para apagarlo sin republicar.
   ========================================================= */
'use strict';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODELO_JEV = 'jev-latest';
const CONFIANZA_MINIMA = 0.7; // por debajo, se queda la primera ficha

function jevActivo() {
  return !!process.env.TYPESAFE_API_KEY && String(process.env.JEV_APARECZO || '').toLowerCase() !== 'off';
}

const texto = (v, max) => String(v || '').trim().slice(0, max);

/* Solo lo necesario para decidir: nada de teléfonos ni reseñas. */
function resumenFicha(p, i) {
  return {
    opcion: String(i),
    nombre: texto(p.displayName && p.displayName.text, 120),
    direccion: texto(p.formattedAddress, 200),
    tipo: texto(p.primaryTypeDisplayName && p.primaryTypeDisplayName.text, 80),
    estado: texto(p.businessStatus, 30),
  };
}

function armarPeticion({ nombre, ciudad, giro }, candidatos) {
  const criteria = { ninguna: 'Ninguna ficha parece ser el negocio descrito.' };
  candidatos.forEach((p, i) => {
    criteria[String(i)] = 'La ficha de la opción ' + i + ' (' + texto(p.displayName && p.displayName.text, 80) + ') es el negocio descrito.';
  });
  return {
    model: MODELO_JEV,
    state: {
      lo_que_escribio_la_persona: { nombre: texto(nombre, 140), ciudad: texto(ciudad, 140), a_que_se_dedica: texto(giro, 140) },
      fichas_de_google: candidatos.map(resumenFicha),
    },
    questions: {
      ficha: {
        type: 'choice',
        instructions:
          'La persona escribió el nombre, la ciudad y a qué se dedica su negocio. ' +
          '¿Cuál de las fichas de Google es ese mismo negocio? Un nombre parecido en otra ciudad, ' +
          'otro giro o una sucursal distinta no cuenta. Si la persona escribió el nombre con errores ' +
          'menores o en otro idioma, la ficha puede ser la misma.',
        criteria,
      },
    },
  };
}

/* Devuelve el índice del candidato elegido, o null si no hay razón para
   cambiar la primera ficha. Nunca lanza: cualquier falla = null. */
async function elegirFicha(entrada, candidatos, { fetchFn, tiempoMs } = {}) {
  if (!jevActivo() || !Array.isArray(candidatos) || candidatos.length < 2) return null;
  const llamar = fetchFn || global.fetch;
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), tiempoMs || 3000);
  try {
    const res = await llamar(ENDPOINT, {
      method: 'POST',
      signal: control.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.TYPESAFE_API_KEY },
      body: JSON.stringify(armarPeticion(entrada, candidatos)),
    });
    if (!res.ok) return null;
    const resp = ((await res.json()).answers || {}).ficha;
    if (!resp || typeof resp.choice !== 'string') return null;
    const indice = Number(resp.choice);
    const confianza = typeof resp.confidence === 'number' ? resp.confidence : 0;
    // Solo se cambia de ficha si Jev está seguro y la elegida no es la primera.
    if (!Number.isInteger(indice) || indice <= 0 || indice >= candidatos.length) return null;
    return confianza >= CONFIANZA_MINIMA ? indice : null;
  } catch {
    return null;
  } finally {
    clearTimeout(corte);
  }
}

module.exports = { elegirFicha, jevActivo, armarPeticion, CONFIANZA_MINIMA, ENDPOINT };
