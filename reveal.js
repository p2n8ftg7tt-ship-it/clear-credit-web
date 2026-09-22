/* Revelado suave al hacer scroll. Progresivo a propósito: el CSS ya deja
   todo visible por defecto (ver [data-reveal] en styles.css), así que si
   este script no carga o el navegador no soporta IntersectionObserver,
   nadie se queda sin ver el contenido. */
(function(){
  if(!('IntersectionObserver' in window)) return;
  var items = document.querySelectorAll('[data-reveal]');
  if(!items.length) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:.15, rootMargin:'0px 0px -40px 0px'});
  items.forEach(function(el){ io.observe(el); });
})();
