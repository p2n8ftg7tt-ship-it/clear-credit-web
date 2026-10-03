# Prueba real del agente (SC-006): resultado y punto de retomar

> **Para la próxima sesión:** lee este archivo y empieza en «Siguiente paso». No hace falta releer las specs 016 a 019.

## Estado de la activación (2026-10-02)

| Paso | Estado |
|------|--------|
| 1. SQL `credito_agente_uso` en Supabase (`udjunkorcmmyndisscfa`) | Hecho y verificado (RLS activado, solo `service_role`) |
| 2. Variables en Netlify (`AGENTE_CREDITO_SECRETO` más las 4 que ya existían) | Hecho; sitio redesplegado y la sonda responde 401 `sin_sesion` |
| 3. Límite de gasto en Anthropic | Cuenta prepagada ($4.89) sin recarga automática: el saldo funciona como tope |
| 4. Prueba real | **Corrida: FALLA por tiempo** (detalle abajo) |

## Resultado de la prueba real

Comando (lo corre el dueño, porque Claude no puede leer la llave):

```
! ANTHROPIC_API_KEY="$(netlify env:get ANTHROPIC_API_KEY)" node tests/manual/agente-credito-real.js
```

- Vuelta 1: 6,528 ms, `stop_reason: tool_use`. Las 5 herramientas corrieron bien (fechas de salida de A y B, utilización 89 %, posible duplicado A/B, 2 consultas duras y 1 incierta).
- Vuelta 2: `tiempo_agotado` dos veces (el intento y el reintento). El corte es de 8.5 s (`TIEMPO_IA_MS` en `netlify/functions/agente-credito.js:26`).
- Resultado: `modo: local`, `motivo: ia_no_disponible` y `reintentable: true`. El respaldo local funcionó como estaba diseñado (Principio III).
- Costo medido: $0.0171. Las vueltas abortadas no quedan medidas y es posible que también se cobren.

## Diagnóstico

La vuelta final escribe el resultado completo en JSON (`max_tokens: 4000`, `effort: medium`, `output_config.format` con esquema). Generar ese texto tarda más de 8.5 s, y Netlify corta las funciones normales a los 10 s. Con una respuesta de ese tamaño, esta arquitectura (una vuelta por llamada a una función síncrona) **no cabe en el tiempo**, aunque las vueltas de herramientas sí caben.

## Opciones (el dueño aún no eligió)

1. **Medir primero (la recomendada):** una corrida más (unos 3 centavos) con un script que llame a la IA sin el corte de 8.5 s y anote cuánto tarda la vuelta final y cuántos tokens escribe. Con ese dato se elige entre la 2 y la 3.
2. **Netlify Edge Function con streaming:** la llamada a la IA pasa a una función Edge que envía la respuesta mientras se escribe. No tiene el corte de 10 s, pero sí un límite de CPU, que hay que verificar en la documentación de Netlify. Es un cambio mediano.
3. **Background Function y espera:** la IA trabaja en segundo plano (hasta 15 min) y guarda el resultado temporal en Supabase. La página pregunta cada pocos segundos si ya está. Es la más robusta y también el cambio más grande.

(Otra vía pequeña, quizá insuficiente: bajar `effort` a `low` o achicar el esquema de salida.)

## Siguiente paso

1. Preguntarle al dueño qué opción quiere: 1, 2 o 3.
2. Si es la 1: escribir `tests/manual/agente-credito-medir.js` (como `agente-credito-real.js`, pero sin `AbortController` e imprimiendo `ms`, `usage.output_tokens` y `stop_reason` de cada vuelta), y pedirle al dueño que lo corra con el mismo `!` de arriba.
3. Hacer una spec corta con SpecKit para el arreglo elegido. El dueño prefiere que Codex implemente (modelo `gpt-5.6-sol`) y que Claude haga los commits.
4. Repetir la prueba real y completar este archivo.

## También pendiente

- La revisión visual del dueño en 375 y 1440 px (`specs/019-agente-en-credito/notas-revision.md`).
- Opcional: los 19 fallos que ya existían (tasas-* y sistema-visual §C) y bloquear el acceso público a `supabase-schema.sql`.
