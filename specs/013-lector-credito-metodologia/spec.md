# Feature Specification: Lector de reportes de crédito con metodología universal

**Feature Branch**: `013-lector-credito-metodologia`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Especifica y organiza todo el trabajo según las fases. No tengo guía de Equifax, por lo tanto usa un modo genérico parecido a los demás, guiado por un reporte real de Equifax (Pedroc.md). Las consultas promocionales pueden durar uno o dos años. Arranca con la fase 0."

**Fuentes de la metodología** (fuera del proyecto, no se copian al repositorio):

- `THEMORA-MASTER-SPEC.md` §4–§11 (metodología de 8 capas, revisión de 12 pasos, charge-offs, fechas, consultas, comparación entre burós, formato de salida, motor de disputas, reglas de seguridad de la IA).
- `TRANSUNION_CR.md` y `EXPERIAN_CR.md` (cómo lee cada buró su propio reporte).
- Un reporte real de Equifax usado **solo como referencia de formato** (secciones, etiquetas de campo, códigos narrativos). Ningún dato personal de ese reporte entra al proyecto.
- `FLUJO DE TRABAJO DEL LECTOR DE CREDITO.md` (propuesta de motor por módulos: lector, reglas, verificador, soluciones, resumen).

**Enmienda 2026-09-30**: se incorporan de esa propuesta el banco de verificación (FR-022a), las reglas como datos (FR-022b, FR-022c), el cálculo del periodo de reporte (FR-024a), el resumen ampliado (FR-025 a FR-025c), el catálogo de acciones posibles (FR-055) y la lectura de reportes escaneados (Fase 6). Lo que se dejó fuera y por qué está en «Descartado de la propuesta».

## Organización por fases

Cada historia de usuario corresponde a una fase y se puede entregar sola. El orden sigue el MASTER-SPEC §44: primero leer y analizar, las cartas al final.

| Fase | Historia | Prioridad | Qué entrega |
|---|---|---|---|
| 0 | US0 | P1 | El lector actual deja de exagerar, ordenar o prometer |
| 1 | US1 | P1 | Lectura cuenta por cuenta de Equifax, Experian y TransUnion |
| 2 | US2 | P2 | Revisión con la metodología y explicación de cada asunto |
| 3 | US3 | P3 | Comparación del mismo reporte entre burós |
| 4 | US4 | P4 | Cada asunto enlazado a la norma que podría aplicar |
| 5 | US5 | P5 | Disputa por campo, seguimiento y verificación del resultado |
| 6 | US6 | P6 | Lectura de reportes escaneados (sin texto) dentro del navegador |

## User Scenarios & Testing *(mandatory)*

### User Story 0 - Resultados honestos en el lector actual (Priority: P1) — Fase 0

Una persona sube su reporte hoy y el lector le muestra una prioridad «Crítica» por tener dos direcciones, le dice «No pagues todavía» ante una cobranza y cuenta como negativo que haya comparado tasas de auto en varias financieras. Tras esta fase, el mismo reporte produce avisos proporcionados: las variaciones de identidad se presentan como algo a verificar, la cobranza se explica sin órdenes y las consultas agrupadas no se castigan.

**Why this priority**: es lo que la gente ve hoy. Un aviso exagerado o una orden disfrazada choca con el Principio I de la constitución y puede empujar a alguien a una decisión de dinero equivocada. Es pequeño y no depende de nada más.

**Independent Test**: subir un reporte con dos direcciones, una cobranza y varias consultas duras de auto en la misma semana, y comprobar que ningún texto dice «Crítica» por identidad, «No pagues» ni cuenta las consultas agrupadas como negativas.

**Acceptance Scenarios**:

1. **Given** un reporte con dos o más nombres, teléfonos o direcciones, **When** se evalúa, **Then** el hallazgo aparece como «Para verificar», explica que las variaciones suelen ser normales (inicial del segundo nombre, errores de tipeo, dirección de un familiar) y ofrece marcar solo lo que la persona no reconozca.
2. **Given** un reporte con una cuenta en cobranza, **When** se muestra la acción sugerida, **Then** el texto describe el derecho a pedir validación y su plazo sin usar órdenes («No pagues», «debes»).
3. **Given** un reporte con cinco o más consultas duras del mismo tipo de crédito dentro de un periodo corto, **When** se evalúa, **Then** no se marca como punto negativo y se explica que los modelos de puntaje pueden agruparlas.
4. **Given** el archivo sin uso del analizador viejo, **When** se revisa el proyecto, **Then** ya no existe y ninguna página lo carga.

---

### User Story 1 - Ver mi reporte cuenta por cuenta (Priority: P1) — Fase 1

La persona sube su reporte de Equifax, Experian o TransUnion y ve una tabla con cada cuenta: acreedor, tipo, responsabilidad, estado, saldo, límite o monto original, fecha de apertura, fecha de primera morosidad (DOFD), último pago, fecha reportada y el historial de pagos mes a mes. Cada dato indica de qué página y sección salió.

**Why this priority**: sin datos por cuenta no hay metodología posible (MASTER-SPEC §5, capa 1 «Leer»). Por sí sola ya le da a la persona algo que hoy no tiene: su reporte ordenado.

**Independent Test**: con un reporte sintético de cada buró, el número de cuentas, cobranzas y consultas extraídas coincide con el documento, y cada campo muestra su página de origen.

**Acceptance Scenarios**:

1. **Given** un reporte de Equifax, **When** se lee, **Then** se reconocen sus secciones (Resumen, Información personal, Avisos del archivo, Cuentas de crédito, Consultas) y los campos de cada cuenta, incluidos los códigos narrativos con su descripción.
2. **Given** una cuenta de Equifax con el código narrativo que indica que «High Credit» es el límite, **When** se lee, **Then** ese valor se trata como límite de crédito y no como saldo más alto.
3. **Given** una cuenta de Experian con «Credit Limit / Original Balance», **When** se lee, **Then** se interpreta como límite en cuentas rotativas y como monto original en préstamos a plazos.
4. **Given** un reporte de TransUnion enviado por correo, **When** se buscan cobranzas, **Then** se encuentran tanto en su sección propia como dentro de «Accounts with Adverse Information».
5. **Given** un campo cuya etiqueta aparece impresa pero vacía, **When** se lee, **Then** el campo queda como «no reportado», nunca como cero ni como problema.
6. **Given** un historial de pagos cuyo mes no se puede ubicar con certeza, **When** se lee, **Then** el atraso se conserva con el año y la marca «mes no verificable», sin inventar el mes.
7. **Given** un reporte de un buró que no se puede identificar, **When** se lee, **Then** se usa la lectura genérica y se avisa que el formato no está verificado.

---

### User Story 2 - Entender qué revisar y por qué (Priority: P2) — Fase 2

Sobre la tabla de la fase 1, el lector aplica la revisión de 12 pasos y presenta cada posible asunto con el formato de ocho partes: qué encontramos, qué dice el reporte, por qué podría necesitar revisión, qué lo confirmaría, regla o fuente relevante, qué puedes hacer, qué guardar y qué revisar después de la respuesta.

**Why this priority**: convierte datos en comprensión, que es la promesa del MASTER-SPEC §52. Depende de la fase 1.

**Independent Test**: con los reportes sintéticos que contienen casos conocidos (cuenta duplicada, atraso con pago documentado antes, charge-off con DOFD, saldo que sube tras charge-off, consulta no reconocida), cada caso produce exactamente un asunto de la categoría esperada y ninguno lleva etiquetas de «ilegal», «fraude», «debe borrarse» o «violación».

**Acceptance Scenarios**:

1. **Given** dos cuentas del mismo acreedor abiertas la misma fecha, **When** se revisan, **Then** aparece un asunto «Posible duplicado» que explica que también puede ser una tarjeta reemplazada y pide el estado de cuenta que lo confirme.
2. **Given** una cuenta en charge-off, **When** se revisa, **Then** se muestran por separado DOFD, fecha de charge-off, último pago, última actualización y fecha reportada, sin usar la regla de «7 años desde la última actividad».
3. **Given** un saldo de charge-off que aumentó, **When** se revisa, **Then** se presenta como «Requiere documentación» y se listan las causas posibles (intereses, cargos, pagos, venta de la deuda) en vez de declararlo error.
4. **Given** una cuenta con estado «al día» y atrasos anteriores en su historial, **When** se revisa, **Then** no se reporta contradicción: se explica que un atraso pasado y un estado actual al día pueden coexistir.
5. **Given** consultas blandas o promocionales, **When** se muestran, **Then** se indica que no afectan el puntaje y que pueden permanecer de uno a dos años según el buró.
6. **Given** un dato que no se puede determinar, **When** se muestra, **Then** aparece «No se puede verificar con la información disponible», con qué falta, por qué importa y qué documento lo resolvería.
7. **Given** un asunto candidato cuya sección se leyó con poca confianza, **When** pasa por el banco de verificación, **Then** se muestra como «Probable» con el aviso «verifica este dato en tu reporte», nunca como confirmado.
8. **Given** una cobranza con DOFD de marzo de 2019, **When** se calcula su periodo de reporte, **Then** la fecha estimada de salida es septiembre de 2026 (DOFD + 180 días + 7 años), no siete años desde la fecha en que se reportó ni desde la última actividad.
9. **Given** una cobranza sin DOFD impresa, **When** se calcula su periodo de reporte, **Then** el lector dice «no se puede calcular con la información disponible» y qué documento lo resolvería.
10. **Given** un atraso ya pagado sin ninguna acción disponible, **When** se muestra, **Then** el texto lo dice con franqueza e indica la fecha estimada en que dejará de reportarse.
11. **Given** cualquier reporte, **When** se muestra el resumen, **Then** no aparece ninguna calificación global de la salud del crédito («buena», «en riesgo», «crítica»).

---

### User Story 3 - Comparar mis tres reportes (Priority: P3) — Fase 3

La persona sube dos o tres reportes de burós distintos y ve, para cada cuenta que aparece en más de uno, una tabla campo por campo: estado, saldo, límite, vencido, fechas, DOFD, historial y observaciones, marcando las diferencias.

**Why this priority**: es la capa 3 «Comparar» y un pedido explícito del MASTER-SPEC §12, pero requiere las fases 1 y 2.

**Independent Test**: con tres reportes sintéticos que comparten dos cuentas con diferencias conocidas (saldo y DOFD), la tabla empareja las cuentas correctas y muestra solo esas diferencias.

**Acceptance Scenarios**:

1. **Given** la misma cuenta con saldos distintos en dos burós, **When** se comparan, **Then** la diferencia se muestra con ambos valores, sus fechas de reporte y una nota de que la diferencia puede deberse a fechas de actualización distintas.
2. **Given** una cuenta que aparece en un solo buró, **When** se comparan, **Then** se informa sin marcarla como error (los acreedores no están obligados a reportar a los tres).
3. **Given** dos cuentas que no se pueden emparejar con seguridad, **When** se comparan, **Then** se muestran por separado con la marca «no se pudo confirmar que sean la misma cuenta».

---

### User Story 4 - Saber qué norma podría aplicar (Priority: P4) — Fase 4

Cada asunto que lo amerite muestra la norma que podría aplicar (FCRA, Regulación V, FDCPA, Regulación F), citada por sección, explicada en lenguaje simple y enlazada a la misma ficha que usa Zyron.

**Why this priority**: es la capa 5 «Revisión legal». Tiene valor, pero exige cargar primero Regulación V y Regulación F con sus pruebas (Principio IV).

**Independent Test**: cada asunto con referencia legal apunta a una ficha existente de la biblioteca de leyes. Las normas que aún no estén cargadas aparecen como «no cargada», nunca con texto inventado.

**Acceptance Scenarios**:

1. **Given** un asunto de fechas de reporte de un charge-off, **When** se abre su regla, **Then** se cita la sección del FCRA sobre periodos de reporte con la fecha de verificación de la fuente.
2. **Given** una norma que el proyecto no tiene cargada, **When** un asunto la necesitaría, **Then** se dice con franqueza que no está cargada y no se improvisa su contenido.
3. **Given** cualquier explicación legal, **When** se muestra, **Then** separa el texto de la norma de la explicación y no afirma que algo «es ilegal» ni que la persona «debe» actuar.

---

### User Story 5 - Disputar un dato concreto y verificar el resultado (Priority: P5) — Fase 5

Desde un asunto, la persona prepara una disputa de un solo campo (cuenta, campo, valor reportado, valor correcto, motivo, evidencia). Si tiene sesión, la guarda con fecha de envío y fecha estimada de respuesta. Cuando llega el reporte nuevo, lo sube y el lector compara el campo disputado y los relacionados con el reporte anterior.

**Why this priority**: son las capas 6 a 8 (acción, verificar resultado, escalar). Es el paso final y depende de todo lo anterior.

**Independent Test**: con un reporte «antes» y uno «después» sintéticos, la disputa guardada muestra si el campo cambió, se borró o siguió igual, y qué otros burós conviene revisar.

**Acceptance Scenarios**:

1. **Given** un asunto de fecha, **When** se prepara la carta, **Then** la carta nombra la cuenta enmascarada, el campo, el valor reportado, el valor que la persona considera correcto y la evidencia adjunta; nunca pide «investigar todo».
2. **Given** una disputa guardada, **When** pasan los días, **Then** la cuenta de la persona muestra el plazo general de respuesta como referencia, sin prometer un resultado.
3. **Given** un reporte nuevo tras la respuesta, **When** se compara, **Then** el lector indica para el campo disputado «corregido», «eliminado», «sin cambio» o «no se puede verificar», y sugiere qué guardar.
4. **Given** un asunto que la persona marcó como cuenta no reconocida, **When** se muestran las acciones posibles, **Then** aparecen la disputa con el buró y la alerta de fraude o el bloqueo, sin decir que se trata de un fraude.

---

### User Story 6 - Leer un reporte escaneado (Priority: P6) — Fase 6

La persona tiene su reporte solo como fotos o como un PDF escaneado sin texto. El lector le avisa que puede leerlo dentro de su navegador con reconocimiento de texto, le dice cuánto hay que descargar para hacerlo y, si acepta, lee el documento sin enviarlo a ningún lado. Todo lo que salga de esa lectura se presenta con menos confianza.

**Why this priority**: amplía quién puede usar el lector, pero agrega una descarga pesada y un origen nuevo a la política de seguridad del sitio. Va al final porque las fases 1 a 5 funcionan con los PDF con texto que entregan los burós.

**Independent Test**: con un reporte sintético convertido a imagen, el lector reconoce las cuentas del fixture y todos los asuntos que produce aparecen como «Probable».

**Acceptance Scenarios**:

1. **Given** un PDF sin capa de texto, **When** se sube, **Then** el lector dice que es una imagen, ofrece leerlo con reconocimiento de texto e indica el tamaño aproximado de la descarga antes de empezar.
2. **Given** que la persona no acepta la descarga, **When** el lector se detiene, **Then** explica cómo pedir al buró el reporte en PDF con texto y no muestra un reporte «limpio».
3. **Given** un reporte leído con reconocimiento de texto, **When** se muestran los asuntos, **Then** ninguno aparece como «Confirmado».

---

### Edge Cases

- El PDF es una imagen escaneada sin texto: el lector lo dice y no produce hallazgos vacíos como si el reporte estuviera limpio. Hasta la Fase 6 se detiene ahí; desde la Fase 6 ofrece leerlo con reconocimiento de texto (US6).
- El reporte mezcla texto explicativo del buró («Summary of Your Rights», leyendas de códigos) con datos: ese texto nunca genera hallazgos.
- Una cuenta aparece cerrada por el acreedor con saldo cero y un charge-off pagado: se muestra como cerrada y pagada; el charge-off sigue siendo un dato reportable, no un error por sí mismo.
- Una misma empresa aparece como consulta dura y blanda en las mismas fechas: se muestra tal cual y se sugiere verificar, sin concluir.
- El reporte está en español: las etiquetas en español se reconocen igual que las inglesas.
- Hay más de 150 páginas: se avisa cuántas se leyeron.
- El reporte trae un número de cuenta completo: el lector lo muestra enmascarado.

## Requirements *(mandatory)*

### Functional Requirements

**Fase 0 — honestidad del lector actual**

- **FR-001**: Las variaciones de nombre, teléfono o dirección MUST mostrarse como asunto «Para verificar» y MUST NOT llevar prioridad «Crítica» ni «Alta» solo por su número.
- **FR-002**: Ningún texto del lector MUST contener órdenes a la persona («No pagues», «debes», «tienes que») ni garantías de borrado, puntaje o aprobación.
- **FR-003**: La acción sugerida para cobranzas MUST describir el derecho a pedir validación e indicar que ese derecho tiene plazo desde el aviso de validación del cobrador.
- **FR-004**: Varias consultas duras MUST NOT marcarse como punto negativo solo por su número; el texto MUST mencionar que las consultas del mismo tipo en poco tiempo pueden contarse como una.
- **FR-005**: El analizador sin uso (el archivo que ninguna página carga) MUST eliminarse.
- **FR-006**: Las pruebas automáticas MUST verificar FR-001 a FR-005 sobre el código de la página.

**Fase 1 — lectura (capa 1)**

- **FR-010**: El lector MUST producir, para cada reporte, un registro con: buró, fecha del reporte, información personal, cuentas, cobranzas, consultas duras, consultas blandas, registros públicos y avisos del archivo (alertas de fraude, congelamientos, declaraciones del consumidor).
- **FR-011**: Cada cuenta MUST incluir, cuando el reporte los muestre: acreedor, acreedor original, número enmascarado, tipo, responsabilidad, fechas (apertura, cierre, DOFD, último pago, última actividad, reportada, charge-off, envío a cobranza), estado, estado de pago, saldo, límite, saldo más alto o monto original, vencido, pago programado, pago real, historial mes a mes, códigos narrativos y comentarios.
- **FR-012**: Cada dato extraído MUST guardar su origen: página, sección y etiqueta del reporte.
- **FR-013**: Un campo impreso sin valor MUST quedar como «no reportado», distinto de cero.
- **FR-014**: El lector MUST aplicar un perfil de lectura por buró (Equifax, Experian, TransUnion) y un perfil genérico, todos con la misma forma de resultado. El perfil de Equifax MUST construirse a partir del formato observado en el reporte real de referencia: secciones, etiquetas de campo, tabla de códigos narrativos, leyenda del historial de pagos, tabla de 24 meses y consultas duras y blandas en una sola tabla con varias fechas por empresa.
- **FR-015**: Cada perfil MUST registrar su fuente y su fecha de verificación.
- **FR-016**: Los códigos del historial de pagos de cada buró (por ejemplo OK, 30–180, CO, C, R, V/VS, F, FS, B/BK, TN, ND, PBC) MUST traducirse a un vocabulario común.
- **FR-017**: Los números de cuenta MUST mostrarse enmascarados; el número de Seguro Social y la fecha de nacimiento MUST NOT guardarse ni enviarse a ningún servicio.
- **FR-018**: La lectura MUST ocurrir en el navegador; el documento MUST NOT enviarse a ningún servidor en esta fase.

**Fase 2 — revisión y explicación (capas 2 y 4)**

- **FR-020**: El lector MUST aplicar los 12 pasos del MASTER-SPEC §6 y producir asuntos con una sola de estas categorías: FACTUAL_ERROR, INCONSISTENCY, DUPLICATE, UNRECOGNIZED, MISSING_INFORMATION, DATE_ISSUE, BALANCE_ISSUE, STATUS_ISSUE, IDENTITY_ISSUE, REQUIRES_DOCUMENTATION, REQUIRES_LEGAL_REVIEW.
- **FR-021**: Las etiquetas ILLEGAL, FRAUD, MUST_BE_DELETED y VIOLATION MUST NOT usarse.
- **FR-022**: Cada asunto MUST mostrarse con las ocho partes del MASTER-SPEC §29 y MUST indicar la cuenta, el campo y el valor reportado que lo originan.
- **FR-022a**: Todo asunto candidato MUST pasar un banco de verificación antes de mostrarse: (1) evidencia: tiene un origen (FR-012) con el texto del reporte que lo respalda; (2) coherencia: no lo contradicen otros datos de la misma cuenta; (3) vigencia: la norma o política que se cita aplica en la fecha del reporte (un dato negativo que ya pasó su fecha de salida no se descarta: se convierte en asunto DATE_ISSUE según FR-024a); (4) duplicado: si otra regla ya produjo el mismo asunto sobre el mismo campo, se fusionan; (5) confianza: la sección se leyó con confianza alta. El resultado MUST ser uno de tres: **Confirmado** (se muestra), **Probable** (se muestra con el aviso «verifica este dato en tu reporte») o **Descartado** (no se muestra; queda solo en memoria para las pruebas y nunca se envía a ningún servicio).
- **FR-022b**: Las reglas de revisión MUST vivir como datos, separadas del motor, igual que los perfiles de buró. Cada regla MUST tener: identificador, familia (`comportamiento` o `calidad_de_datos`), condición, categoría de FR-020, ficha legal (o «no cargada», FR-042), acciones posibles de FR-055, fuente y fecha de verificación.
- **FR-022c**: Los resultados MUST presentar primero «Posibles errores del reporte» (familia `calidad_de_datos`) y después «Lo que pesa en tu historial» (familia `comportamiento`), porque piden acciones distintas: los primeros se pueden disputar; los segundos se explican.
- **FR-023**: La lógica de saldos y utilización MUST distinguir cuentas rotativas, a plazos, hipotecas, auto, estudiantiles, cobranzas y charge-offs; la utilización solo MUST calcularse sobre cuentas rotativas.
- **FR-024**: Las fechas MUST tratarse por separado (DOFD, último pago, última actividad, reportada, charge-off, envío a cobranza) y el lector MUST NOT usar «última actividad» como inicio del periodo de reporte.
- **FR-024a**: La fecha estimada de salida de un dato negativo MUST calcularse así: cobranzas y charge-offs, 7 años desde la DOFD más 180 días (FCRA §605(a)(4) y §605(c)); un atraso en una cuenta que no pasó a cobranza ni a charge-off, 7 años desde el mes de ese atraso (§605(a)(5)); quiebras, 10 años desde la fecha de la orden (§605(a)(1)). La salida de una quiebra de Capítulo 13 a los 7 años y la permanencia de las consultas duras por 2 años MUST presentarse como política del buró (FR-028), no como ley. Si falta la DOFD, el lector MUST decir «no se puede calcular con la información disponible» y MUST NOT usar la fecha reportada ni la última actividad en su lugar.
- **FR-025**: El resultado MUST incluir un resumen ejecutivo: cuentas, negativas, cobranzas, charge-offs, atrasos, consultas, asuntos de identidad y (si aplica) discrepancias entre burós. Además: deuda total, límite total y utilización global de las cuentas rotativas (FR-023), porcentaje de meses pagados a tiempo, antigüedad de la cuenta más antigua y consultas duras de los últimos 12 meses. El resumen MUST NOT incluir una calificación global de la salud del crédito ni una frase de veredicto.
- **FR-025a**: Cuando un asunto no tiene ninguna acción disponible, el lector MUST decirlo con franqueza («no hay una acción que lo corrija; su peso baja con el tiempo») e indicar la fecha estimada de salida si se puede calcular (FR-024a).
- **FR-025b**: Una cuenta, consulta o dato personal MUST tratarse como no reconocido (UNRECOGNIZED) solo cuando la persona lo marque así; el lector MUST NOT suponer que algo no pertenece a la persona.
- **FR-025c**: Mientras trabaja, el lector MUST mostrar en qué fase está: «Leyendo el documento», «Ordenando tus cuentas», «Revisando cada cuenta» y «Preparando el resumen». Ningún mensaje MUST sugerir una revisión legal antes de que exista la Fase 4.
- **FR-026**: El lector MUST incluir una lista de evidencias sugeridas por asunto (estados de cuenta, comprobantes de pago, cartas, acuerdos, reporte policial, etc.).
- **FR-027**: Consultas blandas y promocionales MUST presentarse como sin efecto en el puntaje y con permanencia de uno a dos años según el buró; el lector MUST NOT fijar una fecha de salida que el reporte no indique.
- **FR-028**: Las políticas voluntarias de los burós (por ejemplo, sobre deudas médicas) MUST presentarse como política del buró con su fecha de fuente, nunca como ley.
- **FR-029**: Todo texto visible MUST existir en español y en inglés.

**Fase 3 — comparación (capa 3)**

- **FR-030**: La persona MUST poder subir hasta tres reportes en una misma sesión.
- **FR-031**: El lector MUST emparejar cuentas entre burós por acreedor, últimos dígitos, fecha de apertura y tipo, e indicar su nivel de confianza en el emparejamiento.
- **FR-032**: La comparación MUST mostrar, por campo: valor en cada buró, diferencia, evidencia sugerida y acción posible (MASTER-SPEC §12).
- **FR-033**: Una cuenta presente en un solo buró MUST NOT marcarse como error por esa sola razón.

**Fase 4 — revisión legal (capa 5)**

- **FR-040**: Cada asunto con base legal MUST enlazar a una ficha de la biblioteca de leyes del proyecto; las cifras MUST coincidir con las de esa ficha.
- **FR-041**: Antes de enlazarlas, la biblioteca MUST incorporar Regulación V (secciones 1022.40–1022.43) y Regulación F (1006.18, 1006.26, 1006.30, 1006.34, 1006.38) con fecha de verificación.
- **FR-042**: Una norma no cargada MUST mostrarse como no cargada.
- **FR-043**: Las explicaciones legales MUST seguir la secuencia hecho → evidencia → regla → aplicación → incertidumbre → acción posible.

**Fase 5 — acción, seguimiento y verificación (capas 6–8)**

- **FR-050**: Las cartas MUST generarse por asunto con: destinatario, cuenta enmascarada, campo, valor reportado, valor correcto, motivo y evidencia; MUST NOT generarse disputas masivas genéricas.
- **FR-051**: Con sesión iniciada, la persona MUST poder guardar la disputa con fecha de preparación, fecha de envío, número de rastreo y fecha de respuesta.
- **FR-052**: El lector MUST comparar un reporte nuevo con el anterior e informar, por campo disputado, «corregido», «eliminado», «sin cambio» o «no se puede verificar».
- **FR-053**: Solo se guarda en la cuenta lo que la persona elige guardar, con números de cuenta enmascarados y sin SSN ni fecha de nacimiento.
- **FR-054**: La dirección de disputa por correo de cada buró MUST tomarse de una sola fuente verificada. Equifax: «P.O. Box 740241, Atlanta, GA 30374», la que indica el reporte real de referencia para disputas por correo (decisión del dueño, 2026-09-30; reemplaza a «P.O. Box 740256», que usaban las cartas).
- **FR-055**: Las acciones posibles de un asunto MUST salir de este catálogo cerrado: disputa con el buró (FCRA §611); pedir validación al cobrador (FDCPA §809, 15 U.S.C. §1692g); declaración del consumidor de hasta 100 palabras (FCRA §611(b)); alerta de fraude o bloqueo de datos por robo de identidad (FCRA §605A y §605B), solo si la persona marcó algo como no reconocido (FR-025b); esperar a que el dato deje de reportarse, con su fecha (FR-024a); bajar la utilización de las cuentas rotativas, solo como información. Un asunto puede no tener ninguna (FR-025a).
- **FR-056**: Ninguna acción MUST mostrarse con probabilidad de éxito, plazo de resultado ni efecto en el puntaje. Pagar a cambio de borrado («pay for delete») y negociar con el acreedor MUST NOT sugerirse, porque dependen solo del acreedor y el lector no puede prometer nada sobre ellas.

**Fase 6 — reportes escaneados**

- **FR-060**: Cuando un PDF no tiene capa de texto, el lector MUST ofrecer leerlo con reconocimiento de texto dentro del navegador, en inglés y en español, e indicar el tamaño aproximado de la descarga antes de empezar. La lectura MUST empezar solo si la persona acepta.
- **FR-061**: El documento y sus imágenes MUST NOT enviarse a ningún servicio; el reconocimiento de texto MUST correr en el navegador.
- **FR-062**: Todo asunto que salga de una lectura con reconocimiento de texto MUST quedar como máximo en «Probable» (FR-022a).
- **FR-063**: La política de seguridad del sitio (CSP de `netlify.toml`, hoy común a todas las páginas) MUST ampliarse solo con lo mínimo que exija el motor de reconocimiento (descarga de sus idiomas, ejecución de sus workers y de WebAssembly). El plan de la Fase 6 MUST justificar cada origen o directiva añadida y evaluar si se puede limitar a la ruta del lector.

### Key Entities *(include if feature involves data)*

- **Reporte**: un documento de un buró en una fecha; contiene información personal, cuentas, cobranzas, consultas, registros públicos, avisos del archivo y el perfil de lectura usado.
- **Cuenta**: una línea de crédito tal como la reporta un buró; lleva sus datos, sus fechas, su historial mes a mes, sus códigos narrativos y el origen de cada dato.
- **Origen del dato**: página, sección y etiqueta del reporte de donde salió un valor.
- **Perfil de buró**: cómo se leen las secciones, etiquetas y códigos de un buró, con su fuente y su fecha de verificación.
- **Asunto**: algo que podría necesitar revisión; tiene categoría, cuenta, campo, valor reportado, valor esperado (si se conoce), fundamento, evidencias sugeridas, referencias legales y estado.
- **Evidencia**: un documento que la persona tiene o podría conseguir para confirmar o descartar un asunto.
- **Comparación**: el emparejamiento de una misma cuenta entre burós, con las diferencias por campo y su nivel de confianza.
- **Disputa**: la acción sobre uno o más asuntos de una cuenta; tiene destinatario, fechas, rastreo, respuesta, resultado y siguiente paso.
- **Regla**: una revisión escrita como datos; tiene identificador, familia (comportamiento o calidad de datos), condición, categoría, ficha legal, acciones posibles, fuente y fecha de verificación.
- **Verificación**: el resultado del banco de pruebas sobre un asunto candidato: qué pruebas pasó y si queda Confirmado, Probable o Descartado.
- **Acción posible**: una entrada del catálogo de FR-055, con su norma y sus pasos, sin probabilidad de éxito.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tras la fase 0, ninguna evaluación del lector muestra órdenes, garantías ni prioridad «Crítica» por variaciones de identidad (0 casos en las pruebas).
- **SC-002**: En los reportes de prueba de los tres burós, el lector extrae el 100 % de las cuentas y consultas, y al menos el 95 % de los campos presentes, con el origen de cada uno.
- **SC-003**: Ningún campo impreso vacío ni texto explicativo del buró genera un asunto (0 falsos positivos por leyendas o etiquetas en las pruebas).
- **SC-004**: Cada caso sembrado en los reportes de prueba (duplicado, fecha, saldo, estado, identidad, consulta no reconocida, charge-off, cobranza, discrepancia entre burós) produce el asunto esperado y ninguno más.
- **SC-005**: Una persona que prueba el lector puede decir qué cuenta y qué campo originan un asunto y qué documento lo confirmaría, en menos de 2 minutos por asunto.
- **SC-006**: La lectura de un reporte de 15 páginas termina en menos de 10 segundos en un teléfono de gama media.
- **SC-007**: El 100 % de las referencias legales mostradas apuntan a una ficha existente con fecha de verificación.
- **SC-008**: Ningún asunto mostrado carece de origen en el reporte (0 casos en las pruebas), y el 100 % de los asuntos «Probable» llevan el aviso de verificar el dato.
- **SC-009**: En las pruebas, toda fecha estimada de salida coincide con el cálculo de FR-024a, y ninguna cobranza ni charge-off tiene fecha calculada sin DOFD.
- **SC-010**: Con el reporte sintético escaneado de la Fase 6, el lector reconoce todas las cuentas del fixture y ningún asunto aparece como «Confirmado».

## Assumptions

- No existe guía oficial de Equifax; su perfil se deriva del formato de un reporte real, verificado en una sola versión del formato (mayo 2026). Otros formatos de Equifax se leerán con el perfil genérico hasta tener más muestras.
- El reporte real de Equifax se usa solo como referencia de estructura. Las pruebas usan reportes **sintéticos** con nombres, direcciones y números inventados; ningún dato personal de ese reporte se copia al proyecto.
- Las consultas promocionales y de revisión de cuenta pueden permanecer de uno a dos años según el buró (confirmado por la persona dueña del proyecto); el lector no fija una fecha de salida.
- Se mantiene `credito.html` como página del lector; no se crean las rutas `/credit/...` del MASTER-SPEC.
- Las fases 1 a 3 funcionan sin sesión y sin IA (Principio III). Solo la fase 5 guarda datos, y únicamente con sesión y por decisión de la persona (Principio II).
- Las cartas bilingües existentes (español para entender, inglés para enviar) se reutilizan en la fase 5.
- El plazo general de respuesta de los burós (30 días) se muestra como referencia educativa, no como promesa.
- Portugués y criollo haitiano no son requeridos para el lector en esta especificación; sí para las fichas legales nuevas de la fase 4, según el Principio V.
- El lector se presenta como herramienta educativa, no como servicio de reparación de crédito. Sus textos no usan «dictamen», «especialista certificado» ni promesas de mejora. Si Themora llega a cobrar por ayudar a mejorar el crédito (por ejemplo, en una membresía), antes debe revisarse con un abogado si le aplica la Credit Repair Organizations Act (15 U.S.C. §1679 y siguientes).

## Descartado de la propuesta

Partes de `FLUJO DE TRABAJO DEL LECTOR DE CREDITO.md` que no entran en esta especificación, y por qué:

| Propuesta | Decisión | Razón |
|---|---|---|
| B-08: muchas consultas duras en 12 meses como punto negativo | Descartada | Contradice FR-004: los modelos de puntaje pueden agrupar las consultas del mismo tipo en poco tiempo. |
| B-07: utilización mayor de 30 % | Cambiada | No hay un corte en 30 %; la utilización se muestra como dato (FR-025), solo sobre cuentas rotativas (FR-023). |
| E-01: cuenta que la persona no reconoce, detectada por el sistema | Cambiada | Solo la persona puede decirlo (FR-025b). |
| E-05: saldo mayor que el límite como posible error | Cambiada | Puede ser real. Lo revisable es una deuda vendida que sigue con saldo en la cuenta original y en la cobranza (FR-020, DUPLICATE o BALANCE_ISSUE). |
| E-06: límite legal contado desde que se reporta el dato | Corregida | Se cuenta desde la DOFD + 180 días (FR-024a). |
| «§605: 2 años para consultas duras» | Corregida | Es política de los burós, no ley (FR-024a, FR-028). |
| B-04: embargos, gravámenes y juicios | Sin regla propia | Los burós dejaron de incluir juicios civiles y gravámenes fiscales en 2017–2018; si aparecen, se leen como registro público (FR-010). |
| Veredicto de salud («buena», «regular», «en riesgo», «crítica») y frase de especialista | Descartado | Es un juicio que el lector no debe emitir (FR-001, FR-002, FR-025). |
| Probabilidad de éxito en cada solución | Descartada | No se puede verificar (FR-056). |
| PAY_FOR_DELETE, ACUERDO_PAGO, PLAN_PAGOS, REHABILITACION_CREDITO, «Negociar cobranzas» en el plan | Descartadas | Dependen del acreedor o son consejo financiero (FR-056). |
| Plan de acción con prioridades fijas | Cambiado | El orden sale de FR-022c (primero lo que se puede disputar) y no incluye consejos. |
| `ssn_mascarado` en el registro | Descartado | El registro solo guarda si el reporte mostraba el SSN, nunca el número (FR-017). |
| Nombre «dictamen» y «especialista certificado» | Descartado | Ver el supuesto sobre la herramienta educativa. |
