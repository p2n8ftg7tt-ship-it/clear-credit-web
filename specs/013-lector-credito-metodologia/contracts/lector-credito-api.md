# Contract — `ThemoraLector` y `ThemoraLectorPerfiles`

Son dos módulos de la raíz con el mismo patrón que `tds.js` y `cartas-bilingues.js`:

- En el navegador se exponen como `window.ThemoraLector` y `window.ThemoraLectorPerfiles`.
- En Node, `module.exports`.
- No tocan el DOM, no hacen llamadas de red y no escriben en `localStorage`.

Orden de carga en `credito.html`: primero `lector-credito-perfiles.js` y después `lector-credito.js`, ambos con `defer`, antes del script del analizador. En Node, `lector-credito.js` hace `require('./lector-credito-perfiles.js')` si no encuentra el global.

## Entrada común: `Pagina`

```text
Pagina = {
  numero: number,                 // desde 1
  lineas: [{
    texto: string,                // línea completa, espacios normalizados
    piezas?: [{ texto: string, x: number }]   // solo PDF: posición horizontal de cada fragmento
  }]
}
```

`credito.html` construye las páginas así:

- **PDF**: fragmentos de pdf.js agrupados por línea según `transform[5]`, con tolerancia de 2 pt, y ordenados por `transform[4]`.
- **Word**: una sola página, con una línea por cada párrafo de mammoth.
- **Excel/CSV**: una página por hoja, con una línea por fila; las celdas se unen con dos espacios.

## `ThemoraLector.leerReporte(paginas, opciones?) → Reporte`

- **`paginas`**: `Pagina[]`, máximo 150.
- **`opciones.paginasTotales`**: número. Si es mayor que `paginas.length`, se añade la advertencia `paginas_truncadas`.
- **`opciones.buro`**: fuerza un perfil. Sirve para pruebas y para cuando la persona corrige el buró detectado.
- **Devuelve** un `Reporte` ([data-model.md](../data-model.md)). **No lanza errores** ante texto raro: lo que no entiende queda fuera y, si es relevante, se registra como `advertencia`.
- **Lanza** `TypeError` solo si `paginas` no es un arreglo.
- Es **determinista**: la misma entrada siempre produce la misma salida. Esto lo exigen los fixtures con resultado esperado.

## `ThemoraLector.detectarBuro(paginas) → { buro, puntaje, formatoVerificado }`

Es la función que hoy vive en `credito.html` como `detectCreditBureau`, movida al módulo y alimentada por `perfil.detectar`. Un empate o una puntuación cero devuelven `{ buro: 'desconocido', formatoVerificado: false }`.

## Utilidades expuestas (y probadas)

| Función | Contrato |
|---|---|
| `normalizarFecha(texto)` | → `{ texto, iso }` o `null`. Nunca inventa el día (R7) |
| `normalizarMonto(texto)` | → número, o `null` si está vacío, es «-» o es «—» (R8) |
| `enmascararCuenta(texto)` | → cadena con solo los últimos 4 dígitos visibles (R9) |
| `codigoPago(texto, buro)` | → código común (R11) o `'desconocido'` |
| `resumen(reporte)` | → `{ cuentas, abiertas, cerradas, rotativas, cobranzas, consultasDuras, consultasBlandas, registrosPublicos }`. Sustituye a `extractAccountsSummary` y `extractInquiriesSummary` en la página |

## `ThemoraLectorPerfiles`

```text
{
  equifax:    Perfil,
  experian:   Perfil,
  transunion: Perfil,
  generico:   Perfil,
  version:    '2026-09-30'
}

Perfil = {
  id, nombre,
  fuente: string,               // de dónde salen las etiquetas (guía pública o «formato observado, mayo 2026»)
  verificadoEl: 'AAAA-MM-DD',
  detectar: { fuertes: RegExp[], menciones: RegExp },
  ruido: RegExp[],              // encabezados y pies repetidos, leyendas, textos educativos
  finDeDatos: RegExp[],         // p. ej. /a summary of your rights under the fair credit reporting act/i
  secciones: [{ patron: RegExp, seccion: SeccionCanonica }],
  inicioCuenta: { tipo: 'linea_siguiente' | 'etiqueta', patron: RegExp, siguiente?: RegExp },
  etiquetas: [{ patron: RegExp, campo: string, tipo: 'texto'|'fecha'|'monto'|'numero'|'cuenta' }],
  codigosPago: { [impreso: string]: CodigoComun },
  codigosNarrativos?: { [codigo: string]: string },
  reglas: string[]              // ids de reglas especiales que el motor sabe aplicar
}
```

**Invariantes** (las vigila `tests/lector-credito-perfiles.test.js`):

1. Los cuatro perfiles tienen `fuente` y `verificadoEl` con fecha válida.
2. Ningún `campo` de `etiquetas` queda fuera de los campos definidos en el modelo de datos.
3. Todos los valores de `codigosPago` pertenecen al vocabulario común (R11).
4. El perfil genérico no tiene `detectar.fuertes` y sí tiene alias en español.
5. Los perfiles no contienen datos de ninguna persona: ni nombres propios, ni direcciones, ni números.

## Errores y casos límite

| Entrada | Resultado |
|---|---|
| Páginas sin texto (PDF escaneado) | `Reporte` vacío con la advertencia `sin_texto`. La página dice que no pudo leer texto, **no** que el reporte está limpio |
| Buró no reconocido | Perfil genérico y advertencia `formato_no_verificado` |
| Código de pago desconocido | `codigo:'desconocido'` y se conserva el texto |
| Cuenta sin acreedor legible | Se conserva, con `acreedor.estado:'no_reportado'` |
| Número de cuenta completo | Se enmascara |
