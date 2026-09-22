# Agente de tasas hipotecarias — cómo dejarlo funcionando

Esta guía es para ti, Eddie. Explica cómo poner en marcha el agente que vigila las tasas de
hipoteca a **30 y 15 años** y las muestra en la página **Comprar casa**, y cómo probarlo antes de
que el público lo vea.

> **Hasta que termines los pasos 1 a 7, el sitio no dice nada de esta función.** Todo viene
> apagado con dos interruptores: `TASAS_LANZADO` (dentro de `tasas-hipoteca.js`) y `activo` (en la
> base de datos). No hace falta tocar nada para que el sitio siga como está hoy.

## Qué hace

- **Todos los días a las 13:00 UTC** (9 a. m. en verano de EE. UU., 8 a. m. en invierno) Netlify
  ejecuta solo la función `tasas-agente`. Netlify siempre usa hora UTC y solo la corre en el sitio
  publicado (no en las vistas previas).
- **Lunes y martes publica**: actualiza las cifras que ve la gente. **Los demás días solo vigila**:
  guarda lo que lee y, si hay un cambio importante, crea un aviso.
- **Lee tres fuentes públicas** (ver la sección de fuentes más abajo). Si una falla, conserva las
  últimas cifras publicadas y lo anota. **Nunca inventa ni estima un número.**
- **Un cambio importante** es un movimiento de **0.125 puntos** o más en la tasa a 30 o a 15 años,
  o un cambio del rango objetivo de la Reserva Federal. Aparece como aviso en Comprar casa y como
  una franja cerrable en las otras páginas.
- **Dato que parece imposible** (por ejemplo un salto de más de 1 punto en una semana): se
  **retiene**, no se publica, y lo ves en tu vista del panel.

Una cosa que conviene saber: **Freddie Mac publica una sola vez por semana (los jueves)**. Por eso
la cifra del lunes y la del martes normalmente son la misma. La página muestra siempre la fecha en
que Freddie Mac la publicó, junto a la fecha en que el agente la revisó.

## Paso 1 — Crear las tablas en Supabase

1. Abre tu proyecto en Supabase → **SQL Editor** → **New query**.
2. Copia el bloque del final de `supabase-schema.sql` que empieza con
   `-- Añadido: agente de tasas hipotecarias` (hasta el último `enable row level security`).
3. Pégalo y pulsa **Run**.
4. Comprueba: en **Table Editor** deben aparecer `tasas_config`, `tasas_lecturas`,
   `tasas_publicado`, `tasas_alertas` y `tasas_corridas`. En `tasas_config` hay **una fila**
   (`principal`) con `umbral_pp = 0.125` y `activo = false`.

Las tablas no tienen políticas públicas a propósito: solo las funciones de Netlify, con la llave de
servicio, pueden leerlas o escribirlas.

## Paso 2 — Variables de entorno en Netlify

No hay nada nuevo que crear. Comprueba que existan las mismas que ya usa el panel de administrador:
`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Las fuentes de tasas son
públicas y **no necesitan llave**.

## Paso 3 — Publicar y probar la primera corrida

1. Sube los cambios y espera el deploy de producción.
2. En Netlify → **Functions** → `tasas-agente`: debe mostrar el horario `0 13 * * *`.
3. Pulsa **Run now** (ejecutar ahora).
4. Abre el **panel de administrador** (`admin.html`) y baja hasta **Agente de tasas
   hipotecarias**. Debe haber una fila en "Últimas corridas" con resultado `ok` y las tres fuentes
   en `ok`.
5. Compara: las cifras que guardó el agente deben coincidir **exactamente** con las de
   <https://www.freddiemac.com/pmms>.

> **Si la fuente `tesoro-10a` dice `formato inesperado`:** el archivo del Tesoro se lee con las
> etiquetas `NEW_DATE` y `BC_10YEAR`, según la documentación pública del feed. Esta es la única
> parte que no se pudo comprobar con un archivo real de producción antes de publicar. Si pasa, el
> resto del agente sigue funcionando (solo se pierde el aviso por movimiento del Tesoro); avísale a
> quien mantiene el código con el mensaje que ves en la vista.

## Paso 4 — Probar una publicación un día que no es lunes ni martes

1. En Netlify → **Site configuration → Environment variables** agrega
   `TASAS_FORZAR_TIPO = publicacion`.
2. Vuelve a ejecutar `tasas-agente` con **Run now**.
3. En tu vista debe aparecer una corrida de tipo `publicacion` y "Publicado por última vez" con la
   hora de hoy.
4. **Borra la variable** `TASAS_FORZAR_TIPO` al terminar.

## Paso 5 — Probar un aviso

1. En Supabase → tabla `tasas_config`, cambia `umbral_pp` a `0.01`.
2. Ejecuta `tasas-agente` con **Run now**. En tu vista, "Avisos activos" debe mostrar al menos uno.
3. Vuelve a poner `umbral_pp` en `0.125`.
4. **Limpia la prueba antes de lanzar**: repite el Paso 4 (una corrida de publicación cierra todos
   los avisos activos) o cambia el `estado` de esas filas de `tasas_alertas` a `despejada`. Así no
   quedan avisos de prueba visibles el día del lanzamiento.

## Paso 6 — Ver cómo se retiene un dato dudoso (opcional)

1. En la tabla `tasas_lecturas`, inserta una fila de prueba con una fecha vieja para no estorbar:
   `fuente_id = freddie-pmms`, `serie = pmms30`, `valor = 9.99`, `fecha_fuente = 2000-01-06`,
   `estado = retenida`, `nota = prueba`.
2. Recarga tu vista: debe aparecer en **Lecturas retenidas**.
3. **Bórrala.**

**Cómo liberar una lectura retenida de verdad:** si revisas el dato y es correcto (por ejemplo, un
salto real), cambia su `estado` a `verificada` en la tabla `tasas_lecturas`. La siguiente corrida la
publicará.

## Paso 7 — Antes de lanzar

Todo esto debe estar en orden:

- [ ] La corrida de prueba del Paso 3 salió `ok` y coincide con Freddie Mac.
- [ ] Probaste una publicación (Paso 4) y borraste `TASAS_FORZAR_TIPO`.
- [ ] `umbral_pp` está en `0.125` y no quedan avisos de prueba (Paso 5).
- [ ] Aprobaste la **lista de fuentes** y la lista de **páginas con franja** (ver más abajo).
- [ ] Corriste las pruebas del proyecto y todas pasan: `node --test` (en la carpeta del proyecto).
- [ ] Ves con calma el texto público: título, aviso legal y frases de los avisos (salen todos de
      `tasas-texto.js`).

## Paso 8 — El lanzamiento (un solo commit, en este orden)

Nada de esto se hace antes de terminar el Paso 7.

1. **`privacidad.html`**: agrega una línea, en la parte donde se explica qué recuerda el sitio en
   tu navegador, que diga que si cierras el **aviso de tasas hipotecarias**, el sitio lo recuerda
   solo en tu propio navegador, no envía nada y no usa cookies. (Debe contener la frase
   «aviso de tasas hipotecarias».)
2. **`site-search-index.js`**: agrega una entrada con título «Tasas hipotecarias de referencia
   (15 y 30 años)», dirección `comprar-casa.html#tasas` y palabras clave como `tasa de hipoteca`,
   `tasas 30 años`, `tasas 15 años`, `tasa hoy`, `Freddie Mac`.
3. **`tasas-hipoteca.js`**: cambia `const TASAS_LANZADO = false;` por `true`.
4. Corre `node --test`. Hay una prueba que **falla si el interruptor está en `true` y falta la línea
   de privacidad o la entrada del buscador** (y al revés), para que no se te olvide ninguna.
5. Publica. Todavía no se ve nada, porque `activo` sigue en `false`.
6. En Supabase → `tasas_config` cambia `activo` a **`true`**. En unos minutos (la respuesta se
   guarda 5 minutos) aparece el bloque en Comprar casa.
7. Mira Comprar casa en el celular y en la computadora: sin barra de desplazamiento horizontal.

### Cómo apagarlo

En `tasas_config` pon `activo = false`. El bloque y la franja desaparecen (dentro de unos minutos)
sin necesidad de publicar nada.

## Cada cuánto mirar

No te llega ningún correo: el sistema **no te avisa**. Abre de vez en cuando la vista del panel:

- **Frescura** debe decir "Al día". Si dice "Sin actualizar", una corrida de lunes o martes no
  salió; el público ya ve un aviso honesto de "no pudimos actualizar".
- **Últimos 14 días**: una casilla roja significa que ese día se esperaba una corrida y no la hubo.
- **Lecturas retenidas**: si hay alguna, revísala (Paso 6).

Durante el primer mes del lanzamiento conviene mirar la vista **cada lunes y martes** y anotar si
hubo corrida y si la cifra coincide con Freddie Mac. Esa es la prueba de que funciona bien.

## Cómo cambiar el umbral de alerta

En `tasas_config`, edita `umbral_pp` (en puntos porcentuales; debe ser mayor que 0). Si lo bajas,
habrá más avisos; si lo subes, menos. No hace falta publicar nada.

## Las fuentes y sus condiciones

| Fuente | Qué aporta | Cada cuánto | Cómo se usa |
|---|---|---|---|
| **Freddie Mac PMMS** | Tasas a 30 y 15 años (cifra principal) | Semanal, jueves | Se muestran **tal cual** con su nombre y enlace. Freddie Mac permite usar su información con atribución y **prohíbe alterarla**; por eso no se redondea ni se mezcla con otra. El "cambio" es una resta nuestra y así se rotula. |
| **Tesoro de EE. UU.** (rendimiento a 10 años) | Señal diaria | Días hábiles | Dominio público. Solo puede activar un aviso; **no cambia** las cifras principales. |
| **Reserva Federal** (rango objetivo, vía el Banco de Nueva York) | Señal | Cuando decide | Solo un **cambio** del rango activa un aviso; que lo mantenga no avisa nada. El texto aclara que la Reserva Federal no fija directamente las tasas hipotecarias. |

**Por qué no están Mortgage News Daily ni MBA:** no se pudo comprobar que sus condiciones de uso
permitan mostrar sus cifras en tu sitio. Agregarlas requiere primero un permiso por escrito o un
servicio con licencia.

Las cifras son referencias educativas, no ofertas ni aprobaciones de crédito. Los textos no dan
consejos ni predicciones, y hay pruebas automáticas que lo vigilan.

## Páginas que muestran la franja de aviso

Se muestra en: `index`, `herramientas`, `credito`, `comprar-auto`, `cartas-claras`,
`contrato-auto`, `agendar`, `contacto`, `aparezco`, `formar-negocio`, `listar-negocio` y
`quienes-somos`. En **Comprar casa** se ve el aviso completo dentro del bloque.

**No** se muestra en `login`, `cuenta`, `admin`, `privacidad` ni `terminos`.

Para agregar o quitar una página: agrega (o quita) estas dos líneas justo después de
`<script src="nav.js"></script>` y antes de `analytics.js`, y actualiza la lista en
`tests/tasas-paginas.test.js` (la prueba te avisa si una página nueva no está en ninguna lista):

```html
<script src="tasas-texto.js" defer></script>
<script src="tasas-hipoteca.js" defer></script>
```

## Si algo sale mal

| Qué ves | Qué pasa | Qué hacer |
|---|---|---|
| Corrida en `fallo` con `http 503` o `timeout` en una fuente | Esa fuente no respondió | Nada: reintenta al día siguiente. Las últimas cifras publicadas se conservan. |
| `formato inesperado` en una fuente | La fuente cambió su formato | Avisa a quien mantiene el código; solo hay que ajustar la lectura de esa fuente. |
| Frescura "Sin actualizar" | No se publicó en la última cita de lunes/martes | Mira los últimos 14 días y las fuentes de esa corrida; usa **Run now**. |
| El bloque dice "No disponible ahora" (ya lanzado) | La base de datos no respondió | Se arregla sola cuando vuelve; el resto de la página funciona normal. |
| No aparece nada en el sitio | `TASAS_LANZADO` o `activo` siguen en apagado | Es lo esperado antes del lanzamiento (Paso 8). |

## Dónde está cada pieza

- `netlify/functions/tasas-agente.js` — la corrida diaria.
- `netlify/functions/tasas-hipoteca-logica.js` — las reglas (lectura, alertas, frescura).
- `netlify/functions/tasas-hipoteca.js` — lo que ven los visitantes (solo lectura).
- `netlify/functions/tasas-admin.js` — tu vista en el panel (solo administradores).
- `tasas-texto.js` y `tasas-hipoteca.js` — el texto y el bloque/franja en las páginas.
- `tests/tasas-*.test.js` — las pruebas (`node --test`).
- `specs/004-mortgage-rate-agent/` — la especificación, el plan y las tareas.
