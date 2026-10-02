/* Cableado del lector en credito.html (especificación 013).
   Ejecutar:  node --test tests/credito-lector-ui.test.js

   Qué se movió y por qué (spec 019, Task 1 = 014 T038): las fichas «Tus cuentas, una por una»
   (renderCuentas, historial, «no reportado», resaltador de DOFD, summaryFromReport y
   renderReportSummary) se retiraron de credito.html; el resumen del consumidor de la 014 las
   reemplaza. Sus pruebas se fueron con ellas. Lo que vigilaban y sigue vivo se prueba en:
   - tests/credito-resumen-ui.test.js: el texto del reporte se escapa, el SSN solo con los últimos 4,
     las cuentas con problemas y su análisis;
   - tests/analista-credito.test.js: lo que se guarda en la cuenta solo lleva números (antes FR-053,
     sobre summaryFromReport; ahora sobre paraGuardar).
   Aquí quedan el orden de carga y el botón de la zona de carga. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'credito.html'), 'utf8');

test('los perfiles cargan antes que el motor, y ambos antes del analista', () => {
  const perfiles = html.indexOf('<script defer src="lector-credito-perfiles.js">');
  const motor = html.indexOf('<script defer src="lector-credito.js">');
  const analista = html.indexOf('<script defer src="analista-credito.js">');
  assert.ok(perfiles > 0, 'falta lector-credito-perfiles.js');
  assert.ok(motor > perfiles, 'lector-credito.js debe cargar después de los perfiles');
  assert.ok(analista > motor, 'analista-credito.js debe cargar después del lector');
});

test('el botón dice «Leer mi reporte», sin flecha, y la zona de carga ya no tiene el círculo', () => {
  const boton = html.match(/<button class="cr-analyze-btn"[^>]*>([^<]*(?:<span>[^<]*<\/span>)?)<\/button>/);
  assert.ok(boton, 'no se encontró el botón de analizar');
  assert.strictEqual(boton[1], 'Leer mi reporte');
  assert.ok(!html.includes('cr-upload-icon'), 'quedó el círculo con icono');
  assert.ok(!html.includes('cr-spinner'), 'quedó el círculo giratorio');
  assert.ok(html.includes('Sube tu reporte de Equifax, Experian o TransUnion'));
});
