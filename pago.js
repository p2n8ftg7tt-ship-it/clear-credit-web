/* =========================================================================
   Cómo se cobra, y el número de referencia — Themora
   =========================================================================

   PARA CONFIGURARLO, EDDIE: una sola línea, MEDIOS_DE_COBRO.

   El problema que esto resuelve: hoy el sitio no tiene pasarela de pago. El
   formulario manda los datos y el cobro se acuerda después, por fuera. Eso es
   defendible mientras empiezas — lo que NO es defendible es no decirlo. Una
   persona que llena un formulario de $149 y no sabe cuándo ni cómo le van a
   cobrar, asume lo peor y se va.

   Lo que esto añade, sin pasarela:
     1. Un bloque ANTES del formulario que dice cómo y cuándo se cobra.
     2. Un número de referencia que se genera al enviar, se le muestra a la
        persona y viaja dentro del envío. Es el rastro que hoy no existe:
        si hay una discusión, los dos tienen el mismo número.

   Lo que esto NO reemplaza: un recibo real ni protección de comprador. Para
   eso hace falta una pasarela (Stripe Checkout o Stripe Invoicing). Mientras
   no exista, la página lo dice con todas sus letras en vez de fingir.
   ========================================================================= */

(function () {
  'use strict';

  /* ← Pon aquí los medios por los que de verdad cobras, en orden.
     Ejemplo: ['Zelle', 'Cash App', 'transferencia bancaria']
     Si lo dejas vacío, el bloque dice honestamente que el medio se acuerda
     al confirmar, en vez de inventar uno. */
  var MEDIOS_DE_COBRO = [];

  /* ---------------------------------------------------------------------
     PRECIOS — la única lista de precios del sitio.

     Antes cada precio estaba escrito a mano en su página. Eso funciona
     hasta el día en que subes uno y se te olvida el otro: entonces la
     portada dice $49.99, la página del servicio dice otra cosa, y quien
     lo nota deja de creerte todo lo demás. Ahora el número vive AQUÍ y
     cada lugar que lo muestra lo pide con data-precio-de="...".

     Para cambiar un precio: cámbialo en esta lista. Se actualiza solo en
     la portada, en el héroe de la página y en el bloque de cobro.
     --------------------------------------------------------------------- */
  var PRECIOS = {
    listar: {
      monto: '$49.99',
      nota: 'Los dos mapas, un solo pago',
      extras: ''
    },
    formar: {
      monto: '$149',
      nota: 'Nuestro trabajo',
      extras: 'más lo que cobre tu estado por registrar la LLC'
    }
  };

  /* Texto de una línea, el mismo en todas partes. */
  function textoPrecio(clave) {
    var p = PRECIOS[clave];
    if (!p || !p.monto) return '';
    return p.extras ? p.monto + ' ' + p.extras : p.monto;
  }

  function pintarPrecios() {
    var slots = document.querySelectorAll('[data-precio-de]');
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      var p = PRECIOS[el.getAttribute('data-precio-de')];
      if (!p || !p.monto) { el.hidden = true; continue; }
      var formato = el.getAttribute('data-precio-formato') || 'linea';
      if (formato === 'monto') {
        el.textContent = p.monto;
      } else if (formato === 'etiqueta') {
        el.textContent = p.extras ? p.monto + ' + estado' : p.monto;
      } else {
        el.textContent = textoPrecio(el.getAttribute('data-precio-de'));
      }
      el.hidden = false;
    }
  }

  /* Genera TH-AAMMDD-XXXX. No es un identificador secreto ni sirve para
     autenticar a nadie: es solo un rastro común para las dos partes. */
  function nuevaReferencia() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    var fecha = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1: se confunden al dictarlas
    var cola = '';
    var azar = (window.crypto && window.crypto.getRandomValues)
      ? window.crypto.getRandomValues(new Uint32Array(4))
      : [0, 0, 0, 0].map(function () { return Math.floor(Math.random() * 4294967296); });
    for (var i = 0; i < 4; i++) cola += letras[azar[i] % letras.length];
    return 'TH-' + fecha + '-' + cola;
  }

  function textoMedios() {
    if (!MEDIOS_DE_COBRO.length) {
      return 'Cuando confirmemos, te decimos el medio exacto de pago. ' +
             'Nunca se paga antes de que te confirmemos que sí podemos hacer el trámite.';
    }
    var lista = MEDIOS_DE_COBRO.length === 1
      ? MEDIOS_DE_COBRO[0]
      : MEDIOS_DE_COBRO.slice(0, -1).join(', ') + ' o ' + MEDIOS_DE_COBRO[MEDIOS_DE_COBRO.length - 1];
    return 'El pago se hace por ' + lista + '. Te mandamos el cobro cuando confirmemos ' +
           'que podemos hacer el trámite, no antes.';
  }

  /* A quién le estás pagando, y qué nombre vas a ver en el cobro.
     Alguien que manda dinero por Zelle y ve aparecer un apellido distinto del
     de la página asume que lo estafaron — y con razón, porque es exactamente
     así como se ven las estafas. Decirlo antes cuesta una línea. El dato sale
     de empresa.js; si está vacío, se dice lo único honesto: que se dirá al
     confirmar, y que si el nombre no coincide hay que preguntar. */
  function quienCobra() {
    var e = window.ThemoraEmpresa;
    var nombre = e && e.hayDatos && e.razonSocial ? e.razonSocial : '';
    if (nombre) {
      return '<p class="pago-quien"><strong>A quién le pagas:</strong> el cobro lo emite <b>' +
        String(nombre).replace(/[&<>"]/g, '') + '</b>, que es quien presta el servicio. ' +
        'Ese es el nombre que vas a ver. <strong>Si ves otro nombre, no pagues</strong> y ' +
        '<a href="contacto.html">pregúntanos</a> primero.</p>';
    }
    return '<p class="pago-quien"><strong>A quién le pagas:</strong> al confirmarte el precio te decimos ' +
      'el nombre exacto que verás en el cobro. <strong>Si el nombre no coincide con el que te dijimos, no pagues</strong> ' +
      'y <a href="contacto.html">pregúntanos</a> primero — así se ven las suplantaciones.</p>';
  }

  function pintar() {
    pintarPrecios();
    document.querySelectorAll('.pago-caja').forEach(function (caja) {
      /* El precio sale de PRECIOS si la caja dice de cuál servicio es;
         data-precio a mano sigue funcionando para no romper nada. */
      var clave = caja.getAttribute('data-precio-de');
      var precio = clave ? textoPrecio(clave) : (caja.getAttribute('data-precio') || '');
      caja.innerHTML =
        '<h3 class="pago-titulo">Cómo funciona el pago</h3>' +
        '<ol class="pago-pasos">' +
          '<li><strong>Mandas este formulario.</strong> No se cobra nada todavía y no se pide ningún dato de tarjeta. Aquí no hay pasarela de pago.</li>' +
          '<li><strong>Revisamos y te escribimos.</strong> Te confirmamos si podemos hacer el trámite en tu estado y el precio exacto' + (precio ? ' (hoy, ' + precio + ')' : '') + '.</li>' +
          '<li><strong>Si dices que sí, entonces se cobra.</strong> ' + textoMedios() + '</li>' +
          '<li><strong>Después te pedimos los documentos.</strong> Nunca antes de que sepas el precio y hayas decidido.</li>' +
        '</ol>' +
        quienCobra() +
        '<p class="pago-nota"><strong>Te lo decimos de frente:</strong> como el cobro es por fuera del sitio, no hay recibo automático ni protección de comprador como en una tienda en línea. Lo que sí tienes: un número de referencia al enviar este formulario, el precio por escrito antes de pagar, y las <a href="terminos.html#etapas">etapas y la fórmula de reembolso</a> escritas antes de que pagues nada. Guarda ese número y los mensajes.</p>';
      caja.hidden = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pintar);
  } else {
    pintar();
  }

  window.ThemoraPago = {
    nuevaReferencia: nuevaReferencia,
    MEDIOS: MEDIOS_DE_COBRO,
    PRECIOS: PRECIOS,
    textoPrecio: textoPrecio
  };
})();
