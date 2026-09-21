# Cartas en español e inglés (analizador de reporte de crédito)

En `credito.html`, después de analizar un reporte, cada carta (corrección de datos
personales, disputa al buró y validación de deuda) se muestra en **dos columnas**:

- **Izquierda — «Para que la entiendas — español»:** para que la persona sepa qué dice.
- **Derecha — «Para enviar — English»:** la carta que se manda al buró o a la agencia de
  cobranza (son empresas de Estados Unidos y leen inglés).

En pantallas de escritorio cada párrafo en español queda al lado de su equivalente en
inglés. En el teléfono se apilan: primero todo el español y luego todo el inglés. Al
imprimir sale solo el inglés.

El botón **«Copiar carta en inglés»** copia únicamente el texto en inglés (sin etiquetas
ni español). No hay botón para copiar el español a propósito, para que nadie mande la
versión equivocada.

## Cómo está hecho

Todo vive en `cartas-bilingues.js`. Cada carta es **una sola lista de bloques** y cada
bloque trae su versión en español (`es`) y en inglés (`en`) lado a lado. Los datos de la
persona se meten una vez por el mismo camino en las dos, así que no se pueden
desalinear. No usa IA, no traduce nada, no sale a la red y no guarda nada.

- El **español** es exactamente el texto que el sitio ya tenía (se comprobó carácter por
  carácter contra las cartas anteriores).
- El **inglés** es su equivalente en tono formal de carta de negocios. No agrega ni quita
  ninguna petición ni cita legal: Fair Credit Reporting Act (15 U.S.C. § 1681i, § 611 y
  § 611(d), plazo de 30 días, resultado en 5 días hábiles, 6 meses / 2 años) para las cartas
  al buró y Fair Debt Collection Practices Act (15 U.S.C. § 1692g) para la de la agencia.

### Lo que la persona escribe no se traduce

Nombres, direcciones, referencias de cuenta y el **«Detalle adicional»** se copian **tal
cual** en las dos columnas; igual lo que dice el reporte (nombres, teléfonos y direcciones
detectados). Solo se traduce lo que genera el sitio. Si la persona escribe el «Detalle
adicional» en español, aparece un aviso junto a la carta: *«La línea “Detalle adicional”
está en tus propias palabras. Revísala o escríbela en inglés antes de enviar.»* Sin
detalle, no hay aviso.

### Qué se envía a la red

Nada. Las cartas se arman en el navegador. La analítica solo recibe dos eventos con el
tipo de carta (`carta-generada`, `carta-ingles-copiada`), nunca su contenido.

## Cómo cambiar un párrafo

1. Abre `cartas-bilingues.js` y busca el bloque (por ejemplo `fcra-investigacion`).
2. Edita **el español y el inglés juntos**. Si cambias la petición o la cita legal en uno,
   cámbiala en el otro.
3. Corre las pruebas: `node --test tests/*.test.js` (con Node 22 o más nuevo, `node --test tests/`
   sin el `*.test.js` no encuentra las pruebas).

Las pruebas (`tests/cartas-bilingues.test.js`) fallan si: falta un bloque en un idioma; un dato
de la persona sale en un idioma y en el otro no; las citas legales o los plazos no coinciden;
queda español dentro del inglés; algún texto dice «es ilegal», promete un resultado o le dice a
la persona qué hacer; o el texto en inglés lleva etiquetas.

### Los hallazgos del analizador tienen clave

Cada hallazgo que puede dar una carta lleva una clave estable (`bankruptcy`, `foreclosure`,
`repossession`, `charge-off`, `collection`, `late-payments`, `past-due-amount`, `inquiries`) en
`credito.html` (último parámetro de `addNegative`). La carta en inglés usa el nombre en inglés
de esa clave; el título en español que ve la persona no cambia. Si agregas un hallazgo nuevo
con carta, dale clave y agrega su nombre en inglés en `ETIQUETAS_HALLAZGO` de
`cartas-bilingues.js`; si no, la carta en inglés usará la frase neutra «the account or
information identified in my credit report» (nunca el título en español).

Lo mismo con las etiquetas de los datos detectados (`Nombre o alias`, `Teléfono`, `Dirección`):
una prueba lee `credito.html` y falla si aparece una etiqueta sin traducir.

## Revisión pendiente antes de presentarlo como listo (Principio V de la constitución)

El inglés lo escribió una IA. Hasta que alguien lo revise, la página dice que el borrador en
inglés lo revisa la persona antes de enviarlo y **no** afirma que esté revisado por un
profesional.

- [ ] Una persona que hable inglés con fluidez (mejor si conoce cartas de crédito en EE. UU.)
      revisó las tres cartas en inglés: naturalidad, formalidad, errores.
- [ ] Una revisión legal (abogado o asesor de crédito autorizado) revisó **ambos** idiomas:
      que las citas (FCRA § 611 / 15 U.S.C. § 1681i; FDCPA 15 U.S.C. § 1692g), los plazos y las
      peticiones sean exactos y no prometan nada.
- [ ] Cambios que salieron de la revisión aplicados en `cartas-bilingues.js` (español e inglés
      juntos) y pruebas en verde.

| Revisión | Quién | Fecha | Notas |
|---|---|---|---|
| Inglés | | | |
| Legal | | | |

Cuando ambas estén hechas, anótalo aquí y quita el `TODO(NATIVE_REVIEW)` del encabezado de
`cartas-bilingues.js`.

## Fuera de alcance por ahora

La carta de «cese de comunicación» de `herramientas.html` sigue solo en español. Cuando se
quiera bilingüe, se agrega como un cuarto tipo en `cartas-bilingues.js` con el mismo método.
