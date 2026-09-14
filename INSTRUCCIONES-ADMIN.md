# Cómo activar tu panel de administrador

`admin.html` es una página nueva, separada de lo que ve el cliente, donde
tú ves cuántos clientes tienes, cómo se distribuyen entre los planes, cuántos
análisis y cálculos ha guardado la gente, una tabla con cada cliente
(correo, nombre, teléfono, plan, fecha de registro), **y ahora también un
editor de contenido** para cambiar el título y texto principal de la página
de inicio, su imagen, y el teléfono/correo/redes de contacto — con vista
previa en vivo antes de publicar. Nadie más puede ver ni usar nada de esto:
está protegido por tu sesión Y por una marca especial en tu cuenta que
funciona igual que el campo `plan` que ya usas — no se puede activar desde
el navegador, solo tú desde Supabase.

Esta página **no aparece en el menú** del sitio a propósito. Solo tú
entras a ella escribiendo la dirección directamente (`tudominio.com/admin.html`)
después de iniciar sesión.

Si no completas estos pasos, `admin.html` sigue existiendo pero le va a
decir a cualquiera que la abra "tu cuenta no tiene acceso" — no expone nada
hasta que la actives.

## Paso 1 — Márcate a ti mismo como administrador

1. En Supabase, abre **SQL Editor**.
2. Corre esto, cambiando el correo por el de la cuenta con la que inicias
   sesión en el sitio (la misma cuenta que ya usas para probar):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"is_admin":true}'::jsonb
where email = 'tu-correo@ejemplo.com';
```

3. Listo. Esa cuenta ahora puede entrar a `admin.html` (después de cerrar y
   volver a iniciar sesión, si ya tenía una sesión abierta).

Nunca le des esta marca a una cuenta que no sea tuya.

## Paso 1b — Crea la tabla de contenido editable (si no la tienes ya)

Si ya corriste `supabase-schema.sql` antes de esta actualización, te falta
la parte nueva: la tabla `contenido_sitio` (donde se guardan los textos e
imagen que edites) y el espacio de almacenamiento `sitio-imagenes` (donde
se guardan las imágenes que subas). Sin esto, la sección "Editar contenido"
del panel no va a poder guardar cambios.

1. En Supabase, abre **SQL Editor**.
2. Copia y pega **todo** el archivo `supabase-schema.sql` otra vez (ya
   incluye la parte nueva al final) y presiona **Run**. Es seguro correrlo
   de nuevo aunque ya tengas las tablas anteriores — no borra ni duplica
   nada existente.
3. Esto crea:
   - La tabla `contenido_sitio`: cualquiera puede **leerla** (es contenido
     público del sitio, como el texto de la página de inicio), pero solo
     una cuenta marcada `is_admin` (Paso 1) puede **escribir** en ella.
   - El espacio de almacenamiento `sitio-imagenes`: mismo trato — lectura
     pública, escritura solo para administradores.

## Paso 2 — Consigue tu llave secreta de Supabase

Esta es distinta a la llave "Publishable" que ya usas en `auth.js`. Esta
nueva llave puede leer **todo** en tu base de datos sin restricciones, así
que se maneja distinto: nunca la vas a pegar en ningún archivo del sitio,
solo en la configuración de Netlify (paso 3).

1. En Supabase, ve a **Settings → API Keys**.
2. Busca la pestaña o sección de llaves nuevas (**Publishable and secret API
   keys**) y copia la llave marcada como **secret** (no la "publishable" que
   ya tienes). Si tu proyecto todavía muestra el sistema anterior, es la
   llave **`service_role`** en la pestaña "Legacy".
3. Guárdala en un lugar seguro (como un gestor de contraseñas) — no la
   compartas ni la pegues en WhatsApp, correo sin cifrar, etc.

## Paso 3 — Agrega la llave en Netlify

1. En tu sitio dentro de Netlify, ve a **Site configuration → Environment
   variables** (el mismo lugar donde agregaste `ANTHROPIC_API_KEY` y las
   otras).
2. Agrega una variable nueva:

   | Nombre | Valor |
   |---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | La llave "secret" que copiaste en el Paso 2 |

3. Guarda y vuelve a desplegar el sitio (**Deploys → Trigger deploy →
   Deploy site**) para que la función tome la variable nueva.

## Paso 4 — Entra a tu panel

1. Abre tu sitio publicado e inicia sesión con la cuenta que marcaste como
   administrador en el Paso 1.
2. Ve directamente a `tudominio.com/admin.html`.
3. Deberías ver las tarjetas de estadísticas, la distribución de planes y
   la tabla de clientes cargarse en unos segundos.

Si ves "tu cuenta no tiene acceso", esa cuenta no tiene la marca del Paso 1
(o iniciaste sesión con otra cuenta). Si ves un error de conexión, revisa
que hayas vuelto a desplegar el sitio después del Paso 3.

## Cómo funciona por dentro (para que sepas qué estás activando)

- `admin.html` primero revisa, en tu propio navegador, si tu sesión tiene
  la marca de administrador — esto es solo para no mostrarte una pantalla
  de carga si claramente no tienes acceso.
- La verdadera protección está en `netlify/functions/admin-data.js`: esa
  función vuelve a comprobar tu sesión por su cuenta (no confía en lo que
  diga el navegador) antes de entregar cualquier dato. Es la única parte
  del sitio que usa la llave secreta, y esa llave nunca sale del servidor
  de Netlify — nunca llega al navegador de nadie, ni siquiera al tuyo.
- Ningún cliente, aunque abra las herramientas de desarrollador de su
  navegador, puede ver la llave secreta ni los datos de otros clientes.

## Cómo usar el editor de contenido

Al final de `admin.html`, debajo de la tabla de clientes, hay una sección
**"Editar contenido"** con un formulario a la izquierda y una vista previa
en vivo de la página de inicio a la derecha:

1. **Escribe o borra** el título principal, el texto debajo del título, el
   teléfono, correo o redes sociales — la vista previa de la derecha se
   actualiza al instante con lo que escribes, para que veas cómo se va a
   ver antes de que nadie más lo vea.
2. **Sube una imagen nueva** para el hero (la foto grande de la página de
   inicio) con el botón de archivo — mientras se sube verás "Subiendo…" y
   luego "Imagen lista".
3. Nada de esto se guarda todavía en ese momento — es solo tu vista previa.
   Cuando estés conforme, presiona **"Publicar cambios"**. Ahí sí se guarda
   en la base de datos y, en segundos, cualquiera que visite el sitio ve
   los cambios.
4. Si dejas un campo en blanco y publicas, esa parte de la página vuelve a
   mostrar el contenido original que ya tenía escrito en el HTML — nunca se
   queda en blanco de verdad.
5. El teléfono, correo y redes son nuevos en el sitio (antes no existían en
   el pie de página): solo aparecen ahí una vez que publiques al menos uno.

El editor de textos/imagen cubre por ahora la página de inicio (título,
texto, imagen del hero) y el bloque de contacto que se ve en el pie de
página de todo el sitio. Extender ese mismo editor a los textos de las
demás páginas es un trabajo aparte, cuando lo pidas.

## Cómo usar el editor de colores de marca

Debajo del editor de contenido, en la misma sección, hay un bloque
**"Colores de marca"** con 5 selectores de color (haces clic en el
cuadrito y eliges el color, como en cualquier selector de color del
sistema):

1. **Dorado principal** y **Dorado claro** — el color de los botones y
   acentos del sitio.
2. **Marrón** y **Marrón oscuro** — el color de la marca y los títulos.
3. **Verde salvia** — el color de acentos secundarios.

A propósito dejamos fuera del editor los colores que sostienen la
legibilidad del sitio (el de fondo, el del texto normal, el de "error" en
rojo y el de "éxito" en verde) — esos son estructurales, no de marca, y
cambiarlos por accidente podría dejar texto ilegible o confundir un
mensaje de error con uno de éxito. Si más adelante quieres poder tocar
alguno de esos también, dímelo y lo agregamos con cuidado.

Igual que con los textos: cambiar un color actualiza la vista previa al
instante (a la derecha), pero **no se guarda hasta que presiones
"Publicar cambios"** — el mismo botón publica tanto los textos como los
colores juntos. Si cambiaste de opinión antes de publicar, el botón
**"Restablecer a los colores originales"** regresa los 5 selectores (y la
vista previa) a los colores con los que se lanzó el sitio, sin necesidad
de recordarlos tú mismo.

A diferencia de los textos (que son por página), los colores se aplican
**en todo el sitio a la vez** — todas las páginas comparten la misma
paleta, así que un cambio que publiques aquí se ve de inmediato en
`index.html`, `credito.html`, `comprar-auto.html` y el resto.
