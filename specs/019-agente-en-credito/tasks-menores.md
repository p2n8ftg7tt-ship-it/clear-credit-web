# Correcciones menores de la revisión final (019) — tareas

> TDD por tarea: agregar la prueba tal como está escrita → ver que FALLA → corregir → ver que PASA. Marcar `[X]`.
> El dueño aprobó las seis el 2026-10-02, incluida la del texto legal (M6).

## Reglas

- Editar solo: `credito.html`, `analista-credito.js`, `specs/014-resumen-consumidor/research.md` (una fila, M6), `tests/credito-agente-ui.test.js`, `tests/credito-resumen-ui.test.js`, `tests/analista-credito.test.js` y este archivo (casillas).
- No tocar los bloques ni los textos que estas tareas no nombran. Sin dependencias nuevas, LF, sin `console.log`.
- Al final: `node --test tests/*.test.js` → solo los 19 fallos previos (tasas y sistema visual).
- No hacer commits (los hace Claude).

---

- [X] **M1. `replace` con texto del acreedor.** En `armarFormularioProblema` (`credito.html`), los dos `.replace('name="collectorName" type="text"', '…' + escapeHtml(...) + '…')` y `.replace('name="accountReference" type="text"', …)` usan un texto de reemplazo; un `$&` dentro del dato se interpreta. Usar una función de reemplazo.
  Prueba (al final de `tests/credito-resumen-ui.test.js`):
  ```js
  test('menor M1: la precarga de la carta usa una función de reemplazo (un «$&» en el dato no se interpreta)', () => {
    const cuerpo = html.slice(html.indexOf('function armarFormularioProblema('), html.indexOf("if ($('crCirculos'))"));
    assert.match(cuerpo, /\.replace\('name="collectorName" type="text"', \(\) =>/);
    assert.match(cuerpo, /\.replace\('name="accountReference" type="text"', \(\) =>/);
  });
  ```

- [X] **M2. Ctrl+P también imprime los análisis.** Agregar `window.addEventListener('beforeprint', prepararImpresion);` junto al manejador de `crPrintButton`.
  Prueba (al final de `tests/credito-resumen-ui.test.js`):
  ```js
  test('menor M2: imprimir con el navegador (Ctrl+P) también llena los análisis', () => {
    assert.match(html, /window\.addEventListener\('beforeprint', prepararImpresion\)/);
  });
  ```

- [X] **M3. «Usarás otro de tus 3 análisis» solo si el intento anterior gastó uno.** En el bloque `019-agente` de `credito.html`, `estadoAgente.usado` queda en `true` solo si el resultado fue `modo: 'ia'` o un respaldo que ocurre después de contar el uso; NO con los motivos que pasan antes de contarlo: `sin_sesion`, `limite_diario`, `no_configurado`, `datos_rechazados`. Mantener la condición `vigente()` de la corrida.
  Prueba (al final de `tests/credito-agente-ui.test.js`):
  ```js
  test('menor M3: un respaldo que no gastó un uso no avisa que se gastará otro', async () => {
    for (const motivo of ['sin_sesion', 'limite_diario', 'no_configurado', 'datos_rechazados']) {
      const { api, nodos } = crearEntornoPagina({ analizarConAgente: async () => ({ modo: 'local', motivo, herramientas: {} }) });
      api.iniciarAgente(reporteAcme(), null);
      api.alPedirAgente();
      await api.alConfirmarMarcas([], []);
      api.alPedirAgente();
      assert.strictEqual(nodos.crAgenteAviso.hidden, true, motivo);
    }
    const { api, nodos } = crearEntornoPagina({ analizarConAgente: async () => ({ modo: 'local', motivo: 'ia_no_disponible', herramientas: {} }) });
    api.iniciarAgente(reporteAcme(), null);
    api.alPedirAgente();
    await api.alConfirmarMarcas([], []);
    api.alPedirAgente();
    assert.strictEqual(nodos.crAgenteAviso.hidden, false, 'ia_no_disponible puede haber gastado el uso: se avisa');
  });
  ```

- [X] **M4. Código muerto.** En `renderResumen` (bloque `014-resumen`), quitar `fallbackName` y el uso de `window.__ccLastAnalysis.primaryName` (ya no existe en `paraGuardar`): el título usa `r.nombre` como antes de ese respaldo.
  Prueba (al final de `tests/credito-resumen-ui.test.js`):
  ```js
  test('menor M4: sin código muerto de primaryName', () => {
    assert.ok(!html.includes('primaryName'));
    assert.ok(!html.includes('fallbackName'));
  });
  ```
  Las pruebas US1 existentes de `tests/credito-resumen-ui.test.js` deben seguir pasando sin cambios.

- [X] **M5. Un círculo abierto recibe «Lo que dice el agente» al terminar el agente.** En `mostrarResultadoAgente` (bloque `019-agente`), después de pintar el resultado: si `$('crAnalisis').hidden` es `false` y hay un círculo con `aria-expanded="true"` (`$('crCirculos').querySelector('.cr-circulo[aria-expanded="true"]')`, protegido con `if (… .querySelector)`), agregar `seccionAgenteParaCuenta(su data-id)` con `insertAdjacentHTML('beforeend', …)` si no está vacía y si el panel no la tiene ya (no duplicar).
  Prueba (al final de `tests/credito-agente-ui.test.js`):
  ```js
  test('menor M5: el círculo abierto recibe «Lo que dice el agente» cuando el agente termina', async () => {
    const { api, nodos } = crearEntornoPagina();
    let agregado = '';
    nodos.crCirculos = { hijos: [], attrs: {}, querySelector: (sel) => (sel === '.cr-circulo[aria-expanded="true"]' ? { dataset: { id: 'A' } } : null) };
    nodos.crAnalisis = { hidden: false, innerHTML: '<h4>ACME</h4>', insertAdjacentHTML(pos, h) { agregado += h; this.innerHTML += h; }, querySelector: () => null };
    api.iniciarAgente(reporteAcme(), null);
    api.alPedirAgente();
    await api.alConfirmarMarcas([], []);
    assert.match(agregado, /Lo que dice el agente/);
  });
  ```

- [X] **M6. Texto de § 1692e(8) completo.** En `analista-credito.js` (regla `cobranza`), la cita de `§ 1692e(8)` debe decir: «Comunicar información de crédito sobre una deuda sin indicar que está disputada, cuando se sabe que lo está, es una práctica prohibida.». Cambiar igual la fila correspondiente de la tabla R3 en `specs/014-resumen-consumidor/research.md` («cobranza disputada»).
  Prueba (al final de `tests/analista-credito.test.js`):
  ```js
  test('menor M6: § 1692e(8) incluye la condición de saber que está disputada', () => {
    const cita = A.REGLAS.find((r) => r.id === 'cobranza').citas.find((c) => c.seccion === '§ 1692e(8)');
    assert.strictEqual(cita.texto, 'Comunicar información de crédito sobre una deuda sin indicar que está disputada, cuando se sabe que lo está, es una práctica prohibida.');
  });
  ```
