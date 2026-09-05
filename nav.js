/* ===== Menú de arriba: grupos desplegables =====
   En computadora el menú se abre al pasar el cursor Y al hacer clic; también
   se maneja con teclado (Enter/Espacio para abrir, Escape para cerrar).
   En celular no existe "pasar el cursor", así que el CSS deja los grupos
   siempre abiertos dentro del menú de hamburguesa y este archivo no
   interviene. */
(() => {
  'use strict';

  const groups = Array.from(document.querySelectorAll('.nav-group'));
  if (!groups.length) return;

  // El desplegable solo aplica en pantallas anchas...
  const desktop = window.matchMedia('(min-width: 901px)');
  // ...y hay que distinguir si el aparato tiene cursor de verdad. Una tableta
  // en horizontal es "ancha" pero no tiene cursor: ahí el menú abre al tocar.
  const canHover = window.matchMedia('(hover: hover)');

  function close(group) {
    group.classList.remove('is-open');
    const btn = group.querySelector('.nav-group-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function open(group) {
    groups.forEach(other => { if (other !== group) close(other); });
    group.classList.add('is-open');
    const btn = group.querySelector('.nav-group-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function closeAll() { groups.forEach(close); }

  groups.forEach(group => {
    const btn = group.querySelector('.nav-group-btn');
    if (!btn) return;

    // Cursor: abrir al entrar, cerrar al salir. Se cierra con un pequeño
    // retraso para que no desaparezca si el mouse pasa en diagonal hacia
    // el menú — el error clásico de estos desplegables.
    let closeTimer = null;
    group.addEventListener('mouseenter', () => {
      if (!desktop.matches || !canHover.matches) return;
      window.clearTimeout(closeTimer);
      open(group);
    });
    group.addEventListener('mouseleave', () => {
      if (!desktop.matches || !canHover.matches) return;
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => close(group), 180);
    });

    btn.addEventListener('click', event => {
      event.preventDefault();
      if (!desktop.matches) return; // en celular ya está todo visible
      // Donde hay cursor, el menú ya se abrió solo al acercarse: si el clic
      // lo cerrara, se cerraría justo cuando la persona intenta usarlo.
      if (canHover.matches) { open(group); return; }
      group.classList.contains('is-open') ? close(group) : open(group);
    });

    btn.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(group);
        const first = group.querySelector('.nav-menu a');
        if (first) first.focus();
      }
    });

    // Si el foco sale del grupo por completo, se cierra.
    group.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!group.contains(document.activeElement)) close(group);
      }, 0);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = groups.find(g => g.classList.contains('is-open'));
    if (!open) return;
    const btn = open.querySelector('.nav-group-btn');
    close(open);
    if (btn) btn.focus();
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-group')) closeAll();
  });

  // Al pasar de celular a computadora (o al girar el teléfono) se limpia el estado.
  const onChange = () => closeAll();
  desktop.addEventListener ? desktop.addEventListener('change', onChange) : desktop.addListener(onChange);
})();
