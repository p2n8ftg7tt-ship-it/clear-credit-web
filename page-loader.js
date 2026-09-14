/* =========================================================
   Indicador de carga — Clear Credit
   Muestra el círculo giratorio mientras la página termina de
   cargar (fuentes, imágenes, scripts), y lo vuelve a mostrar un
   momento al navegar a otra página del sitio, para que la espera
   en una conexión lenta se sienta más fluida.
   ========================================================= */
(function () {
  "use strict";

  function hideLoader() {
    var el = document.getElementById("pageLoader");
    if (el) el.classList.add("is-hidden");
  }

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader);
  }

  // Seguridad: si algo tarda demasiado en cargar, no dejamos a la
  // persona viendo el círculo para siempre — a los 4 segundos se
  // oculta solo, aunque la página siga terminando de cargar recursos.
  window.setTimeout(hideLoader, 4000);

  // Al hacer clic en un enlace interno del sitio, mostramos otra vez
  // el círculo de inmediato (la página de destino ya lo trae puesto
  // desde el principio, así que la transición se ve continua).
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a) return;

    var href = a.getAttribute("href") || "";
    if (
      !href ||
      href.charAt(0) === "#" ||
      href.indexOf("mailto:") === 0 ||
      href.indexOf("tel:") === 0 ||
      a.target === "_blank" ||
      a.hasAttribute("download")
    ) {
      return;
    }

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return;
    }
    if (url.origin !== window.location.origin) return;

    var el = document.getElementById("pageLoader");
    if (el) el.classList.remove("is-hidden");
  });
})();
