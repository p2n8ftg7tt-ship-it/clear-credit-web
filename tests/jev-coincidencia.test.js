/* Jev escoge la ficha de Google que es el negocio; sin Jev o con poca
   confianza se queda la primera. El TDS sigue saliendo de tds.js.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../netlify/functions/lib/jev-coincidencia.js');

const fichas = [
  { id: 'a', displayName: { text: 'Guajiro Express' }, formattedAddress: 'Miami, FL', primaryTypeDisplayName: { text: 'Cafe' } },
  { id: 'b', displayName: { text: 'Guajiro Llc' }, formattedAddress: 'Roanoke, VA', primaryTypeDisplayName: { text: 'Cuban restaurant' }, nationalPhoneNumber: '555' },
];
const entrada = { nombre: 'Guajiro Llc', ciudad: 'Roanoke, VA', giro: 'comida cubana' };
const jev = (answer, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => ({ answers: { ficha: answer } }) });

async function conLlave(valor, fn) {
  const antes = { ...process.env };
  if (valor === null) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = valor;
  delete process.env.JEV_APARECZO;
  try { return await fn(); } finally { process.env = antes; }
}

test('sin llave no llama a Jev y no cambia la ficha', () => conLlave(null, async () => {
  let llamado = false;
  assert.equal(await J.elegirFicha(entrada, fichas, { fetchFn: async () => { llamado = true; } }), null);
  assert.equal(llamado, false);
}));

test('con JEV_APARECZO=off tampoco llama', () => conLlave('k', async () => {
  process.env.JEV_APARECZO = 'off';
  assert.equal(await J.elegirFicha(entrada, fichas, { fetchFn: jev({ choice: '1', confidence: 0.99 }) }), null);
}));

test('cambia a la segunda ficha si Jev está seguro', () => conLlave('k', async () => {
  assert.equal(await J.elegirFicha(entrada, fichas, { fetchFn: jev({ choice: '1', confidence: 0.92 }) }), 1);
}));

test('con poca confianza, "ninguna", la primera o un error, se queda la primera', () => conLlave('k', async () => {
  for (const f of [jev({ choice: '1', confidence: 0.4 }), jev({ choice: 'ninguna', confidence: 0.99 }),
    jev({ choice: '0', confidence: 0.99 }), jev({ choice: '7', confidence: 0.99 }), jev(null, false),
    async () => { throw new Error('red'); }]) {
    assert.equal(await J.elegirFicha(entrada, fichas, { fetchFn: f }), null);
  }
}));

test('con una sola ficha no hay nada que elegir', () => conLlave('k', async () => {
  assert.equal(await J.elegirFicha(entrada, fichas.slice(0, 1), { fetchFn: jev({ choice: '0', confidence: 1 }) }), null);
}));

test('la petición manda solo lo necesario: sin teléfono y con la pregunta tipo choice', () => {
  const p = J.armarPeticion(entrada, fichas);
  assert.equal(p.model, 'jev-latest');
  assert.equal(p.questions.ficha.type, 'choice');
  assert.deepEqual(Object.keys(p.questions.ficha.criteria), ['0', '1', 'ninguna']);
  assert.ok(!JSON.stringify(p).includes('555'));
});
