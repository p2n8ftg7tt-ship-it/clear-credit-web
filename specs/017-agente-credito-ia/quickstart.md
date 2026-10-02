# Quickstart — validar el agente de crédito con IA (017)

## Requisitos

- Node 18 o más reciente. No hay dependencias que instalar.
- Desde la raíz del proyecto (`MyWeb/`).

## 1. Pruebas automáticas (no gastan dinero)

```bash
node --test tests/agente-credito-validar.test.js tests/agente-credito-funcion.test.js tests/agente-credito-cliente.test.js
```

| Archivo | Qué demuestra |
|---|---|
| `agente-credito-validar.test.js` | Barrera de datos personales (FR-004), forma del resultado, cuentas y etiquetas que existen, números con fuente y palabras prohibidas (FR-019, FR-020) |
| `agente-credito-funcion.test.js` | 401 `sin_sesion`, 429 `limite_diario` en el cuarto análisis, el uso se cuenta solo en la vuelta 1, 403 con pase alterado, vencido, de otra cuenta o con HMAC distinto, 400 con datos personales, 504 con tiempo agotado, corte a las 6 vueltas, una sola corrección y después `respuesta_no_valida`, nada del reporte en los logs |
| `agente-credito-cliente.test.js` | El etiquetador sobre los 6 `tests/fixtures/credito/esperado/*.json` no deja pasar ningún dato personal (SC-002). Ciclo completo ACME/ZETA con un servidor simulado: termina en `modo: 'ia'` con `2028-09`, 89 %, el par A–B y 2 consultas (SC-001). Cada respaldo termina con un resultado (SC-003) |

Además, sin regresiones (SC-007):

```bash
node --test tests/*.test.js
```

Esperado: los mismos 19 fallos que ya existían (tasas y sistema visual) y ninguno nuevo.

## 2. Configuración (la hace el dueño; ver `INSTRUCCIONES-AGENTE-CREDITO.md`)

1. En Supabase → SQL Editor: correr el bloque «Agente de crédito» de `supabase-schema.sql` (tabla `credito_agente_uso` y función `credito_agente_consumir`).
2. En Netlify → Variables de entorno: crear `AGENTE_CREDITO_SECRETO` con 32 bytes aleatorios. Se genera con:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
3. `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya existen.

## 3. Prueba real (gasta centavos; solo con aprobación del dueño)

```bash
ANTHROPIC_API_KEY=... node tests/manual/agente-credito-real.js
```

Corre el ciclo completo con ACME/ZETA **contra Claude de verdad**, sin Supabase (simula la sesión y el contador). Esperado:
- resultado `modo: 'ia'` válido;
- 6 vueltas o menos, cada una por debajo de 8.5 s;
- costo calculado con `usage` dentro de unos $0.05–0.12 (SC-006).

Los números medidos se anotan en `specs/017-agente-credito-ia/notas-prueba-real.md`.

## 4. Después de cambiar código

```bash
graphify update .
```
