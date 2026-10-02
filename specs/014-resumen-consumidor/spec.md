# Feature Specification: Resumen del consumidor en el analizador de crédito

**Feature Branch**: `014-resumen-consumidor`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Tienes el ejemplo del reporte de Experian (archivo privado del dueño, fuera del proyecto), empieza a trabajar en todo lo anterior en orden." — «Todo lo anterior» es lo acordado en la conversación del 2026-10-01: el analizador debe trabajar como un agente que observa, lee, interpreta, analiza, concluye y propone soluciones según las leyes de crédito; lo que ve el consumidor es un **resumen**, no una copia del reporte, en el orden en que se lee un reporte, sin aturdir ni sonar frío.

**Fuentes**:

- Conversación del 2026-10-01 con el dueño del proyecto (decisiones registradas abajo).
- Un reporte real de Experian (Annual Credit Report) usado **solo como referencia de formato**. Ningún dato personal de ese reporte entra al proyecto; las pruebas usan reportes sintéticos.
- `specs/013-lector-credito-metodologia` (fases 0 y 1 ya entregadas: el lector cuenta por cuenta). Esta especificación continúa sus fases 2 y 4 desde la vista del consumidor.

**Decisiones del dueño (2026-10-01)**:

1. Se dice **«consumidor»**, nunca «cliente».
2. El motor es híbrido: reglas dentro del navegador leen y detectan; la IA (cuando exista) solo explica y arma el plan con datos sin información personal. Esta especificación cubre la vista y las reglas locales; la IA queda para otra especificación.
3. Todas las leyes de crédito (FCRA, FDCPA, FCBA, ECOA, CROA y demás) son la base del análisis.
4. Los reportes llegan casi siempre en inglés; el resumen sale en español.
5. Las cuentas sin problemas no se muestran una por una; solo cuentan.
6. Consultas: número de blandas, número de duras (destacado); cada grupo tiene un ícono que despliega la lista completa.
7. Datos generales incluyen el SSN enmascarado `xxx-xx-1234` (solo los últimos cuatro).
8. Cuentas con problemas: círculos con las iniciales del acreedor; color según gravedad; al tocar un círculo se abre su análisis.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver un resumen claro y confiable de mi reporte (Priority: P1)

El consumidor sube su reporte de Experian, Equifax o TransUnion. En lugar de indicadores vacíos y tablas, ve un **cuadro grande de datos generales**: buró y fecha del reporte, su nombre, su SSN enmascarado, su dirección actual, su teléfono actual, cuántas cuentas tiene (abiertas y cerradas), cuántas consultas duras (destacadas) y cuántas blandas, y cuántos registros públicos. Junto a cada número de consultas hay un ícono; al tocarlo se despliega un cartel con la lista completa (empresa y fecha). Debajo, un **cuadro pequeño de cuentas abiertas** dice cuántas hay y de qué tipo. Todos los números de la pantalla coinciden entre sí.

**Why this priority**: es lo primero que ve el consumidor y hoy es lo que más confunde (nombre leído como «ID #23627», tres teléfonos pegados, «Puntos negativos 6» frente a «12 cuentas con información negativa», «Puntaje: No visible»). Si los números no cuadran, nada de lo que venga después merece confianza.

**Independent Test**: subir un reporte sintético con nombres alternos, varios teléfonos, SSN parcial, 16 cuentas de varios tipos, 1 consulta dura y 113 blandas; comprobar que el cuadro muestra el nombre real (no un identificador), un solo teléfono actual con «y N más», `xxx-xx-` más los cuatro dígitos correctos, los totales correctos, y que los carteles de consultas listan exactamente las consultas del reporte.

**Acceptance Scenarios**:

1. **Given** un reporte cuyo bloque de nombres incluye identificadores como «Name ID #14081», **When** se muestra el resumen, **Then** el nombre mostrado es un nombre de persona y nunca un identificador.
2. **Given** un reporte que muestra el SSN (completo o parcial), **When** se muestra el resumen, **Then** aparece como `xxx-xx-` seguido solo de los últimos cuatro dígitos, y el número completo no aparece en ninguna parte de la pantalla, del texto copiado ni de lo impreso.
3. **Given** un reporte que no muestra el SSN (como el Annual Credit Report de Experian), **When** se muestra el resumen, **Then** la línea del SSN dice que el reporte no lo muestra, sin inventar dígitos.
4. **Given** un reporte con varios teléfonos o direcciones, **When** se muestra el resumen, **Then** aparece uno como actual y los demás como «y N más», sin alarma.
5. **Given** un reporte con 14 consultas duras y 40 blandas, **When** el consumidor toca el ícono de las duras, **Then** se despliega un cartel con las 14 (empresa y fecha) que se cierra con un toque fuera, con un botón de cerrar o con la tecla Escape.
6. **Given** cualquier reporte, **When** se muestra el resumen, **Then** el número de cuentas con problemas es el mismo en todos los lugares donde aparece.
7. **Given** un reporte sin puntaje ni utilización impresos, **When** se muestra el resumen, **Then** no aparecen casillas vacías del tipo «No visible».

---

### User Story 2 - Ver de un vistazo qué cuentas tienen problemas (Priority: P1)

Después de los datos generales, el consumidor ve **solo las cuentas con problemas**, cada una como un círculo con las iniciales del acreedor (por ejemplo «BE» para Blue Eagle Credit Union) y un color según la gravedad: rojo para cobranza, charge-off, deuda cancelada («written off»), reposesión o ejecución hipotecaria; naranja para atrasos; amarillo para lo que vale la pena revisar. Bajo cada círculo, el nombre corto del acreedor y una frase de tres a seis palabras («Atraso de 30 días, feb. 2026»). Si no hay ninguna, ve una frase tranquila que lo dice.

**Why this priority**: es la respuesta a la pregunta que trae el consumidor («¿qué está mal?») y lo que hoy queda enterrado debajo de pantallas de datos crudos.

**Independent Test**: con un reporte sintético que tenga una cuenta con charge-off, una tarjeta con un atraso de 30 días y tres cuentas al día, comprobar que aparecen exactamente dos círculos (rojo y naranja), en ese orden, y que las tres cuentas al día no aparecen.

**Acceptance Scenarios**:

1. **Given** una cuenta marcada por el buró como «Potentially negative» o con charge-off, cobranza o monto cancelado, **When** se arma la lista, **Then** aparece como círculo rojo.
2. **Given** una cuenta con al menos un atraso de 30 días o más en su historial y sin los problemas del punto anterior, **When** se arma la lista, **Then** aparece como círculo naranja.
3. **Given** dos acreedores con las mismas iniciales, **When** se muestran, **Then** se distinguen por el nombre corto debajo del círculo.
4. **Given** varias cuentas con problemas, **When** se ordenan, **Then** van de más grave a menos grave y, dentro de la misma gravedad, de la más reciente a la más antigua.
5. **Given** un reporte sin cuentas con problemas, **When** se muestra la sección, **Then** dice en una frase que no se encontraron cuentas con problemas y no muestra círculos.
6. **Given** el color de un círculo, **When** lo usa alguien que no distingue colores o un lector de pantalla, **Then** la gravedad también se dice con palabras.

---

### User Story 3 - Entender cada problema y qué puedo hacer según la ley (Priority: P2)

El consumidor toca un círculo y se abre el análisis de esa cuenta, escrito como lo explicaría un analista de crédito: **Qué vimos** (el dato exacto y en qué página del reporte está), **Qué significa para ti** (en palabras sencillas), **Qué dice la ley** (la norma que podría aplicar, con su sección y lo que permite), y **Qué puedes hacer** (opciones en orden, sin órdenes). Si aplica una carta, un botón la prepara con el formulario que ya existe, plegado hasta que el consumidor lo pide.

**Why this priority**: es el valor que el consumidor no consigue leyendo el reporte solo. Depende de que las historias 1 y 2 identifiquen bien las cuentas.

**Independent Test**: con la cuenta de charge-off del reporte sintético, tocar su círculo y comprobar que el análisis cita la página del reporte, explica qué es un charge-off, menciona el derecho a disputar información inexacta (FCRA §611) y el plazo de reporte de siete años desde la primera morosidad (FCRA §605), y ofrece la carta de disputa; y que ningún texto dice «debes», «no pagues» ni «es ilegal».

**Acceptance Scenarios**:

1. **Given** una cuenta en cobranza, **When** se abre su análisis, **Then** explica el derecho a pedir validación de la deuda (FDCPA §1692g) y su plazo, y ofrece la carta de validación.
2. **Given** una cuenta con un atraso, **When** se abre su análisis, **Then** indica mes y gravedad del atraso, explica cuánto tiempo puede permanecer en el reporte y cuándo una disputa tiene sentido (si el dato es inexacto) y cuándo no.
3. **Given** una cuenta cuyo dato negativo supera el periodo máximo de reporte, **When** se abre su análisis, **Then** lo señala como información que podría ser obsoleta según FCRA §605.
4. **Given** un círculo abierto, **When** el consumidor toca otro círculo, **Then** se cierra el primero y se abre el segundo; el foco del teclado va al análisis abierto.
5. **Given** una ley que no está cargada en el sitio (por ejemplo, una ley estatal), **When** podría aplicar, **Then** el análisis dice con franqueza que no está cubierta en lugar de improvisarla.

---

### User Story 4 - Ver al agente trabajar mientras lee mi reporte (Priority: P2)

Mientras se procesa el archivo, en lugar de una barra muda, el consumidor ve los pasos en vivo: observando (buró, fecha, páginas), leyendo (cuántas cuentas y datos personales), revisando contra la ley, y la conclusión («Encontré 2 cuentas con problemas»). Cada paso se marca al terminar.

**Why this priority**: da confianza y humaniza la espera, pero el resumen sirve sin él.

**Independent Test**: subir un reporte de varias páginas y comprobar que los pasos aparecen en orden, cada uno con su dato real, y que el último dice el mismo número de cuentas con problemas que la sección de círculos.

**Acceptance Scenarios**:

1. **Given** un PDF de 23 páginas, **When** se lee, **Then** el paso de observar muestra el avance por página y el buró detectado.
2. **Given** que la lectura falla (archivo sin texto, escaneo), **When** ocurre, **Then** el paso en curso se marca como no completado y un mensaje en palabras sencillas dice qué hacer.
3. **Given** un consumidor que prefiere menos movimiento, **When** se muestran los pasos, **Then** aparecen sin animaciones.
4. **Given** un lector de pantalla, **When** avanza cada paso, **Then** se anuncia su texto.

---

### User Story 5 - Una pantalla que no aturde (Priority: P3)

Una vez que las historias 1 a 3 están en pie, se retira de la vista del consumidor todo lo que repite o confunde: los indicadores con «No visible», la tabla de cuentas por tipo, la sección «Tus cuentas, una por una» con todos los campos, las listas genéricas de puntos negativos y positivos, y el plan que repite los mismos títulos. Los textos dicen «consumidor» donde antes decían «cliente».

**Why this priority**: limpiar antes de tener el reemplazo dejaría al consumidor sin información.

**Independent Test**: con el reporte sintético completo, contar las secciones visibles tras el análisis: pasos del agente, datos generales, cuentas abiertas, cuentas con problemas (con su análisis) y acciones finales; ninguna otra.

**Acceptance Scenarios**:

1. **Given** el resultado de un análisis, **When** se recorre la pantalla, **Then** ningún hallazgo aparece dos veces.
2. **Given** los textos del analizador, **When** se revisan, **Then** no usan la palabra «cliente» para referirse a la persona.
3. **Given** el resultado, **When** se imprime o se guarda en la cuenta, **Then** se imprime o guarda el resumen nuevo, con el SSN enmascarado.

---

### Edge Cases

- El reporte no tiene nombre legible: se muestra «Nombre no legible en el reporte», nunca un identificador.
- El reporte trae el SSN completo: solo se muestran los cuatro últimos; el número completo no se guarda en el resultado.
- Un acreedor con nombre de una sola palabra o con siglas («WFBNA CARD», «AMEX»): las iniciales se toman de forma razonable (dos letras como máximo).
- Una cuenta aparece cerrada y pagada pero con un charge-off en su historial: cuenta como problema (rojo).
- Una cuenta de depósito con monto cancelado («$144 written off»): cuenta como problema (rojo).
- Más de 12 cuentas con problemas: los círculos se acomodan en varias filas sin desbordar en un teléfono.
- Cientos de consultas blandas: el cartel muestra la lista con desplazamiento propio y agrupada por empresa.
- El lector no reconoce el buró: el resumen funciona igual y dice que el formato no se reconoció.
- Se leen solo algunas páginas de un PDF largo: el resumen lo dice en el cuadro de datos generales.

## Requirements *(mandatory)*

### Functional Requirements

**Una sola verdad**

- **FR-001**: Todos los números y hallazgos que ve el consumidor MUST salir de la lectura cuenta por cuenta del reporte; el análisis viejo por palabras sueltas MUST NOT producir hallazgos visibles.
- **FR-002**: El número de cuentas con problemas MUST ser el mismo en los pasos del agente, en el cuadro de datos generales y en la sección de círculos.

**Datos generales (cuadro grande)**

- **FR-003**: El cuadro MUST mostrar: buró, fecha del reporte, nombre principal, SSN enmascarado, dirección actual, teléfono actual, total de cuentas (abiertas y cerradas), consultas duras, consultas blandas y registros públicos.
- **FR-004**: El nombre principal MUST ser un nombre de persona; textos como «Name ID #…» MUST descartarse.
- **FR-005**: El SSN MUST mostrarse como `xxx-xx-` más los cuatro últimos dígitos solo si el reporte los imprime; el número completo MUST NOT conservarse en ningún resultado, guardado, impresión ni dato enviado a terceros.
- **FR-006**: Si hay más de un teléfono o dirección, MUST mostrarse el actual y un contador «y N más».
- **FR-007**: Las consultas duras MUST mostrarse con más énfasis que las blandas; cada grupo MUST tener un ícono que despliega un cartel con la lista completa (empresa y fecha), que se abre y cierra con ratón, toque o teclado.
- **FR-008**: El cuadro MUST NOT mostrar casillas vacías («No visible») para datos que el reporte no trae, salvo el SSN, que dice que el reporte no lo muestra.

**Cuentas abiertas (cuadro pequeño)**

- **FR-009**: El cuadro MUST mostrar cuántas cuentas abiertas hay y cuántas de cada tipo (tarjetas, auto, hipoteca, estudiantil, otros préstamos); los tipos sin cuentas no se muestran.

**Cuentas con problemas (círculos)**

- **FR-010**: Una cuenta MUST considerarse con problemas si tiene: cobranza, charge-off, monto cancelado, reposesión, ejecución hipotecaria, atraso de 30 días o más en su historial, saldo vencido mayor que cero, o la marca del buró de información potencialmente negativa.
- **FR-011**: La gravedad MUST ser: roja (cobranza, charge-off, monto cancelado, reposesión, ejecución hipotecaria, registro público), naranja (atrasos o saldo vencido), amarilla (marcada por el buró o con datos que merecen revisión, sin lo anterior).
- **FR-012**: Cada círculo MUST mostrar las iniciales del acreedor (máximo dos letras), y debajo el nombre corto y una frase breve con el problema principal y su fecha.
- **FR-013**: La gravedad MUST comunicarse también con texto (no solo color), con contraste suficiente.
- **FR-014**: Las cuentas sin problemas MUST NOT mostrarse como círculo ni como ficha.

**Análisis por cuenta**

- **FR-015**: Al activar un círculo MUST abrirse su análisis con cuatro partes: Qué vimos (con página del reporte), Qué significa para ti, Qué dice la ley (norma y sección) y Qué puedes hacer.
- **FR-016**: Solo puede haber un análisis abierto a la vez.
- **FR-017**: La parte legal MUST citar solo normas cargadas en el sitio; lo que no esté cargado MUST decirse con franqueza.
- **FR-018**: Los textos MUST describir derechos y opciones; MUST NOT decir «debes», «no pagues», «es ilegal» ni garantizar resultados (Principio I).
- **FR-019**: Cuando aplique una carta (disputa con el buró, validación con el cobrador, corrección de identidad), el análisis MUST ofrecer prepararla reutilizando los formularios y cartas bilingües existentes, plegados hasta que el consumidor los pida y con los datos de la cuenta ya completados cuando el reporte los traiga.

**Pasos del agente**

- **FR-020**: Durante el procesamiento MUST mostrarse los pasos Observar, Leer, Revisar contra la ley y Concluir, cada uno con datos reales del reporte, marcados al completarse y anunciados a lectores de pantalla.
- **FR-021**: Los pasos MUST respetar la preferencia de movimiento reducido.

**Limpieza y lenguaje**

- **FR-022**: Tras entregar las historias 1 a 3 MUST retirarse de la vista: indicadores vacíos, tabla por tipo, «Tus cuentas, una por una», listas genéricas de negativos/positivos y el plan repetido.
- **FR-023**: Los textos visibles del analizador MUST usar «consumidor» y nunca «cliente» para la persona.
- **FR-024**: Todo texto que viene del reporte MUST mostrarse como texto, nunca interpretarse como código de la página.
- **FR-025**: El archivo MUST seguir procesándose solo en el navegador del consumidor (Principio II); la analítica MUST registrar solo eventos sin cifras ni datos personales.
- **FR-026**: Lo que el asistente Mr. Credit Coach lee del análisis MUST seguir funcionando con la nueva forma del resultado.

### Key Entities

- **Resumen del reporte**: buró, fecha, nombre principal, últimos cuatro del SSN (o su ausencia), dirección y teléfono actuales con sus contadores, totales de cuentas, consultas y registros públicos, páginas leídas.
- **Cuenta con problema**: la cuenta leída del reporte, su gravedad (roja, naranja, amarilla), el problema principal con su fecha, las iniciales y el nombre corto del acreedor.
- **Hallazgo legal**: para una cuenta, qué se vio (con página), qué significa, norma aplicable (ley y sección), opciones y carta sugerida si la hay.
- **Consulta**: empresa, fecha y tipo (dura, blanda, promocional, revisión de cuenta).
- **Paso del agente**: nombre del paso, texto con el dato real, estado (en curso, completado, no completado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En los reportes de prueba de los tres burós, el 100 % de los números del resumen coincide con el reporte (cuentas, abiertas, cerradas, consultas duras y blandas, cuentas con problemas).
- **SC-002**: En ningún reporte de prueba aparece como nombre un identificador ni aparece el SSN completo en pantalla, impresión o resultado guardado.
- **SC-003**: Un consumidor puede decir cuáles de sus cuentas tienen problemas en menos de 10 segundos después de ver el resultado, sin desplazarse más de una pantalla en un teléfono.
- **SC-004**: La pantalla de resultado de un reporte con 16 cuentas ocupa al menos un 60 % menos de altura que la versión actual.
- **SC-005**: El 100 % de las cuentas con problemas de los reportes de prueba tiene un análisis con página de origen, norma citada y al menos una opción; el 0 % de los textos contiene «debes», «no pagues» o «es ilegal».
- **SC-006**: Ningún hallazgo aparece dos veces en la pantalla de resultado.

## Assumptions

- Formatos de entrada: los que ya acepta el analizador (PDF con texto, Word, Excel/CSV). Los escaneos siguen fuera (fase 6 de la especificación 013).
- Los reportes de prueba son sintéticos, construidos a partir del formato de reportes reales; ningún dato personal real entra al proyecto.
- El Annual Credit Report de Experian no imprime el SSN; en ese caso no hay dígitos que mostrar.
- Las normas citadas en esta etapa son las ya cargadas en el sitio (FCRA y FDCPA, las mismas que usa Zyron); otras leyes de crédito se añadirán con su propia prueba antes de citarse.
- La IA del modelo híbrido no forma parte de esta especificación; todo funciona sin IA (Principio III).
- El resumen sale en español; los demás idiomas se tratan después.
- El resto de la página `credito.html` (explicaciones de FICO, burós, derechos) no cambia.
