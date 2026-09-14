/* ===========================================================================
   Ayudas del formulario de cuenta:
     1) Sugerencias de dominio al escribir el correo (@gmail.com, etc.)
     2) Medidor y reglas de la contraseña nueva
     3) Comparación con "confirmar contraseña"

   Sobre las reglas: la guía federal vigente (NIST SP 800-63B revisión 4,
   agosto de 2025) dice que lo que de verdad protege una contraseña es su
   LARGO y que no esté en las listas de contraseñas filtradas — y que NO se
   deben exigir mayúsculas ni símbolos, porque empujan a la gente a patrones
   predecibles tipo "Password1!". Por eso aquí el largo y la lista negra son
   obligatorios, y mayúsculas/números/símbolos suman fuerza pero no bloquean.
   =========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------
     1. Sugerencias de dominio de correo
     --------------------------------------------------------------- */

  // Los más usados en EE. UU. y en Latinoamérica.
  const DOMINIOS = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
    'live.com', 'aol.com', 'msn.com', 'protonmail.com', 'me.com',
    'hotmail.es', 'yahoo.com.mx', 'outlook.es', 'live.com.mx', 'gmail.es'
  ];

  function montarSugerenciasCorreo(input) {
    if (!input || input.dataset.suggestReady) return;
    input.dataset.suggestReady = '1';
    input.setAttribute('autocomplete', input.getAttribute('autocomplete') || 'email');

    const caja = document.createElement('div');
    caja.className = 'mail-suggest';
    caja.hidden = true;
    caja.setAttribute('role', 'listbox');
    const envoltura = document.createElement('div');
    envoltura.className = 'mail-suggest-wrap';
    input.parentNode.insertBefore(envoltura, input);
    envoltura.appendChild(input);
    envoltura.appendChild(caja);

    let activo = -1;

    const opciones = () => Array.from(caja.querySelectorAll('.mail-suggest-item'));

    function cerrar() { caja.hidden = true; caja.innerHTML = ''; activo = -1; }

    function elegir(valor) {
      input.value = valor;
      cerrar();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }

    function pintar() {
      const valor = input.value.trim();
      const arroba = valor.indexOf('@');
      if (arroba < 1) return cerrar();               // aún no escribe la @
      if (valor.indexOf('@', arroba + 1) !== -1) return cerrar(); // dos arrobas: no sugerimos

      const usuario = valor.slice(0, arroba);
      const escrito = valor.slice(arroba + 1).toLowerCase();
      const lista = DOMINIOS
        .filter(d => d.startsWith(escrito))
        .filter(d => d !== escrito)                  // ya lo escribió completo
        .slice(0, 6);

      if (!lista.length) return cerrar();

      caja.innerHTML = lista.map((d, idx) =>
        `<button type="button" class="mail-suggest-item" role="option" data-value="${usuario}@${d}" tabindex="-1">` +
        `<span class="mail-suggest-user">${usuario}@</span><b>${d}</b></button>`).join('');
      caja.hidden = false;
      activo = -1;
    }

    function marcar(idx) {
      const items = opciones();
      items.forEach(el => el.classList.remove('is-active'));
      if (idx >= 0 && items[idx]) {
        items[idx].classList.add('is-active');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
      activo = idx;
    }

    input.addEventListener('input', pintar);
    input.addEventListener('focus', pintar);
    input.addEventListener('blur', () => setTimeout(cerrar, 140));

    input.addEventListener('keydown', event => {
      if (caja.hidden) return;
      const items = opciones();
      if (event.key === 'ArrowDown') { event.preventDefault(); marcar((activo + 1) % items.length); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); marcar((activo - 1 + items.length) % items.length); }
      else if (event.key === 'Enter' && activo >= 0) { event.preventDefault(); elegir(items[activo].dataset.value); }
      else if (event.key === 'Escape') { cerrar(); }
      else if (event.key === 'Tab' && activo >= 0) { elegir(items[activo].dataset.value); }
    });

    caja.addEventListener('mousedown', event => {
      const item = event.target.closest('.mail-suggest-item');
      if (item) { event.preventDefault(); elegir(item.dataset.value); }
    });
  }

  /* ---------------------------------------------------------------
     2. Fuerza de la contraseña
     --------------------------------------------------------------- */

  const LARGO_MINIMO = 10;

  // Las contraseñas más usadas del mundo y sus variantes obvias. Se compara
  // sin distinguir mayúsculas y quitando los cambios típicos (a→@, e→3, etc.),
  // porque "P@ssw0rd" es exactamente igual de conocida que "password".
  const COMUNES = [
    'password','passwort','contrasena','contraseña','123456','12345678','123456789','1234567890',
    'qwerty','qwertyuiop','abc123','111111','000000','iloveyou','admin','welcome','monkey',
    'dragon','sunshine','princess','football','baseball','superman','batman','master','login',
    'letmein','trustno1','whatever','starwars','freedom','shadow','michael','jennifer','jordan',
    'hunter','ranger','soccer','hockey','killer','george','andrew','charlie','thomas','robert',
    'mexico','colombia','venezuela','argentina','america','familia','tequiero','teamo','amor',
    'hola','holahola','maria','jose','juan','carlos','alejandro','fernando','guadalupe',
    'qazwsx','zaqwsx','asdfgh','zxcvbn','1q2w3e4r','1qaz2wsx','q1w2e3r4','password1','password123'
  ];

  function normalizar(txt) {
    return String(txt).toLowerCase()
      .replace(/[@]/g, 'a').replace(/[4]/g, 'a')
      .replace(/[3]/g, 'e').replace(/[1!|]/g, 'i')
      .replace(/[0]/g, 'o').replace(/[$5]/g, 's')
      .replace(/[7]/g, 't');
  }

  function esComun(pass) {
    const limpio = txt => String(txt).toLowerCase().replace(/[^a-z0-9ñ]/g, '');
    const crudo = limpio(pass);
    if (!crudo) return false;

    // Se prueban cuatro formas de la misma contraseña, porque "Password1!",
    // "P@ssw0rd" y "password" son la misma para quien la intenta adivinar:
    //   tal cual · sin los dígitos del final · sin los cambios tipo a→@ · ambas
    const variantes = new Set([
      crudo,
      crudo.replace(/\d+$/, ''),
      limpio(normalizar(pass)),
      limpio(normalizar(pass)).replace(/\d+$/, '')
    ]);

    return COMUNES.some(c => {
      const cn = limpio(normalizar(c));
      const cc = limpio(c);
      for (const v of variantes) {
        if (v.length >= 4 && (v === cn || v === cc)) return true;
      }
      return false;
    });
  }

  // Secuencias y repeticiones: "aaaaaa", "abcdef", "123456", "qwerty"
  function esPatron(pass) {
    const p = String(pass).toLowerCase();
    if (/^(.)\1+$/.test(p)) return true;                    // un solo carácter repetido
    const filas = 'abcdefghijklmnopqrstuvwxyz0123456789qwertyuiopasdfghjklzxcvbnm';
    for (let i = 0; i + p.length <= filas.length; i++) {
      const trozo = filas.slice(i, i + p.length);
      if (p === trozo || p === trozo.split('').reverse().join('')) return true;
    }
    return false;
  }

  /* Devuelve todo lo que el formulario necesita saber de una contraseña. */
  function evaluar(pass, correo) {
    const p = String(pass || '');
    const usuarioCorreo = String(correo || '').split('@')[0].toLowerCase();

    const checks = {
      largo:      p.length >= LARGO_MINIMO,
      mayuscula:  /[A-ZÁÉÍÓÚÑ]/.test(p),
      minuscula:  /[a-záéíóúñ]/.test(p),
      numero:     /\d/.test(p),
      // Un espacio suma largo, pero no cuenta como símbolo: decir que sí
      //  sería marcar una regla que la persona no cumplió.
      simbolo:    /[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ\s]/.test(p),
      largoExtra: p.length >= 14
    };

    // Bloqueantes: sin esto no se puede crear la cuenta.
    const problemas = [];
    if (!p) problemas.push('vacia');
    else {
      if (!checks.largo) problemas.push('corta');
      if (esComun(p)) problemas.push('comun');
      else if (esPatron(p)) problemas.push('patron');
      if (usuarioCorreo.length >= 3 && normalizar(p).includes(normalizar(usuarioCorreo))) problemas.push('correo');
    }

    // Puntaje 0–4, mandado por el largo y ayudado por la variedad.
    let puntos = 0;
    if (p.length >= LARGO_MINIMO) puntos++;
    if (p.length >= 14) puntos++;
    if (p.length >= 18) puntos++;
    const variedad = [checks.mayuscula, checks.minuscula, checks.numero, checks.simbolo].filter(Boolean).length;
    if (variedad >= 3) puntos++;
    if (problemas.length) puntos = 0;

    const nivel = ['muy débil', 'débil', 'aceptable', 'buena', 'muy buena'][Math.min(puntos, 4)];
    return { checks, problemas, puntos: Math.min(puntos, 4), nivel, valida: problemas.length === 0 };
  }

  const MENSAJES = {
    vacia:  'Escribe una contraseña.',
    corta:  'Necesita al menos ' + LARGO_MINIMO + ' caracteres. El largo es lo que más protege — una frase que recuerdes es más segura y más fácil que algo corto y raro.',
    comun:  'Esa es una de las contraseñas más usadas del mundo (o una variante obvia). Es de las primeras que prueba cualquier atacante.',
    patron: 'Es una secuencia o una repetición ("123456", "qwerty", "aaaaaa"). Se adivina en segundos.',
    correo: 'No uses tu propio correo dentro de la contraseña — es lo primero que prueban.'
  };

  window.ThemoraAuthHelpers = {
    montarSugerenciasCorreo,
    evaluar,
    MENSAJES,
    LARGO_MINIMO,
    DOMINIOS
  };
})();
