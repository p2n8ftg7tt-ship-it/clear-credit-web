/* =========================================================
   Pase del agente de crédito (spec 017).
   El pase liga las vueltas de un mismo análisis sin guardar nada en el
   servidor: va firmado con AGENTE_CREDITO_SECRETO y lleva el HMAC de la
   conversación, así el navegador no puede cambiar lo que ya se habló.
   ========================================================= */
'use strict';

const crypto = require('crypto');

/* JSON con las claves ordenadas: el mismo contenido da siempre el mismo texto. */
function canonico(valor) {
  if (Array.isArray(valor)) return '[' + valor.map(canonico).join(',') + ']';
  if (valor && typeof valor === 'object') {
    return '{' + Object.keys(valor).sort().filter((k) => valor[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canonico(valor[k])).join(',') + '}';
  }
  return JSON.stringify(valor === undefined ? null : valor);
}

const hmac = (texto, secreto) => crypto.createHmac('sha256', secreto).update(texto).digest('base64url');

function hmacConversacion(messages, secreto) {
  return hmac('conversacion:' + canonico(messages), secreto);
}

function firmarPase(datos, secreto) {
  const cuerpo = Buffer.from(canonico(datos)).toString('base64url');
  return cuerpo + '.' + hmac('pase:' + cuerpo, secreto);
}

function leerPase(texto, secreto, ahoraSeg) {
  if (typeof texto !== 'string' || texto.length > 4000) return null;
  const partes = texto.split('.');
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const esperada = Buffer.from(hmac('pase:' + partes[0], secreto));
  const dada = Buffer.from(partes[1]);
  if (esperada.length !== dada.length || !crypto.timingSafeEqual(esperada, dada)) return null;
  let datos;
  try { datos = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8')); } catch (_) { return null; }
  if (!datos || datos.v !== 1 || typeof datos.e !== 'number' || datos.e <= ahoraSeg) return null;
  return datos;
}

module.exports = { canonico, firmarPase, leerPase, hmacConversacion };
