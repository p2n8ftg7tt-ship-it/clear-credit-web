/* =========================================================
   Themora — identidad legal de la empresa
   ---------------------------------------------------------
   Quién responde legalmente por este sitio: razón social,
   dirección y un correo para asuntos legales.

   POR QUÉ EXISTE ESTE ARCHIVO
   Un sitio que trata dinero, crédito y documentos de gente que
   muchas veces desconfía —con razón— de quien pide papeles, tiene
   que decir quién está del otro lado. Sin esto, Themora es una
   marca sin dueño: nadie sabe a quién reclamar, a qué dirección
   mandar una carta, ni en qué estado está registrada.

   POR QUÉ ESTÁ VACÍO
   Mismo criterio que el teléfono y el WhatsApp: una dirección
   inventada o un "próximamente" es peor que no poner nada. En
   cuanto Eddie llene estas líneas, el dato aparece solo en el pie
   de página, en Términos y en Privacidad. Mientras estén vacías,
   no se pinta nada — la página no miente ni promete.

   CÓMO LLENARLO
   Escribe entre las comillas y guarda. Nada más.

     RAZON_SOCIAL : el nombre EXACTO que está en el registro del
                    estado, con su terminación. Si la LLC todavía
                    no existe y operas como persona, pon tu nombre
                    legal y DEJA VACÍO 'ESTADO' y 'NUMERO_REGISTRO'.
     DIRECCION    : la dirección postal del registro. Si usas un
                    agente registrado o un buzón comercial, ESA es
                    la que va aquí — no la de tu casa.
     CORREO_LEGAL : un correo que de verdad leas. Puede ser el
                    mismo de contacto.
   ========================================================= */
(function () {
  'use strict';

  var RAZON_SOCIAL    = '';   // ← 'Themora LLC'
  var ESTADO          = '';   // ← 'Virginia'
  var NUMERO_REGISTRO = '';   // ← 'S1234567'
  var DIRECCION       = '';   // ← '123 Main St, Suite 4, Roanoke, VA 24011'
  var CORREO_LEGAL    = '';   // ← 'legal@mithemora.com'

  var hayAlgo = !!(RAZON_SOCIAL || DIRECCION || CORREO_LEGAL);

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* La línea de registro solo se arma si hay estado. Decir "registrada"
     sin decir dónde no informa nada. */
  function lineaRegistro() {
    if (!ESTADO) return '';
    var t = 'Registrada en ' + esc(ESTADO);
    if (NUMERO_REGISTRO) t += ' · No. ' + esc(NUMERO_REGISTRO);
    return t;
  }

  function bloqueCompleto() {
    var partes = [];
    if (RAZON_SOCIAL) partes.push('<strong>' + esc(RAZON_SOCIAL) + '</strong>');
    var reg = lineaRegistro();
    if (reg) partes.push(reg);
    if (DIRECCION) partes.push(esc(DIRECCION));
    if (CORREO_LEGAL) {
      partes.push('<a href="mailto:' + esc(CORREO_LEGAL) + '">' + esc(CORREO_LEGAL) + '</a>');
    }
    return partes.join('<br>');
  }

  function lineaCorta() {
    var partes = [];
    if (RAZON_SOCIAL) partes.push(esc(RAZON_SOCIAL));
    if (DIRECCION) partes.push(esc(DIRECCION));
    return partes.join(' · ');
  }

  function pintar() {
    var slots = document.querySelectorAll('[data-empresa]');
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      if (!hayAlgo) { el.hidden = true; continue; }
      var modo = el.getAttribute('data-empresa');
      el.innerHTML = modo === 'corta' ? lineaCorta() : bloqueCompleto();
      el.hidden = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pintar);
  } else {
    pintar();
  }

  window.ThemoraEmpresa = {
    hayDatos: hayAlgo,
    razonSocial: RAZON_SOCIAL,
    correoLegal: CORREO_LEGAL
  };
})();
