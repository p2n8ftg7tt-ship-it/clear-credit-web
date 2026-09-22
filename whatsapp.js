/* =========================================================================
   Canal de WhatsApp — Themora
   =========================================================================

   PARA ENCENDERLO, EDDIE: cambia UNA línea, la de WHATSAPP_NUMERO.

     Formato: código de país + número, sin +, sin espacios, sin guiones.
     Un número de Virginia se escribe así:  '15405551234'

   Mientras esa línea esté vacía NO aparece ningún botón en ninguna página.
   Es a propósito: un botón de WhatsApp que no lleva a nadie es peor que no
   tener botón, porque la persona escribe, no recibe respuesta, y se va.

   Por qué WhatsApp y no solo el formulario: para este público es el canal
   natural. Un formulario se siente como un trámite; un mensaje se siente
   como hablar con alguien. El formulario se queda para quien prefiere dejar
   sus datos y que le escriban.

   AVISO IMPORTANTE, para ti y para quien toque esto después: WhatsApp no es
   un canal privado ni cifrado de extremo a extremo para efectos de negocio
   — los mensajes quedan en tu teléfono y en el de la persona. Por eso el
   texto que se manda prellenado NUNCA pide número de seguro social, de
   cuenta ni de tarjeta, y la página lo dice. Si alguien te manda un dato de
   esos por WhatsApp, lo mejor es pedirle que lo borre y recogerlo por otra
   vía.
   ========================================================================= */

(function () {
  'use strict';

  var WHATSAPP_NUMERO = '';   // ← pon aquí tu número. Ejemplo: '15405551234'

  /* Para la página de Contacto. Mismo criterio: si están vacíos, no aparecen.
     Un correo o un teléfono publicados y sin atender hacen más daño que no
     tenerlos, porque la persona escribe, no recibe respuesta, y no vuelve.
     El teléfono va en dos formatos: TELEFONO como se lee, TELEFONO_MARCAR
     como se marca (sin espacios ni guiones, con el código de país). */
  var CORREO = '';            // ← ejemplo: 'hola@mithemora.com'
  var TELEFONO = '';          // ← como quieres que se lea: '(540) 555-0100'
  var TELEFONO_MARCAR = '';   // ← como se marca: '+15405550100'
  var HORARIO = '';           // ← opcional: 'Lunes a sábado, 9am a 7pm'

  /* ---------- Contacto directo (solo en la página de Contacto) ---------- */
  function pintarCanales() {
    var caja = document.getElementById('canalesDirectos');
    if (!caja) return;
    var filas = [];
    if (CORREO) {
      filas.push('<a class="cd-item" href="mailto:' + CORREO + '" data-umami-event="contacto-correo">' +
        '<span class="cd-ico" aria-hidden="true">✉</span>' +
        '<span><strong>Correo</strong><small>' + CORREO + '</small></span></a>');
    }
    if (TELEFONO && TELEFONO_MARCAR) {
      filas.push('<a class="cd-item" href="tel:' + TELEFONO_MARCAR + '" data-umami-event="contacto-telefono">' +
        '<span class="cd-ico" aria-hidden="true">☎</span>' +
        '<span><strong>Teléfono</strong><small>' + TELEFONO + '</small></span></a>');
    }
    if (!filas.length) return;
    caja.innerHTML = '<p class="cd-titulo">Si prefieres no usar el formulario:</p>' +
      '<div class="cd-lista">' + filas.join('') + '</div>' +
      (HORARIO ? '<small class="cd-horario">' + HORARIO + '</small>' : '');
    caja.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pintarCanales);
  } else {
    pintarCanales();
  }

  if (!WHATSAPP_NUMERO) return;

  var ICONO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18">' +
    '<path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/>' +
    '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.24 8.23z"/></svg>';

  function textoPorDefecto() {
    var pagina = (location.pathname.split('/').pop() || 'index.html');
    var mapa = {
      'listar-negocio.html': 'Hola, quiero que mi negocio aparezca en Google Maps y Apple Maps.',
      'formar-negocio.html': 'Hola, quiero registrar mi negocio (LLC) y sacar el EIN.',
      'aparezco.html': 'Hola, hice la revisión y mi negocio no aparece en los mapas.',
      'cartas-claras.html': 'Hola, me llegó una carta en inglés y necesito ayuda para entenderla.',
      'contrato-auto.html': 'Hola, tengo un contrato del dealer y quiero que me ayuden a revisarlo.',
      'agendar.html': 'Hola, quiero agendar una cita.'
    };
    return mapa[pagina] || 'Hola, vi la página de Themora y tengo una pregunta.';
  }

  /* Un texto que RECOMIENDA WhatsApp no puede quedarse visible cuando el botón
     de WhatsApp no existe. Antes pasaba: la caja se ocultaba sola, pero la frase
     "por WhatsApp suele ser lo más rápido" seguía ahí, mandando a la gente a un
     canal que no está. Ahora el texto tiene dos versiones y se enciende la que
     corresponde:
       [data-si-whatsapp]  → solo si hay número
       [data-sin-whatsapp] → solo si no lo hay  */
  (function alternarTextos() {
    var hay = !!WHATSAPP_NUMERO;
    document.querySelectorAll('[data-si-whatsapp]').forEach(function (el) { el.hidden = !hay; });
    document.querySelectorAll('[data-sin-whatsapp]').forEach(function (el) { el.hidden = hay; });
  })();

  // Se busca por la clase, no por [data-whatsapp]: las cajas llevan solo
  // data-whatsapp-label, y ese atributo NO coincide con ese selector.
  document.querySelectorAll('.wa-caja').forEach(function (caja) {
    var mensaje = caja.getAttribute('data-whatsapp') || textoPorDefecto();
    var etiqueta = caja.getAttribute('data-whatsapp-label') || 'Escríbenos por WhatsApp';
    var url = 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensaje);

    var a = document.createElement('a');
    a.className = 'wa-btn';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('data-umami-event', 'whatsapp-abrir');
    a.innerHTML = ICONO + '<span>' + etiqueta + '</span>';

    var nota = document.createElement('small');
    nota.className = 'wa-nota';
    nota.textContent = 'Por WhatsApp no mandes tu número de seguro social, de cuenta ni de tarjeta. No hacen falta, y ahí quedan guardados.';

    caja.appendChild(a);
    caja.appendChild(nota);
    caja.hidden = false;
  });
})();
