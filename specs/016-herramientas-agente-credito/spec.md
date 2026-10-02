# Feature Specification: Herramientas de cálculo del agente de crédito (Fase 1)

**Feature Branch**: `016-herramientas-agente-credito`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Sí, apruebo la arquitectura propuesta y las 4 herramientas. En `calcularFechaSalida`, NO presentes 180 días como jurídicamente equivalentes a 6 meses exactos. Si el DOFD solo tiene mes y año, calcula una fecha estimada con precisión mensual y marca claramente el resultado como estimación, no como fecha legal definitiva (`precision: "mes"`, `estimada: true`, `reglaBase: "7_anos_mas_180_dias"`, `motivoEstimacion: "dofd_sin_dia_exacto"`). Themora debe limitarse a calcular y mostrar el dato. No debe afirmar que una cuenta «debe eliminarse» en una fecha determinada ni emitir una conclusión legal. Mantén: cálculos puros y deterministas; no sustituir datos faltantes; separar cálculo de interpretación; ACME y ZETA como fixtures; no tocar todavía `credito.html`, cartas ni frontend. Los resultados esperados de ACME/ZETA quedan aprobados como pruebas de referencia, teniendo en cuenta que `2028-09` es una estimación mensual basada en DOFD `2021-03`."

**Fuentes**:

- Conversación del 2026-10-01/02 con el dueño del proyecto: el analizador deja de ser un conjunto de reglas fijas y pasa a ser un **agente de IA** que revisa, analiza, propone y, más adelante, prepara soluciones. El agente necesita herramientas que le den números exactos para no inventarlos.
- `specs/013-lector-credito-metodologia` (el lector ya entrega el reporte normalizado: cuentas, consultas, fechas, montos y el origen de cada dato). Esta especificación usa su modelo de datos tal cual.
- `specs/013-lector-credito-metodologia/spec.md` FR-023, FR-024, FR-024a, FR-027, FR-028 y la tabla «Descartado de la propuesta» (B-07: no hay corte en 30 %).
- Constitución del proyecto, Principios I (honestidad), II (privacidad), III (funciona sin IA) y IV (una sola verdad, probada).

**Decisiones del dueño (2026-10-02)**:

1. La Fase 1 construye **solo** el motor lógico y matemático: cuatro herramientas de cálculo. Sin cartas, sin diseño visual, sin frontend y sin conexión con la página del analizador.
2. Las cuatro herramientas son: **Fecha de salida** (`calcularFechaSalida`), **Utilización** (`calcularUtilizacion`), **Posibles duplicados** (`buscarPosiblesDuplicados`) y **Consultas duras en 12 meses** (`contarConsultasDuras`).
3. Las herramientas calculan; no interpretan. No producen frases para el consumidor, ni veredictos, ni recomendaciones.
4. Si falta un dato, la herramienta lo dice; nunca lo reemplaza por otro.
5. Una fecha de salida basada en un DOFD sin día exacto es una **estimación mensual**, marcada como tal; 180 días no se presentan como equivalentes jurídicos de 6 meses.
6. El caso ACME/ZETA es la prueba de referencia aprobada.

## Alcance

**Dentro**: las cuatro herramientas, sus contratos de entrada y salida, sus reglas de cálculo, sus estados para datos faltantes y casos límite, el caso de referencia ACME/ZETA y los casos límite de cada herramienta.

**Fuera (fases siguientes)**: la capa que convierte los resultados en español claro; el agente de IA y su función en el servidor; el manual del agente; cartas; cambios en la página del analizador o en el resumen del consumidor; fecha de salida de registros públicos (quiebras); agrupación de consultas por comparación de tasas; comparación entre burós.

## User Scenarios & Testing *(mandatory)*

Los «usuarios» directos de estas herramientas son el agente de análisis y la capa de interpretación que hablará con el consumidor. El beneficiario final es el consumidor, que recibe números exactos y comprobables en lugar de estimaciones inventadas.

### User Story 1 - Saber hasta cuándo puede aparecer un dato negativo (Priority: P1)

El agente revisa una cuenta en cobranza o cargada a pérdida y necesita decirle al consumidor hasta cuándo, según la regla de la FCRA, puede seguir apareciendo en el reporte. Pide a la herramienta **Fecha de salida** el cálculo. La herramienta devuelve la fecha calculada, con qué regla, a partir de qué dato y de qué página, y si es exacta o una estimación mensual. Si falta el DOFD, responde que no se puede calcular y por qué.

**Why this priority**: es el dato que más decisiones mueve (pagar, esperar, consultar la prescripción) y el más fácil de equivocar; la spec 013 ya corrigió una regla errónea («7 años desde la última actividad»). Un error aquí es información legal falsa.

**Independent Test**: con el caso ACME/ZETA, la herramienta devuelve para ACME y ZETA la estimación `2028-09` marcada como estimación mensual con la regla «7 años más 180 días» y el motivo «DOFD sin día exacto»; para NOVA y SOL devuelve «no aplica». Con una cobranza sin DOFD devuelve «no se puede calcular: falta el DOFD».

**Acceptance Scenarios**:

1. **Given** la cuenta ACME BANK cargada a pérdida con DOFD `2021-03` y hoy `2026-10-01`, **When** se calcula su fecha de salida, **Then** el resultado es `2028-09` con `precision: "mes"`, `estimada: true`, `reglaBase: "7_anos_mas_180_dias"`, `motivoEstimacion: "dofd_sin_dia_exacto"`, la base es el DOFD con su origen, el rango posible va de `2028-08` a `2028-09` y `yaPaso` es falso.
2. **Given** la cobranza ZETA COLLECTIONS con DOFD `2021-03`, **When** se calcula, **Then** el resultado es el mismo que en el escenario 1.
3. **Given** una cobranza con DOFD de día exacto `2019-03-15`, **When** se calcula, **Then** la fecha es `2026-09-11` (15 de marzo de 2019 + 180 días = 11 de septiembre de 2019; + 7 años), con `precision: "dia"` y `estimada: false`.
4. **Given** una cobranza o charge-off sin DOFD, **When** se calcula, **Then** el estado es «no calculable» con motivo «falta el DOFD», y no aparece ninguna fecha aunque la cuenta tenga fecha reportada, de última actividad o de charge-off.
5. **Given** una cuenta al día sin atrasos (NOVA CARD, SOL AUTO), **When** se calcula, **Then** el resultado es «no aplica».
6. **Given** una cuenta que no pasó a cobranza ni a charge-off pero tiene atrasos en su historial, **When** se calcula, **Then** se devuelve una fecha por cada mes con atraso (mes del atraso + 7 años), marcada como estimación mensual con `reglaBase: "7_anos_desde_atraso"`.
7. **Given** cualquier resultado de esta herramienta, **When** se revisa, **Then** no contiene palabras como «debe eliminarse», «ilegal», «obligatorio» ni ninguna conclusión legal: solo la fecha calculada, la regla y el dato base.

---

### User Story 2 - Saber cuánto se usa de cada tarjeta (Priority: P2)

El agente necesita la utilización de cada tarjeta y la total para explicar al consumidor cuánto de su crédito disponible está usando. La herramienta **Utilización** calcula el porcentaje de cada cuenta rotativa abierta y el total, y lista qué cuentas dejó fuera y por qué.

**Why this priority**: la utilización es uno de los factores que el consumidor sí puede cambiar pronto; el código viejo la leía del texto con expresiones regulares y la juzgaba con cortes que el dueño descartó (B-07).

**Independent Test**: con ACME/ZETA, NOVA CARD sale con 89 % y el total con 89 % ($890 de $1,000); ACME queda excluida por «cargada a pérdida»; ZETA y SOL no aparecen porque no son rotativas.

**Acceptance Scenarios**:

1. **Given** NOVA CARD con saldo $890 y límite $1,000, **When** se calcula, **Then** su utilización es 89 % y `sobreLimite` es falso.
2. **Given** el caso ACME/ZETA completo, **When** se calcula, **Then** el total es saldo $890, límite $1,000, 89 %, y ACME aparece en excluidas con motivo «cargada a pérdida».
3. **Given** una tarjeta abierta sin límite reportado, **When** se calcula, **Then** queda excluida con motivo «sin límite» y no se usa el saldo más alto en su lugar.
4. **Given** una tarjeta con límite $0, **When** se calcula, **Then** queda excluida con motivo «límite cero» y no se divide.
5. **Given** una tarjeta con saldo mayor que su límite, **When** se calcula, **Then** el porcentaje pasa de 100 % y `sobreLimite` es verdadero.
6. **Given** que ninguna tarjeta puede incluirse, **When** se calcula, **Then** el total es «sin dato», no 0 %.
7. **Given** cualquier resultado, **When** se revisa, **Then** no contiene calificaciones («buena», «alta», «mala») ni cortes como 30 % o 10 %.

---

### User Story 3 - Ver si una deuda aparece dos veces (Priority: P2)

El agente necesita saber si una deuda podría estar reportada dos veces (por ejemplo, el acreedor original con saldo y un cobrador con el mismo saldo). La herramienta **Posibles duplicados** devuelve pares de cuentas con lo que coincide, lo que difiere, si ambas tienen saldo y si el reporte dice que la cuenta original fue vendida o transferida, con el texto exacto y su origen. No concluye que haya un error.

**Why this priority**: el doble reporte es uno de los errores más comunes y disputables; pero el agente solo puede llamarlo error si el reporte muestra que la deuda se vendió o transfirió. La herramienta le da ese hecho.

**Independent Test**: con ACME/ZETA, sale exactamente un par (ACME, ZETA) de tipo «original y cobranza», con coincidencias en acreedor original, saldo y DOFD, ambos con saldo, y la marca de venta encontrada con el texto «Account sold to another lender».

**Acceptance Scenarios**:

1. **Given** el caso ACME/ZETA, **When** se buscan duplicados, **Then** hay un solo par `[ACME, ZETA]`, tipo `original_y_cobranza`, `coinciden: acreedor_original, saldo, dofd`, `ambosConSaldo: true`, `marcaVendida.encontrada: true` con el texto y su origen.
2. **Given** el mismo caso pero sin el comentario de venta en ACME, **When** se buscan duplicados, **Then** el par sigue apareciendo con `marcaVendida.encontrada: false`.
3. **Given** una cobranza sin acreedor original, **When** se buscan duplicados, **Then** no se forma ningún par «original y cobranza» con ella y no hay error.
4. **Given** dos cuentas del mismo acreedor abiertas la misma fecha, **When** se buscan duplicados, **Then** aparece un par `mismo_acreedor_misma_apertura`.
5. **Given** dos cobranzas con el mismo acreedor original, **When** se buscan duplicados, **Then** aparece un par `dos_cobranzas_mismo_original`.
6. **Given** nombres que solo difieren en mayúsculas, puntos o espacios («Acme Bank.» y «ACME  BANK»), **When** se comparan, **Then** se consideran el mismo nombre; nombres distintos después de normalizar («ACME BANK» y «ACME BK») no se emparejan.

---

### User Story 4 - Contar las consultas duras del último año (Priority: P3)

El agente necesita saber cuántas consultas duras hubo en los últimos 12 meses. La herramienta **Consultas duras** las cuenta respecto a la fecha de hoy que se le entrega, separa las que tienen fecha incompleta en el borde de la ventana y las que no tienen fecha o tipo.

**Why this priority**: pesa poco en el plan, pero el número debe ser exacto y coincidir con lo que ve el consumidor (Principio IV).

**Independent Test**: con ACME/ZETA y hoy `2026-10-01`, el total es 2 (2026-02-14 y 2025-11-03), hay 1 incierta (`2025-10`), la de 2025-08-20 queda fuera y la blanda no se cuenta.

**Acceptance Scenarios**:

1. **Given** el caso ACME/ZETA y hoy `2026-10-01`, **When** se cuentan, **Then** la ventana es del 2025-10-01 (sin incluir) al 2026-10-01 (incluido), `total: 2`, `inciertas: 1`.
2. **Given** una consulta dura con fecha posterior a hoy, **When** se cuentan, **Then** aparece en `futuras` y no en el total.
3. **Given** una consulta sin fecha, **When** se cuentan, **Then** suma a `sinFecha` y no al total.
4. **Given** una consulta de tipo desconocido, **When** se cuentan, **Then** suma a `desconocidas` y no al total.
5. **Given** varias consultas de la misma empresa en pocos días, **When** se cuentan, **Then** cada una cuenta por separado (no se agrupan por comparación de tasas).

---

### Edge Cases

- **DOFD solo con año** (`2021`): Fecha de salida devuelve «no calculable», motivo «DOFD imprecisa».
- **DOFD posterior a hoy**: se calcula igual y se agrega el aviso «DOFD futura».
- **DOFD anterior a la fecha de apertura**: se calcula igual y se agrega el aviso «DOFD antes de la apertura»; la herramienta no concluye nada sobre esto.
- **Rango de estimación que contiene hoy**: `yaPaso` es «incierto».
- **Fecha que cae en un día inexistente** (por ejemplo, 29 de febrero + 7 años): se usa el último día de ese mes.
- **Hoy es 29 de febrero** para la ventana de consultas: el inicio de la ventana es el 28 de febrero del año anterior.
- **Saldo negativo** (saldo a favor) en una tarjeta: se excluye con motivo «saldo negativo».
- **Tarjeta cerrada**: se excluye de la utilización con motivo «cerrada».
- **Tarjeta de usuario autorizado**: se incluye y queda marcada su responsabilidad.
- **Una misma cuenta en varios pares** de duplicados: se permite; un mismo par nunca se repite y una cuenta nunca se empareja consigo misma.
- **Lista de cuentas o consultas vacía**: resultados vacíos y totales «sin dato» o 0 según corresponda, sin error.
- **Entrada con forma inválida** (no es una lista, falta el identificador de una cuenta, la fecha de hoy no es válida): la herramienta lo señala como error de uso, distinto de un dato faltante del reporte.

## Requirements *(mandatory)*

### Functional Requirements

**Comunes a las cuatro herramientas**

- **FR-001**: Cada herramienta MUST ser determinista: la misma entrada MUST producir exactamente la misma salida, en el mismo orden, sin depender del reloj, del azar, de la red ni de la página.
- **FR-002**: La fecha de hoy MUST llegar como dato de entrada en las herramientas que la usan (Fecha de salida y Consultas duras); ninguna herramienta MUST leer la fecha del sistema.
- **FR-003**: Las herramientas MUST devolver solo hechos, números y códigos (por ejemplo `no_calculable`, `falta_dofd`); MUST NOT devolver frases para el consumidor, calificaciones, recomendaciones ni conclusiones legales.
- **FR-004**: Ningún resultado MUST contener ni implicar «debe eliminarse», «ilegal», «violación», «fraude», «garantiza» ni un aumento de puntaje.
- **FR-005**: Si falta un dato necesario, la herramienta MUST devolver un estado con su motivo y MUST NOT reemplazarlo por otro dato (por ejemplo, fecha reportada en lugar del DOFD, o saldo más alto en lugar del límite).
- **FR-006**: Cada resultado por cuenta o consulta MUST incluir el identificador de la cuenta y el origen (página y etiqueta del reporte) de los datos usados, para que pueda comprobarse en el reporte original.
- **FR-007**: Un error de uso (entrada con forma inválida) MUST distinguirse de un dato faltante del reporte: el primero se señala como error; el segundo es un resultado normal con estado y motivo.
- **FR-008**: Las herramientas MUST usar el reporte normalizado que ya entrega el lector (spec 013) sin modificarlo, y MUST NOT leer ni devolver datos personales del consumidor (nombres, direcciones, teléfonos, SSN, fecha de nacimiento).
- **FR-009**: Las herramientas MUST funcionar igual en el dispositivo del consumidor y en el servidor, sin IA (Principio III).

**Fecha de salida**

- **FR-010**: Para cobranzas y charge-offs, la fecha MUST calcularse como DOFD + 180 días + 7 años (FCRA §605(a)(4) y §605(c)), con `reglaBase: "7_anos_mas_180_dias"`.
- **FR-011**: Si el DOFD tiene día exacto, el resultado MUST tener `precision: "dia"` y `estimada: false`.
- **FR-012**: Si el DOFD tiene solo mes y año, el resultado MUST tener `precision: "mes"`, `estimada: true` y `motivoEstimacion: "dofd_sin_dia_exacto"`; la fecha estimada MUST ser el mes que resulta de sumar 6 meses y 7 años al mes del DOFD, y MUST incluir el rango de meses posibles (desde el primer día del mes del DOFD + 180 días + 7 años hasta el último día del mes del DOFD + 180 días + 7 años). La herramienta MUST NOT presentar 180 días como equivalentes jurídicos de 6 meses.
- **FR-013**: Si el DOFD tiene solo el año, el resultado MUST ser `no_calculable` con motivo `dofd_imprecisa`.
- **FR-014**: Si una cobranza o charge-off no tiene DOFD, el resultado MUST ser `no_calculable` con motivo `falta_dofd`, sin fecha.
- **FR-015**: Para cuentas que no son cobranza ni charge-off pero tienen atrasos en su historial o en la lista de atrasos, MUST devolverse una fecha por cada mes con atraso: mes del atraso + 7 años (FCRA §605(a)(5)), con `reglaBase: "7_anos_desde_atraso"`, `precision: "mes"`, `estimada: true` y `motivoEstimacion: "atraso_sin_dia_exacto"`. Los meses marcados como no verificables MUST quedar fuera con su motivo.
- **FR-016**: Una cuenta es cobranza o charge-off si el lector la marcó como cobranza, si su estado o su historial indican charge-off, o si tiene fecha o monto de charge-off.
- **FR-017**: Cuentas sin cobranza, charge-off ni atrasos MUST devolver `no_aplica`.
- **FR-018**: Cada resultado calculado MUST indicar `yaPaso` respecto a hoy: verdadero, falso o «incierto» si hoy cae dentro del rango de la estimación.
- **FR-019**: El resultado MUST describirse siempre como un cálculo informativo según la regla citada, nunca como la fecha en que la cuenta será o deberá ser eliminada.

**Utilización**

- **FR-020**: La utilización MUST calcularse solo sobre cuentas rotativas abiertas que no sean cobranza ni charge-off (spec 013 FR-023).
- **FR-021**: Por cuenta: porcentaje = saldo ÷ límite × 100, redondeado al entero (las mitades hacia arriba), calculado sin errores de redondeo intermedios. Total: suma de saldos ÷ suma de límites de las cuentas incluidas, con el mismo redondeo.
- **FR-022**: Las cuentas rotativas excluidas MUST listarse con su motivo: `sin_limite`, `limite_cero`, `sin_saldo`, `saldo_negativo`, `cerrada`, `cargada_a_perdida`, `cobranza`.
- **FR-023**: Si ninguna cuenta queda incluida, el total MUST ser «sin dato» (nulo), no 0 %.
- **FR-024**: Un saldo mayor que el límite MUST calcularse igual y marcarse `sobreLimite: true`.
- **FR-025**: Las cuentas de usuario autorizado MUST incluirse con su responsabilidad indicada.
- **FR-026**: El resultado MUST NOT incluir calificaciones ni cortes (spec 013 B-07).

**Posibles duplicados**

- **FR-027**: La herramienta MUST detectar tres tipos de par: `original_y_cobranza` (el acreedor original de una cobranza es igual al acreedor de otra cuenta que no es cobranza), `dos_cobranzas_mismo_original` y `mismo_acreedor_misma_apertura`.
- **FR-028**: Los nombres MUST compararse exactos después de normalizar mayúsculas, puntuación y espacios repetidos; no se usa comparación aproximada.
- **FR-029**: Para cada par MUST devolverse qué campos coinciden y cuáles difieren entre saldo, DOFD (al mes) y fecha de apertura, y si ambas cuentas tienen saldo mayor que cero.
- **FR-030**: Para pares `original_y_cobranza`, MUST indicarse si los comentarios, el estado o los códigos narrativos de la cuenta original contienen «sold», «transferred», «vendida» o «transferida», con el texto exacto y su origen; si no aparecen, `encontrada: false`.
- **FR-031**: Los pares MUST salir en orden estable por identificador; un par MUST NOT repetirse y una cuenta MUST NOT emparejarse consigo misma.
- **FR-032**: La herramienta MUST NOT afirmar que un par es un error, un doble cobro ni algo disputable; eso le corresponde a la capa de interpretación.

**Consultas duras**

- **FR-033**: La ventana MUST ir desde hoy menos el número de meses pedido (12 por omisión, sin incluir ese día) hasta hoy (incluido); si el día no existe en el mes de inicio, se usa el último día de ese mes.
- **FR-034**: Solo cuentan las consultas de tipo `dura`. Las de tipo desconocido suman a `desconocidas`; las blandas, promocionales y de revisión de cuenta se ignoran.
- **FR-035**: Una consulta con fecha de solo mes y año cuenta si el mes entero cae dentro de la ventana, no cuenta si cae entero fuera, y va a `inciertas` si cruza el borde; las inciertas no suman al total.
- **FR-036**: Las consultas sin fecha suman a `sinFecha`; las posteriores a hoy van a `futuras`; ninguna de las dos suma al total.
- **FR-037**: Las consultas MUST NOT agruparse por comparación de tasas.

**Pruebas de referencia**

- **FR-038**: El caso ACME/ZETA (cuatro cuentas, cinco consultas, hoy `2026-10-01`) MUST existir como dato de prueba en la forma del reporte normalizado y MUST producir exactamente los resultados de la tabla «Resultados de referencia».
- **FR-039**: Cada herramienta MUST tener además pruebas para cada caso límite listado en «Edge Cases» que le corresponda.
- **FR-040**: Esta fase MUST NOT modificar la página del analizador, el resumen del consumidor, las cartas ni el lector.

### Resultados de referencia (ACME/ZETA, hoy `2026-10-01`)

Datos:

| Cuenta | Datos |
|---|---|
| A · ACME BANK | rotativa, cerrada, estado «Charge Off», saldo $1,284, DOFD `2021-03`, apertura `2018-06`, comentario «Account sold to another lender» |
| B · ZETA COLLECTIONS | cobranza, saldo $1,284, acreedor original «ACME BANK», DOFD `2021-03` |
| C · NOVA CARD | rotativa, abierta, individual, saldo $890, límite $1,000, al día |
| D · SOL AUTO | auto, abierta, saldo $14,200, al día |
| Consultas | dura 2026-02-14; dura 2025-11-03; dura `2025-10`; dura 2025-08-20; blanda 2026-05-01 |

Resultados esperados:

| Herramienta | Resultado |
|---|---|
| Fecha de salida | A y B: `2028-09`, `precision: "mes"`, `estimada: true`, `reglaBase: "7_anos_mas_180_dias"`, `motivoEstimacion: "dofd_sin_dia_exacto"`, rango `2028-08` a `2028-09`, `yaPaso: false`. C y D: `no_aplica` |
| Utilización | C: 89 %, `sobreLimite: false`. Total: $890 / $1,000 = 89 %. Excluida: A (`cargada_a_perdida`) |
| Posibles duplicados | 1 par: `original_y_cobranza [A, B]`, coinciden `acreedor_original`, `saldo`, `dofd`; `ambosConSaldo: true`; `marcaVendida.encontrada: true`, texto «Account sold to another lender» |
| Consultas duras | ventana 2025-10-01 (excl.) a 2026-10-01; `total: 2`; `inciertas: 1` (`2025-10`); fuera: 2025-08-20; blanda ignorada |

### Key Entities *(include if feature involves data)*

- **Reporte normalizado** (spec 013): la entrada. Cuentas y consultas con cada dato en la forma «tiene valor / impreso vacío / no aparece» y con su origen.
- **Resultado de fecha de salida**: cuenta, regla base, estado (`calculado`, `no_calculable`, `no_aplica`), motivo, dato base con su origen, fecha calculada, precisión, si es estimada y por qué, rango, `yaPaso` y avisos.
- **Resultado de utilización**: lista por cuenta (saldo, límite, porcentaje, sobre límite, responsabilidad), total (o «sin dato») y lista de excluidas con motivo.
- **Posible duplicado**: tipo de par, las dos cuentas, campos que coinciden, campos que difieren con sus valores, si ambas tienen saldo y la marca de venta con su texto y origen.
- **Conteo de consultas duras**: ventana, total, consultas dentro, inciertas, futuras, cantidad sin fecha y cantidad de tipo desconocido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El caso ACME/ZETA produce exactamente los resultados de referencia en las cuatro herramientas (4 de 4).
- **SC-002**: Cada caso límite listado tiene al menos una prueba y todas pasan (100 %).
- **SC-003**: Ejecutar cada herramienta 100 veces seguidas con la misma entrada da 100 salidas idénticas.
- **SC-004**: Ninguna cobranza ni charge-off sin DOFD recibe una fecha de salida (0 casos), y toda fecha calculada desde un DOFD sin día exacto está marcada como estimación (100 %).
- **SC-005**: Ningún resultado de ninguna herramienta contiene frases para el consumidor, calificaciones ni las palabras prohibidas de FR-004 (0 apariciones en las pruebas).
- **SC-006**: Todo resultado por cuenta o consulta puede rastrearse hasta la página y la etiqueta del reporte de donde salió (100 %).
- **SC-007**: Las pruebas existentes del lector y del resumen siguen pasando sin cambios (0 regresiones), y la página del analizador no cambia.

## Assumptions

- El reporte normalizado del lector (spec 013) es la única entrada; sus campos (`dofd`, `saldo`, `limite`, `esCobranza`, `historial`, `comentarios`, etc.) no cambian en esta fase.
- La fecha de hoy la entregará quien llame a la herramienta (el agente o la capa de interpretación); en las pruebas es fija.
- La regla de 180 días + 7 años es la de FR-024a de la spec 013 y de la FCRA §605(c); la quiebra (10 años) queda para otra fase porque vive en los registros públicos, no en las cuentas.
- Los reportes llegan casi siempre en inglés, por eso la marca de venta busca palabras en inglés y en español.
- Los montos ya vienen en dólares como números; los centavos se respetan cuando el reporte los trae.
- La fecha calculada es informativa: los burós pueden retirar un dato antes, y esta fase no intenta predecir su comportamiento.
- Los nombres de las herramientas (`calcularFechaSalida`, `calcularUtilizacion`, `buscarPosiblesDuplicados`, `contarConsultasDuras`) son los acordados con el dueño y serán los mismos que use el agente.
