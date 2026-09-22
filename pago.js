/* =========================================================================
   Cómo se cobra, y el número de referencia — Themora
   =========================================================================

   PARA CONFIGURARLO, EDDIE: dos líneas. FACTURA_CON_TARJETA y MEDIOS_DE_COBRO.

   LA IDEA
   Hay dos formas de que alguien te pague, y NO son equivalentes para él:

     · Con TARJETA, a través de una factura de Stripe. Si paga con tarjeta de
       crédito y no recibe lo que pagó, tiene derecho por ley a disputar el
       cargo con su banco (Fair Credit Billing Act, 60 días). Esa protección
       no se la damos nosotros y no se la podemos quitar: es de él.

     · Con ZELLE, Cash App o efectivo. Es como entregar dinero en mano: una
       vez enviado NO hay disputa posible ni forma de recuperarlo.

   Las dos son legítimas y las dos hacen falta — parte de la gente a la que
   sirve Themora no tiene tarjeta de crédito, y si el único camino es tarjeta,
   se quedan fuera. Lo que no es legítimo es dejar que alguien elija sin saber
   que está eligiendo. Por eso este bloque pone las dos una al lado de la otra
   y dice en voz alta cuál protege y cuál no.

   Decirlo tú antes de cobrar vale más que cualquier sello de seguridad: es la
   señal de que no dependes de que el cliente no se entere.

   LO QUE ESTE ARCHIVO HACE
     1. Un bloque ANTES del formulario que explica cómo y cuándo se cobra.
     2. La comparación honesta de los dos medios, con su protección real.
     3. Un número de referencia que se genera al enviar, se le muestra a la
        persona y viaja dentro del envío. Es el rastro común: si hay una
        discusión, los dos tienen el mismo número. Ese mismo número va después
        en la factura (lo pone crear-factura.js), así que el formulario, el
        cobro y el recibo quedan unidos por un solo código.
   ========================================================================= */

(function () {
  'use strict';

  /* ←←← PONLO EN true cuando tengas Stripe listo (ver INSTRUCCIONES-PAGOS.md).
     Mientras esté en false, la página NO menciona el pago con tarjeta: no se
     promete un camino que todavía no existe. */
  var FACTURA_CON_TARJETA = false;

  /* ← Los medios por los que cobras a mano, en orden.
     Ejemplo: ['Zelle', 'Cash App', 'efectivo']
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

  function listaMedios() {
    if (!MEDIOS_DE_COBRO.length) return '';
    return MEDIOS_DE_COBRO.length === 1
      ? MEDIOS_DE_COBRO[0]
      : MEDIOS_DE_COBRO.slice(0, -1).join(', ') + ' o ' + MEDIOS_DE_COBRO[MEDIOS_DE_COBRO.length - 1];
  }

  /* El tercer paso cambia según lo que esté configurado. Cuatro estados, y
     ninguno de ellos promete algo que no exista todavía. */
  function textoPaso3() {
    var manual = listaMedios();
    if (FACTURA_CON_TARJETA && manual) {
      return 'Te mandamos el cobro y eliges cómo pagar: <strong>con tarjeta</strong>, ' +
             'por una factura que te llega a tu correo, o <strong>por ' + manual + '</strong>. ' +
             'No son iguales — la diferencia está aquí abajo.';
    }
    if (FACTURA_CON_TARJETA) {
      return 'Te llega una <strong>factura a tu correo</strong> y pagas con tarjeta desde ahí. ' +
             'No se paga antes de que te confirmemos que sí podemos hacer el trámite.';
    }
    if (manual) {
      return 'El pago se hace por ' + manual + '. Te mandamos el cobro cuando confirmemos ' +
             'que podemos hacer el trámite, no antes.';
    }
    return 'Cuando confirmemos, te decimos el medio exacto de pago. ' +
           'Nunca se paga antes de que te confirmemos que sí podemos hacer el trámite.';
  }

  /* ---------------------------------------------------------------------
     La comparación honesta.

     Este es el bloque que más cuesta escribir y el que más vale. Decirle a
     alguien "si me pagas por Zelle no vas a poder reclamar" parece un tiro en
     el pie. No lo es: la persona que se entera DESPUÉS no vuelve nunca y se lo
     cuenta a los demás. La que se entera antes, por ti, entiende que no
     dependes de que ella no se entere — y esa es exactamente la señal que
     busca alguien que ya ha sido estafado una vez.

     La protección de la tarjeta es real y no es nuestra: sale de la Fair
     Credit Billing Act, da 60 días para disputar, y ni Themora ni Stripe se
     la pueden quitar. Por eso se puede afirmar sin exagerar.
     --------------------------------------------------------------------- */
  function comparacionMedios() {
    var manual = listaMedios();
    if (!FACTURA_CON_TARJETA) return '';

    var filaManual = manual
      ? '<div class="pago-opcion pago-opcion-sin">' +
          '<span class="pago-op-etiqueta pago-op-sin">Sin protección</span>' +
          '<strong>' + manual + '</strong>' +
          '<p>Va directo, sin comisión y sin esperar. Pero funciona como entregar dinero en mano: ' +
          '<strong>una vez enviado no se puede disputar ni recuperar</strong>, ni por nosotros ni por tu banco. ' +
          'Si eliges este camino, tu garantía es lo que dice esta página: el precio por escrito antes de pagar, ' +
          'tu número de referencia y las <a href="terminos.html#etapas">etapas de reembolso</a>.</p>' +
        '</div>'
      : '';

    return '<div class="pago-opciones">' +
      '<div class="pago-opcion pago-opcion-con">' +
        '<span class="pago-op-etiqueta pago-op-con">Con protección de tu banco</span>' +
        '<strong>Tarjeta, por factura</strong>' +
        '<p>Te llega una factura a tu correo y pagas ahí. Si pagas con <strong>tarjeta de crédito</strong> y no recibes lo que pagaste, ' +
        '<strong>tienes derecho por ley a disputar el cargo con tu banco</strong> — 60 días desde que te llega el estado de cuenta. ' +
        'Esa protección no te la damos nosotros y no te la podemos quitar: es tuya. ' +
        'Además te queda una factura que sirve de recibo.</p>' +
      '</div>' +
      filaManual +
    '</div>' +
    '<p class="pago-consejo"><strong>Si nos acabas de conocer, paga con tarjeta.</strong> ' +
    'Te lo decimos nosotros, aunque nos cueste la comisión: es el camino en el que no tienes que confiar en nadie. ' +
    'Y si no tienes tarjeta, el otro camino también está — solo queremos que sepas lo que estás eligiendo.</p>';
  }

  /* La nota final cambia: sin tarjeta, hay que decir que no hay recibo
     automático; con tarjeta, la factura ES el recibo. */
  function notaFinal() {
    if (FACTURA_CON_TARJETA) {
      return '<p class="pago-nota"><strong>Lo que tienes en las manos:</strong> un número de referencia al enviar este formulario ' +
        '(el mismo que va en la factura), el precio por escrito antes de pagar, una factura que sirve de recibo, ' +
        'y las <a href="terminos.html#etapas">etapas y la fórmula de reembolso</a> escritas antes de que pagues nada. ' +
        'Guarda el número y los mensajes.</p>';
    }
    return '<p class="pago-nota"><strong>Te lo decimos de frente:</strong> como el cobro es por fuera del sitio, ' +
      'no hay recibo automático ni protección de comprador como en una tienda en línea. Lo que sí tienes: ' +
      'un número de referencia al enviar este formulario, el precio por escrito antes de pagar, y las ' +
      '<a href="terminos.html#etapas">etapas y la fórmula de reembolso</a> escritas antes de que pagues nada. ' +
      'Guarda ese número y los mensajes.</p>';
  }

  /* A quién le estás pagando, y qué nombre vas a ver en el cobro.
     Alguien que manda dinero y ve aparecer un apellido distinto del de la
     página asume que lo estafaron — y con razón, porque es exactamente así
     como se ven las estafas. Decirlo antes cuesta una línea. El dato sale de
     empresa.js; si está vacío, se dice lo único honesto: que se dirá al
     confirmar, y que si el nombre no coincide hay que preguntar. */
  function quienCobra() {
    var e = window.ThemoraEmpresa;
    var nombre = e && e.hayDatos && e.razonSocial ? e.razonSocial : '';
    if (nombre) {
      return '<p class="pago-quien"><strong>A quién le pagas:</strong> el cobro lo emite <b>' +
        String(nombre).replace(/[&<>"]/g, '') + '</b>, que es quien presta el servicio. ' +
        'Ese es el nombre que vas a ver' + (FACTURA_CON_TARJETA ? ' en la factura y en tu estado de cuenta' : '') + '. ' +
        '<strong>Si ves otro nombre, no pagues</strong> y <a href="contacto.html">pregúntanos</a> primero.</p>';
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
          '<li><strong>Mandas este formulario.</strong> No se cobra nada todavía y no se pide ningún dato de tarjeta.</li>' +
          '<li><strong>Revisamos y te escribimos.</strong> Te confirmamos si podemos hacer el trámite en tu estado y el precio exacto' + (precio ? ' (hoy, ' + precio + ' USD)' : '') + '.</li>' +
          '<li><strong>Si dices que sí, entonces se cobra.</strong> ' + textoPaso3() + '</li>' +
          '<li><strong>Después te pedimos los documentos.</strong> Nunca antes de que sepas el precio y hayas decidido.</li>' +
        '</ol>' +
        comparacionMedios() +
        quienCobra() +
        notaFinal();
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
    TARJETA: FACTURA_CON_TARJETA,
    PRECIOS: PRECIOS,
    textoPrecio: textoPrecio
  };
})();
