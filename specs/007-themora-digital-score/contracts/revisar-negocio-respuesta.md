# Contract: `POST /.netlify/functions/revisar-negocio` — response changes

Request unchanged (`{ nombre, ciudad, giro, accessToken }`). Error, limit and `noConfigurado` responses unchanged.

## Success `200` — before → after

| Field | Before | After |
|-------|--------|-------|
| `ok`, `google`, `apple`, `sugerencias`, `conIA` | — | unchanged |
| `parametros` | rows with `cumplido`, `tuValor`, `meta`, `nota` | unchanged rows (shown as "Lo que encontramos"); no weights exposed |
| `puntaje` | 0–100 "percent of weight met" | **removed** |
| `tds` | — | **new**: `ResultadoTDS` (see data-model.md) |
| `entradaTDS` | — | **new**: the `EntradaTDS` used, so the page can compute actions and the simulator with `tds.js` without a new search |

```json
{
  "ok": true,
  "google": { "...": "unchanged" },
  "apple": { "...": "unchanged" },
  "sugerencias": ["..."],
  "parametros": [{ "clave": "presencia", "etiqueta": "...", "cumplido": true, "tuValor": "...", "meta": "...", "nota": null }],
  "tds": {
    "tds": 30,
    "banda": "invisible",
    "parcial": true,
    "pilaresMedidos": 4,
    "multiplicador": 1,
    "referencia": { "valor": 4.7, "origen": "fija", "cantidad": 0 },
    "pilares": [
      { "clave": "reputacion", "peso": 0.3, "pesoAplicado": 0.333, "valor": 63.8, "razon": "..." },
      { "clave": "visibilidad", "peso": 0.25, "pesoAplicado": 0.278, "valor": 30, "razon": "..." },
      { "clave": "fundamentos", "peso": 0.2, "pesoAplicado": 0.222, "valor": 0, "razon": "..." },
      { "clave": "completitud", "peso": 0.15, "pesoAplicado": 0.167, "valor": 0, "razon": "..." },
      { "clave": "actividad", "peso": 0.1, "pesoAplicado": 0, "valor": null, "razon": "No lo pudimos comprobar: ..." }
    ]
  },
  "entradaTDS": { "encontrado": true, "calificacion": 5, "totalResenas": 1, "sitioWeb": false, "horarioCompleto": false, "fotos": 0, "posicionGiro": null, "giroMedible": true, "referencia": { "valor": 4.7, "origen": "fija", "cantidad": 0 } },
  "conIA": false
}
```

## Rules

- `tds` is computed only by `tds.js`; the function never computes a score on its own.
- `entradaTDS` contains no business name, address, phone or review text.
- Apple presence stays in `parametros` and never changes `tds` (FR-010).
