# Feature Specification: El agente en la página del analizador (Fase 4)

**Feature Branch**: `019-agente-en-credito`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Fase 4: conectar el agente (017) y las cartas (018) con credito.html — marcar lo que no reconozco, ver los pasos del agente en vivo, ver el resultado, completar/aprobar/copiar cartas; respaldo local."

**Fuentes**: conversación del 2026-10-02; `specs/014-resumen-consumidor` (diseño del resumen ya acordado: datos generales, cuentas abiertas, círculos, análisis, pasos, pantalla que no aturde); `specs/017-agente-credito-ia`; `specs/018-cartas-agente`; memoria «Diseño actual del sitio» (Mar en calma, tokens, Atkinson/Literata en credito); constitución.

**Decisiones del dueño (2026-10-02)**:

1. Punto de partida guardado antes de empezar (commit `cd14cc0`).
2. **La 019 absorbe lo pendiente de la 014**: los círculos (US2), el análisis por problema (US3), los pasos (US4) y la limpieza (US5) se hacen aquí, como dice la 014, más el agente encima. Las tareas pendientes de la 014 quedan marcadas «reemplazada por 019».
3. **Primero el resumen local, después el agente a pedido**: subir el reporte → resumen y círculos al instante, sin IA → botón «Analizar con el agente» (pide sesión) → lista «¿Hay algo que no reconoces?» → pasos en vivo → el resultado llena el análisis de cada círculo y aparece «Tus cartas».
4. Todo gratis; el sitio no envía cartas; ningún dato personal va a la IA.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver al instante, sin IA, un resumen con las cuentas que tienen problemas (Priority: P1)

Lo que la 014 ya acordó: datos generales, cuentas abiertas y **círculos** con las cuentas que tienen problemas (iniciales, color por gravedad); al tocar un círculo se abre su análisis local (qué vimos, qué significa, qué dice la ley, qué puedes hacer); pasos de lectura; sin indicadores viejos ni «Estado general».

**Why this priority**: es lo que funciona siempre, con o sin IA (Principio III), y la base sobre la que se muestra el agente.

**Independent Test**: los criterios de la 014 para US2, US3, US4 y US5 (sus tareas T017–T041), con los mismos reportes sintéticos.

**Acceptance Scenarios**: los de la spec 014, historias 2 a 5, sin cambios.

---

### User Story 2 - Pedir el análisis del agente y marcar lo que no reconozco (Priority: P1)

Debajo del resumen aparece «Analizar con el agente». Sin sesión, invita a iniciar sesión y explica que es gratis (3 por día). Con sesión, abre la lista «¿Hay algo que no reconoces?» con casillas para cada cuenta (acreedor y frase corta) y cada dato personal (los valores reales se ven **solo en la pantalla**). Al confirmar, el agente empieza y los pasos se ven en vivo, en español claro.

**Why this priority**: es la puerta del agente y la única forma de marcar lo que no reconoce antes de que el agente proponga cartas.

**Independent Test**: con una sesión simulada y el agente simulado, marcar la cuenta B y confirmar envía `marcadas.cuentas = ['B']`; los pasos muestran «Quitando tus datos personales antes de enviar», «Calculando hasta cuándo puede aparecer la cuenta B»… y «Listo».

**Acceptance Scenarios**:

1. **Given** un consumidor sin sesión, **When** toca «Analizar con el agente», **Then** ve la invitación a iniciar sesión y no se llama al agente.
2. **Given** un consumidor con sesión, **When** toca el botón, **Then** ve la lista de cuentas y datos personales con casillas, todas sin marcar, y el botón «Analizar».
3. **Given** que marca cuentas o datos, **When** confirma, **Then** el agente recibe esas marcas (por cuenta y etiqueta), nunca sus valores.
4. **Given** el agente trabajando, **When** avanza, **Then** cada evento aparece como un paso en español, en orden, sin datos del reporte.
5. **Given** que el agente ya corrió, **When** el consumidor lo pide otra vez, **Then** se avisa que gastará otro de sus 3 análisis del día.

---

### User Story 3 - Ver el resultado del agente dentro del resumen (Priority: P1)

El resultado aparece en una sección «Lo que encontró el agente»: diagnóstico, plan (hasta 3 pasos con su tipo, sus cuentas por nombre, los **hechos** con su fuente —«del reporte» o «calculado»— separados de la **interpretación**, y la acción), después, preguntas para ti, qué verificar y datos personales para revisar. Además, al abrir un círculo, su análisis muestra «Lo que dice el agente» con los pasos del plan que tocan esa cuenta. Si el agente no estuvo disponible, se muestra el análisis local (fechas de salida, utilización, posibles duplicados, consultas duras) con el motivo en palabras simples.

**Why this priority**: es el valor del agente para el consumidor.

**Independent Test**: con el resultado de ACME/ZETA, la sección muestra el diagnóstico, 3 pasos con «Cuenta A (ACME BANK)», «del reporte»/«calculado», la pregunta sobre la carta de ZETA y el aviso educativo; el círculo de ACME muestra el paso «Disputar». Con `limite_diario`, se ve «Ya usaste tus 3 análisis con IA de hoy» y el análisis local.

**Acceptance Scenarios**:

1. **Given** un resultado `modo: 'ia'`, **When** se pinta, **Then** aparecen las seis partes y el aviso «Esto es información educativa, no asesoría legal ni financiera. Revisa tu reporte original antes de actuar.».
2. **Given** un paso del plan, **When** se pinta, **Then** cada cuenta se nombra «Cuenta X (ACREEDOR)» y cada hecho dice si salió del reporte o fue calculado.
3. **Given** un resultado `modo: 'local'`, **When** se pinta, **Then** se ve el motivo en español y los datos de las cuatro herramientas.
4. **Given** un círculo de una cuenta que el plan menciona, **When** se abre, **Then** su análisis incluye «Lo que dice el agente» con esos pasos.
5. **Given** cualquier texto del reporte o del agente, **When** se pinta, **Then** sale escapado (nunca como HTML).

---

### User Story 4 - Completar, aprobar y copiar mis cartas (Priority: P1)

Si el agente propuso cartas, aparece «Tus cartas»: una tarjeta por carta con su destinatario, sus cuentas, los campos para los datos del consumidor (y del cobrador en la validación), las dos confirmaciones y el estado. Solo cuando está **aprobada** se ven la carta en dos columnas (español para entender, inglés para enviar), el botón «Copiar carta en inglés» y la guía de envío.

**Why this priority**: es la acción final y la línea que separa a Themora de la reparación de crédito.

**Independent Test**: con la disputa a Equifax de ACME/ZETA, la tarjeta empieza «Falta tu nombre y tu dirección»; al completar y marcar las dos confirmaciones pasa a «Aprobada» y muestra la carta con «ACCOUNTS I AM DISPUTING» y la guía; al cambiar la dirección vuelve a borrador.

**Acceptance Scenarios**:

1. **Given** un borrador incompleto, **When** se pinta, **Then** dice qué falta en español y no muestra la carta final.
2. **Given** datos completos y las dos confirmaciones, **When** se aprueba, **Then** se ven las dos columnas, «Copiar carta en inglés» y la guía.
3. **Given** una carta aprobada, **When** cambia un dato, **Then** vuelve a borrador y se oculta la carta final.
4. **Given** cualquier carta, **When** se revisa la página, **Then** no hay ningún botón ni acción que la envíe por internet.

### Edge Cases

- **Sin cuentas con problemas**: el botón del agente sigue disponible; el agente puede devolver un plan de «proteger».
- **El reporte no se pudo leer**: no se ofrece el agente; se muestra el error de la 014.
- **El consumidor cierra la lista de marcas sin confirmar**: no se llama al agente ni se gasta un uso.
- **Respuesta del agente con 0 cartas**: no aparece «Tus cartas».
- **Analizar otro reporte**: se borran el resultado, las marcas y los borradores del anterior.
- **Teléfono (375 px)**: todo en una columna, sin desplazamiento horizontal; las dos columnas de la carta se apilan (como hoy).

## Requirements *(mandatory)*

**Resumen local (de la 014)**

- **FR-001**: La página MUST cumplir las historias 2 a 5 de la spec 014 (círculos, análisis por problema, pasos, pantalla que no aturde) según sus tareas T017–T041, sin cambios de criterio.

**Puerta del agente**

- **FR-002**: Tras un resumen exitoso, la página MUST mostrar «Analizar con el agente». Sin sesión: invitación a iniciar sesión, con «Gratis, hasta 3 análisis por día», sin llamar al agente.
- **FR-003**: Con sesión, el botón MUST abrir «¿Hay algo que no reconoces?» con casillas por cuenta (acreedor y frase) y por dato personal (tipo y valor, solo en pantalla), todas sin marcar, más «Analizar» y «Cancelar».
- **FR-004**: Al confirmar, la página MUST llamar a `analizarConAgente` con el token de la sesión y `marcadas: { cuentaIds, datos }`. «Cancelar» no llama al agente.
- **FR-005**: Si ya hubo un análisis con el agente para ese reporte, el botón MUST avisar que se gastará otro de los 3 del día.

**Pasos en vivo**

- **FR-006**: Cada evento del agente MUST mostrarse como un paso en español (tabla en el contrato), en una lista con `aria-live`, a continuación de los pasos de lectura; los pasos MUST NOT llevar datos del reporte, salvo la letra y el acreedor de una cuenta, que vienen del dispositivo.

**Resultado**

- **FR-007**: Un resultado `modo: 'ia'` MUST pintarse en «Lo que encontró el agente» con diagnóstico, plan, después, preguntas para ti, qué verificar, datos personales para revisar y el aviso educativo fijo.
- **FR-008**: Cada paso del plan MUST mostrar su tipo en español (Disputar, Pagar, Esperar, Proteger, Revisar), sus cuentas como «Cuenta X (ACREEDOR)», cada hecho con «del reporte» o «calculado» y la interpretación separada de la acción.
- **FR-009**: Un resultado `modo: 'local'` MUST pintarse con el motivo en español (tabla en el contrato) y los resultados de las cuatro herramientas: fechas de salida (marcando «estimada»), utilización por tarjeta y total, posibles duplicados y consultas duras de 12 meses.
- **FR-010**: Al abrir un círculo cuya cuenta aparece en el plan, su análisis MUST incluir «Lo que dice el agente» con esos pasos.
- **FR-011**: Todo texto que venga del reporte o del agente MUST pintarse escapado.

**Cartas**

- **FR-012**: Si el resultado trae cartas, MUST aparecer «Tus cartas» con una tarjeta por borrador (`crearBorradores`), su destinatario y sus cuentas.
- **FR-013**: Cada tarjeta MUST tener los campos del consumidor (nombres, primer apellido, segundo apellido, calle, ciudad, estado, código postal, teléfono) y, en la validación, los del cobrador; los cambios pasan por `actualizarDatos`.
- **FR-014**: Cada tarjeta MUST tener las dos confirmaciones (`confirmar`) y mostrar el estado y lo que falta en español.
- **FR-015**: Solo una carta `aprobada` MUST mostrar las dos columnas, «Copiar carta en inglés» (copia solo el inglés, como hoy) y la guía de envío.
- **FR-016**: La página MUST NOT tener ninguna acción que envíe una carta por internet.

**General**

- **FR-017**: La lógica de presentación MUST vivir en un módulo propio (`agente-credito-vista.js`) que devuelve HTML escapado y se prueba en Node; `credito.html` solo conecta eventos.
- **FR-018**: La página MUST usar los tokens y estilos actuales (Mar en calma; radios de 6 px; foco con `--focus-ring`; Atkinson/Literata en credito) y funcionar en 375 px sin desplazamiento horizontal.
- **FR-019**: La analítica MUST registrar solo eventos sin datos (`agente-pedido`, `agente-terminado`, `agente-respaldo`, `carta-aprobada`, `carta-copiada`).
- **FR-020**: No se modifican el lector, las herramientas, la función del servidor ni `cartas-bilingues.js`. En `agente-credito-cliente.js` solo se exporta `letrasDe(reporte)` (el mapa id de cuenta → letra que ya usa el etiquetador).

### Key Entities

- **Estado de la página**: reporte leído, análisis local (014), preparado (etiquetado/privado), resultado del agente, borradores.
- **Paso visible**: texto en español de un evento del agente.
- **Tarjeta de carta**: vista de un borrador con sus campos, confirmaciones y estado.

## Success Criteria *(mandatory)*

- **SC-001**: Con ACME/ZETA y el agente simulado, el recorrido completo (resumen → marcar → pasos → resultado → carta aprobada y copiada) funciona en las pruebas.
- **SC-002**: Los criterios de éxito de la spec 014 (SC-001 a SC-006) se cumplen.
- **SC-003**: 0 textos del reporte o del agente pintados sin escapar (prueba con un acreedor `<script>`).
- **SC-004**: 0 casos en que se llame al agente sin sesión o sin confirmar la lista de marcas.
- **SC-005**: Sin regresiones: las pruebas que pasaban siguen pasando (los 19 fallos previos de tasas y sistema visual no cambian).
- **SC-006**: Revisión manual del dueño en 375 px y 1440 px antes de publicar.

## Assumptions

- La sesión viene de `CCAuth.getAccessToken()` (auth.js), como en Zyron.
- Las cartas manuales de hoy (formularios de la página) se conservan; la 014 T029 ya las reutiliza desde el análisis local.
- Publicar requiere activar el agente (SQL, secreto, límite de gasto) según `INSTRUCCIONES-AGENTE-CREDITO.md`; sin eso, el botón lleva al análisis local con «no configurado».
