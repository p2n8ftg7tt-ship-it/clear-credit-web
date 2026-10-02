# Contratos — Agente de crédito con IA (017)

## 1. Función `POST /.netlify/functions/agente-credito`

Formas de pedido y respuesta en `../data-model.md` («Vuelta», «Respuesta del servidor»).

**Orden de comprobación en cada vuelta**:

1. Método `POST`. Faltan `ANTHROPIC_API_KEY`, `AGENTE_CREDITO_SECRETO` o las variables de Supabase → `503 no_configurado`.
2. Cuerpo JSON de 256 KB como máximo, porque la conversación crece con los bloques de pensamiento; el etiquetado no puede pasar de 60 KB → si no, `400 datos_rechazados`.
3. Sesión de Supabase (`/auth/v1/user`) → si falla, `401 sin_sesion`.
4. **Vuelta 1**:
   - barrera de datos personales sobre `etiquetado` → `400 datos_rechazados`;
   - `credito_agente_consumir(user, hoyEste, 3)` → `false`: `429 limite_diario`; error: `503 ia_no_disponible`.
5. **Vuelta n ≥ 2**:
   - el pase es válido (firma, vencimiento, usuario, `n ≤ 6`) → si no, `403 pase_invalido`;
   - **Pase normal** (`c` = 0): el HMAC de `messages` sin el último mensaje coincide con `h`, y el último mensaje es `user` con exactamente los `tool_result` de los `tool_use` de la última respuesta. Si el HMAC no coincide → `403 pase_invalido`; si el último mensaje no cumple → `400 datos_rechazados`;
   - **Pase de corrección** (`c` = 1): el HMAC de `messages` completo coincide con `h`. Esos mensajes ya terminan en el mensaje de corrección del servidor, y el navegador no agrega nada → si no, `403 pase_invalido`;
   - barrera de datos personales sobre esos `tool_result` → `400 datos_rechazados`.
5b. **Antes de cada llamada a Claude**: `credito_agente_llamar(user, d del pase, 24)` → `false`: `429 limite_diario`; error: `503 ia_no_disponible`. Un pase de reintento (`c` = 1, mismo `n`) también es válido con `n` = 1.
6. Llamada a Claude:
   - `system` = [MANUAL con `cache_control`];
   - `tools` = HERRAMIENTAS;
   - `messages`: en la vuelta 1, el servidor arma `[{ role: 'user', content: 'Hoy: <d>\n<reporte>…JSON del etiquetado…</reporte>' }]`;
   - `output_config: { effort: 'medium', format }`, `tool_choice: auto`, `fallbacks: 'default'`.

   Si se agota el tiempo o hay error 5xx o 429 de Anthropic → `504`/`502 ia_no_disponible` (reintentable). Si hay `refusal` → `502 ia_no_disponible` (no reintentable).
7. **`stop_reason: tool_use`**:
   - si `n` = 6 → `200 { estado: 'respaldo', motivo: 'demasiadas_vueltas' }`;
   - si no → `200 { estado: 'herramientas', pase (n+1, h nuevo), messages, pedidos }`.
8. **`stop_reason: end_turn`**: se valida el resultado (research R8). El servidor saca el etiquetado del primer mensaje y los resultados de herramientas de los `tool_result` de `messages`; como la conversación está protegida por el HMAC, puede confiar en ellos.
   - **Válido** → `200 terminado`.
   - **No válido, sin corrección previa en este análisis (`k` = 0) y `n` < 6** → el servidor agrega a `messages` un mensaje `user` con los problemas y responde `200 { estado: 'herramientas', pedidos: [], pase (n+1, c = 1, k = 1, h de messages completo), messages }`. El navegador reenvía `messages` sin agregar nada; esa vuelta es la corrección.
   - **No válido con `k` = 1, o `n` = 6** → `200 respaldo respuesta_no_valida`.
9. **`max_tokens`**: se trata como respuesta no válida (paso 8).

**Nunca** se registra en logs el cuerpo, el etiquetado ni la respuesta de Claude. Solo se registran códigos (`motivo`, `stop_reason`, `status`).

## 2. Módulo del navegador `agente-credito-cliente.js` (UMD: `window.ThemoraAgenteCredito`)

```js
etiquetarReporte(reporte) → { etiquetado, paraHerramientas }

analisisLocal(paraHerramientas, { hoy, motivo, reintentable }) → AnalisisLocal

analizarConAgente(reporte, {
  accessToken,            // de auth.js; sin él → analisisLocal('sin_sesion') sin llamar al servidor
  fetch,                  // inyectable para pruebas; por omisión window.fetch
  url,                    // por omisión '/.netlify/functions/agente-credito'
  onEvento                // (codigo) => void, opcional
}) → Promise<{ modo: 'ia', ... } | AnalisisLocal>
```

**Garantías**:
- La promesa **siempre se resuelve**; nunca se rechaza (FR-025). Cualquier error termina en `analisisLocal`.
- Ejecuta los `pedidos` con `ThemoraHerramientas.ejecutar` sobre `paraHerramientas`, con `hoy` = `d` del pase (FR-010). El `tool_result.content` es `JSON.stringify(resultado)`. Un `TypeError` de una herramienta vuelve como `tool_result` con `is_error: true` y su código.
- Reintenta una vez una vuelta que responde `ia_no_disponible` con `reintentable: true` (FR-024). Si la respuesta trae `pase` y `messages`, reintenta con ellos (no suma uso); si no, reenvía el mismo cuerpo.
- No guarda nada en `localStorage` ni en cookies. No envía analítica.
- `onEvento` solo recibe los códigos de `EventoProgreso`.

## 3. Biblioteca del servidor

- `netlify/functions/lib/agente-credito-manual.js` → `{ MANUAL, HERRAMIENTAS, ESQUEMA_RESULTADO, VERSION }`
- `netlify/functions/lib/agente-credito-validar.js` (pura) → `{ barreraDatosPersonales(valor) → { ok, motivo? }, validarResultado(resultado, { etiquetado, resultadosHerramientas }) → { ok, problemas: string[] }, palabrasProhibidas(texto) → string[] }`
- `netlify/functions/lib/agente-credito-pase.js` (pura, con el secreto como parámetro) → `{ firmarPase(datos, secreto), leerPase(texto, secreto, ahoraSeg) → datos | null, hmacConversacion(messages, secreto) }`
