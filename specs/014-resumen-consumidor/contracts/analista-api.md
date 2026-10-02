# Contract — `ThemoraAnalista` (analista-credito.js)

Módulo de la raíz con el mismo patrón que `lector-credito.js`: `window.ThemoraAnalista` en el navegador, `module.exports` en Node. No toca el DOM, no hace llamadas de red, no escribe en `localStorage`. Se carga con `defer` después de `lector-credito.js`.

## `analizar(reporte, opciones?) → Analisis`

- **`reporte`**: el `Reporte` de `ThemoraLector.leerReporte()`.
- **`opciones.hoy`**: fecha ISO para pruebas; por defecto, la fecha del reporte (no la del reloj), para que el cálculo de obsolescencia sea reproducible.
- **Devuelve** un `Analisis` ([data-model.md](../data-model.md)). Determinista.
- **Lanza** `TypeError` solo si `reporte` no es un objeto con `cuentas`.

## `REGLAS` (exportado, solo lectura)

`[{ id, gravedad, detecta(cuenta, reporte) → { fecha?, dato, origen } | null, textos: { queSignifica, opciones[], noCubierto? }, citas: [{ ley, seccion, texto }], carta }]`

Invariantes (las vigila `tests/analista-credito.test.js`):

1. Toda `cita.seccion` aparece en `zyron-leyes.js`.
2. Ningún texto contiene `debes`, `no pagues`, `es ilegal`, `garantiz` ni `cliente`.
3. Toda regla roja o naranja tiene al menos una opción y una cita.
4. Los textos no contienen datos de ninguna persona.

## Utilidades expuestas (y probadas)

| Función | Contrato |
|---|---|
| `iniciales(acreedor)` | 1–2 letras mayúsculas; nunca vacío («?» si no hay letras) |
| `nombreCorto(acreedor)` | ≤ 22 caracteres, sin sufijos corporativos |
| `esObsoleta(cuenta, fechaReporte)` | booleano según R2/R3 de research.md; `false` si no hay fecha de inicio verificable |
| `paraGuardar(analisis)` | La forma que espera `CCAuth.saveAnalysis()`; sin SSN, nombres ni direcciones |

## Cambios en `ThemoraLector` (lector-credito.js)

- `identidad.ssnUltimos4`: ver data-model. El número completo nunca sale de la función que lee la línea.
- `identidad.nombres` sin identificadores.
- `cuenta.marcaNegativaBuro: true` cuando Experian imprime «POTENTIALLY NEGATIVE» sobre el bloque de la cuenta.
- Estado con «written off» → `montoChargeOff` si trae monto y código de charge-off.

Las pruebas existentes (`tests/lector-credito*.test.js`) deben seguir pasando; los fixtures esperados se actualizan solo en los campos nuevos.
