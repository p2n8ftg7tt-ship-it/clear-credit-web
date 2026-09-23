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

      // Lo que la persona escribe se escapa: pegarlo tal cual en innerHTML
      // dejaría que un texto con < o " se convierta en HTML.
      const u = escaparHtml(usuario);
      caja.innerHTML = lista.map(d =>
        `<button type="button" class="mail-suggest-item" role="option" data-value="${u}@${d}" tabindex="-1">` +
        `<span class="mail-suggest-user">${u}@</span><b>${d}</b></button>`).join('');
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

  /* ---------------------------------------------------------------
     3. Correo, errores de Supabase y destino después de entrar
     --------------------------------------------------------------- */

  function escaparHtml(txt) {
    return String(txt).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // Revisa lo mismo que revisaría un humano: algo@algo.algo, sin espacios.
  // Devuelve null si está bien, o el mensaje que hay que mostrar.
  function problemaCorreo(correo) {
    const c = String(correo || '').trim();
    if (!c) return 'Escribe tu correo electrónico.';
    if (/\s/.test(c)) return 'El correo no puede tener espacios.';
    if (c.indexOf('@') === -1) return 'Al correo le falta la @ (por ejemplo: nombre@gmail.com).';
    if (!/^[^@]+@[^@]+\.[a-z]{2,}$/i.test(c)) return 'Revisa el correo: debe verse como nombre@gmail.com.';
    return null;
  }

  /* Supabase contesta en inglés y con términos técnicos. Esto lo traduce a
     algo que una persona sin experiencia técnica entienda y sepa qué hacer.
     Se mira primero `code` (estable entre versiones) y después el texto,
     porque algunas respuestas viejas o de red no traen código. */
  function mensajeError(error) {
    const code = (error && error.code) || '';
    const msg = (error && error.message) || '';
    const status = error && error.status;
    const es = (codigos, patron) => codigos.indexOf(code) !== -1 || (patron && patron.test(msg));

    if (es(['invalid_credentials'], /invalid login credentials/i))
      return 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.';
    if (es(['email_not_confirmed'], /email not confirmed/i))
      return 'Todavía no confirmas tu correo. Busca el mensaje que te enviamos (revisa también la carpeta de correo no deseado) y haz clic en el enlace.';
    if (es(['user_already_exists', 'email_exists'], /already registered|already exists/i))
      return 'Ya existe una cuenta con ese correo. Inicia sesión, o usa «¿Olvidaste tu contraseña?» si no la recuerdas.';
    if (es(['over_email_send_rate_limit'], /email rate limit/i))
      return 'Enviamos demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.';
    if (es(['over_request_rate_limit', 'over_sms_send_rate_limit'], /rate limit|too many requests/i) || status === 429)
      return 'Hubo demasiados intentos seguidos. Por seguridad, espera unos minutos antes de volver a intentar.';
    if (/for security purposes.*after (\d+) seconds/i.test(msg))
      return 'Por seguridad, espera ' + msg.match(/after (\d+) seconds/i)[1] + ' segundos antes de pedir otro correo.';
    if (es(['weak_password'], /password should|password is known|pwned|weak/i))
      return 'Esa contraseña no es lo bastante segura. Usa al menos ' + LARGO_MINIMO + ' caracteres y que no sea una contraseña común.';
    if (es(['same_password'], /should be different/i))
      return 'La nueva contraseña tiene que ser distinta a la anterior.';
    if (es(['email_address_invalid', 'validation_failed'], /invalid.*email|unable to validate email/i))
      return 'Ese correo no parece válido. Revísalo (por ejemplo: nombre@gmail.com).';
    if (es(['otp_expired'], /token has expired|otp expired|link is invalid or has expired/i))
      return 'El enlace o código ya venció. Pide uno nuevo.';
    if (/invalid otp|token is invalid/i.test(msg))
      return 'El código no es correcto. Revísalo e inténtalo de nuevo.';
    if (es(['session_not_found', 'session_expired', 'refresh_token_not_found'], /session.*(missing|not found|expired)/i))
      return 'Tu sesión venció. Vuelve a pedir el enlace o a iniciar sesión.';
    if (es(['signup_disabled'], /signups not allowed/i))
      return 'Por ahora no estamos aceptando cuentas nuevas. Escríbenos desde la página de Contacto.';
    if (es(['user_banned'], /banned/i))
      return 'Esta cuenta está suspendida. Escríbenos desde la página de Contacto.';
    if (es(['provider_disabled'], /provider is not enabled|unsupported provider/i))
      return 'Este método de acceso no está activado todavía en el sitio. Prueba con otro método.';
    if (/sms.*not enabled|phone.*not enabled|to signup, please provide/i.test(msg))
      return 'El acceso por teléfono todavía no está activado en el sitio. Prueba con correo.';
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg) || status === 0)
      return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
    if (status >= 500)
      return 'El servicio de cuentas tiene un problema en este momento. Inténtalo de nuevo en unos minutos.';
    // Nunca mostrar el texto técnico en inglés: queda en la consola para diagnosticar.
    if (msg && typeof console !== 'undefined') console.warn('[Themora] Error de cuenta:', code || status, msg);
    return 'Algo salió mal. Inténtalo de nuevo, y si sigue pasando, escríbenos desde la página de Contacto.';
  }

  /* A dónde mandar a la persona después de entrar. Solo se aceptan páginas
     del propio sitio ("herramientas.html", "credito.html#guardar"): un
     ?next=https://otro-sitio.com convertiría el login en un redireccionador
     para estafas de phishing. */
  function destinoSeguro(valor, porDefecto) {
    const d = String(valor || '');
    return /^[a-z0-9-]+\.html(#[a-z0-9-]*)?$/i.test(d) && !/^login\.html/i.test(d) ? d : (porDefecto || 'cuenta.html');
  }

  const API = {
    montarSugerenciasCorreo,
    evaluar,
    MENSAJES,
    LARGO_MINIMO,
    DOMINIOS,
    escaparHtml,
    problemaCorreo,
    mensajeError,
    destinoSeguro
  };
  if (typeof window !== 'undefined') window.ThemoraAuthHelpers = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
