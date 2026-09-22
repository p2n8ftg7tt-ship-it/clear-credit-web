/* Cableado de credito.html para los tres arreglos de la especificación 005.
   Ejecutar:  node --test tests/credito-identidad.test.js

   El script del analizador vive dentro de credito.html y no se puede ejecutar en Node, así que
   estas pruebas leen el texto de la página y comprueban que el cableado exista (campo del
   teléfono, lista de datos detectados agrupada, tarjetas de identidad). Las REGLAS (formato del
   teléfono, agrupar, tarjetas, orden) se prueban de verdad en tests/cartas-bilingues.test.js.
   Contrato: specs/005-credit-letter-fixes/contracts/letters-module.md */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const leerCredito = () => fs.readFileSync(path.join(__dirname, '..', 'credito.html'), 'utf8');

/* Texto de una función del script de credito.html: desde «function nombre(» hasta la siguiente
   «function » que empieza una línea con dos espacios (o el final del archivo). */
function cuerpoDe(html, nombre) {
  const inicio = html.indexOf('function ' + nombre + '(');
  assert.ok(inicio >= 0, 'no se encontró la función ' + nombre);
  const siguiente = html.indexOf('\n  function ', inicio + 10);
  return html.slice(inicio, siguiente > 0 ? siguiente : undefined);
}

test('credito.html tiene las funciones que estas pruebas vigilan', () => {
  const html = leerCredito();
  ['personalFieldsHtml', 'detectedOptionsHtml', 'submitIdentityCorrection'].forEach((nombre) => {
    assert.ok(html.includes('function ' + nombre + '('), nombre);
  });
});

/* ---------- US1: teléfono con guiones ---------- */

test('el campo del teléfono pide 10 dígitos con guiones y conserva su etiqueta', () => {
  const cuerpo = cuerpoDe(leerCredito(), 'personalFieldsHtml');
  const campo = cuerpo.match(/<input id="'\+formId\+'Phone"[^>]*>/);
  assert.ok(campo, 'no se encontró el campo del teléfono');
  const etiqueta = campo[0];
  ['name="currentPhone"', 'type="tel"', 'inputmode="tel"', 'autocomplete="tel"', 'maxlength="20"',
    'placeholder="540-555-0142"', 'pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"',
    'title="Escribe un teléfono de 10 dígitos, como 540-555-0142."', 'required'].forEach((atributo) => {
    assert.ok(etiqueta.includes(atributo), 'falta ' + atributo);
  });
  assert.ok(cuerpo.includes('>Número de teléfono actual</label>'), 'cambió la etiqueta del campo');
});

test('hay un manejador de escritura que formatea el teléfono al teclear, pegar o autocompletar', () => {
  const html = leerCredito();
  assert.ok(/addEventListener\('input'/.test(html) && html.includes('currentPhone') && html.includes('telefonoEscribiendo'));
  assert.ok(/addEventListener\('change'/.test(html), 'falta el evento change para el autocompletado del navegador');
});

test('los teléfonos detectados se muestran con el mismo formato que las cartas', () => {
  const cuerpo = cuerpoDe(leerCredito(), 'identityDisplayValue');
  assert.ok(cuerpo.includes('formatearTelefono'));
  assert.ok(!cuerpo.includes("'('"), 'no debe quedar el formato con paréntesis');
});

test('las tres cartas comprueban el teléfono antes de armarse', () => {
  const html = leerCredito();
  ['submitIdentityCorrection', 'submitBureauDispute', 'submitDebtValidation'].forEach((nombre) => {
    assert.ok(cuerpoDe(html, nombre).includes('phoneIsValid('), nombre + ' no valida el teléfono');
  });
  assert.ok(html.includes('Escribe un teléfono de 10 dígitos, como 540-555-0142.'));
  assert.ok(cuerpoDe(html, 'phoneIsValid').includes('telefonoValido'));
});

/* ---------- US3: muchos nombres, direcciones y teléfonos ---------- */

test('la lista de datos detectados va agrupada por tipo, con conteo, sin nada marcado de antemano', () => {
  const cuerpo = cuerpoDe(leerCredito(), 'detectedOptionsHtml');
  assert.ok(cuerpo.includes('agruparDetectados'), 'no usa agruparDetectados');
  assert.ok(cuerpo.includes('cr-detected-group'), 'falta el fieldset de cada grupo');
  assert.ok(/<legend>/.test(cuerpo) && cuerpo.includes('.valores.length'), 'la leyenda del grupo debe llevar su conteo');
  assert.ok(cuerpo.includes('cr-detected-toggle') && cuerpo.includes('Marcar todos'), 'falta el botón de marcar todos');
  assert.ok(/valores\.length\s*>\s*=?\s*2|valores\.length>1|valores\.length\s*>\s*1/.test(cuerpo), 'el botón solo va en grupos de 2 o más');
  assert.ok(!/\bchecked\b/.test(cuerpo), 'nada debe venir marcado de antemano');
  assert.ok(cuerpo.includes('escapeHtml'), 'los valores deben escaparse como texto');
  assert.ok(cuerpo.includes('name="disputedValue"') && cuerpo.includes('type="checkbox"'));
});

test('sin el módulo de cartas la lista sigue mostrándose (plana, como antes)', () => {
  const cuerpo = cuerpoDe(leerCredito(), 'detectedOptionsHtml');
  assert.ok(/window\.ThemoraCartas/.test(cuerpo) && /agruparDetectados/.test(cuerpo));
  assert.ok(cuerpo.includes('Datos personales detectados'));
});

test('todas las tarjetas de identidad reciben la lista completa de datos, no solo los de su tipo', () => {
  const lineas = leerCredito().split('\n').filter((l) => /addNegative\(/.test(l) && /'identity-(names|phones|addresses|mixed)'/.test(l) && !/const addNegative/.test(l));
  assert.strictEqual(lineas.length, 4, 'debe haber las 4 tarjetas de identidad');
  lineas.forEach((l) => {
    assert.ok(l.includes('allDetectedIdentity'), 'una tarjeta no recibe todos los datos: ' + l.slice(0, 90));
    assert.ok(!/detected(Names|Phones|Addresses)\)/.test(l), 'una tarjeta recibe solo un tipo: ' + l.slice(0, 90));
  });
});

test('qué tarjetas de identidad se ofrecen lo decide tiposDeTarjeta (con respaldo si falta el módulo)', () => {
  const html = leerCredito();
  assert.ok(html.includes('tiposDeTarjeta'));
  assert.ok(html.includes('Información personal consistente'), 'el positivo debe seguir');
});

test('sin datos marcados sigue el aviso de marcar por lo menos uno', () => {
  assert.ok(leerCredito().includes('Marca por lo menos un nombre, teléfono o dirección incorrectos para incluirlos en la carta.'));
});

test('el botón de marcar todos actúa solo sobre su grupo y avisa su estado', () => {
  const html = leerCredito();
  assert.ok(html.includes("closest('.cr-detected-toggle')"), 'falta el manejador del botón');
  assert.ok(html.includes("closest('.cr-detected-group')"), 'debe limitarse a su propio grupo');
  assert.ok(html.includes('aria-pressed') && html.includes('Quitar todos'));
});

test('la privacidad no cambia: ninguna llamada de red nueva y la analítica sigue mandando solo el tipo de carta', () => {
  const html = leerCredito();
  assert.ok(!/\bfetch\(/.test(html), 'credito.html no debe llamar a fetch');
  assert.ok(html.includes("window.ThemoraStats.evento('carta-generada',{tipo:type})"));
  const eventos = html.match(/ThemoraStats\.evento\([^)]*\)/g) || [];
  eventos.forEach((e) => assert.ok(!/nombre|address|direccion|phone|telefono|length|size/i.test(e), 'analítica con datos: ' + e));
});
