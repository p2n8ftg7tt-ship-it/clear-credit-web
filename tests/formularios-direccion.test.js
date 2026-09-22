/* Cobertura del autocompletado de direcciones: ningún campo de dirección queda sin conectar
   por olvido. Ejecutar:  node --test tests/formularios-direccion.test.js

   Por qué existe: el autocompletado solo estaba conectado en un formulario (credito.html) y
   los demás formularios con dirección nunca lo tuvieron. Esta prueba lee el texto de todas
   las páginas de la raíz (también las etiquetas que credito.html arma dentro de cadenas de
   JavaScript) y falla si aparece un campo con pinta de dirección que no está conectado ni
   está en la lista de excepciones con su razón.
   Reglas: specs/003-address-autocomplete-bilingual-letters/contracts/address-form-markup.md */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const PAGINAS = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html')).sort();
const leer = (archivo) => fs.readFileSync(path.join(RAIZ, archivo), 'utf8');

const PARECE_DIRECCION = /street|calle|direccion|address/i;

/* Campos que parecen dirección pero NO se conectan, cada uno con su razón. */
const EXCEPCIONES = [
  {
    archivo: 'listar-negocio.html',
    etiqueta: /^<input type="text" name="direccion" \/>$/,
    razon: 'Copia oculta del formulario para que Netlify detecte los campos (clase sr-only); la persona nunca la ve ni la escribe.'
  }
];

/* Lo que debe estar conectado: seis formularios (F1–F6 de la especificación). */
const ESPERADO = {
  'credito.html': {
    persona: { tipo: 'persona', ciudad: true, estado: true, cp: true, estadoCp: false },
    cobrador: { tipo: 'cobrador', ciudad: true, estado: true, cp: true, estadoCp: false }
  },
  'herramientas.html': {
    persona: { tipo: 'persona', ciudad: true, estado: true, cp: true, estadoCp: false },
    cobrador: { tipo: 'cobrador', ciudad: true, estado: true, cp: true, estadoCp: false }
  },
  'cuenta.html': {
    persona: { tipo: 'persona', ciudad: true, estado: false, cp: false, estadoCp: true }
  },
  'listar-negocio.html': {
    negocio: { tipo: 'negocio', ciudad: false, estado: false, cp: false, estadoCp: false }
  }
};

function etiquetas(texto) {
  return texto.match(/<(?:input|textarea)\b[^>]*>/gi) || [];
}
function atributo(etiqueta, nombre) {
  const m = etiqueta.match(new RegExp('(?:^|\\s)' + nombre + '="([^"]*)"', 'i'));
  return m ? m[1] : null;
}
function esCampoDeDireccion(etiqueta) {
  const tipo = (atributo(etiqueta, 'type') || 'text').toLowerCase();
  if (tipo === 'hidden' || tipo === 'checkbox' || tipo === 'radio' || tipo === 'submit' || tipo === 'file') return false;
  return PARECE_DIRECCION.test(atributo(etiqueta, 'id') || '') || PARECE_DIRECCION.test(atributo(etiqueta, 'name') || '');
}

test('cada campo con pinta de dirección está conectado o tiene una excepción con razón', () => {
  const sueltos = [];
  PAGINAS.forEach((archivo) => {
    etiquetas(leer(archivo)).filter(esCampoDeDireccion).forEach((et) => {
      if (/\sdata-dir-calle(=|\s|>|\/)/.test(et)) return;
      const excepcion = EXCEPCIONES.find((e) => e.archivo === archivo && e.etiqueta.test(et.trim()));
      if (excepcion) { assert.ok(excepcion.razon.length > 20); return; }
      sueltos.push(archivo + ': ' + et);
    });
  });
  assert.deepStrictEqual(sueltos, [], 'Campos de dirección sin conectar (agrega data-dir-calle o una excepción con razón):\n' + sueltos.join('\n'));
});

test('las páginas con campos conectados cargan direccion-autocompletar.js', () => {
  PAGINAS.forEach((archivo) => {
    const texto = leer(archivo);
    if (/data-dir-calle/.test(texto)) {
      assert.match(texto, /<script src="direccion-autocompletar\.js"><\/script>/, archivo + ' usa data-dir-calle pero no carga el script');
    }
  });
});

test('un mismo nombre de grupo no mezcla tipos dentro de una página (persona nunca comparte grupo con cobrador)', () => {
  PAGINAS.forEach((archivo) => {
    const tipos = {};
    etiquetas(leer(archivo)).forEach((et) => {
      const grupo = atributo(et, 'data-dir-calle');
      if (grupo === null) return;
      const tipo = atributo(et, 'data-dir-tipo') || 'persona';
      assert.ok(['persona', 'cobrador', 'negocio'].includes(tipo), archivo + ': tipo desconocido ' + tipo);
      if (tipos[grupo]) assert.strictEqual(tipos[grupo], tipo, archivo + ': el grupo "' + grupo + '" mezcla tipos');
      tipos[grupo] = tipo;
    });
  });
});

test('están conectados exactamente los seis formularios esperados, con los campos de cada forma', () => {
  const encontrados = {};
  PAGINAS.forEach((archivo) => {
    const ets = etiquetas(leer(archivo));
    ets.forEach((et) => {
      const grupo = atributo(et, 'data-dir-calle');
      if (grupo === null) return;
      encontrados[archivo] = encontrados[archivo] || {};
      encontrados[archivo][grupo] = { tipo: atributo(et, 'data-dir-tipo') || 'persona' };
    });
    Object.keys(encontrados[archivo] || {}).forEach((grupo) => {
      const tiene = (a) => ets.some((et) => atributo(et, a) === grupo);
      Object.assign(encontrados[archivo][grupo], {
        ciudad: tiene('data-dir-ciudad'), estado: tiene('data-dir-estado'), cp: tiene('data-dir-cp'), estadoCp: tiene('data-dir-estado-cp')
      });
    });
  });
  assert.deepStrictEqual(encontrados, ESPERADO);
});

test('los campos conectados siguen siendo los mismos (por name o id) que ya usaba cada formulario', () => {
  const clave = (et) => atributo(et, 'name');
  const esperados = {
    'credito.html': ['street', 'collectorStreet'],
    'herramientas.html': ['street', 'collectorStreet'],
    'listar-negocio.html': ['direccion']
  };
  Object.keys(esperados).forEach((archivo) => {
    const marcados = etiquetas(leer(archivo)).filter((et) => /data-dir-calle/.test(et));
    esperados[archivo].forEach((nombre) => {
      const et = marcados.find((x) => clave(x) === nombre);
      assert.ok(et, archivo + ': falta el campo "' + nombre + '" conectado');
    });
  });
  const cuenta = etiquetas(leer('cuenta.html')).find((et) => atributo(et, 'id') === 'profileAddress');
  assert.ok(cuenta && /data-dir-calle/.test(cuenta), 'cuenta.html: profileAddress debe estar conectado');
});
