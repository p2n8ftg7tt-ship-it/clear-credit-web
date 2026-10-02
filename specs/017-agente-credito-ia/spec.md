# Feature Specification: Agente de crédito con IA (Fase 2: el agente piensa)

**Feature Branch**: `017-agente-credito-ia`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Fase 2 del agente de crédito (spec 017): agente de IA que analiza el reporte con las 4 herramientas de la spec 016. Diseño aprobado por el dueño: Sonnet 5.5; 3 análisis por día por cuenta con sesión; un análisis completo de una vez (sin conversación; preguntas como lista); todo gratis (sin cobro, fuera de CROA); enfoque 1: el navegador dirige el ciclo, una vuelta de Claude por llamada a Netlify (límite 10 s), máx. 6 vueltas, pase firmado por análisis (solo la primera vuelta cuenta uso), «hoy» lo fija el servidor; etiquetador en el navegador sin datos personales y segunda barrera en el servidor; manual y herramientas viven en el servidor; salida JSON (diagnostico, plan ≤3 con hechos separados de interpretacion, despues, preguntasParaTi, verificar, datosPersonales); validación de formato, palabras prohibidas (1 corrección), cuentas existentes, números de herramientas/reporte; análisis local como respaldo en cada falla; pruebas con Claude simulado; prueba real solo con aprobación; tabla credito_agente_uso y variable AGENTE_CREDITO_SECRETO; fuera: cartas, credito.html, cobros, conversación, otros idiomas."

**Fuentes**:

- Conversación del 2026-10-02 con el dueño (diseño aprobado en dos partes; decisiones abajo).
- `specs/016-herramientas-agente-credito` (las cuatro herramientas de cálculo, ya entregadas en el commit `6740f06`).
- `specs/013-lector-credito-metodologia` (el reporte normalizado; FR-024a, FR-025b, FR-027, FR-028 y B-07).
- `Downloads/manual-agente-v2.md` (manual del agente). Esta fase lo corrige y lo incorpora al proyecto.
- Constitución, Principios I a V y «Restricciones técnicas».

**Decisiones del dueño (2026-10-02)**:

1. Modelo de IA: **Claude Sonnet 5.5**.
2. Límite: **3 análisis con IA por día por cuenta**, solo con sesión iniciada.
3. **Un análisis completo de una vez.** No hay conversación; lo que el agente necesita preguntar sale como una lista de «Preguntas para ti».
4. **Todo es gratis en esta fase.** No se cobra nada; el tema de cobrar queda fuera, a la espera de una consulta legal (CROA).
5. **El navegador dirige el ciclo**: cada llamada al servidor es una sola vuelta de la IA, para no superar el límite de tiempo del servidor y para poder mostrar los pasos en vivo (Fase 4).
6. Fuera de esta fase: cartas, cambios en la página del analizador, cobros, conversación de seguimiento y otros idiomas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recibir un análisis claro de mi reporte, hecho por el agente (Priority: P1)

Un consumidor con sesión iniciada sube su reporte. Su dispositivo lo lee y prepara una versión **sin datos personales**: los nombres, direcciones y teléfonos se cambian por etiquetas («Nombre 1», «Dirección 2») con lo que las distingue, y las cuentas reciben letras (A, B, C). El agente revisa esa versión, usa las herramientas de cálculo cuando necesita un número exacto y entrega un análisis: un diagnóstico, hasta 3 pasos de plan, lo que queda para después, preguntas para el consumidor, lo que debe verificar en su reporte original y los datos personales que conviene revisar. En cada paso del plan se separa lo que dice el reporte (hechos) de lo que concluye el agente (interpretación).

**Why this priority**: es la razón de ser del agente: pasar de reglas fijas a un análisis que razona sobre cada reporte, con números exactos y sin inventar.

**Independent Test**: con el caso ACME/ZETA y una IA simulada con respuestas guionizadas, el ciclo completo termina con un análisis que cumple el formato, menciona solo las cuentas A–D, usa `2028-09` como estimación para ACME y ZETA, el 89 % de NOVA y el par ACME–ZETA, y no contiene palabras prohibidas.

**Acceptance Scenarios**:

1. **Given** un consumidor con sesión y el reporte ACME/ZETA, **When** pide el análisis con IA, **Then** recibe un resultado con `diagnostico`, `plan` (máximo 3 pasos), `despues`, `preguntasParaTi`, `verificar` y `datosPersonales`.
2. **Given** un paso del plan, **When** se revisa, **Then** tiene un `tipo` (disputar, pagar, esperar, proteger o revisar), las cuentas por su letra, una lista de `hechos` con su fuente (reporte o herramienta), una `interpretacion` y una `accion`.
3. **Given** que el agente necesita una fecha de salida, una utilización, duplicados o consultas duras, **When** pide la herramienta, **Then** el dispositivo del consumidor la ejecuta con las herramientas de la spec 016 y le devuelve el resultado exacto.
4. **Given** que el reporte no dice si llegó una carta del cobrador, **When** el agente lo necesita, **Then** lo pone en `preguntasParaTi` y no afirma que haya un plazo corriendo.
5. **Given** el resultado, **When** se revisa, **Then** no contiene puntajes, promesas de subir el puntaje, «ilegal», «debe eliminarse», «garantiza» ni «debes».

---

### User Story 2 - Que mis datos personales nunca salgan de mi dispositivo (Priority: P1)

El consumidor confía en que su nombre, dirección, teléfono, Seguro Social, fecha de nacimiento y números de cuenta no viajan al servidor ni a la IA. El etiquetador los reemplaza antes de enviar, y el servidor rechaza cualquier envío que parezca contenerlos.

**Why this priority**: es el Principio II y la promesa del sitio («Se queda en tu dispositivo»). Un solo dato filtrado destruye la confianza.

**Independent Test**: el etiquetador corre sobre los reportes sintéticos del proyecto y ningún nombre, dirección, teléfono, SSN, fecha de nacimiento ni número de cuenta del reporte aparece en lo que se enviaría; un envío con un SSN completo es rechazado por el servidor.

**Acceptance Scenarios**:

1. **Given** un reporte con dos nombres que solo difieren en la inicial del segundo nombre, **When** se etiqueta, **Then** se envía «Nombre 1» y «Nombre 2» con la diferencia «solo inicial», y ningún nombre real.
2. **Given** un reporte con una dirección actual y otra anterior en otro estado, **When** se etiqueta, **Then** se envían «Dirección 1 (actual)» y «Dirección 2 (anterior, otro estado)», sin calle ni ciudad.
3. **Given** cualquier envío que contenga un número con forma de Seguro Social, una fecha de nacimiento o un número de cuenta con más de 4 dígitos visibles, **When** llega al servidor, **Then** se rechaza y no se envía nada a la IA.
4. **Given** el contador de uso, **When** se guarda, **Then** solo contiene la cuenta, el día y el número de usos; nada del reporte.

---

### User Story 3 - Siempre recibir una respuesta, aunque la IA no esté disponible (Priority: P2)

Si el consumidor no tiene sesión, llegó a su límite del día, la IA falla o tarda demasiado, o el análisis se pasa de vueltas, recibe el **análisis local**: los resultados de las cuatro herramientas en la misma forma del resultado, con un aviso honesto de por qué no hubo IA y, cuando aplica, la opción de reintentar.

**Why this priority**: Principio III: nunca dejar a la persona sin respuesta.

**Independent Test**: con la IA simulada fallando, sin sesión y con el cuarto uso del día, en los tres casos el consumidor recibe el análisis local con su motivo.

**Acceptance Scenarios**:

1. **Given** un consumidor sin sesión, **When** pide el análisis, **Then** recibe el análisis local con el motivo `sin_sesion`.
2. **Given** un consumidor que ya hizo 3 análisis hoy, **When** pide el cuarto, **Then** recibe el análisis local con el motivo `limite_diario` y no se llama a la IA.
3. **Given** que la IA falla o tarda más de lo permitido, **When** pasa, **Then** se reintenta una vez; si vuelve a fallar, el consumidor recibe el análisis local con el motivo `ia_no_disponible` y la opción de reintentar.
4. **Given** un análisis que llega a 6 vueltas sin terminar, **When** pasa, **Then** se entrega el análisis local con el motivo `demasiadas_vueltas` y no se cobra otro uso.
5. **Given** un resultado de la IA que sigue con palabras prohibidas después de una corrección, **When** pasa, **Then** se entrega el análisis local con el motivo `respuesta_no_valida`.

---

### User Story 4 - Que nadie pueda abusar del agente (Priority: P2)

El dueño necesita que el servicio de IA solo se use para analizar reportes, dentro del límite, y que nadie pueda cambiar las instrucciones del agente, sus herramientas ni gastar usos ajenos.

**Why this priority**: controla el costo y protege la llave de la IA (Principio II y «Restricciones técnicas»).

**Independent Test**: con el servidor y una IA simulada: una vuelta con el pase alterado o vencido se rechaza; un intento de enviar instrucciones propias o herramientas propias se ignora o se rechaza; las vueltas 2 a 6 de un mismo análisis no suman usos.

**Acceptance Scenarios**:

1. **Given** la primera vuelta de un análisis, **When** el servidor la acepta, **Then** suma 1 uso del día y entrega un pase firmado que identifica ese análisis, su cuenta, su fecha de hoy y su número de vuelta.
2. **Given** una vuelta siguiente con un pase válido, **When** llega, **Then** no suma uso.
3. **Given** un pase alterado, de otra cuenta o de un día anterior, **When** llega, **Then** se rechaza.
4. **Given** un envío que incluye instrucciones o herramientas distintas de las del servidor, **When** llega, **Then** el servidor usa solo su propio manual y sus propias herramientas.
5. **Given** un reporte etiquetado más grande que el máximo permitido, **When** llega, **Then** se rechaza sin llamar a la IA.

---

### Edge Cases

- **Reporte sin cuentas negativas ni nada raro**: el agente entrega un diagnóstico positivo, un plan de «proteger» y `preguntasParaTi` vacío; no inventa problemas.
- **Reporte con más de 3 asuntos**: los que no entran en el plan van a `despues`.
- **Herramienta que devuelve «no calculable»** (por ejemplo, cobranza sin DOFD): el agente lo dice y lo pone en `verificar`; no inventa la fecha.
- **El agente menciona una cuenta que no existe** (por ejemplo «Cuenta F» en un reporte de A a D): el resultado se rechaza y se pide una corrección; si persiste, se entrega el análisis local.
- **El agente da un número que no viene del reporte ni de una herramienta**: igual que el caso anterior.
- **Un comentario del reporte trae instrucciones** («ignora tus reglas»): el agente lo trata como dato; el resultado sigue pasando la validación.
- **Cambio de día a mitad de un análisis**: el pase conserva el «hoy» del inicio; el análisis termina con esa fecha y no suma otro uso.
- **El consumidor cierra la página a mitad del ciclo**: el uso ya contado no se devuelve; no queda nada guardado del reporte.
- **Dos análisis a la vez de la misma cuenta**: cada uno cuenta como un uso; el límite de 3 se respeta aunque lleguen juntos.

## Requirements *(mandatory)*

### Functional Requirements

**Etiquetado y privacidad**

- **FR-001**: Antes de cualquier envío, el dispositivo del consumidor MUST convertir el reporte normalizado en un **reporte etiquetado** sin nombres, direcciones, teléfonos, empleadores, SSN (ni sus últimos 4), fechas de nacimiento, números de cuenta ni contactos.
- **FR-002**: El reporte etiquetado MUST nombrar las cuentas con letras (A, B, C… en el orden del reporte) y conservar de cada cuenta solo lo que necesita el análisis: acreedor, acreedor original, tipo, estado, responsabilidad, saldo, límite, montos, fechas, historial de pagos, comentarios y si es cobranza o está cerrada.
- **FR-003**: Los datos personales MUST enviarse como etiquetas («Nombre 1», «Dirección 1», «Teléfono 1») con su diferencia respecto al primero, de un conjunto cerrado: nombres (`igual`, `solo_inicial_o_tilde`, `nombre_de_pila_distinto`, `apellido_distinto`), direcciones (`actual`, `anterior`, `mismo_estado`, `otro_estado`, `estado_desconocido`), teléfonos (`mismo_codigo_de_area`, `otro_codigo_de_area`); además, cuántos SSN y cuántas fechas de nacimiento distintas aparecen (sin sus valores).
- **FR-004**: El servidor MUST rechazar todo envío que contenga algo con forma de SSN, de fecha de nacimiento etiquetada como tal, de correo, o un número de 9 o más dígitos, y MUST NOT llamar a la IA en ese caso.
- **FR-005**: Nada del reporte MUST guardarse en el servidor ni en registros; el contador de uso guarda solo cuenta, día y número de usos. La analítica registra solo eventos sin cifras ni datos.

**Acceso, límite y pase**

- **FR-006**: El análisis con IA MUST requerir sesión iniciada y verificada en cada vuelta.
- **FR-007**: Cada cuenta MUST tener como máximo **3 análisis con IA por día** (día calendario de EE. UU. Este, fijo para todo el sitio). Solo la primera vuelta de un análisis suma un uso; el conteo MUST ser seguro aunque lleguen dos análisis a la vez.
- **FR-007a**: Cada cuenta MUST tener además como máximo **24 llamadas a la IA por día** (3 análisis × 8 llamadas: 6 vueltas y 2 reintentos). Así, repetir una vuelta con el mismo pase no permite usar la IA sin límite. Al llegar al tope, el consumidor recibe el análisis local con `limite_diario`. *(Agregado al escribir el plan, 2026-10-02, para cerrar el abuso de US4.)*
- **FR-008**: En la primera vuelta, el servidor MUST entregar un **pase firmado** con el identificador del análisis, la cuenta, la fecha de hoy (`AAAA-MM-DD`), el número de vuelta y su vencimiento (15 minutos). Las vueltas siguientes MUST traer el pase; el servidor MUST rechazar pases alterados, vencidos, de otra cuenta o con un número de vuelta que no corresponde.
- **FR-009**: Un análisis MUST terminar en **6 vueltas como máximo**.
- **FR-010**: La fecha de hoy que usan las herramientas MUST ser la del pase, no la del dispositivo.

**El agente**

- **FR-011**: Las instrucciones del agente (el manual) y la definición de sus herramientas MUST vivir solo en el servidor; lo que envíe el dispositivo como instrucciones o herramientas MUST ignorarse.
- **FR-012**: El manual MUST incorporar las correcciones pendientes: salida de cobranzas y charge-offs = DOFD + 180 días + 7 años, presentada como estimación cuando el DOFD no tiene día (spec 016); utilización como dato, sin cortes de 30 % ni 10 % (spec 013, B-07); consultas y políticas de los burós como política, no como ley (FR-028 de la 013); y la regla de que solo la persona dice qué no reconoce (FR-025b de la 013).
- **FR-013**: El agente MUST tener exactamente cuatro herramientas, con los nombres y el alcance del catálogo de la spec 016: `calcularFechaSalida` (por cuenta), `calcularUtilizacion`, `buscarPosiblesDuplicados` y `contarConsultasDuras`.
- **FR-014**: Las herramientas MUST ejecutarse en el dispositivo del consumidor con las funciones de la spec 016, y sus resultados MUST volver al agente sin cambios.
- **FR-015**: Cada vuelta MUST responder dentro del límite de tiempo del servidor; si no, cuenta como falla de la IA (FR-024).
- **FR-016**: El modelo MUST ser Claude Sonnet 5.5 (decisión del dueño).

**El resultado**

- **FR-017**: El resultado MUST tener exactamente estos campos: `diagnostico` (de 3 a 5 oraciones), `plan` (0 a 3 pasos), `despues` (lista), `preguntasParaTi` (lista), `verificar` (lista) y `datosPersonales` (lista de `{ etiqueta, razon }`).
- **FR-018**: Cada paso del plan MUST tener `tipo` ∈ {`disputar`, `pagar`, `esperar`, `proteger`, `revisar`}, `cuentas` (letras), `hechos` (lista de `{ cuenta, dato, fuente: 'reporte' | 'herramienta' }`), `interpretacion` y `accion`.
- **FR-019**: El servidor MUST validar el resultado antes de entregarlo: (a) cumple el formato de FR-017 y FR-018; (b) toda cuenta mencionada existe en el reporte etiquetado; (c) toda etiqueta de `datosPersonales` existe; (d) todo monto, porcentaje o fecha en `hechos` aparece en el reporte etiquetado o en un resultado de herramienta de ese análisis; (e) no contiene palabras prohibidas.
- **FR-020**: Palabras prohibidas, sin distinguir mayúsculas ni acentos: «ilegal», «violación», «debe eliminarse», «tienen que borrar», «garantiza», «garantizado», «subirá tu puntaje», «aumentará tu puntaje», «debes», «tienes que», «fraude» (salvo dentro de «alerta de fraude») y cualquier número de puntaje de crédito.
- **FR-021**: Si la validación falla, el servidor MUST pedir **una** corrección a la IA dentro del mismo análisis (cuenta como vuelta); si vuelve a fallar, el resultado es el análisis local con motivo `respuesta_no_valida`.
- **FR-022**: El resultado MUST ser en español. El aviso «Esto es información educativa, no asesoría legal ni financiera» lo agrega la página, no la IA.

**Respaldo sin IA**

- **FR-023**: El dispositivo MUST poder producir el **análisis local**: los resultados de las cuatro herramientas, en una forma que la Fase 4 pueda mostrar igual que el análisis con IA, con `modo: 'local'` y un `motivo` ∈ {`sin_sesion`, `limite_diario`, `ia_no_disponible`, `demasiadas_vueltas`, `respuesta_no_valida`, `datos_rechazados`}.
- **FR-024**: Si una vuelta falla por la IA o por tiempo, el dispositivo MUST reintentar esa vuelta una vez **sin sumar uso**, ni siquiera en la vuelta 1: el servidor entrega para eso un pase de reintento. Si falla otra vez, MUST entregar el análisis local con `ia_no_disponible`.
- **FR-025**: Ninguna falla MUST dejar al consumidor sin resultado.

**Progreso**

- **FR-026**: El dispositivo MUST avisar cada paso del agente en forma de eventos con códigos (por ejemplo `enviando`, `herramienta:calcularFechaSalida:B`, `terminado`, `respaldo:limite_diario`) para que la Fase 4 los muestre; los eventos MUST NOT llevar datos del reporte.

**Configuración y alcance**

- **FR-027**: La función MUST documentar su configuración en español claro: crear la tabla del contador y la variable del secreto para firmar los pases (constitución, «Documentación junto al cambio»). Hasta que eso exista, el sitio MUST NOT anunciar el análisis con IA.
- **FR-028**: Esta fase MUST NOT modificar la página del analizador, las cartas, el lector, el analista ni las herramientas de la spec 016, y MUST NOT incluir cobros.

### Key Entities *(include if feature involves data)*

- **Reporte etiquetado**: la versión sin datos personales del reporte: buró, fecha del reporte, etiquetas de datos personales con su diferencia, conteo de SSN y fechas de nacimiento distintas, cuentas con letra y sus datos, consultas (empresa, fecha, tipo), registros públicos y avisos.
- **Pase del análisis**: identificador del análisis, cuenta, fecha de hoy, número de vuelta y vencimiento, firmado por el servidor.
- **Vuelta**: una llamada del dispositivo al servidor: el pase (desde la segunda), el reporte etiquetado (solo en la primera), los resultados de las herramientas pedidas en la vuelta anterior.
- **Resultado del agente**: `diagnostico`, `plan`, `despues`, `preguntasParaTi`, `verificar`, `datosPersonales`, con `modo: 'ia'`.
- **Análisis local**: los resultados de las cuatro herramientas, `modo: 'local'` y `motivo`.
- **Uso diario**: cuenta, día y número de análisis con IA de ese día.
- **Evento de progreso**: un código que describe el paso actual, sin datos del reporte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el caso ACME/ZETA y la IA simulada, el ciclo completo entrega un resultado válido que usa los valores de referencia de la spec 016 (fecha `2028-09` estimada, 89 %, par A–B, 2 consultas duras).
- **SC-002**: En los reportes sintéticos del proyecto, el 100 % de los envíos del etiquetado están libres de nombres, direcciones, teléfonos, SSN, fechas de nacimiento y números de cuenta del reporte original.
- **SC-003**: El 100 % de los casos de falla (sin sesión, límite, IA caída, tiempo agotado, demasiadas vueltas, respuesta no válida, datos rechazados) termina con un resultado para el consumidor; 0 casos sin respuesta.
- **SC-004**: Ningún resultado entregado contiene palabras prohibidas, cuentas inexistentes ni números sin fuente (0 casos en las pruebas).
- **SC-005**: Un consumidor no puede pasar de 3 análisis con IA en un día, ni siquiera con pedidos simultáneos o pases manipulados (0 casos en las pruebas).
- **SC-006**: En la prueba real aprobada por el dueño, un análisis típico termina en 6 vueltas o menos, cada vuelta responde a tiempo y el costo medido por análisis queda dentro del rango estimado (unos 5 a 12 centavos de dólar); el resultado se registra en las notas de la feature.
- **SC-007**: Las pruebas existentes del proyecto que pasaban antes siguen pasando, y la página del analizador, las cartas, el lector, el analista y las herramientas no cambian.

## Assumptions

- La llave de la IA y las variables de la base de datos ya existen en el servidor (las usa Zyron). El dueño crea la tabla del contador y el secreto de los pases siguiendo las instrucciones de la feature.
- El servidor corta cada llamada a los 10 segundos; por eso una vuelta por llamada. Si el plan técnico mide vueltas más largas, se ajusta el esfuerzo del modelo, no el diseño.
- Los reportes llegan casi siempre en inglés; el resultado sale en español.
- El análisis local de esta fase muestra los resultados de las herramientas sin redacción; mejorar su texto queda para la Fase 4.
- La prueba real con la IA cuesta centavos y solo se ejecuta con aprobación del dueño.
- La conexión con la página del analizador (botón, pantalla de pasos en vivo, presentación del resultado) es la Fase 4.
- Cobrar por el análisis queda fuera hasta una consulta con un abogado de protección al consumidor.
