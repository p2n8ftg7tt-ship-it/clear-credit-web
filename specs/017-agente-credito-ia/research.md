# Research — Agente de crédito con IA (017)

No queda ningún «NEEDS CLARIFICATION». Formato: decisión, por qué, alternativas.

## R1. Llamada a Claude: HTTP directo con `fetch`, sin SDK

- **Decision**: `fetch("https://api.anthropic.com/v1/messages")` con `x-api-key` y `anthropic-version: 2023-06-01`, como `netlify/functions/coach.js`.
- **Rationale**: el proyecto no tiene `package.json` ni dependencias, y la constitución exige evidencia antes de agregar una («sitio estático sin paso de compilación»). Todas las funciones del sitio ya llaman a Anthropic así.
- **Alternatives considered**: `@anthropic-ai/sdk`. Es la opción preferida en general, pero obligaría a introducir `package.json`, instalación y empaquetado en Netlify solo para esta función. Queda anotado para cuando el sitio adopte dependencias.

## R2. Parámetros del modelo

- **Decision**:
  - `model: "claude-sonnet-5-5"` (decisión del dueño).
  - Sin `thinking`, porque Sonnet 5.5 usa pensamiento adaptativo por omisión. `output_config.effort: "medium"`.
  - `max_tokens: 4000`, sin streaming.
  - `tool_choice: { type: "auto" }`. El uso forzado de herramientas da error 400 en Sonnet 5.5.
  - Las 4 herramientas con `strict: true`.
  - `fallbacks: "default"` con la cabecera beta `anthropic-beta: server-side-fallback-2026-07-01`. Si Sonnet 5.5 se niega por las categorías `cyber` o `frontier_llm`, el servidor de Anthropic reintenta con Sonnet 5.
- **Rationale**: `medium` mantiene cada vuelta por debajo de los 10 s de Netlify; si la prueba real mide vueltas más lentas, se baja a `low` (supuesto de la spec). Con `max_tokens` de 4000 alcanza para el resultado JSON (≈1,000–2,000 tokens) más el pensamiento, y una respuesta sin streaming no corre riesgo de timeout HTTP en ese tamaño.
- **Rechazos**: si `stop_reason === "refusal"`, se trata como `ia_no_disponible` y se usa el respaldo local. Un reporte de crédito no debería activar ningún clasificador; si pasa, se registra solo el código.

## R3. El resultado final: `output_config.format` con JSON Schema

- **Decision**: cada vuelta envía `output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA_RESULTADO } }`. Cuando Claude ya no pide herramientas (`stop_reason: "end_turn"`), su bloque `text` es el JSON del resultado.
- **Esquema**: el de `data-model.md` § ResultadoAgente. Todos los objetos llevan `additionalProperties: false` y `required` completos. El esquema no admite `minItems` ni `maxLength`, así que el límite de 3 pasos y el de 3 a 5 oraciones los comprueba la validación del servidor (R8).
- **Rationale**: las salidas estructuradas son compatibles con las herramientas y con el pensamiento, y garantizan un JSON parseable.
- **Plan B**, si la combinación da error en la prueba real: una quinta herramienta `entregar_analisis` con `strict: true` y la instrucción del manual de llamarla al terminar. La validación del servidor no cambia.

## R4. Ciclo dirigido por el navegador y conversación a prueba de manipulaciones

- **Decision**:
  - El servidor devuelve al navegador el `content` completo de cada respuesta de Claude, con sus bloques `thinking`. El navegador lo reenvía **sin cambios** y le agrega solo los `tool_result`.
  - El pase guarda `h`, un **HMAC-SHA256 de la conversación** hasta esa vuelta (JSON canónico de `messages`).
  - En la vuelta *n*, el servidor recalcula el HMAC de los mensajes previos y lo compara con `h`. El único mensaje nuevo permitido es un `user` que contiene **exactamente** un `tool_result` por cada `tool_use` de la última respuesta, con el mismo `tool_use_id`, y nada más.
- **Rationale**:
  - Sonnet 5.5 exige reenviar los bloques de pensamiento sin cambios («preserved thinking»): la conversación tiene que crecer solo agregando al final. La regla del HMAC cumple eso por diseño.
  - Además, el navegador no puede inyectar texto propio, cambiar el reporte después de la vuelta 1 ni usar la llave para otra cosa (US4).
- **Alternatives considered**: guardar la conversación en Supabase. Descartado por FR-005 (nada del reporte se guarda en el servidor).

## R5. El pase

- **Decision**:
  - Formato `base64url(JSON) + "." + base64url(HMAC-SHA256(JSON, AGENTE_CREDITO_SECRETO))`.
  - JSON: `{ v: 1, a: <id del análisis, 16 bytes aleatorios en base64url>, u: <id de usuario de Supabase>, d: <hoy AAAA-MM-DD, hora del Este>, n: <número de la próxima vuelta>, e: <vencimiento en epoch segundos, emisión + 900>, h: <HMAC de la conversación> }`.
  - Se verifica con `crypto.timingSafeEqual`, como en `lib/pagos-stripe.js`.
  - Se rechaza si: la firma no coincide, `e` ya pasó, `u` ≠ el usuario de la sesión, `n` > 6 o `h` no coincide.
- **Rationale**: no hace falta guardar estado en el servidor. `crypto` es nativo de Node. Los 15 minutos los confirmó el dueño.
- **Reintento (FR-024)**: si Claude falla de forma reintentable, la respuesta de respaldo trae un **pase de reintento** (`c` = 1, mismo `n`, `h` = HMAC de la conversación que se le envió a Claude) y esa conversación en `messages`. El navegador la reenvía tal cual. Sirve también en la vuelta 1, que así no vuelve a sumar uso.
- **Repetir una vuelta**: un pase sigue siendo válido mientras no vence, así que reenviarlo vuelve a llamar a Claude. Para que eso no permita usar la IA sin límite, cada llamada a Claude cuenta en un segundo tope diario de **24 llamadas por cuenta** (FR-007a, R6).

## R6. Límite diario atómico (hora del Este)

- **Decision**:
  - Tabla `credito_agente_uso (user_id uuid, dia date, veces int, primary key (user_id, dia))`.
  - Función SQL `credito_agente_consumir(p_user uuid, p_dia date, p_limite int) returns boolean`. Hace `insert … on conflict (user_id, dia) do update set veces = credito_agente_uso.veces + 1 where credito_agente_uso.veces < p_limite returning true`, y devuelve `false` si no actualizó ninguna fila.
  - Se llama por `POST /rest/v1/rpc/credito_agente_consumir` con la service role, como `lib/pagos-stripe.js`.
  - El día se calcula en el servidor con `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(ahora)`.
  - RLS activado y sin políticas: solo la service role accede.
- **Rationale**: `revisar-negocio.js` primero lee y después escribe (dos pedidos seguidos), así que dos análisis al mismo tiempo podrían pasar el límite. FR-007 y SC-005 exigen que sea atómico.
- **Tope de llamadas (FR-007a)**: la misma tabla tiene la columna `llamadas`. La función `credito_agente_llamar(p_user, p_dia, p_limite) returns boolean` hace un `update … set llamadas = llamadas + 1 where … and llamadas < p_limite` atómico. Se llama antes de **cada** llamada a Claude, con el `d` del pase y un límite de 24.
- **Si el contador falla, se cierra**: se responde `limite_no_verificable` y el navegador muestra el respaldo local con `ia_no_disponible`. `revisar-negocio.js` deja pasar cuando falla, pero aquí cada análisis gasta dinero (Principio II, control de costo).
- **El SQL** se agrega a `supabase-schema.sql` (la fuente única del esquema) y se copia en las instrucciones.

## R7. Etiquetador (navegador)

- **Decision**: `etiquetarReporte(reporte)` devuelve `{ etiquetado, paraHerramientas }`.
  - **`etiquetado`** es lo que se envía:
    - `buro` y `fechaReporte` (iso);
    - `identidad`: `nombres[]`, `direcciones[]` y `telefonos[]` como `{ etiqueta, diferencias[] }`, además de `ssnDistintos` y `fechasNacimientoDistintas` (conteos que el lector ya entrega como booleanos: 0 o 1);
    - `cuentas[]` con `letra` y solo los campos de FR-002, convertidos a valores simples. Los montos van como números y las fechas como iso. **No** se envían `origen`, `numero` ni `contacto`;
    - `consultas[]`: `{ empresa, fecha, tipo }`;
    - `registrosPublicos[]`: `{ tipo, fechaPresentacion, estado }`;
    - `avisos[]`: `{ tipo }`, sin texto.
  - **`paraHerramientas`** se queda en el navegador: el `Reporte` normalizado con cada `Cuenta.id` cambiado por su letra y sin `identidad`. Así los resultados de las herramientas usan las mismas letras que el agente.
  - **Diferencias de nombre** (comparadas contra Nombre 1, después de normalizar tildes y mayúsculas): `igual`; `solo_inicial_o_tilde` (mismo nombre de pila y apellido, y el resto solo difiere en iniciales o tildes); `nombre_de_pila_distinto`; `apellido_distinto` (último token distinto).
  - **Direcciones**: `actual` o `anterior`, según `tipo`. Estado: el código de 2 letras antes del ZIP (`/\b([A-Z]{2})\s+\d{5}/`); `mismo_estado`, `otro_estado` o `estado_desconocido`.
  - **Teléfonos**: los 3 primeros dígitos; `mismo_codigo_de_area` u `otro_codigo_de_area`. El código de área no se envía.
- **Rationale**: es justo lo que el manual sabe usar («Nombre 3: nombre de pila distinto»), sin un solo dato real.
- **Comentarios de cuenta**: se envían porque el agente los necesita (por ejemplo, «sold»). Se recortan a 300 caracteres y pasan por la barrera del servidor (R9).

## R8. Validación del resultado (servidor)

Módulo puro, en este orden:

1. **Forma**: JSON parseable y campos exactos (FR-017 y FR-018). `plan.length ≤ 3`. `diagnostico` de 3 a 5 oraciones (se separan con `/[.!?](\s|$)/`).
2. **Cuentas**: toda letra en `plan[].cuentas` y en `hechos[].cuenta` existe en el etiquetado.
3. **Etiquetas**: toda `datosPersonales[].etiqueta` existe en `identidad`.
4. **Números con fuente**: de cada `hechos[].dato` se extraen montos (`$1,284`), porcentajes (`89 %` o `89%`) y fechas (`2028-09`, `09/2028`, `2021-03-15`), y se normalizan a número o a iso. Cada uno tiene que estar en el conjunto de valores del etiquetado más los resultados de herramientas de la conversación (montos, porcentajes y fechas, todo recorrido en profundidad).
5. **Palabras prohibidas**: la lista de FR-020, comparada sin tildes ni mayúsculas en todos los textos. Excepción: «alerta de fraude». Además, un número de 300 a 850 junto a «puntaje» o «score» se trata como puntaje.

- **Si falla**: se agrega un mensaje `user` con la lista de problemas en códigos («cuenta_inexistente: F», «palabra_prohibida: debes») y se pide la corrección. Esa corrección es una vuelta (FR-021). Si falla otra vez: `respuesta_no_valida`.
- **Rationale**: son reglas deterministas y probables sin gastar dinero.

## R9. Barrera de datos personales en el servidor (FR-004)

- **Decision**: se recorren todos los strings del cuerpo (el etiquetado en la vuelta 1, los `tool_result` en las siguientes). Se rechaza con `datos_rechazados` si encuentra:
  - una forma de SSN: `\b\d{3}-\d{2}-\d{4}\b` o `\b\d{9}\b`;
  - cualquier número de 9 dígitos o más;
  - un correo;
  - las palabras «date of birth», «DOB», «fecha de nacimiento» o «nacimiento» seguidas de una fecha;
  - las claves `identidad.nombres[].valor`, `numero` o `contacto` en las cuentas;
  - un tamaño total mayor de 60 KB.
- **Rationale**: es una segunda línea de defensa si el etiquetador falla. Es preferible rechazar de más (y caer al análisis local) a filtrar un dato.

## R10. Manual y herramientas viven en el servidor

- **Decision**: `netlify/functions/lib/agente-credito-manual.js` exporta:
  - `MANUAL`: el texto del manual v2 con las correcciones de FR-012 y el formato de salida reemplazado por «responde con el JSON del esquema»;
  - `HERRAMIENTAS`: las 4 definiciones con `name`, `description`, `input_schema` y `strict: true`;
  - `ESQUEMA_RESULTADO`.

  Las entradas de las herramientas son:
  - `calcularFechaSalida { cuenta: string }` (la letra);
  - `calcularUtilizacion {}`;
  - `buscarPosiblesDuplicados {}`;
  - `contarConsultasDuras { meses: integer }`.
- **Una sola verdad (Principio IV)**: una prueba compara los nombres de `HERRAMIENTAS` con `ThemoraHerramientas.CATALOGO`.
- **Caché**: `cache_control: { type: "ephemeral" }` en el bloque de `system`, que cachea las herramientas y el manual porque van antes en el orden de render. Nunca se agrega nada que cambie (fechas, ids) al `system`. La fecha de hoy va en el primer mensaje `user`.

## R11. Tiempo límite

- **Decision**: `AbortController` con 8.5 s para la llamada a Anthropic, porque Netlify corta a los 10 s y hay que dejar margen para la sesión, el contador y la validación. Si se agota el tiempo, se responde `504 { motivo: "ia_no_disponible", reintentable: true }`. El navegador reintenta una vez (FR-024).
- **Precedente**: `tasas-agente.js` ya usa `AbortController`.

## R12. Pruebas sin gastar dinero

- **Decision**: la función exporta `handler` y una fábrica `crearHandler({ fetch, ahora, entorno })` para inyectar un `fetch` simulado (Supabase y Anthropic guionizados) y un reloj fijo. Las pruebas usan `node:test`.
- **Archivos de prueba**:
  - `tests/agente-credito-validar.test.js`: validación, palabras prohibidas, números y barrera de datos personales;
  - `tests/agente-credito-funcion.test.js`: 401, 429, 403, 400, 504, vueltas, HMAC de la conversación, uso contado una sola vez y concurrencia simulada;
  - `tests/agente-credito-cliente.test.js`: etiquetador sobre los 6 `esperado/*.json` sin datos personales, ciclo completo ACME/ZETA con un servidor simulado y todos los respaldos.
- **Prueba real**: `tests/manual/agente-credito-real.js`, que no termina en `.test.js` y por eso no corre con la suite. Requiere `ANTHROPIC_API_KEY` y la aprobación del dueño, y mide el tiempo por vuelta, las vueltas y el costo con `usage` (SC-006).

## R13. Documentación y publicación

- `INSTRUCCIONES-AGENTE-CREDITO.md` en la raíz, con su redirección 404 en `netlify.toml`, como las demás `INSTRUCCIONES-*`.
- Pasos: crear la tabla y la función (SQL), crear `AGENTE_CREDITO_SECRETO` (32 bytes aleatorios) en Netlify y verificar con la prueba real.
- Hasta que estén hechos, nada en el sitio anuncia el análisis con IA (FR-027). En esta fase no hay ningún botón (eso es la Fase 4).
