/* ===========================================================================
   Analítica de Themora — sin cookies, sin banner de consentimiento
   ---------------------------------------------------------------------------
   PARA ENCENDERLA, EDDIE: solo cambia UNA línea, la de UMAMI_WEBSITE_ID.

     1. Entra a https://cloud.umami.is y crea la cuenta (gratis, sin tarjeta).
     2. "Add website" → nombre: Themora → dominio: tu dominio de Netlify.
     3. Entra al sitio recién creado → pestaña "Tracking code".
     4. De ese código copia SOLO el valor de data-website-id (se ve como
        xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) y pégalo abajo entre las
        comillas de UMAMI_WEBSITE_ID.
     5. Sube el cambio. Listo — en unos minutos verás las visitas.

   Si el src que te muestra tu panel NO es cloud.umami.is (pasa si algún día
   lo mueves a tu propio servidor), pega ese otro enlace en UMAMI_SCRIPT.

   Mientras UMAMI_WEBSITE_ID esté vacío, este archivo no hace absolutamente
   nada: no carga ningún script, no manda ningún dato. El sitio funciona igual.

   Por qué Umami y no Google Analytics: no usa cookies ni huella digital del
   navegador, así que no hace falta el banner de "aceptar cookies" — que en un
   sitio cuyo argumento central es que respeta la privacidad de la gente,
   habría sido una contradicción incómoda.
   =========================================================================== */
(() => {
  'use strict';

  const UMAMI_WEBSITE_ID = 'ea20b35d-ee72-4363-8c6c-29d748ae84cc';                              // ← pega aquí la ID
  const UMAMI_SCRIPT     = 'https://cloud.umami.is/script.js';

  /* ---------------------------------------------------------------------
     1. Cargar el medidor (solo si ya hay ID)
     --------------------------------------------------------------------- */
  const encendida = Boolean(UMAMI_WEBSITE_ID);

  if (encendida) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = UMAMI_SCRIPT;
    s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------------------
     2. Marcar acciones que se crean con JavaScript
     --------------------------------------------------------------------
     Los botones que ya existen en el HTML llevan su data-umami-event
     escrito ahí mismo. Aquí solo se marcan los que nacen desde JS y por
     eso no se pueden etiquetar a mano.
     --------------------------------------------------------------------- */
  function marcar(selector, evento) {
    document.querySelectorAll(selector).forEach(el => {
      if (!el.hasAttribute('data-umami-event')) el.setAttribute('data-umami-event', evento);
    });
  }

  function marcarLoQueNaceDespues() {
    marcar('.credit-coach-launcher', 'zyron-abrir');
    marcar('.mail-suggest-item', 'correo-sugerencia-usada');
  }

  // El botón de Zyron se inyecta después de cargar la página.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(marcarLoQueNaceDespues, 400));
  } else {
    setTimeout(marcarLoQueNaceDespues, 400);
  }
  new MutationObserver(marcarLoQueNaceDespues)
    .observe(document.documentElement, { childList: true, subtree: true });

  /* ---------------------------------------------------------------------
     3. Una forma segura de mandar un evento desde cualquier archivo
     --------------------------------------------------------------------
     Uso:  window.ThemoraStats.evento('carta-explicada', { categoria: 'irs' });

     Nunca falla ni rompe la página si la analítica está apagada o si el
     script no cargó (por ejemplo con un bloqueador de anuncios).
     IMPORTANTE: no le pases nunca datos personales — ni correos, ni nombres,
     ni el contenido de una carta. Solo etiquetas cortas y genéricas.
     --------------------------------------------------------------------- */
  window.ThemoraStats = {
    encendida,
    evento(nombre, datos) {
      try {
        if (window.umami && typeof window.umami.track === 'function') {
          datos ? window.umami.track(nombre, datos) : window.umami.track(nombre);
        }
      } catch (_) { /* la analítica jamás debe romper el sitio */ }
    }
  };
})();
