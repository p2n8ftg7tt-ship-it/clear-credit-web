# Feature Specification: Cartas del agente de crédito (Fase 3: el agente actúa)

**Feature Branch**: `018-cartas-agente`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Fase 3: el agente «actúa» — las cartas pasan a ser herramientas del agente; el consumidor revisa, aprueba y envía; el agente nunca envía nada solo." Diseño aprobado por el dueño el 2026-10-02.

**Fuentes**: conversación del 2026-10-02; `specs/017-agente-credito-ia` (el agente y su resultado validado); `specs/003-…` y `specs/005-credit-letter-fixes` (las cartas bilingües de `cartas-bilingues.js`); `specs/013-lector-credito-metodologia` FR-025b y FR-055; la habilidad `consumer-credit-disputes` (reglas legales de las disputas); la constitución.

**Decisiones del dueño (2026-10-02)**:

1. Solo las **3 cartas que ya existen**: corrección de datos personales (al buró), disputa al buró (FCRA §611) y validación de deuda al cobrador (FDCPA §1692g), con sus motivos actuales. Además, la disputa al buró puede incluir **varias cuentas en una sola carta por buró**.
2. **La IA propone y no redacta texto legal**: elige el tipo, las cuentas y el motivo de una lista cerrada. Las cartas salen de las plantillas bilingües fijas.
3. «No es mía» y la carta de datos personales **solo para lo que el consumidor marcó** antes del análisis (la pantalla para marcar es de la Fase 4).
4. Cada carta nace como **borrador**. El consumidor completa sus datos en su dispositivo, confirma y la **aprueba**. **El agente nunca envía nada.**
5. No se guarda la fecha de envío ni se hace seguimiento en esta fase.
6. Fuera: `credito.html` (Fase 4), bloqueo por robo de identidad §605B, carta de seguimiento, disputa directa con quien reporta, cobros.
7. La implementación la hace Codex; Claude define qué se hace y qué no, revisa y hace los commits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El agente propone las cartas que corresponden (Priority: P1)

Al terminar el análisis, el agente propone hasta 3 cartas: a qué buró o cobrador, sobre qué cuentas y con qué motivo de la lista cerrada. Solo propone cartas para lo que el plan señala como posible error («disputar») o como algo para revisar con el cobrador, nunca en masa.

**Why this priority**: es lo que convierte el análisis en una acción concreta.

**Independent Test**: con ACME/ZETA y la IA simulada, el resultado trae una disputa al buró Equifax por la cuenta A con motivo `wrong-amount`; el servidor la acepta. Una propuesta `not-mine` sobre una cuenta que el consumidor no marcó se rechaza.

**Acceptance Scenarios**:

1. **Given** el resultado del agente con la disputa por la cuenta A, **When** el servidor lo valida, **Then** la propuesta se acepta tal cual.
2. **Given** una propuesta con una cuenta que no existe, un tipo o motivo fuera de la lista, o más de 3 cartas, **When** se valida, **Then** se pide una corrección; si persiste, el resultado se entrega **sin** las cartas no válidas.
3. **Given** una propuesta `not-mine` o una carta de datos personales sobre algo que el consumidor no marcó, **When** se valida, **Then** se rechaza esa carta.
4. **Given** una validación de deuda sobre una cuenta que no es cobranza, **When** se valida, **Then** se rechaza esa carta.
5. **Given** dos propuestas del mismo tipo al mismo destinatario, **When** se valida, **Then** se rechaza: van en una sola carta.

### User Story 2 - Ver el borrador de cada carta en español e inglés (Priority: P1)

El dispositivo convierte cada propuesta en un borrador con las plantillas bilingües existentes, usando los datos que el consumidor escribe en su dispositivo (nombre, dirección, teléfono; en la validación, la dirección del cobrador) y, para identificar cada cuenta, el acreedor y los últimos 4 dígitos del número que trae el reporte. Nada de esto sale del dispositivo.

**Why this priority**: el consumidor tiene que ver exactamente qué va a firmar.

**Independent Test**: con ACME/ZETA, el borrador de la disputa sale dirigido a Equifax (P.O. Box 740241, Atlanta, GA 30374), con un bloque «CUENTAS QUE DISPUTO / ACCOUNTS I AM DISPUTING» que lista ACME BANK, sus últimos 4 dígitos y el motivo en los dos idiomas, y con los mismos datos en las dos columnas.

**Acceptance Scenarios**:

1. **Given** una disputa con 2 cuentas, **When** se arma el borrador, **Then** la carta lista las 2 cuentas con su acreedor, sus últimos 4 dígitos y su motivo en español y en inglés.
2. **Given** una disputa con 1 sola cuenta, **When** se arma, **Then** la carta sale igual que hoy más el bloque de cuentas (sin cambiar ningún otro texto existente).
3. **Given** cualquier borrador, **When** se compara español con inglés, **Then** tienen los mismos datos, la misma ley y los mismos plazos (regla existente de `cartas-bilingues`).
4. **Given** el reporte de un buró desconocido, **When** se arma una disputa, **Then** el borrador queda **incompleto** con el motivo «falta el destinatario» y no se puede aprobar.

### User Story 3 - Aprobar una carta: siempre decide el consumidor (Priority: P1)

Un borrador solo pasa a **aprobado** si el consumidor completó sus datos y confirmó dos cosas: que revisó que la información es inexacta (o, en la validación, que quiere pedir la validación) y que él mismo la envía. Solo una carta aprobada entrega su texto final para copiar o imprimir. Cada carta trae una guía fija de envío.

**Why this priority**: es la línea que separa a Themora de una empresa de reparación de crédito y evita disputas en masa.

**Independent Test**: un borrador sin las confirmaciones o sin dirección del consumidor no se puede aprobar; con todo completo, se aprueba y entrega el texto en inglés para enviar, el texto en español y la guía de envío.

**Acceptance Scenarios**:

1. **Given** un borrador sin nombre o sin dirección del consumidor, **When** intenta aprobarse, **Then** no se aprueba y se dice qué falta.
2. **Given** un borrador completo sin las dos confirmaciones, **When** intenta aprobarse, **Then** no se aprueba.
3. **Given** un borrador completo con las dos confirmaciones, **When** se aprueba, **Then** su estado es `aprobada` y entrega `textoEn`, `textoEs` y la guía de envío (correo certificado con acuse, copias, guardar el recibo, plazo de 30 días del buró o de respuesta del cobrador).
4. **Given** cualquier carta, **When** se revisa el sistema, **Then** no existe ninguna función que la envíe a un buró, cobrador o servicio externo.

### Edge Cases

- **El agente no propone cartas**: `cartas` es una lista vacía; no pasa nada.
- **El plan no tiene pasos «disputar» pero el agente propone una disputa**: se rechaza esa carta (no hay disputas sin un paso del plan que las respalde).
- **Cuenta sin número en el reporte**: la cuenta se identifica solo por el acreedor y la fecha de apertura si existe; el borrador lo dice y sigue siendo aprobable.
- **Validación de deuda sin dirección del cobrador**: el borrador queda incompleto hasta que el consumidor la escribe.
- **El consumidor cambia sus datos después de aprobar**: la carta vuelve a borrador y debe aprobarse otra vez.
- **El análisis cayó al respaldo local** (sin IA): no hay propuestas de cartas.

## Requirements *(mandatory)*

### Functional Requirements

**Propuestas del agente (servidor)**

- **FR-001**: El resultado del agente MUST tener un campo `cartas` (0 a 3 propuestas). Cada una: `tipo` ∈ {`bureau-dispute`, `debt-validation`, `identity`}; `cuentas` (letras; vacío en `identity`); `motivo` ∈ {`not-mine`, `wrong-amount`, `wrong-date`, `already-resolved`, `wrong-status`, `other`} para `bureau-dispute`, por cuenta; `subtipo` ∈ {`identity-names`, `identity-phones`, `identity-addresses`, `identity-mixed`} y `etiquetas` (datos personales) para `identity`.
- **FR-002**: El reporte etiquetado MUST poder llevar `marcadas: { cuentas: [letras], datos: [etiquetas] }`: lo que el consumidor dijo que no reconoce. Si no viene, se toma como vacío.
- **FR-003**: El servidor MUST validar cada propuesta: (a) tipo, motivo y subtipo de la lista; (b) las cuentas y etiquetas existen; (c) `debt-validation` solo sobre cuentas en cobranza, una carta por cuenta; (d) `not-mine` solo sobre cuentas en `marcadas.cuentas`; (e) `identity` solo con etiquetas en `marcadas.datos`; (f) `bureau-dispute` solo sobre cuentas que aparecen en un paso del plan de tipo `disputar`; (g) no hay dos propuestas del mismo tipo al mismo destinatario; (h) máximo 3.
- **FR-004**: Si una propuesta no es válida, el servidor MUST incluir el problema en la corrección única de la spec 017 (FR-021). Si después de la corrección sigue sin ser válida, el resultado MUST entregarse **sin esa carta** (no se pierde el resto del análisis).
- **FR-005**: El manual del agente MUST explicar cuándo proponer cada carta, la lista cerrada de motivos y que nunca propone `not-mine` ni datos personales sin la marca del consumidor.

**Borradores (dispositivo)**

- **FR-006**: El dispositivo MUST convertir cada propuesta en un **borrador** con las plantillas de `cartas-bilingues.js`, sin IA y sin red.
- **FR-007**: La disputa al buró MUST poder listar varias cuentas en un bloque bilingüe «CUENTAS QUE DISPUTO» / «ACCOUNTS I AM DISPUTING», cada una con acreedor, últimos 4 dígitos (si el reporte los trae) y su motivo. El resto del texto existente de la carta MUST NOT cambiar.
- **FR-008**: El destinatario de la disputa y de la carta de datos personales MUST ser el buró del reporte, con su dirección de envío de una tabla única dentro de `cartas-bilingues.js`. Esa tabla MUST coincidir con la de `credito.html` (una prueba lo comprueba hasta que la Fase 4 haga que `credito.html` use la de `cartas-bilingues.js`).
- **FR-009**: Los datos del consumidor (nombre, dirección, teléfono) y la dirección del cobrador MUST escribirse y quedarse en el dispositivo; MUST NOT enviarse al servidor ni a la IA.
- **FR-010**: Un borrador MUST quedar `incompleto` con la lista de lo que falta (`falta_nombre`, `falta_direccion`, `falta_destinatario`, `falta_cobrador`) mientras falte algún dato necesario.

**Aprobación**

- **FR-011**: Un borrador MUST pasar a `aprobada` solo si está completo y el consumidor confirmó (a) «Revisé que esta información es inexacta» (en la validación: «Quiero pedir la validación de esta deuda») y (b) «Yo envío esta carta».
- **FR-012**: Solo una carta `aprobada` MUST entregar su texto final (`textoEn`, `textoEs`) y la guía de envío.
- **FR-013**: Si cambian los datos de una carta aprobada, MUST volver a `borrador`.
- **FR-014**: La guía de envío MUST ser texto fijo en español: correo certificado con acuse de recibo, enviar copias (nunca originales), guardar copia de la carta y el recibo, y el plazo (30 días para el buró, a veces 45; en la validación, que el cobrador debe pausar el cobro hasta responder). Sin promesas de resultado.
- **FR-015**: Ninguna parte del sistema MUST enviar una carta a un buró, cobrador o servicio externo.

**Idiomas y alcance**

- **FR-016**: El texto nuevo en inglés (el bloque de cuentas) MUST marcarse como pendiente de revisión nativa (Principio V), igual que el resto del inglés de `cartas-bilingues.js`.
- **FR-017**: Esta fase MUST NOT modificar `credito.html`, el lector, el analista ni las herramientas de la spec 016; en `cartas-bilingues.js` solo agrega el bloque de cuentas y la tabla de burós, sin cambiar los textos existentes.

### Key Entities

- **Propuesta de carta**: tipo, cuentas, motivo por cuenta o subtipo y etiquetas. La produce el agente; no tiene datos personales.
- **Marcadas**: cuentas y etiquetas de datos personales que el consumidor dijo que no reconoce.
- **Borrador**: la propuesta más los datos del dispositivo, con estado `incompleto`, `borrador` o `aprobada`, lo que falta y las confirmaciones.
- **Carta aprobada**: textos final en inglés y español y la guía de envío.

## Success Criteria *(mandatory)*

- **SC-001**: Con ACME/ZETA, el ciclo completo con la IA simulada termina con una disputa a Equifax por la cuenta A que se puede aprobar y cuyo texto en inglés incluye «ACME BANK», el motivo y la dirección de Equifax.
- **SC-002**: El 100 % de las propuestas que violan FR-003 se rechazan en las pruebas; 0 cartas `not-mine` o de datos personales sin la marca del consumidor.
- **SC-003**: Ninguna carta entrega texto final sin estar `aprobada` (0 casos).
- **SC-004**: Ningún dato del consumidor (nombre, dirección, teléfono, número de cuenta) aparece en lo que se envía al servidor (0 casos en las pruebas).
- **SC-005**: Las pruebas existentes de las cartas bilingües y de las specs 016 y 017 siguen pasando; los textos existentes de las cartas no cambian.

## Assumptions

- La pantalla para marcar lo que no se reconoce, la del borrador y la de aprobación son de la Fase 4; esta fase entrega la lógica y sus pruebas.
- Las direcciones de los burós de `credito.html` son las correctas hoy; esta fase no las verifica de nuevo.
- La revisión nativa del inglés y la revisión legal de las cartas siguen pendientes, como ya dice `INSTRUCCIONES-CARTAS-BILINGUES.md`.
