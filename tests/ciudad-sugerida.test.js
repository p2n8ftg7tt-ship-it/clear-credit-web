/* Pruebas de ciudad-sugerida.js: el formato "Ciudad, ST", los 50 estados +
   DC, la ciudad del perfil y cómo se clasifica para las estadísticas.
   Correr con:  node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');

const C = require('../ciudad-sugerida.js');

test('formatear: "Ciudad, ST" solo con un estado válido y ciudad', () => {
  assert.equal(C.formatear('  Houston ', 'tx'), 'Houston, TX');
  assert.equal(C.formatear('Washington', 'DC'), 'Washington, DC');
  assert.equal(C.formatear('San Juan', 'PR'), null); // no es uno de los 50 + DC
  assert.equal(C.formatear('', 'VA'), null);
  assert.equal(C.formatear('Roanoke', ''), null);
  assert.equal(C.formatear(null, null), null);
});

test('codigoEstado: código, código + ZIP, nombre en inglés o español', () => {
  assert.equal(C.codigoEstado('VA'), 'VA');
  assert.equal(C.codigoEstado('va 24011'), 'VA');
  assert.equal(C.codigoEstado('Virginia 24011'), 'VA');
  assert.equal(C.codigoEstado('West Virginia'), 'WV');
  assert.equal(C.codigoEstado('Nuevo México 87501'), 'NM');
  assert.equal(C.codigoEstado('New Mexico'), 'NM');
  assert.equal(C.codigoEstado('Carolina del Norte'), 'NC');
  assert.equal(C.codigoEstado('district of columbia'), 'DC');
  assert.equal(C.codigoEstado('24011'), null);
  assert.equal(C.codigoEstado('ZZ'), null);
  assert.equal(C.codigoEstado(''), null);
});

test('hay exactamente 51 códigos (50 estados + DC)', () => {
  assert.equal(C.ESTADOS.length, 51);
});

test('desdePerfil: ciudad + estado guardados, o nada', () => {
  assert.equal(C.desdePerfil({ city: 'Roanoke', state_zip: 'VA 24011' }), 'Roanoke, VA');
  assert.equal(C.desdePerfil({ city: 'Santa Fe', state_zip: 'Nuevo México' }), 'Santa Fe, NM');
  assert.equal(C.desdePerfil({ city: '', state_zip: 'VA' }), null);
  assert.equal(C.desdePerfil({ city: 'Roanoke', state_zip: '24011' }), null);
  assert.equal(C.desdePerfil(null), null);
});

test('clasificar: perfil, detectada, editada, escrita o vacía', () => {
  assert.equal(C.clasificar({ valor: '', sugerido: 'Houston, TX', origen: 'detectada' }), 'vacia');
  assert.equal(C.clasificar({ valor: 'Houston, TX', sugerido: 'Houston, TX', origen: 'detectada' }), 'detectada');
  assert.equal(C.clasificar({ valor: ' Roanoke, VA ', sugerido: 'Roanoke, VA', origen: 'perfil' }), 'perfil');
  assert.equal(C.clasificar({ valor: 'Salem, VA', sugerido: 'Roanoke, VA', origen: 'perfil' }), 'editada');
  assert.equal(C.clasificar({ valor: 'Salem, VA', sugerido: null, origen: null }), 'escrita');
});
