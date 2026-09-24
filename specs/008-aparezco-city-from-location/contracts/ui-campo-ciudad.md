# Contract: "Ciudad y estado" field on `aparezco.html`

## Module `ciudad-sugerida.js` (browser global `ThemoraCiudad`, CommonJS export for tests)

| Function | Input | Output |
|----------|-------|--------|
| `formatear(ciudad, estado)` | raw strings | `"Ciudad, ST"` or `null` if state not in 50 + DC or city empty |
| `desdePerfil(metadata)` | user metadata `{ city, state_zip }` | `"Ciudad, ST"` or `null` |
| `codigoEstado(texto)` | `"VA"`, `"VA 24011"`, `"Virginia"`, `"Nuevo México 87501"` | two-letter code or `null` |
| `clasificar({ valor, sugerido, origen })` | field value at search time | `perfil \| detectada \| editada \| escrita \| vacia` |

## Page behavior

1. On load, start the lookup at once (signed-in profile when `CCAuth` is ready; otherwise `GET /.netlify/functions/ubicacion`, 2 s timeout).
2. Apply only if the field is empty and not touched (`input` event) during the visit.
3. When applied: the field gets the value (normal text color), and a note appears under it:
   *"Detectamos tu ciudad. Si tu negocio está en otra, escríbela aquí."* (profile: *"Usamos la ciudad de tu perfil. Si tu negocio está en otra, escríbela aquí."*).
4. A clear button "×" (`aria-label="Borrar la ciudad"`, at least 40×40 px touch target) is visible while the field has text; it empties the field and focuses it.
5. On "Buscar mi negocio" with an empty city: no request; message *"Escribe la ciudad y el estado donde está tu negocio (por ejemplo: Houston, TX)."*, field focused and marked invalid.
6. The result states the city used ("Buscamos en: Houston, TX").
7. Failure of any kind: no message; field as today (placeholder "Roanoke, VA").

## Privacy note text (added to the existing `.ap-privacy` block)

*"Te sugerimos la ciudad según tu conexión a internet; no la guardamos y puedes cambiarla."*

## Analytics

`aparezco-empezar` gains `ciudad: perfil | detectada | editada | escrita`. No city text, ever.
