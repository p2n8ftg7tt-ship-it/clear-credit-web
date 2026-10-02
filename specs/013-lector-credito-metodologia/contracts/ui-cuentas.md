# Contract — Interfaz del lector: «Tus cuentas, una por una» y rediseño visual

Dirección visual trabajada con la guía *frontend-design*, dentro del sistema «Mar en calma» (spec 012). **No se cambian tamaños de letra del sitio** (preferencia del dueño): se reutiliza la escala `--text-*`.

## 1. De qué trata y para quién

- **Tema**: el reporte de crédito de una persona, el mismo papel que tiene en la mano o en su PDF.
- **Público**: hispanohablantes en EE. UU., muchas veces leyendo desde el teléfono, frente a un documento en inglés que les da miedo.
- **Trabajo principal de la pantalla**: que la persona encuentre **su cuenta** y vea con calma qué dice cada campo, sobre todo las fechas, que son lo que más confunde.

## 2. Plan de diseño (primera pasada)

**Color**: cinco valores con nombre, todos ya son tokens del sitio.

| Nombre | Hex | Papel en el lector |
|---|---|---|
| Tinta | `#123F4F` | Nombres de acreedor, cifras y texto principal |
| Copia lavanda | `#ECEAF7` y franja `#8C86C9` | El papel de cada ficha; la franja identifica la herramienta de crédito |
| Renglón | `#D3E2E4` | Las líneas del papel y los meses al día en la franja de historial |
| Resaltador | `#FFE27A` | **Solo** DOFD, fecha de charge-off, vencido mayor que cero y monto de charge-off |
| Corrector | `#C7372F` | Meses con atraso, cobranza o charge-off en el historial; nada más |

**Tipografía**:
- **Bricolage Grotesque** para el nombre del acreedor y las cifras, con `font-variant-numeric: tabular-nums` para que montos y fechas se alineen en columna.
- **Literata** para etiquetas, explicaciones y «no reportado», este último en cursiva y en `--muted`.
- Las etiquetas van en minúscula inicial, nunca en mayúsculas sostenidas.

**Maquetación**: el resultado es una pila de **fichas de cuenta** sobre papel rayado. En escritorio, a la izquierda hay un índice fijo con las cuentas; en el teléfono, ese índice es un desplegable arriba.

```text
Escritorio (≥ 1000 px)
┌───────────────┬────────────────────────────────────────────────┐
│ Tus cuentas   │ ▔▔▔▔▔▔▔▔ franja lavanda ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│ (índice fijo) │ BLUE EAGLE CREDIT UNION            Abierta      │
│               │ Tarjeta de crédito, individual. Cuenta *7291    │
│ ● Discover    │ ─────────────────────────────────────────────── │
│ ● Blue Eagle  │ saldo            $294   límite           $500   │
│ ● Blue Eagle  │ vencido   no reportado  pago programado   $20   │
│   (cerrada)   │ ─────────────────────────────────────────────── │
│ ● Santander   │ abierta     05/01/2024  primer atraso (DOFD) —  │
│   (cerrada)   │ último pago 03/31/2026  reportada   04/23/2026  │
│               │ ─────────────────────────────────────────────── │
│ Consultas     │ Historial de pagos                              │
│ Datos         │ 2025 ▭▭▭▭▭▭▭▭▭▭▭▭  2026 ▭▭█▭···                 │
│ personales    │            E F M A M J J A S O N D   (30 = rojo)│
│               │ ▸ De dónde salió cada dato                      │
└───────────────┴────────────────────────────────────────────────┘

Teléfono (< 760 px)
┌──────────────────────────────┐
│ ▾ Ir a una cuenta (6)        │
│ ▔▔▔▔ franja lavanda ▔▔▔▔▔▔▔▔ │
│ BLUE EAGLE CREDIT UNION      │
│ Abierta. Tarjeta, *7291      │
│ saldo                   $294 │
│ límite                  $500 │
│ …                            │
│ 2026 ▭▭█▭▭▭▭▭▭▭▭▭            │
│ 2025 ▭▭▭▭▭▭▭▭▭▭▭▭            │
└──────────────────────────────┘
```

- **Alineación**: todo a la izquierda; las cifras alineadas a la derecha dentro de su renglón.
- **Largo de línea**: 70 caracteres como máximo en los textos explicativos.

**Principios**:
1. **La ficha se parece al reporte, pero ordenado**: las fechas se muestran tal como las imprime el buró (`05/01/2024`), para que la persona pueda cotejarlas con su papel sin traducir formatos.
2. **El amarillo es escaso**: si todo está resaltado, nada lo está. Se usa en un máximo de cuatro campos, y solo cuando tienen valor.
3. **Un solo elemento llamativo: la franja del historial**. Todo lo demás es quieto: sin sombras, sin degradados y sin efectos al pasar el mouse sobre las fichas.
4. **Lo ausente se dice en palabras**: «no reportado», nunca un guion suelto ni un cero.
5. **Un solo movimiento**: al aparecer los resultados, el resaltador pasa una vez sobre los campos resaltados de la primera ficha, como en el hero. Con `prefers-reduced-motion`, aparece ya pintado.

## 3. Revisión contra el brief (segunda pasada)

| Idea de la primera versión | Por qué parecía genérica | Cambio |
|---|---|---|
| Contadores grandes en cajas (cuentas, cobranzas, consultas) | Es el tratamiento por defecto de «número grande y etiqueta chica» | El resumen se escribe como una frase: «Encontramos 6 cuentas: 3 abiertas y 3 cerradas. Una aparece como charge-off pagado. Hay 18 consultas duras y 12 blandas.» Las cajas actuales de la Fase 0 (puntaje, utilización) se reducen a un solo renglón |
| Metadatos del documento unidos con « · » | Señal de plantilla | Frase completa: «Reporte de Equifax del 24 de mayo de 2026. Leímos las 14 páginas.» |
| Botón «Evaluar documento →» | La flecha añadida es una muletilla | «Leer mi reporte» sin flecha; el texto del progreso dice lo mismo («Leyendo tu reporte…») |
| Tarjetas con sombra y radio para cada cuenta | El «kit SaaS» | Fichas de papel sin sombra, con renglones y franja superior, que ya es el lenguaje `.copia-*` del sitio. Radio de 6 px, el del sistema |
| Índice con numeración 01/02/03 | Las cuentas no son una secuencia | Índice con el nombre del acreedor y su estado; sin números |
| Etiquetas «SALDO», «LÍMITE» en mayúsculas | Mayúsculas sostenidas en etiquetas | Minúscula inicial en Literata |

El dueño ya descartó el café/dorado, el Apple y el BMW. Este plan no introduce colores nuevos: el carácter sale de la metáfora del papel, del resaltador y de la franja del historial.

## 4. Marcado (contrato para `credito.html`)

Dentro de `#crResults`, después del resumen y antes de «Puntos negativos», va:

```html
<section class="lc-cuentas" id="crCuentas" aria-labelledby="crCuentasTitulo">
  <h3 id="crCuentasTitulo">Tus cuentas, una por una</h3>
  <p class="lc-resumen" id="crResumenFrase"></p>
  <p class="lc-aviso" id="crAvisosLectura" hidden></p>
  <div class="lc-cuerpo">
    <nav class="lc-indice" aria-label="Cuentas del reporte"><!-- <details> en el teléfono --></nav>
    <div class="lc-fichas" id="crFichas"><!-- una <article class="lc-ficha"> por cuenta --></div>
  </div>
</section>
```

Cada ficha:

```html
<article class="lc-ficha" id="cuenta-{id}" aria-labelledby="cuenta-{id}-t" data-estado="abierta|cerrada|cobranza">
  <header>
    <h4 id="cuenta-{id}-t">{acreedor}</h4>
    <p class="lc-sub">{tipo}, {responsabilidad}. Cuenta {número enmascarado}</p>
    <span class="lc-estado">{Abierta | Cerrada | En cobranza}</span>
  </header>
  <dl class="lc-campos"> <!-- pares dt/dd; dd.lc-vacio para «no reportado»; dd.lc-resaltado para los 4 campos -->
  </dl>
  <div class="lc-historial" role="group" aria-label="Historial de pagos de {acreedor}">
    <!-- una fila por año; celdas <span class="lc-mes" data-codigo="al_dia|atraso_30|…|sin_datos" title aria-label="marzo de 2026: 30 días de atraso"> -->
    <!-- los meses no verificables: <p class="lc-nota">En 2026 hay un atraso de 30 días cuyo mes no se pudo ubicar.</p> -->
  </div>
  <details class="lc-origen"><summary>De dónde salió cada dato</summary><ul>…</ul></details>
</article>
```

**Orden de campos en la ficha** (solo los que existen en el registro):
1. Dinero: saldo; límite, monto original o saldo más alto; vencido; pago programado; pago real; monto de charge-off.
2. Fechas: abierta, primer atraso (DOFD), charge-off, enviada a cobranza, último pago, última actividad, reportada, cerrada.
3. Otros: estado, designador de actividad, plazo, meses revisados, acreedor original, códigos narrativos, comentarios.

**Consultas y datos personales** van en el mismo `lc-cuerpo` como dos bloques finales:
- Consultas duras y blandas en listas separadas, agrupadas por empresa con sus fechas.
- Datos personales: nombres, direcciones y teléfonos, y la frase «El reporte muestra tu número de Seguro Social enmascarado» o «tu fecha de nacimiento», sin repetir los valores.

## 5. Requisitos de calidad

- **Accesibilidad**:
  - Cada celda del historial tiene `aria-label` con el mes y el estado en palabras.
  - El color nunca es la única señal: los atrasos muestran su número dentro de la celda, y la cobranza y el charge-off llevan su sigla.
  - Contraste de al menos 4.5:1 en el texto.
  - Foco visible con `--focus-ring`.
  - El índice es navegable con teclado.
- **Teléfono**: sin desplazamiento horizontal desde 320 px; el historial pasa a 12 celdas por fila.
- **Impresión**: las fichas se imprimen una tras otra sin cortar una ficha a mitad de página (`break-inside: avoid`); el índice y el movimiento se ocultan.
- **Rendimiento**: con 60 cuentas se dibuja en un solo `innerHTML` por bloque, sin animar cada ficha.
- **Seguridad**: todo texto del reporte pasa por `escapeHtml` antes de insertarse.
- **Vigilancia**: `tests/sistema-visual.test.js` sigue pasando. No se añaden colores sueltos fuera de los tokens ni tamaños de letra nuevos.

## 6. Cambios visuales en lo que ya existe (mismo alcance)

- **Zona de carga**:
  - La caja punteada pasa a ser una hoja lavanda con renglones y la franja de crédito.
  - Se quita el círculo con icono.
  - El texto principal es «Sube tu reporte de Equifax, Experian o TransUnion».
  - Se conserva el aviso de privacidad («El archivo no sale de tu teléfono»).
- **Progreso**: se quita el círculo giratorio. En su lugar hay un renglón que se va resaltando mientras se leen las páginas, con el texto «Leyendo la página 4 de 14», y sin movimiento cuando la persona prefiere reducirlo.
- **Estado general** (`.cr-health`): se quitan los fondos translúcidos con rgba sueltos y se usan las copias rosa, celeste o verde con su franja.
