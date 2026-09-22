# Contract: snapshot change — `ultimaRevisionEn`

Amends [`specs/004-mortgage-rate-agent/contracts/snapshot-public.md`](../../004-mortgage-rate-agent/contracts/snapshot-public.md). Everything in that contract still holds; this file only adds one field and one read.

## Request

Unchanged: `GET /.netlify/functions/tasas-hipoteca` — no body, no auth, no query parameters. Same caching (`public, max-age=60, s-maxage=300, stale-while-revalidate=600`).

## Response addition (`200`, only when `activo: true`)

```jsonc
{
  "version": 1,                              // unchanged
  "activo": true,
  "frescura": "al_dia",
  "publicadoEn": "2026-09-22T13:00:05Z",
  "ultimaRevisionEn": "2026-09-24T13:00:04Z", // NEW: latest run in which at least one source answered; null if none / unreadable
  "...": "all other 004 fields unchanged"
}
```

| Field | Type | Rule |
|---|---|---|
| `ultimaRevisionEn` | `string` (UTC ISO 8601) \| `null` | Start time of the most recent `tasas_corridas` row whose `resultado` is `ok` or `parcial`. `null` when there is none or when that single read failed. |

The shape illustrates structure only; the numbers and dates are examples.

## Server behavior

- One extra read, in parallel with the two existing ones: `tasas_corridas?resultado=in.(ok,parcial)&order=corrida_en.desc&limit=1&select=corrida_en` with the service-role key.
- **Failure isolation**: if only this read fails, the response is still `200` with `ultimaRevisionEn: null` (the houses then make no claim beyond `frescura`). The response stays `503 { "estado": "no_disponible" }` only in the cases 004 already defined (config or published-snapshot read failed).
- The `activo: false` response (`{ "version": 1, "activo": false }`) is unchanged and does not read runs.
- No other run-log data is ever exposed (no type, per-source results, error text, counts, durations).

## Consumer rules

- A consumer MUST treat a missing or `null` field as "unknown" and MUST NOT display an "active" claim that depends on it; it falls back to `frescura` alone.
- A consumer MUST NOT show the raw timestamp as a rate figure or send it to analytics.

## Guarantees the tests pin

- `construirRespuestaPublica` copies `ultimaRevisionEn` through unchanged (ISO string or `null`).
- The function returns `200` with `ultimaRevisionEn: null` when the runs read fails and the other reads succeed.
- The function never adds any other field from `tasas_corridas` to the response.
- `activo: false` response is byte-identical to before.
