# Contract: owner status (`tasas-admin`)

Owner-only view of the agent's health (Story 5, FR-020, FR-031). Nothing is pushed to the owner; the owner opens the view and reads it.

- **Request**: `GET /.netlify/functions/tasas-admin` with `Authorization: Bearer <Supabase access token>` (same as the admin panel's existing calls).
- **Authorization**: the function confirms the token belongs to a real session (`/auth/v1/user`, anon key) **and** `app_metadata.is_admin === true`; otherwise `401` (no token / invalid) or `403` (not admin), with a short message and **no data**. No other signed-in user and no visitor can read it.
- **Caching**: `Cache-Control: no-store`.
- **Side effects**: none (read-only).

## Response `200`

```jsonc
{
  "activo": false,                         // current launch switch (tasas_config.activo)
  "umbralPp": 0.125,
  "ultimaCorridaOk": "2026-09-21T13:00:05Z", // last run with resultado ok|parcial that published (Mon/Tue) or watched
  "horasDesdeUltimaOk": 3,
  "publicadoEn": "2026-09-21T13:00:05Z",   // last successful publish
  "frescura": "al_dia",
  "corridas": [                            // newest first, up to 60
    {
      "corridaEn": "2026-09-21T13:00:05Z",
      "tipo": "publicacion",               // | "vigilancia"
      "resultado": "ok",                   // | "parcial" | "fallo"
      "fuentes": { "freddie-pmms": "ok", "tesoro-10a": "ok", "nyfed-objetivo": "ok" },
      "publicadas": 2, "retenidas": 0, "alertaNueva": false, "duracionMs": 2380
    }
  ],
  "retenidas": [                           // readings waiting for the owner (FR-019)
    { "id": 88, "serie": "pmms30", "valor": 8.12, "fechaFuente": "2026-09-17", "nota": "salto > 1.0 pp" }
  ],
  "alertasActivas": [ /* same shape as the public alertas[] */ ],
  "diasEsperados": [                       // last 14 days: which days had a run, so a miss is visible at a glance
    { "dia": "2026-09-21", "esperada": "publicacion", "hubo": true }
  ]
}
```

## Owner-view requirements it must satisfy

- Shows, without reading code: each run's outcome and which sources answered or failed (FR-020); the age of the last successful run; readings held as implausible; whether an alert is active.
- `diasEsperados` makes a **missed run** (no row for an expected day) visible even though the run itself could not log anything.
- Error text in `fuentes` is a short category (`timeout`, `http 503`, `formato inesperado`), never a URL with keys or a stack trace.

## Front-end placement

A new "Agente de tasas" section in `admin.html` (owner-only page, already gated), loaded with the same token the panel already holds. It reuses the panel's existing table styles.
