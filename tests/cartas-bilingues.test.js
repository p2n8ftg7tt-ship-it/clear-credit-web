/* Pruebas de las cartas en español e inglés.  Ejecutar:  node --test tests/cartas-bilingues.test.js

   Verifican lo que pide la constitución (Principio IV: una sola verdad, probada):
   1. Que cada carta tenga los MISMOS bloques en español y en inglés.
   2. Que los mismos datos (nombre, dirección, teléfono, cuenta, buró, fecha…) salgan en las dos.
   3. Que las dos citen la misma ley y los mismos plazos.
   4. Que el inglés no arrastre palabras en español (salvo lo que la persona escribió o lo que
      dice el reporte, que se copia tal cual).
   5. Que ninguna de las dos diga «es ilegal», ni prometa, ni mande a la persona qué hacer
      (Principio I: honestidad y no asesoría).
   6. Que el texto en inglés listo para copiar no lleve etiquetas ni avisos.
   Contrato: specs/003-address-autocomplete-bilingual-letters/contracts/bilingual-letter.md */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

global.window = {};
const C = require(path.join(__dirname, '..', 'cartas-bilingues.js'));

const FECHA = new Date(2026, 8, 20, 12, 0, 0); // 20 de septiembre de 2026
const REMITENTE = { givenNames: 'Maria Elena', firstSurname: 'Garcia', secondSurname: 'Lopez', street: '742 Evergreen Terrace', city: 'Roanoke', state: 'VA', postalCode: '24016', currentPhone: '(540) 555-0142' };
const NOMBRE_LEGAL = 'Maria Elena Garcia Lopez';
const DIRECCION = '742 Evergreen Terrace, Roanoke, VA 24016';
const BURO = { nombre: 'Experian', destinatario: 'Experian — Dispute by Mail', direccion: ['P.O. Box 4500', 'Allen, TX 75013'] };
const COBRADOR = { nombre: 'Acme Recovery LLC', calle: '100 Collector Way', ciudad: 'Dallas', estado: 'TX', cp: '75201' };
const DISPUTADOS = [
  { type: 'Nombre o alias', value: 'MARIA E GARCIA-LOPEZ' },
  { type: 'Teléfono', value: '(540) 555-0000' },
  { type: 'Dirección', value: '12 OAK ST APT 3, ROANOKE VA 24011' }
];
const SUBTIPOS = ['identity-names', 'identity-phones', 'identity-addresses', 'identity-mixed'];
const MOTIVOS = ['not-mine', 'wrong-amount', 'wrong-date', 'already-resolved', 'wrong-status', 'other'];
const CLAVES = ['bankruptcy', 'foreclosure', 'repossession', 'charge-off', 'collection', 'late-payments', 'past-due-amount', 'inquiries'];

const identidad = (subtipo) => C.armar('identity', { fecha: FECHA, remitente: REMITENTE, buro: BURO, subtipo, valoresDisputados: DISPUTADOS });
const disputa = (motivo, extra) => C.armar('bureau-dispute', Object.assign({ fecha: FECHA, remitente: REMITENTE, buro: BURO, motivo, detalle: '', hallazgo: { clave: 'collection', titulo: 'Cuenta en cobranza' } }, extra || {}));
const validacion = (extra) => C.armar('debt-validation', Object.assign({ fecha: FECHA, remitente: REMITENTE, cobrador: COBRADOR, referencia: '', hallazgo: { clave: 'collection', titulo: 'Cuenta en cobranza' } }, extra || {}));

/* Todas las cartas que se prueban, con lo que cada una debe contener. */
function casos() {
  const lista = [];
  SUBTIPOS.forEach((s) => lista.push({ nombre: 'identidad/' + s, tipo: 'identity', r: identidad(s), hechos: DISPUTADOS.map((d) => (d.type === 'Teléfono' ? '540-555-0000' : d.value)).concat([BURO.nombre, BURO.destinatario, 'P.O. Box 4500', 'Allen, TX 75013']) }));
  MOTIVOS.forEach((m) => lista.push({ nombre: 'disputa/' + m, tipo: 'bureau-dispute', r: disputa(m), hechos: [BURO.nombre, BURO.destinatario, 'P.O. Box 4500', 'Allen, TX 75013'] }));
  ['', 'AB-123456'].forEach((ref) => lista.push({ nombre: 'validacion/' + (ref || 'sin-ref'), tipo: 'debt-validation', r: validacion({ referencia: ref }), hechos: [COBRADOR.nombre, COBRADOR.calle, 'Dallas, TX 75201'].concat(ref ? [ref] : []) }));
  return lista;
}

const HECHOS_REMITENTE = [NOMBRE_LEGAL, DIRECCION, '540-555-0142']; // el teléfono se escribe crudo como (540) 555-0142 y sale con guiones
const BLOQUES = {
  identity: ['remitente', 'fecha', 'destinatario', 'asunto', 'saludo', 'apertura', 'disputados', 'correcta', 'adjuntos', 'declaracion', 'firma'],
  'bureau-dispute': ['remitente', 'fecha', 'destinatario', 'asunto', 'saludo', 'apertura', 'motivo', 'fcra-investigacion', 'fcra-notificacion', 'mi-informacion', 'adjuntos', 'declaracion', 'firma'],
  'debt-validation': ['remitente', 'fecha', 'cobrador', 'asunto', 'saludo', 'apertura', 'lista-validacion', 'no-reconocimiento', 'mi-informacion', 'firma']
};

/* ---------- 1. estructura ---------- */

test('cada carta tiene los mismos bloques, en el mismo orden, con contenido en los dos idiomas', () => {
  casos().forEach(({ nombre, tipo, r }) => {
    assert.deepStrictEqual(r.bloques.map((b) => b.id), BLOQUES[tipo], nombre);
    r.bloques.forEach((b) => {
      assert.ok(Array.isArray(b.es) && b.es.length > 0, nombre + '/' + b.id + ': bloque vacío en español');
      assert.ok(Array.isArray(b.en) && b.en.length > 0, nombre + '/' + b.id + ': bloque vacío en inglés');
      b.es.concat(b.en).forEach((l) => assert.strictEqual(typeof l, 'string'));
    });
  });
});

test('el texto de cada idioma es exactamente sus bloques, separados por una línea en blanco', () => {
  casos().forEach(({ nombre, r }) => {
    assert.strictEqual(r.textoEs, r.bloques.map((b) => b.es.join('\n')).join('\n\n'), nombre);
    assert.strictEqual(r.textoEn, r.bloques.map((b) => b.en.join('\n')).join('\n\n'), nombre);
  });
});

/* ---------- 2. los mismos datos en las dos columnas ---------- */

test('los mismos datos aparecen en español y en inglés', () => {
  casos().forEach(({ nombre, r, hechos }) => {
    HECHOS_REMITENTE.concat(hechos).forEach((h) => {
      assert.ok(r.textoEs.includes(h), nombre + ': falta en español → ' + h);
      assert.ok(r.textoEn.includes(h), nombre + ': falta en inglés → ' + h);
    });
  });
});

test('los datos que solo salen en la carta de identidad también van completos en las dos', () => {
  const r = identidad('identity-mixed');
  ['Maria Elena', 'Garcia', 'Lopez', '742 Evergreen Terrace', 'Roanoke', 'VA', '24016'].forEach((h) => {
    assert.ok(r.textoEs.includes(h) && r.textoEn.includes(h), h);
  });
});

test('la fecha es el mismo día en las dos columnas, cada una en su formato', () => {
  casos().forEach(({ nombre, r }) => {
    assert.ok(r.textoEs.includes('20 de septiembre de 2026'), nombre + ' (es)');
    assert.ok(r.textoEn.includes('September 20, 2026'), nombre + ' (en)');
  });
  assert.strictEqual(C.formatearFecha(FECHA, 'es'), '20 de septiembre de 2026');
  assert.strictEqual(C.formatearFecha(FECHA, 'en'), 'September 20, 2026');
});

test('sin segundo apellido: «No aplica» y «N/A», y el nombre legal no queda con espacios de sobra', () => {
  const r = C.armar('identity', { fecha: FECHA, remitente: Object.assign({}, REMITENTE, { secondSurname: '' }), buro: BURO, subtipo: 'identity-names', valoresDisputados: DISPUTADOS });
  assert.ok(r.textoEs.includes('Segundo apellido: No aplica'));
  assert.ok(r.textoEn.includes('Second surname: N/A'));
  assert.ok(r.textoEs.includes('Maria Elena Garcia\n') && !/ {2}/.test(r.textoEn.split('\n')[0]));
});

test('la carta de identidad usa el destinatario y las direcciones de cada buró en las dos columnas', () => {
  ['Equifax', 'TransUnion'].forEach((n) => {
    const r = C.armar('identity', { fecha: FECHA, remitente: REMITENTE, buro: { nombre: n, destinatario: n + ' Info Services', direccion: ['P.O. Box 1', 'Atlanta, GA 30374'] }, subtipo: 'identity-names', valoresDisputados: DISPUTADOS });
    assert.ok(r.textoEs.includes(n + ' Info Services') && r.textoEn.includes(n + ' Info Services'));
    assert.ok(r.textoEn.includes('Dear ' + n + ' Dispute Team:'));
    assert.ok(r.textoEs.includes('Estimado equipo de disputas de ' + n + ':'));
  });
});

/* ---------- 3. la misma ley y los mismos plazos ---------- */

test('las cartas al buró citan la misma ley y los mismos plazos en los dos idiomas', () => {
  MOTIVOS.forEach((m) => {
    const r = disputa(m);
    ['1681i', '§ 611', '611(d)'].forEach((c) => {
      assert.ok(r.textoEs.includes(c) && r.textoEn.includes(c), m + ': falta la cita ' + c);
    });
    [/\b30\b/, /\b5\b/, /\b6\b/, /\b2\b/].forEach((n) => {
      assert.ok(n.test(r.textoEs) && n.test(r.textoEn), m + ': falta el número ' + n);
    });
    assert.ok(/6 meses/.test(r.textoEs) && /6 months/.test(r.textoEn));
    assert.ok(/2 años/.test(r.textoEs) && /2 years/.test(r.textoEn));
    assert.ok(/Fair Credit Reporting Act/.test(r.textoEs) && /Fair Credit Reporting Act/.test(r.textoEn));
  });
});

test('la carta al cobrador cita la misma ley en los dos idiomas', () => {
  const r = validacion();
  assert.ok(r.textoEs.includes('1692g') && r.textoEn.includes('1692g'));
  assert.ok(/Fair Debt Collection Practices Act/.test(r.textoEs) && /Fair Debt Collection Practices Act/.test(r.textoEn));
  assert.strictEqual((r.textoEs.match(/^- /gm) || []).length, 4);
  assert.strictEqual((r.textoEn.match(/^- /gm) || []).length, 4);
});

test('la carta de identidad enumera los mismos datos disputados en las dos columnas', () => {
  const r = identidad('identity-mixed');
  assert.strictEqual((r.textoEs.match(/^- /gm) || []).length, DISPUTADOS.length);
  assert.strictEqual((r.textoEn.match(/^- /gm) || []).length, DISPUTADOS.length);
  assert.ok(r.textoEs.includes('- Nombre o alias: MARIA E GARCIA-LOPEZ') && r.textoEn.includes('- Name or alias: MARIA E GARCIA-LOPEZ'));
  assert.ok(r.textoEs.includes('- Teléfono: 540-555-0000') && r.textoEn.includes('- Phone: 540-555-0000'));
  assert.ok(r.textoEs.includes('- Dirección: 12 OAK ST APT 3, ROANOKE VA 24011') && r.textoEn.includes('- Address: 12 OAK ST APT 3, ROANOKE VA 24011'));
});

/* ---------- 4. sin español en el inglés ---------- */

const ESPANOL_EN_EL_INGLES = /Estimad|Atentamente|Asunto|Firma:|Teléfono|Nombre legal|Dirección actual|Ciudad:|Estado:|Código postal|No aplica|Calle y número|Adjunto|Declaro|Solicito|Motivo|Detalle adicional|MI INFORMACI|INFORMACIÓN QUE|cobranza|deuda|reporte de crédito/;

test('el inglés no arrastra palabras ni acentos del español', () => {
  casos().forEach(({ nombre, r }) => {
    assert.ok(!ESPANOL_EN_EL_INGLES.test(r.textoEn), nombre + ': hay español en el inglés → ' + (r.textoEn.match(ESPANOL_EN_EL_INGLES) || [])[0]);
    assert.ok(!/[áéíóúñüÁÉÍÓÚÑ¿¡]/.test(r.textoEn), nombre + ': hay letras del español en el inglés');
  });
});

test('los seis motivos y los cuatro asuntos de identidad tienen frase en los dos idiomas', () => {
  MOTIVOS.forEach((m) => {
    const t = C.MOTIVOS[m];
    assert.ok(t && t.es && t.en, m);
    assert.notStrictEqual(t.es, t.en);
    assert.ok(disputa(m).textoEs.includes(t.es) && disputa(m).textoEn.includes(t.en));
  });
  const asuntos = new Set(SUBTIPOS.map((s) => identidad(s).textoEn.split('\n\n')[5]));
  assert.strictEqual(asuntos.size, 4, 'cada subtipo de identidad debe decir algo distinto');
});

test('etiquetas de los hallazgos: todas las claves tienen español e inglés', () => {
  CLAVES.forEach((k) => {
    const e = C.ETIQUETAS_HALLAZGO[k];
    assert.ok(e && e.es && e.en, k);
    assert.ok(!ESPANOL_EN_EL_INGLES.test(e.en) && !/[áéíóúñ]/.test(e.en), k + ': inglés con español');
  });
  assert.deepStrictEqual(Object.keys(C.ETIQUETAS_TIPO_DATO).sort(), ['Dirección', 'Nombre', 'Nombre o alias', 'Teléfono']);
  assert.strictEqual(C.ETIQUETAS_TIPO_DATO['Nombre'], 'Name');
  assert.strictEqual(C.ETIQUETAS_TIPO_DATO['Teléfono'], 'Phone');
  assert.strictEqual(C.ETIQUETAS_TIPO_DATO['Dirección'], 'Address');
});

test('cada hallazgo con carta se cita en inglés con su etiqueta, y con el monto o la cantidad si los tiene', () => {
  CLAVES.forEach((k) => {
    const arg = k === 'past-due-amount' ? '$1,234' : k === 'inquiries' ? '7' : '';
    const titulo = C.ETIQUETAS_HALLAZGO[k].es + (arg ? ': ' + arg : '');
    const r = disputa('not-mine', { hallazgo: { clave: k, arg, titulo } });
    const en = C.ETIQUETAS_HALLAZGO[k].en + (arg ? ': ' + arg : '');
    assert.ok(r.textoEn.includes('"' + en + '"'), k + ': la carta en inglés debe citar ' + en);
    assert.ok(r.textoEs.includes('"' + titulo + '"'), k + ': la carta en español debe citar ' + titulo);
  });
});

test('un hallazgo desconocido usa una frase neutra en inglés y nunca el título en español', () => {
  const r = disputa('other', { hallazgo: { clave: 'no-existe', titulo: 'Cuenta rara en español' } });
  assert.ok(r.textoEs.includes('Cuenta rara en español'));
  assert.ok(!r.textoEn.includes('Cuenta rara') && !/en español/.test(r.textoEn));
  assert.ok(/the account or information identified in my credit report/.test(r.textoEn));
  const sin = disputa('other', { hallazgo: undefined });
  assert.ok(/the account or information identified in my credit report/.test(sin.textoEn));
  assert.ok(sin.textoEs.includes('esta cuenta'));
});

/* ---------- 5. honestidad (Principio I) ---------- */

const PROHIBIDAS = /ilegal|illegal|debes|you must|you should|garantiz|guarante|seguro que|will win|ganar[aá]s|te conviene|es recomendable|I promise/i;

test('ninguna carta dice «es ilegal», promete un resultado ni aconseja a la persona', () => {
  casos().forEach(({ nombre, r }) => {
    assert.ok(!PROHIBIDAS.test(r.textoEs), nombre + ' (es): ' + (r.textoEs.match(PROHIBIDAS) || [])[0]);
    assert.ok(!PROHIBIDAS.test(r.textoEn), nombre + ' (en): ' + (r.textoEn.match(PROHIBIDAS) || [])[0]);
  });
});

test('las cartas de validación y de corrección no reconocen la deuda ni prometen pagar', () => {
  const r = validacion();
  assert.ok(/no es un reconocimiento de que la deuda es válida ni una promesa de pago/.test(r.textoEs));
  assert.ok(/not an acknowledgment that the debt is valid, nor a promise to pay/.test(r.textoEn));
});

/* ---------- 6. el texto en inglés es solo la carta ---------- */

test('el texto en inglés listo para copiar no lleva etiquetas de columna ni avisos', () => {
  casos().forEach(({ nombre, r }) => {
    assert.ok(!/Para enviar|Para que la entiendas|Borrador|revisa|Revísala|columna/i.test(r.textoEn), nombre);
    assert.ok(r.textoEn.startsWith(NOMBRE_LEGAL), nombre + ': la carta empieza con el remitente');
    assert.ok(r.textoEn.trim().endsWith(NOMBRE_LEGAL), nombre + ': la carta termina con la firma');
    assert.ok(/Sincerely,\n\nSignature: _+\n/.test(r.textoEn), nombre);
    assert.ok(/Atentamente,\n\nFirma: _+\n/.test(r.textoEs), nombre);
  });
});

test('armar acepta el tipo de solución de la página (identity-names, etc.) y rechaza uno desconocido', () => {
  const r = C.armar('identity-phones', { fecha: FECHA, remitente: REMITENTE, buro: BURO, valoresDisputados: DISPUTADOS });
  assert.deepStrictEqual(r.bloques.map((b) => b.id), BLOQUES.identity);
  assert.ok(r.textoEn.includes('incorrect or outdated phone numbers'));
  assert.throws(() => C.armar('otra-cosa', {}), /tipo/i);
});

/* Guardia contra el error que solo se vio en el navegador: el analizador etiqueta los datos detectados
   de su reporte con cierto texto en español (type:'Nombre o alias'…). Si alguien agrega o cambia una
   etiqueta en credito.html sin traducirla aquí, el inglés mostraría español. */
test('cada etiqueta de dato detectado que usa credito.html tiene su traducción al inglés', () => {
  const html = require('node:fs').readFileSync(path.join(__dirname, '..', 'credito.html'), 'utf8');
  const usadas = new Set((html.match(/{type:'([^']+)',value:/g) || []).map((x) => x.match(/type:'([^']+)'/)[1]));
  assert.ok(usadas.size >= 3, 'se esperaban al menos las etiquetas de nombre, teléfono y dirección; hay: ' + [...usadas].join(', '));
  usadas.forEach((etiqueta) => assert.ok(C.ETIQUETAS_TIPO_DATO[etiqueta], 'falta traducir la etiqueta  + etiqueta +  de credito.html'));
});

test('una etiqueta de dato desconocida nunca deja español en la carta en inglés', () => {
  const r = C.armar('identity', { fecha: FECHA, remitente: REMITENTE, buro: BURO, subtipo: 'identity-names', valoresDisputados: [{ type: 'Etiqueta nueva sin traducir', value: 'DATO' }] });
  assert.ok(r.textoEn.includes('- Information: DATO'));
  assert.ok(!/Etiqueta nueva/.test(r.textoEn));
});

/* ---------- texto que escribe la persona (Detalle adicional) ---------- */

test('hayTextoLibre es true solo si la persona escribió un detalle en la carta al buró', () => {
  assert.strictEqual(disputa('other', { detalle: 'Esta cuenta ya fue resuelta.' }).hayTextoLibre, true);
  assert.strictEqual(disputa('other', { detalle: '' }).hayTextoLibre, false);
  assert.strictEqual(disputa('other', { detalle: '   \n  ' }).hayTextoLibre, false);
  assert.strictEqual(disputa('other', {}).hayTextoLibre, false);
  SUBTIPOS.forEach((s) => assert.strictEqual(identidad(s).hayTextoLibre, false, s));
  assert.strictEqual(validacion().hayTextoLibre, false);
  assert.strictEqual(validacion({ referencia: 'AB-123' }).hayTextoLibre, false);
});

test('el detalle sale idéntico en las dos columnas, con acentos, # y comillas, y marca solo su bloque', () => {
  const detalle = 'La cuenta #45 «ya fue pagada» en 2023; nunca abrí "otra" con ellos.';
  const r = disputa('already-resolved', { detalle });
  assert.deepStrictEqual(r.bloques.filter((b) => b.libre).map((b) => b.id), ['motivo']);
  const motivo = r.bloques.find((b) => b.id === 'motivo');
  assert.ok(motivo.es.includes('Detalle adicional: ' + detalle));
  assert.ok(motivo.en.includes('Additional detail: ' + detalle));
  assert.ok(r.textoEs.includes(detalle) && r.textoEn.includes(detalle));
});

test('el detalle se recorta de espacios pero no se cambia ni se traduce', () => {
  const r = disputa('other', { detalle: '   texto en español   ' });
  assert.ok(r.textoEn.includes('Additional detail: texto en español\n'));
  assert.ok(!r.textoEn.includes('Additional detail:  '));
});

/* =========================================================================
   Especificación 005 — arreglos de la página de crédito
   Contrato: specs/005-credit-letter-fixes/contracts/letters-module.md
   ========================================================================= */

/* ---------- 005 · US1: teléfono con guiones (AC-1.1 – AC-1.9) ---------- */

test('telefonoEscribiendo: al teclear 5405550142 dígito por dígito se van poniendo los guiones', () => {
  const esperado = ['5', '54', '540', '540-5', '540-55', '540-555', '540-555-0', '540-555-01', '540-555-014', '540-555-0142'];
  const digitos = '5405550142';
  for (let i = 1; i <= digitos.length; i++) {
    assert.strictEqual(C.telefonoEscribiendo(digitos.slice(0, i)), esperado[i - 1], 'con ' + i + ' dígitos');
  }
});

test('telefonoEscribiendo: pegar un teléfono en cualquier formato lo deja como 540-555-0142', () => {
  ['(540) 555-0142', '540.555.0142', '540 555 0142', '+1 540 555 0142', '15405550142', '1-540-555-0142'].forEach((crudo) => {
    assert.strictEqual(C.telefonoEscribiendo(crudo), '540-555-0142', crudo);
  });
});

test('telefonoEscribiendo: letras y símbolos no entran, y nunca pasa de 10 dígitos', () => {
  assert.strictEqual(C.telefonoEscribiendo('54a0-b555'), '540-555');
  assert.strictEqual(C.telefonoEscribiendo('54055501429999'), '540-555-0142');
  assert.strictEqual(C.telefonoEscribiendo('abc'), '');
  assert.strictEqual(C.telefonoEscribiendo(''), '');
  assert.strictEqual(C.telefonoEscribiendo(null), '');
  assert.strictEqual(C.telefonoEscribiendo(undefined), '');
});

test('telefonoEscribiendo: el 1 inicial solo se descarta cuando hay 11 dígitos', () => {
  assert.strictEqual(C.telefonoEscribiendo('1'), '1');
  assert.strictEqual(C.telefonoEscribiendo('1540555014'), '154-055-5014');
  assert.strictEqual(C.telefonoEscribiendo('15405550142'), '540-555-0142');
});

test('formatearTelefono: 10 dígitos salen como XXX-XXX-XXXX; lo demás no se inventa ni se recorta', () => {
  assert.strictEqual(C.formatearTelefono('5405550142'), '540-555-0142');
  assert.strictEqual(C.formatearTelefono('(540) 555-0142'), '540-555-0142');
  assert.strictEqual(C.formatearTelefono('+1 540 555 0142'), '540-555-0142');
  assert.strictEqual(C.formatearTelefono('54055'), '54055');
  assert.strictEqual(C.formatearTelefono('5550142'), '5550142');
  assert.strictEqual(C.formatearTelefono('  abc '), 'abc');
  assert.strictEqual(C.formatearTelefono(null), '');
});

test('telefonoValido: solo con exactamente 10 dígitos', () => {
  ['5405550142', '540-555-0142', '(540) 555-0142', '+1 540 555 0142'].forEach((v) => assert.strictEqual(C.telefonoValido(v), true, v));
  ['', '54055', '5550142', '540-555-01', '540555014299', 'abc', null].forEach((v) => assert.strictEqual(C.telefonoValido(v), false, String(v)));
});

test('todas las cartas imprimen cada teléfono como XXX-XXX-XXXX en español e inglés', () => {
  const TELEFONO = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  casos().forEach(({ nombre, r }) => {
    ['textoEs', 'textoEn'].forEach((idioma) => {
      const encontrados = r[idioma].match(TELEFONO) || [];
      assert.ok(encontrados.length >= 1, nombre + ' (' + idioma + '): no hay teléfono');
      encontrados.forEach((t) => assert.ok(/^\d{3}-\d{3}-\d{4}$/.test(t), nombre + ' (' + idioma + '): ' + t));
      assert.ok(!r[idioma].includes('(540)'), nombre + ' (' + idioma + '): quedó un paréntesis');
    });
  });
});

test('la carta arma bien el teléfono aunque llegue sin guiones', () => {
  const remitente = Object.assign({}, REMITENTE, { currentPhone: '5405550142' });
  const r = C.armar('bureau-dispute', { fecha: FECHA, remitente, buro: BURO, motivo: 'not-mine', detalle: '', hallazgo: { clave: 'collection', titulo: 'Cuenta en cobranza' } });
  assert.ok(r.textoEs.includes('Teléfono: 540-555-0142') && r.textoEn.includes('Phone: 540-555-0142'));
  assert.ok(r.textoEs.includes('Teléfono actual: 540-555-0142') && r.textoEn.includes('Current phone: 540-555-0142'));
});

test('un teléfono de 7 dígitos se imprime tal cual: nunca se inventa el código de área', () => {
  const remitente = Object.assign({}, REMITENTE, { currentPhone: '555-0142' });
  const r = C.armar('debt-validation', { fecha: FECHA, remitente, cobrador: COBRADOR, referencia: '', hallazgo: { clave: 'collection', titulo: 'Cuenta en cobranza' } });
  assert.ok(r.textoEn.includes('Phone: 555-0142'));
});

test('un teléfono disputado en cualquier formato sale con guiones en las dos columnas', () => {
  const valores = [{ type: 'Teléfono', value: '5405559999' }, { type: 'Teléfono', value: '(540) 555-0000' }];
  const r = C.armar('identity', { fecha: FECHA, remitente: REMITENTE, buro: BURO, subtipo: 'identity-phones', valoresDisputados: valores });
  ['- Teléfono: 540-555-9999', '- Teléfono: 540-555-0000'].forEach((l) => assert.ok(r.textoEs.includes(l), l));
  ['- Phone: 540-555-9999', '- Phone: 540-555-0000'].forEach((l) => assert.ok(r.textoEn.includes(l), l));
});

/* ---------- 005 · US2: la dirección no se repite en «Mi información correcta» (AC-2.1 – AC-2.9) ---------- */

const correcta = (r) => r.bloques.find((b) => b.id === 'correcta');
const conteo = (texto, pedazo) => texto.split(pedazo).length - 1;

test('«Mi información correcta» tiene 7 líneas y la dirección en UNA sola, en español e inglés', () => {
  SUBTIPOS.forEach((subtipo) => {
    const b = correcta(identidad(subtipo));
    assert.deepStrictEqual(b.es, [
      'MI INFORMACIÓN CORRECTA:',
      'Nombre legal: Maria Elena Garcia Lopez',
      'Nombre(s): Maria Elena',
      'Primer apellido: Garcia',
      'Segundo apellido: Lopez',
      'Dirección actual: 742 Evergreen Terrace, Roanoke, VA 24016',
      'Teléfono actual: 540-555-0142'
    ], subtipo + ' (es)');
    assert.deepStrictEqual(b.en, [
      'MY CORRECT INFORMATION:',
      'Legal name: Maria Elena Garcia Lopez',
      'Given name(s): Maria Elena',
      'First surname: Garcia',
      'Second surname: Lopez',
      'Current address: 742 Evergreen Terrace, Roanoke, VA 24016',
      'Current phone: 540-555-0142'
    ], subtipo + ' (en)');
  });
});

test('«Mi información correcta» ya no trae calle, ciudad, estado ni código postal por separado', () => {
  SUBTIPOS.forEach((subtipo) => {
    const b = correcta(identidad(subtipo));
    b.es.forEach((l) => assert.ok(!/^(Calle y número|Ciudad|Estado|Código postal):/.test(l), subtipo + ' (es): ' + l));
    b.en.forEach((l) => assert.ok(!/^(Street and number|City|State|ZIP code):/.test(l), subtipo + ' (en): ' + l));
    assert.strictEqual(b.es.length, b.en.length, subtipo + ': distinto número de líneas');
  });
});

test('la calle aparece a lo sumo dos veces en toda la carta de identidad (remitente + información correcta)', () => {
  SUBTIPOS.forEach((subtipo) => {
    const r = identidad(subtipo);
    assert.ok(conteo(r.textoEs, '742 Evergreen Terrace') <= 2, subtipo + ' (es)');
    assert.ok(conteo(r.textoEn, '742 Evergreen Terrace') <= 2, subtipo + ' (en)');
    assert.strictEqual((r.textoEn.match(/^Current address:/gm) || []).length, 1, subtipo + ': más de una línea Current address');
    assert.strictEqual((r.textoEs.match(/^Dirección actual:/gm) || []).length, 1, subtipo + ': más de una línea Dirección actual');
  });
});

test('sin segundo apellido la línea dice «No aplica» / «N/A» y sigue habiendo una sola dirección', () => {
  const remitente = Object.assign({}, REMITENTE, { secondSurname: '' });
  const r = C.armar('identity', { fecha: FECHA, remitente, buro: BURO, subtipo: 'identity-names', valoresDisputados: DISPUTADOS });
  const b = correcta(r);
  assert.ok(b.es.includes('Segundo apellido: No aplica') && b.en.includes('Second surname: N/A'));
  assert.strictEqual(b.es.length, 7);
});

test('la dirección se escribe «calle, ciudad, estado CP» con espacios sencillos y sin comas dobles', () => {
  const dir = (extra) => {
    const remitente = Object.assign({}, REMITENTE, extra);
    return C.armar('identity', { fecha: FECHA, remitente, buro: BURO, subtipo: 'identity-names', valoresDisputados: DISPUTADOS });
  };
  const sucia = dir({ street: '  742   Evergreen  Terrace ', city: ' Roanoke ', state: ' VA', postalCode: '24016 ' });
  assert.ok(correcta(sucia).es.includes('Dirección actual: 742 Evergreen Terrace, Roanoke, VA 24016'));
  assert.ok(correcta(sucia).en.includes('Current address: 742 Evergreen Terrace, Roanoke, VA 24016'));
  const sinEstado = dir({ state: '' });
  assert.ok(correcta(sinEstado).es.includes('Dirección actual: 742 Evergreen Terrace, Roanoke, 24016'));
  const sinCP = dir({ postalCode: '' });
  assert.ok(correcta(sinCP).es.includes('Dirección actual: 742 Evergreen Terrace, Roanoke, VA'));
  [sucia, sinEstado, sinCP].forEach((r) => {
    assert.ok(!/,\s*,/.test(r.textoEn) && !/[^\S\n]{2,}/.test(r.textoEn.replace(/_+/g, '_')), 'comas o espacios dobles');
    assert.ok(!/(, ?)$/m.test(correcta(r).en.join('\n')), 'coma al final');
  });
});

test('las cartas al buró y de validación no cambian salvo el teléfono (fixture de antes del arreglo)', () => {
  const antes = require(path.join(__dirname, 'fixtures', 'cartas-antes-005.json'));
  const remitente = Object.assign({}, REMITENTE, { currentPhone: '540-555-0142' });
  const ahora = {};
  MOTIVOS.forEach((m) => { ahora['disputa/' + m] = C.armar('bureau-dispute', { fecha: FECHA, remitente, buro: BURO, motivo: m, detalle: '', hallazgo: { clave: 'collection', titulo: 'Cuenta en cobranza' } }); });
  ['', 'AB-123456'].forEach((ref) => { ahora['validacion/' + (ref || 'sin-ref')] = C.armar('debt-validation', { fecha: FECHA, remitente, cobrador: COBRADOR, referencia: ref, hallazgo: { clave: 'collection', titulo: 'Cuenta en cobranza' } }); });
  assert.deepStrictEqual(Object.keys(ahora).sort(), Object.keys(antes).sort());
  Object.keys(antes).forEach((clave) => {
    const bloques = ahora[clave].bloques.map((b) => ({ id: b.id, es: b.es, en: b.en }));
    assert.deepStrictEqual(bloques, antes[clave], clave);
  });
});

/* ---------- 005 · US3: muchos nombres, direcciones y teléfonos (AC-3.1 – AC-3.10) ---------- */

const genNombres = (n) => Array.from({ length: n }, (_, i) => ({ type: i % 2 ? 'Nombre' : 'Nombre o alias', value: 'Persona Numero' + String.fromCharCode(65 + i) }));
const genDirs = (n) => Array.from({ length: n }, (_, i) => ({ type: 'Dirección', value: (100 + i) + ' Oak St, Roanoke, VA 2401' + (i % 10) }));
const genTels = (n) => Array.from({ length: n }, (_, i) => ({ type: 'Teléfono', value: '540555' + String(1000 + i) }));
const totalValores = (grupos) => grupos.reduce((suma, g) => suma + g.valores.length, 0);

test('agruparDetectados: con N nombres, M direcciones y P teléfonos salen exactamente N+M+P valores', () => {
  [0, 1, 5, 10].forEach((n) => [0, 1, 5, 10].forEach((m) => [0, 1, 5, 10].forEach((p) => {
    const grupos = C.agruparDetectados([].concat(genTels(p), genDirs(m), genNombres(n)));
    assert.strictEqual(totalValores(grupos), n + m + p, n + '/' + m + '/' + p);
  })));
});

test('agruparDetectados: los grupos van en orden fijo, con su título, y el que está vacío no aparece', () => {
  const grupos = C.agruparDetectados([].concat(genTels(2), genDirs(3), genNombres(1)));
  assert.deepStrictEqual(grupos.map((g) => [g.clave, g.titulo, g.valores.length]),
    [['nombres', 'Nombres', 1], ['direcciones', 'Direcciones', 3], ['telefonos', 'Teléfonos', 2]]);
  assert.deepStrictEqual(C.agruparDetectados(genTels(2)).map((g) => g.clave), ['telefonos']);
  assert.deepStrictEqual(C.agruparDetectados([]), []);
});

test('agruparDetectados: «Nombre» y «Nombre o alias» van al mismo grupo; un tipo desconocido no se pierde', () => {
  const grupos = C.agruparDetectados([{ type: 'Nombre', value: 'Ana Perez' }, { type: 'Nombre o alias', value: 'Ana P Perez' }, { type: 'Correo', value: 'ana@example.com' }]);
  assert.deepStrictEqual(grupos.map((g) => [g.clave, g.titulo, g.valores.length]), [['nombres', 'Nombres', 2], ['otros', 'Otros datos', 1]]);
});

test('agruparDetectados: un mismo dato escrito distinto (mayúsculas, espacios, formato del teléfono) sale una sola vez', () => {
  const grupos = C.agruparDetectados([
    { type: 'Nombre o alias', value: 'MARIA GARCIA' }, { type: 'Nombre o alias', value: 'Maria  Garcia' },
    { type: 'Dirección', value: '12 Oak St Apt 3' }, { type: 'Dirección', value: '12  oak st   apt 3' },
    { type: 'Teléfono', value: '(540) 555-0000' }, { type: 'Teléfono', value: '540.555.0000' }, { type: 'Teléfono', value: '+1 540 555 0000' }
  ]);
  assert.deepStrictEqual(grupos.map((g) => g.valores.length), [1, 1, 1]);
  assert.strictEqual(grupos[0].valores[0].value, 'MARIA GARCIA', 'se conserva el primero que apareció');
});

test('agruparDetectados: los teléfonos salen con guiones, el orden es el de aparición y la entrada no se toca', () => {
  const entrada = [{ type: 'Teléfono', value: '5405559999' }, { type: 'Teléfono', value: '(540) 555-0000' }];
  const copia = JSON.parse(JSON.stringify(entrada));
  const grupos = C.agruparDetectados(entrada);
  assert.deepStrictEqual(grupos[0].valores.map((v) => v.value), ['540-555-9999', '540-555-0000']);
  assert.deepStrictEqual(entrada, copia);
  grupos[0].valores.forEach((v) => assert.strictEqual(v.type, 'Teléfono'));
});

test('agruparDetectados: nunca devuelve menos valores que los distintos que recibió', () => {
  const entrada = [].concat(genNombres(4), genDirs(4), genTels(4), genNombres(4), genTels(4));
  assert.strictEqual(totalValores(C.agruparDetectados(entrada)), 12);
});

test('tiposDeTarjeta: mismos umbrales que hasta ahora (2 o más de un tipo; los tres para «mixta»)', () => {
  const t = (nombres, direcciones, telefonos) => C.tiposDeTarjeta({ nombres, direcciones, telefonos });
  assert.deepStrictEqual(t(0, 0, 0), []);
  assert.deepStrictEqual(t(1, 1, 1), []);
  assert.deepStrictEqual(t(2, 0, 0), ['identity-names']);
  assert.deepStrictEqual(t(0, 2, 0), ['identity-addresses']);
  assert.deepStrictEqual(t(0, 0, 2), ['identity-phones']);
  assert.deepStrictEqual(t(3, 1, 2), ['identity-names', 'identity-phones']);
  assert.deepStrictEqual(t(2, 1, 1), ['identity-names']);
  assert.deepStrictEqual(t(2, 2, 2), ['identity-names', 'identity-phones', 'identity-addresses', 'identity-mixed']);
  assert.deepStrictEqual(t(9, 9, 1), ['identity-names', 'identity-addresses']);
});

test('ordenarDisputados: nombres, luego direcciones, luego teléfonos; estable dentro del grupo; sin tocar la entrada', () => {
  const entrada = [
    { type: 'Teléfono', value: 'T1' }, { type: 'Nombre o alias', value: 'N1' }, { type: 'Dirección', value: 'D1' },
    { type: 'Nombre', value: 'N2' }, { type: 'Teléfono', value: 'T2' }, { type: 'Dirección', value: 'D2' }, { type: 'Otro', value: 'X1' }
  ];
  const copia = JSON.parse(JSON.stringify(entrada));
  assert.deepStrictEqual(C.ordenarDisputados(entrada).map((v) => v.value), ['N1', 'N2', 'D1', 'D2', 'T1', 'T2', 'X1']);
  assert.deepStrictEqual(entrada, copia);
});

test('la carta de identidad lista exactamente los datos marcados, agrupados y en el mismo orden en las dos columnas', () => {
  const marcados = [
    { type: 'Teléfono', value: '5405550001' }, { type: 'Nombre o alias', value: 'ANA P PEREZ' }, { type: 'Dirección', value: '9 ELM ST, ROANOKE VA 24011' },
    { type: 'Nombre o alias', value: 'ANA PEREZ' }
  ];
  const r = C.armar('identity', { fecha: FECHA, remitente: REMITENTE, buro: BURO, subtipo: 'identity-mixed', valoresDisputados: marcados });
  const b = r.bloques.find((x) => x.id === 'disputados');
  assert.deepStrictEqual(b.es, ['INFORMACIÓN QUE DISPUTO:', '- Nombre o alias: ANA P PEREZ', '- Nombre o alias: ANA PEREZ', '- Dirección: 9 ELM ST, ROANOKE VA 24011', '- Teléfono: 540-555-0001']);
  assert.deepStrictEqual(b.en, ['INFORMATION I AM DISPUTING:', '- Name or alias: ANA P PEREZ', '- Name or alias: ANA PEREZ', '- Address: 9 ELM ST, ROANOKE VA 24011', '- Phone: 540-555-0001']);
});

test('la carta de identidad tiene una línea por cada dato marcado (1, 3 y 8) y nunca agrega los datos propios de la persona', () => {
  const todos = [].concat(genNombres(3), genDirs(2), genTels(3));
  [1, 3, 8].forEach((k) => {
    const marcados = todos.slice(0, k);
    const r = C.armar('identity', { fecha: FECHA, remitente: REMITENTE, buro: BURO, subtipo: 'identity-mixed', valoresDisputados: marcados });
    const b = r.bloques.find((x) => x.id === 'disputados');
    assert.strictEqual(b.es.length - 1, k, 'es, K=' + k);
    assert.strictEqual(b.en.length - 1, k, 'en, K=' + k);
    todos.slice(k).forEach((v) => assert.ok(!r.textoEs.includes(v.value) && !r.textoEn.includes(v.value), 'aparece un dato sin marcar: ' + v.value));
    b.es.concat(b.en).forEach((l) => assert.ok(!l.includes(DIRECCION) && !l.includes(NOMBRE_LEGAL), 'se coló un dato propio: ' + l));
  });
});
