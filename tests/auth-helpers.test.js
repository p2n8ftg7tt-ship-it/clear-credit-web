/* Pruebas de las ayudas del login (auth-helpers.js): que los errores de
   Supabase lleguen en español y sin jerga, que el correo se revise bien y
   que ?next= nunca mande a la persona fuera del sitio.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const H = require('../auth-helpers.js');

/* ---------------- mensajeError ---------------- */
test('credenciales incorrectas: mensaje claro, por código o por texto', () => {
  const esperado = /Correo o contraseña incorrectos/;
  assert.match(H.mensajeError({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }), esperado);
  assert.match(H.mensajeError({ message: 'Invalid login credentials' }), esperado);
});

test('correo sin confirmar, cuenta repetida y límites de intentos', () => {
  assert.match(H.mensajeError({ code: 'email_not_confirmed', message: 'Email not confirmed' }), /confirmas tu correo/);
  assert.match(H.mensajeError({ code: 'user_already_exists', message: 'User already registered' }), /Ya existe una cuenta/);
  assert.match(H.mensajeError({ code: 'over_request_rate_limit', status: 429, message: 'Request rate limit reached' }), /demasiados intentos/);
  assert.match(H.mensajeError({ status: 429, message: 'x' }), /demasiados intentos/);
  assert.match(H.mensajeError({ code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' }), /demasiados correos/);
  assert.match(H.mensajeError({ message: 'For security purposes, you can only request this after 42 seconds.' }), /espera 42 segundos/);
});

test('contraseña débil usa el mínimo del sitio (10), no el de Supabase (6)', () => {
  const m = H.mensajeError({ code: 'weak_password', message: 'Password should be at least 6 characters.' });
  assert.match(m, /10 caracteres/);
  assert.doesNotMatch(m, /6 caracteres/);
});

test('sin red o con el servidor caído: se dice qué hacer', () => {
  assert.match(H.mensajeError({ message: 'Failed to fetch', status: 0 }), /internet/);
  assert.match(H.mensajeError({ message: 'Internal', status: 500 }), /en unos minutos/);
});

test('un error desconocido nunca muestra el texto técnico en inglés', () => {
  const original = console.warn;
  console.warn = () => {};
  try {
    const m = H.mensajeError({ code: 'algo_raro', message: 'Database error saving new user', status: 400 });
    assert.doesNotMatch(m, /Database|error saving/i);
    assert.match(m, /Algo salió mal/);
    assert.match(H.mensajeError(null), /Algo salió mal/);
  } finally {
    console.warn = original;
  }
});

/* ---------------- problemaCorreo ---------------- */
test('correo: vacío, sin @, con espacios o sin dominio', () => {
  assert.match(H.problemaCorreo(''), /Escribe tu correo/);
  assert.match(H.problemaCorreo('juangmail.com'), /falta la @/);
  assert.match(H.problemaCorreo('juan @gmail.com'), /espacios/);
  assert.match(H.problemaCorreo('juan@gmail'), /nombre@gmail\.com/);
  assert.equal(H.problemaCorreo('  juan.perez@gmail.com '), null);
  assert.equal(H.problemaCorreo('maria@correo.com.mx'), null);
});

/* ---------------- destinoSeguro ---------------- */
test('?next= solo acepta páginas de este sitio', () => {
  assert.equal(H.destinoSeguro('credito.html'), 'credito.html');
  assert.equal(H.destinoSeguro('herramientas.html#hipoteca'), 'herramientas.html#hipoteca');
  assert.equal(H.destinoSeguro('https://estafa.com/login.html'), 'cuenta.html');
  assert.equal(H.destinoSeguro('//estafa.com'), 'cuenta.html');
  assert.equal(H.destinoSeguro('javascript:alert(1)'), 'cuenta.html');
  assert.equal(H.destinoSeguro('../otra/cosa.html'), 'cuenta.html');
  assert.equal(H.destinoSeguro('login.html'), 'cuenta.html', 'volver al login sería un ciclo');
  assert.equal(H.destinoSeguro(null), 'cuenta.html');
});

/* ---------------- escaparHtml ---------------- */
test('escaparHtml neutraliza lo que escribe la persona', () => {
  assert.equal(H.escaparHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});

/* ---------------- evaluar (sin cambios, como red de seguridad) ---------------- */
test('la contraseña sigue pidiendo 10 caracteres y rechaza las comunes', () => {
  assert.equal(H.evaluar('corta', '').valida, false);
  assert.ok(H.evaluar('P@ssw0rd123', '').problemas.includes('comun'));
  assert.equal(H.evaluar('mi perro se llama pancho', 'juan@gmail.com').valida, true);
});
