# Implementation Plan: Agente de crédito con IA (Fase 2: el agente piensa)

**Branch**: `017-agente-credito-ia` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-agente-credito-ia/spec.md`

## Summary

Un agente con Claude Sonnet 5.5 analiza el reporte de crédito usando las cuatro herramientas de la spec 016. El **navegador dirige el ciclo**:
1. Etiqueta el reporte, sin datos personales.
2. Llama a una función de Netlify que hace **una vuelta de Claude por llamada** (menos de 8.5 s).
3. Ejecuta en el dispositivo las herramientas que Claude pide y repite, hasta 6 vueltas.

El servidor guarda el manual y las herramientas, verifica la sesión y el límite atómico de 3 al día (hora del Este) y firma un **pase** de 15 minutos con un HMAC de la conversación. Así nadie puede alterarla ni usar la llave para otra cosa. Antes de entregar, valida el resultado JSON: forma, cuentas, números con fuente y palabras prohibidas, con una sola corrección. Si algo falla, el consumidor recibe el **análisis local** con los resultados de las herramientas.

## Technical Context

**Language/Version**: JavaScript (ES2020). Navegador sin compilación y Node 18+ en las funciones de Netlify (local: v24)

**Primary Dependencies**: ninguna nueva. `fetch` y `crypto` nativos; reutiliza `herramientas-credito.js` (016)

**Storage**: Supabase, solo la tabla `credito_agente_uso` (usuario, día, veces) y la función atómica `credito_agente_consumir`. Nada del reporte se guarda

**Testing**: `node:test` + `node:assert`, con `fetch` simulado para Supabase y Anthropic. Una prueba real aparte (`tests/manual/`), que cuesta centavos y se corre solo con aprobación

**Target Platform**: navegador del consumidor (`window.ThemoraAgenteCredito`) y Netlify Functions (`/.netlify/functions/agente-credito`)

**Project Type**: sitio estático + funciones sin servidor

**Performance Goals**: cada vuelta responde en ≤ 8.5 s (límite de Netlify: 10 s); un análisis completo en ≤ 6 vueltas, idealmente 2 o 3 (todas las herramientas pedidas en paralelo en una vuelta)

**Constraints**: cero datos personales fuera del dispositivo; manual y herramientas solo en el servidor; conversación protegida por HMAC (solo puede crecer al final, como pide el pensamiento de Sonnet 5.5); límite atómico; el contador cierra el paso si falla; nada del reporte en los logs

**Scale/Scope**: 1 función nueva, 3 bibliotecas de servidor, 1 módulo de navegador, 3 archivos de prueba, 1 prueba real, 1 bloque SQL, 1 archivo de instrucciones y 1 redirección en `netlify.toml`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / regla | Cómo se cumple | ✓ |
|---|---|---|
| **I. Honestidad y no asesoría** | El manual prohíbe veredictos y promesas; el servidor valida palabras prohibidas (FR-020) y números con fuente (FR-019d). Los hechos van separados de la interpretación. La página agrega el aviso educativo. Sin cobro (no aplica CROA) | ✅ |
| **II. Privacidad por diseño** | Etiquetador en el dispositivo y barrera en el servidor (R7, R9). Sesión obligatoria y límite de 3 al día. El contador guarda solo usuario, día y veces. Logs solo con códigos | ✅ |
| **III. Funciona sin IA** | `analisisLocal` en cada falla; la promesa del cliente nunca se rechaza (FR-023 a FR-025) | ✅ |
| **IV. Una sola verdad, probada** | Los cálculos salen solo de `herramientas-credito.js`. Una prueba compara los nombres de las herramientas del manual con `CATALOGO`. Los números de la IA se validan contra las herramientas y el reporte | ✅ |
| **V. Multilingüe** | Solo español en esta fase (decisión del dueño); otros idiomas quedan fuera del alcance. No contradice el principio: no se publica texto traducido | ✅ |
| Sin dependencias nuevas | Solo `fetch` y `crypto` nativos (R1) | ✅ |
| Todo lo de la raíz se publica | `INSTRUCCIONES-AGENTE-CREDITO.md` lleva su redirección 404 en `netlify.toml`. `tests/` y `specs/` ya están bloqueados. `agente-credito-cliente.js` es código público, como los demás módulos | ✅ |
| Secretos fuera del código | `AGENTE_CREDITO_SECRETO`, `ANTHROPIC_API_KEY` y la service role solo en variables de Netlify | ✅ |
| Función que gasta dinero: sesión + límite | Sesión de Supabase en cada vuelta y límite atómico por cuenta (R6) | ✅ |
| CSP | El navegador solo llama a `'self'` (la función); no hace falta cambiar la CSP | ✅ |
| Documentación junto al cambio | `INSTRUCCIONES-AGENTE-CREDITO.md`; el sitio no anuncia la función hasta que esté configurada (FR-027) | ✅ |
| Pruebas antes de publicar; LF; graphify | Incluidas en el quickstart | ✅ |

**Re-check post-design**: sin violaciones. La decisión de no usar el SDK (R1) sigue la regla de no agregar dependencias, y queda anotada.

## Project Structure

### Documentation (this feature)

```text
specs/017-agente-credito-ia/
├── spec.md
├── plan.md                    # este archivo
├── research.md                # R1–R13
├── data-model.md              # etiquetado, pase, vuelta, respuesta, resultado, respaldo
├── quickstart.md
├── contracts/
│   └── agente-credito-api.md  # función, módulo del navegador y bibliotecas
├── checklists/requirements.md
└── tasks.md                   # lo crea /speckit-tasks
```

### Source Code (repository root)

```text
MyWeb/
├── herramientas-credito.js                    # 016 · sin cambios
├── agente-credito-cliente.js                  # NUEVO · etiquetador + director del ciclo + análisis local (UMD)
├── netlify/functions/
│   ├── agente-credito.js                      # NUEVO · una vuelta por llamada; crearHandler({fetch, ahora, entorno})
│   └── lib/
│       ├── agente-credito-manual.js           # NUEVO · MANUAL, HERRAMIENTAS, ESQUEMA_RESULTADO
│       ├── agente-credito-validar.js          # NUEVO · barrera de datos personales + validación del resultado (pura)
│       └── agente-credito-pase.js             # NUEVO · firmar/leer pase, HMAC de la conversación (pura)
├── supabase-schema.sql                        # + bloque «Agente de crédito» (tabla + función + RLS)
├── INSTRUCCIONES-AGENTE-CREDITO.md            # NUEVO
├── netlify.toml                               # + redirección 404 de INSTRUCCIONES-AGENTE-CREDITO.md
└── tests/
    ├── agente-credito-validar.test.js         # NUEVO
    ├── agente-credito-funcion.test.js         # NUEVO
    ├── agente-credito-cliente.test.js         # NUEVO
    └── manual/agente-credito-real.js          # NUEVO · prueba real, fuera de la suite
```

**No se tocan**: `credito.html`, `cartas-bilingues.js`, `lector-credito*.js`, `analista-credito.js`, `herramientas-credito.js` ni `coach.js` (FR-028).

**Structure Decision**: se sigue el patrón del proyecto: módulos UMD en la raíz para el navegador, funciones en `netlify/functions/` y lógica compartida en `lib/`. La función **no** carga `herramientas-credito.js`, porque las herramientas corren en el navegador (FR-014); solo necesita sus nombres para las definiciones. La prueba de coherencia (Principio IV) sí lo carga, con `require('../herramientas-credito.js')`, en `tests/`.

## Orden de construcción (para `/speckit-tasks`)

1. **Bibliotecas puras primero** (TDD): `agente-credito-pase.js` → `agente-credito-validar.js` → `agente-credito-manual.js` (con la prueba de coherencia con `CATALOGO`).
2. **Etiquetador** en `agente-credito-cliente.js` (US2), con la prueba sobre los 6 reportes esperados.
3. **Función** `agente-credito.js`: vuelta 1 → herramientas → final → corrección → respaldos (US1, US3, US4), con un `fetch` simulado.
4. **Director del ciclo** y **análisis local** en el cliente (US1, US3), con la prueba del ciclo completo ACME/ZETA contra la función real y un Anthropic simulado.
5. **SQL, instrucciones y redirección.**
6. **Prueba real** (script). Se ejecuta solo con la aprobación del dueño, y lo medido se anota en `notas-prueba-real.md`.
7. **Cierre**: la suite completa, `graphify update .` y la comprobación de que no se tocó nada fuera del alcance.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Una vuelta tarda más de 8.5 s | `effort: medium` y manual cacheado. Si la prueba real lo mide, se baja a `low`. El reintento automático cubre los casos aislados |
| `output_config.format` junto con herramientas da error en la API | Plan B (R3): una quinta herramienta `entregar_analisis` con `strict: true`; la validación no cambia |
| El etiquetador deja pasar un dato personal en un formato de reporte nuevo | Barrera del servidor (R9) y prueba con los 6 reportes. El banco 015 lo ampliará |
| El validador de números rechaza resultados correctos (por ejemplo, «$1284» frente a «$1,284») | Se normalizan los formatos (R8); las pruebas cubren variantes. Si falla, hay una corrección y después el respaldo |
| Costo mayor del estimado | Límite de 3 al día por cuenta, caché del manual y medición en la prueba real (SC-006). Además, el dueño puede poner un tope de gasto en la consola de Anthropic |

## Complexity Tracking

Sin violaciones de la constitución; nada que justificar.
