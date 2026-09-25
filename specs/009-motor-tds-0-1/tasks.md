# Tasks: Motor TDS 0.1 en ¿Aparezco?

**Origen**: motor corregido en `G:\My Drive\TDS` (spec `001-tds-scoring-engine`, Python).
Contratos de referencia: `score-input.schema.json`, `score-output.schema.json`; caso de prueba
`guajiro.json` (TDS 33 ± 2,8 · Crítico).

**Decisiones (2026-09-24, usuario)**

- Netlify no corre Python: el motor se traduce a JavaScript en `tds.js` y lee los parámetros de
  `models/tds-0.1.0.json` (copia exacta del modelo de `G:\My Drive\TDS\models`).
- Visibilidad sí se mide: 2 consultas de categoría × 9 puntos de la ciudad = 18 búsquedas de
  Google Places pidiendo solo `places.id` (tarifa "IDs Only", sin costo).
- "¿Ya reclamaste tu ficha?" se pregunta en el formulario (Sí / No / No sé). "No sé" = dato
  desconocido: compuerta 1,0 y bandera `claimed_unknown`. Es la única diferencia con el motor
  Python, que exige `claimed` cuando la ficha es localizable.
- Lo que Google no da (tasa de respuesta, última actividad, mensajería, reservar/pedir,
  coherencia entre fuentes) va como `null`: nunca cuenta como cero.
- Sin cohorte de 30 negocios o más se usan las referencias por defecto del modelo
  (bandera `default_references`).

## Fase 1: Base

- [X] T001 Copiar `models/tds-0.1.0.json` y los ejemplos de `G:\My Drive\TDS\tests\fixtures` a `tests/fixtures/tds/`
- [X] T002 Guardar las salidas del motor Python (`python -m tds_engine score|simulate`) en `tests/fixtures/tds/esperado/` como resultado esperado

## Fase 2: Motor en JavaScript

- [X] T003 Pruebas de paridad en `tests/tds.test.js`: cada ejemplo da exactamente la salida del motor Python (incluidos `input_hash` y `parameters_hash`); `invalid_rating_6` da `TDSInputError` en `business.reviews.rating`; simulate da el mismo `delta_points`
- [X] T004 Reescribir `tds.js`: validación de entrada, cohortes, ráfagas, 5 componentes, agregado, razones, simulate, redondeo "mitad hacia arriba", JSON canónico y SHA-256 igual que Python
- [X] T005 Pruebas propias de Aparezco: `claimed` desconocido (compuerta 1, bandera), límites 0–100, textos sin promesas

## Fase 3: Función y página

- [X] T006 `netlify/functions/revisar-negocio.js`: armar la entrada del motor con datos de Google (sin nombre, ciudad, giro ni teléfono), malla de 18 búsquedas, comprobar el sitio web, recibir `reclamada`
- [X] T007 `netlify.toml`: incluir `models/*.json` en la función
- [X] T008 `tests/revisar-negocio-tds.test.js` con Google falso: malla, privacidad, no encontrado = "no evaluable"
- [X] T009 `aparezco.html`: pregunta de ficha reclamada; puntaje con margen y categoría (o rango), evaluación incompleta, componentes V/R/I/C/A, acciones del motor con puntos estimados, simulador con `simulate`, texto de "Cómo calculamos"

## Fase 4: Cierre

- [X] T010 Correr todas las pruebas (`node --test tests/`) y `graphify update .`
