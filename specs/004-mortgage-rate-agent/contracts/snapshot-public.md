# Contract: public snapshot (`tasas-hipoteca`)

Read-only endpoint the Comprar casa block and the site-wide banner both read.

- **Request**: `GET /.netlify/functions/tasas-hipoteca` — no body, no auth, no query parameters. Same origin, so the CSP (`connect-src 'self'`) needs no change.
- **Caching**: `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`. An alert therefore reaches visitors within about 5 minutes; page views do not each hit the database.
- **Side effects**: none. Reads `tasas_config`, `tasas_publicado` and active rows of `tasas_alertas` with the service-role key; returns only the fields below (never run logs, error text, thresholds or held readings).
- **Session / rate limit**: none by design (FR-022: no sign-in, no personal data; response is shared and cacheable). Justified in the plan's Complexity Tracking.

## Response `200 application/json; charset=utf-8`

```jsonc
{
  "version": 1,
  "activo": true,                       // false → front-end renders nothing at all
  "generadoEn": "2026-09-21T13:04:11Z", // when this response was built
  "frescura": "al_dia",                 // "al_dia" | "sin_actualizar" | "sin_datos"
  "publicadoEn": "2026-09-21T13:00:05Z",// last successful Mon/Tue run; null when sin_datos
  "proximaActualizacion": "2026-09-22T13:00:00Z",
  "fuente": {                           // headline source (display metadata)
    "id": "freddie-pmms",
    "nombre": "Freddie Mac · Primary Mortgage Market Survey",
    "url": "https://www.freddiemac.com/pmms",
    "atribucion": "Fuente: Freddie Mac PMMS",
    "frecuencia": "Semanal, los jueves",
    "mide": "Promedio nacional semanal de las tasas que ofrecen los prestamistas, para hipotecas fijas a 30 y 15 años"
  },
  "terminos": {                         // null when sin_datos
    "30": { "valor": 6.95, "previo": 6.76, "cambioPp": 0.19, "fechaFuente": "2026-09-17" },
    "15": { "valor": 6.26, "previo": 6.09, "cambioPp": 0.17, "fechaFuente": "2026-09-17" }
  },
  "alertas": [                          // possibly empty; ordered by banner priority
    {
      "id": 41,                         // what the browser remembers on dismiss
      "tipo": "movimiento_semanal",     // | "tesoro_10a" | "fed_objetivo"
      "termino": "30",                  // "30" | "15" | null
      "direccion": "sube",              // | "baja"
      "magnitudPp": 0.19,
      "detectadaEn": "2026-09-18T13:00:07Z",
      "fechaFuente": "2026-09-17",
      "fuente": { "id": "freddie-pmms", "nombre": "Freddie Mac PMMS", "url": "https://www.freddiemac.com/pmms" },
      "semanalPendiente": false,        // true for tesoro_10a / fed_objetivo (weekly average not yet republished)
      "datos": null                     // fed_objetivo: { "desde": "3.50–3.75", "hasta": "3.75–4.00" }
    }
  ],
  "fuentesSenal": [                     // shown in the sources area (Story 4)
    { "id": "tesoro-10a", "nombre": "Tesoro de EE. UU. · rendimiento a 10 años", "mide": "…", "frecuencia": "Diaria, días hábiles", "url": "https://home.treasury.gov/..." },
    { "id": "nyfed-objetivo", "nombre": "Reserva Federal · rango objetivo", "mide": "…", "frecuencia": "Cuando el Fed decide", "url": "https://www.federalreserve.gov/monetarypolicy/openmarket.htm" }
  ]
}
```

The numbers above only illustrate the shape.

**Banner priority** when several alerts are active: `fed_objetivo` > `movimiento_semanal` (30) > `movimiento_semanal` (15) > `tesoro_10a`; the banner shows the first and links to the block, which lists all.

## Failure behavior

| Situation | Response | Front-end behavior |
|---|---|---|
| Pre-launch (`TASAS_LANZADO = false` in the browser script) | no request is made | Nothing rendered anywhere: no block, no banner, no message. |
| Owner switched the feature off (`activo = false`) | `200 { "version":1, "activo": false }` | Block stays hidden; no banner. |
| Launched, never published | `200` with `frescura:"sin_datos"`, `terminos:null`, `alertas:[]` | Block shows "Todavía no está disponible" (FR-009); no banner. |
| Last publish overdue | `200` with `frescura:"sin_actualizar"` and the last figures | Block keeps the figures and dates, adds visible "No se pudo actualizar" notice (FR-008). Alerts still shown if active. |
| Database unreachable (after launch) | `503 { "estado":"no_disponible" }` (no cache) | Block becomes visible with the honest "no disponible ahora"; banner: shows nothing (FR-022). |
| Network/JS failure in the browser (after launch) | — | Block visible with the same honest message; banner: nothing; the rest of the page is unaffected. |

## Guarantees the tests pin

- `terminos.*.valor` and `fechaFuente` are exactly what Freddie Mac published; `cambioPp` is `valor − previo` to 3 decimals.
- No prose, advice or prediction words in any field; wording is built client-side.
- Every `alertas[*]` carries `tipo`, `direccion`, `magnitudPp`, `fechaFuente`, `fuente` (FR-011).
