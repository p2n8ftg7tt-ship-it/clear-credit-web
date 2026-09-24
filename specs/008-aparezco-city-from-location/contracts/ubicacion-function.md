# Contract: `GET /.netlify/functions/ubicacion`

Approximate city of the visitor, from Netlify's `context.geo`. Public, no session, no body.

## Request

`GET` with no parameters. Any other method → `405 { "error": "Método no permitido." }`.

## Response `200`

```json
{ "ciudad": "Houston", "estado": "TX" }
```

or, when not usable (non-US, no city, no subdivision, geo missing):

```json
{ "ciudad": null, "estado": null }
```

## Headers (always)

- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: private, no-store`

## Guarantees

- Never returns latitude, longitude, postal code, timezone, IP or country name.
- Never writes the location to logs, storage or analytics.
- Never throws to the client: any internal error → `200 { "ciudad": null, "estado": null }`.
- `ciudad` is trimmed and at most 80 characters; `estado` is exactly two uppercase letters or null (the page applies the 50-states-+-DC rule).
