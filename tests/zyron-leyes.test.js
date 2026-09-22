/* Pruebas de las leyes de Zyron.  Ejecutar:  node --test tests/

   Verifican cuatro cosas:
   1. Que cada pregunta llegue a la ficha correcta, en los cuatro idiomas.
   2. Que ninguna respuesta rompa las reglas de honestidad de Zyron (no decir
      "es ilegal", no prometer, no mandar qué hacer).
   3. Que las cuatro traducciones de cada ficha cuenten los MISMOS números
      (plazos, montos): una traducción con otro plazo es un error legal.
   4. Que las fichas del sitio y el resumen que lee la IA (leyes-digest.js)
      no se contradigan. */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
global.window = {};
const LEYES = require(path.join(RAIZ, 'zyron-leyes.js'));
require(path.join(RAIZ, 'zyron-brain.js'));
const { DIGESTO_LEYES } = require(path.join(RAIZ, 'netlify', 'functions', 'leyes-digest.js'));

const IDIOMAS = ['es', 'en', 'pt', 'ht'];
const preguntar = (q, estado) => window.ZyronBrain.responder(q, estado || {});
const ficha = (id) => LEYES.find((f) => f.id === id);

/* ---------- 1. estructura ---------- */

test('cada ficha está completa en los cuatro idiomas', () => {
  const ids = new Set();
  assert.ok(LEYES.length >= 26, 'se esperaban al menos 26 fichas, hay ' + LEYES.length);
  LEYES.forEach((f) => {
    assert.ok(!ids.has(f.id), 'id repetido: ' + f.id);
    ids.add(f.id);
    assert.ok(f.cita, f.id + ': falta la cita de la sección');
    assert.ok(f.claves.length > 0, f.id + ': sin claves');
    IDIOMAS.forEach((i) => {
      assert.ok(Array.isArray(f[i]) && f[i].length > 0 && f[i][0].length > 40, f.id + ': falta texto en ' + i);
    });
  });
});

test('las claves están normalizadas (sin acentos ni mayúsculas)', () => {
  LEYES.forEach((f) => {
    f.claves.concat(f.pistas).forEach((k) => {
      assert.strictEqual(k, window.ZyronIdioma.normalizar(k), f.id + ': clave sin normalizar: ' + k);
    });
  });
});

/* ---------- 2. enrutamiento ---------- */

const RUTAS = [
  // español
  ['¿A qué hora pueden llamarme los cobradores?', 'es', 'fdcpa_horarios'],
  ['Me llaman al trabajo todos los días', 'es', 'fdcpa_horarios'],
  ['llamaron a mi jefe y le dijeron que debo dinero', 'es', 'fdcpa_terceros'],
  ['quiero que dejen de llamarme', 'es', 'fdcpa_cese'],
  ['¿cómo pido que me validen la deuda?', 'es', 'fdcpa_validacion'],
  ['esta deuda no es mía, cómo la disputo', 'es', 'fdcpa_validacion'],
  ['me amenazan con embargo y dicen que son abogados', 'es', 'fdcpa_mentiras'],
  ['me cobran de más, cargos que no estaban en el contrato', 'es', 'fdcpa_cargos'],
  ['me insultan y me gritan cuando llaman', 'es', 'fdcpa_acoso'],
  ['¿puedo demandar a un cobrador?', 'es', 'fdcpa_derechos'],
  ['me demandaron en otro estado, dónde me pueden demandar', 'es', 'fdcpa_demanda'],
  ['¿qué es la FDCPA?', 'es', 'fdcpa_general'],
  ['¿cuántos años dura una quiebra en mi reporte?', 'es', 'fcra_plazos'],
  ['cuánto tiempo sale una cuenta en cobranza de mi reporte', 'es', 'fcra_plazos'],
  ['¿dónde saco mi reporte de crédito gratis?', 'es', 'fcra_gratis'],
  ['hay un error en mi reporte, cómo lo disputo', 'es', 'fcra_disputa'],
  ['quiero disputar directamente con el banco', 'es', 'fcra_disputa_directa'],
  ['me robaron la identidad', 'es', 'fcra_robo_id'],
  ['abrieron una tarjeta a mi nombre', 'es', 'fcra_robo_id'],
  ['me negaron el crédito, por qué', 'es', 'fcra_accion_adversa'],
  ['¿quién puede ver mi crédito sin mi permiso?', 'es', 'fcra_quien_ve'],
  ['mi empleador me pidió el reporte de crédito para el trabajo', 'es', 'fcra_empleo'],
  ['me llegan ofertas de tarjetas preaprobadas, cómo las paro', 'es', 'fcra_preaprobadas'],
  ['¿puedo demandar a Equifax por un error en mi reporte?', 'es', 'fcra_demanda'],
  ['¿qué contiene mi archivo de crédito? ¿quién consultó mi crédito?', 'es', 'fcra_contenido'],
  ['tengo deuda médica en mi reporte', 'es', 'fcra_medico'],
  ['¿qué leyes conoces?', 'es', 'leyes_alcance'],
  // inglés
  ['What time can debt collectors call me?', 'en', 'fdcpa_horarios'],
  ['stop calling me, how do I send a cease and desist', 'en', 'fdcpa_cese'],
  ['how do I dispute an error on my credit report', 'en', 'fcra_disputa'],
  ['How long does a bankruptcy stay on my credit report?', 'en', 'fcra_plazos'],
  ['I was denied credit, what do they have to tell me?', 'en', 'fcra_accion_adversa'],
  ['is it free to get my credit report', 'en', 'fcra_gratis'],
  ['can they call my family about my debt', 'en', 'fdcpa_terceros'],
  ['what laws do you know', 'en', 'leyes_alcance'],
  // portugués
  ['Em que horário os cobradores podem ligar para mim?', 'pt', 'fdcpa_horarios'],
  ['como contesto um erro no meu relatório de crédito', 'pt', 'fcra_disputa'],
  ['por quanto tempo uma dívida fica no meu relatório', 'pt', 'fcra_plazos'],
  ['quero pedir que parem de ligar', 'pt', 'fdcpa_cese'],
  ['me negaram o crédito, preciso saber por quê', 'pt', 'fcra_accion_adversa'],
  // criollo haitiano
  ['Ki lè kolektè yo ka rele m?', 'ht', 'fdcpa_horarios'],
  ['mwen vle yo sispann rele mwen', 'ht', 'fdcpa_cese'],
  ['kijan pou m kontèste yon erè nan rapò kredi mwen', 'ht', 'fcra_disputa'],
  ['konbyen tan yon dèt rete nan rapò kredi m', 'ht', 'fcra_plazos'],
  ['yo vòlè idantite m', 'ht', 'fcra_robo_id'],
  ['mwen vle valide dèt la, li pa pou mwen', 'ht', 'fdcpa_validacion'],
  ['yo refize m kredi, poukisa?', 'ht', 'fcra_accion_adversa'],
  ['ki lwa ou konnen?', 'ht', 'leyes_alcance']
];

RUTAS.forEach(([pregunta, idioma, tema]) => {
  test('«' + pregunta + '» → ' + tema + ' (' + idioma + ')', () => {
    const r = preguntar(pregunta);
    assert.strictEqual(r.tema, tema);
    assert.strictEqual(r.idioma, idioma);
  });
});

test('la respuesta sale en el idioma detectado y no en español por defecto', () => {
  const pt = preguntar('Em que horário os cobradores podem ligar para mim?');
  assert.ok(/8 da manhã/.test(pt.texto), 'debería contestar en portugués');
  const ht = preguntar('Ki lè kolektè yo ka rele m?');
  assert.ok(/8 è nan maten/.test(ht.texto), 'debería contestar en criollo');
});

test('los enlaces de una ficha llevan la etiqueta del idioma', () => {
  const es = preguntar('quiero que dejen de llamarme');
  const ht = preguntar('mwen vle yo sispann rele mwen');
  assert.strictEqual(es.enlaces[0].label, 'Preparar mi carta →');
  assert.strictEqual(ht.enlaces[0].label, 'Prepare lèt mwen an →');
});

/* ---------- idioma ---------- */

test('el criollo se detecta y se puede pedir por su nombre', () => {
  const r = preguntar('habla criollo por favor');
  assert.strictEqual(r.idioma, 'ht');
  assert.ok(/kreyòl/.test(r.texto));
  assert.strictEqual(preguntar('pale kreyòl avè m').idioma, 'ht');
});

test('"una carta en criollo" describe un papel: no cambia de idioma', () => {
  const r = preguntar('me llegó una carta en criollo', { idioma: 'es' });
  assert.strictEqual(r.idioma, 'es');
});

test('el portugués se pide por su nombre', () => {
  assert.strictEqual(preguntar('fale português comigo').idioma, 'pt');
});

test('español e inglés cotidianos no se confunden con criollo', () => {
  assert.strictEqual(preguntar('yo tengo una deuda con una tarjeta').idioma, 'es');
  assert.strictEqual(preguntar('I\'m worried about my debt, what can I do?').idioma, 'en');
});

test('saludos, gracias y despedidas existen en criollo', () => {
  assert.strictEqual(preguntar('bonjou').idioma, 'ht');
  assert.strictEqual(preguntar('bonjou').tema, 'saludo');
  assert.strictEqual(preguntar('mesi anpil').tema, 'gracias');
  assert.strictEqual(preguntar('orevwa').tema, 'adios');
});

test('la emoción va primero, también en criollo', () => {
  const r = preguntar('mwen pè, yo rele m tout tan');
  assert.strictEqual(r.idioma, 'ht');
  assert.ok(/^Respire/.test(r.texto), 'debe abrir con el prefijo emocional: ' + r.texto.slice(0, 60));
});

test('un tema corto en portugués avisa con honestidad qué detalle tiene', () => {
  const r = preguntar('Recebi uma carta em inglês, não entendo o papel');
  assert.strictEqual(r.idioma, 'pt');
  assert.ok(/FDCPA/.test(r.texto), 'el aviso debe decir que las leyes sí están a fondo');
});

test('si además pide las palabras exactas, se suman a la respuesta legal (es/en)', () => {
  const r = preguntar('¿cómo le digo al cobrador que deje de llamarme?');
  assert.strictEqual(r.tema, 'fdcpa_cese');
  assert.ok(/Please do not call me at work/.test(r.texto), 'faltan las frases para el teléfono');
});

test('un dato sensible se frena antes de cualquier ley, en criollo también', () => {
  const r = preguntar('nimewo sekirite sosyal mwen se 123-45-6789 epi yo rele m', { idioma: 'ht' });
  assert.strictEqual(r.tema, 'sensible');
  assert.strictEqual(r.idioma, 'ht');
});

/* ---------- 3. reglas de honestidad ---------- */

const PROHIBIDAS = [
  [/il[eé]gal|illegal|il[ií]cit|illicit/i, 'afirma que algo es ilegal'],
  [/\b(te garantizo|garantizamos|i guarantee|we guarantee|eu garanto|nou garanti|mwen garanti)\b/i, 'promete un resultado'],
  [/\b(te vamos a borrar|we will delete|vamos apagar)\b/i, 'promete borrar'],
  [/\b(debes|deberías) (pagar|demandar|firmar|contratar|ignorar)/i, 'ordena qué hacer'],
  [/\byou should (pay|sue|sign|ignore|hire)/i, 'ordena qué hacer'],
  [/\b(deve|deveria) (pagar|processar|assinar|ignorar)/i, 'ordena qué hacer'],
  [/\bou dwe (peye|siyen|mennen|pran yon avoka)/i, 'ordena qué hacer (criollo)'],
  [/CARS Rule/i, 'cita la CARS Rule anulada']
];

test('ninguna respuesta de ninguna ficha rompe las reglas de honestidad', () => {
  LEYES.forEach((f) => {
    IDIOMAS.forEach((i) => {
      f[i].forEach((texto) => {
        PROHIBIDAS.forEach(([regla, motivo]) => {
          assert.ok(!regla.test(texto), f.id + ' (' + i + '): ' + motivo + ' → ' + (texto.match(regla) || [])[0]);
        });
      });
    });
  });
});

test('las fichas que hablan de decidir demandar o pagar remiten a un abogado', () => {
  ['fdcpa_derechos', 'fcra_demanda'].forEach((id) => {
    ['es', 'en', 'pt', 'ht'].forEach((i) => {
      assert.ok(/LawHelp\.org/.test(ficha(id)[i][0]), id + ' (' + i + '): debe remitir a LawHelp.org');
    });
  });
});

test('las fichas de plazos y disputas aclaran que nadie borra información correcta o que la deuda no desaparece', () => {
  assert.ok(/no significa que la deuda desaparezca/.test(ficha('fcra_plazos').es[0]));
  assert.ok(/doesn.t mean the debt disappears/.test(ficha('fcra_plazos').en[0]));
  assert.ok(/nadie puede borrar información correcta/.test(ficha('fcra_disputa').es[0]));
});

test('la ficha de alcance dice qué NO tiene cargado', () => {
  IDIOMAS.forEach((i) => {
    assert.ok(/Regulaci[oó]n F|Regulation F|Regula[cç][aã]o F|Règleman F/.test(ficha('leyes_alcance')[i][0]), i);
  });
});

/* ---------- 4. números consistentes ---------- */

function numeros(texto) {
  // Quita citas (§ 1692, 15 U.S.C.) y el 1-888 del teléfono: son iguales y solo estorban.
  return (texto.match(/\$?\d[\d,]*/g) || []).map((n) => n.replace(/,$/, '')).sort();
}

test('las cuatro traducciones de cada ficha cuentan los mismos números', () => {
  LEYES.forEach((f) => {
    const base = numeros(f.es[0]).join(' ');
    ['en', 'pt', 'ht'].forEach((i) => {
      assert.strictEqual(numeros(f[i][0]).join(' '), base, f.id + ': los números de ' + i + ' no coinciden con es');
    });
  });
});

test('cada monto y plazo de las fichas aparece también en el resumen de la IA', () => {
  const MEDIDAS = /\b\d+\s*(?:días hábiles|días|años|año|meses|palabras)\b/g;
  LEYES.forEach((f) => {
    const montos = f.es[0].match(/\$[\d,]+/g) || [];
    montos.forEach((m) => assert.ok(DIGESTO_LEYES.includes(m), f.id + ': ' + m + ' no está en el resumen de la IA'));
    (f.es[0].match(MEDIDAS) || []).forEach((m) => {
      assert.ok(DIGESTO_LEYES.includes(m), f.id + ': «' + m + '» no está en el resumen de la IA');
    });
  });
});

test('cada sección citada por una ficha aparece en el resumen de la IA', () => {
  LEYES.forEach((f) => {
    const antes = f.cita.split('·')[0];
    (antes.match(/\b\d{3}[A-C]?\b/g) || []).forEach((n) => {
      assert.ok(DIGESTO_LEYES.includes(n), f.id + ': la sección ' + n + ' no está en el resumen de la IA');
    });
  });
});

test('el resumen de la IA declara lo que no tiene cargado y no dice «ilegal»', () => {
  assert.ok(/Regulación F/.test(DIGESTO_LEYES));
  assert.ok(/prescripción/.test(DIGESTO_LEYES));
  // «ilegal» solo puede aparecer una vez: en la instrucción que PROHÍBE decirlo.
  assert.strictEqual((DIGESTO_LEYES.match(/ilegal/gi) || []).length, 1);
  assert.ok(!/ilícit/i.test(DIGESTO_LEYES));
});
