# Cómo activar la búsqueda automática en "¿Aparezco?"

`aparezco.html` busca el negocio por la persona: nombre, ciudad y giro, y
muestra la dirección, la calificación en estrellas, el número de reseñas,
hasta 3 reseñas de verdad, un scorecard con parámetros de "negocio bien
puesto" (calificación, reseñas, horario, fotos, sitio web, posición en su
categoría) comparado contra el promedio real de su competencia, un puntaje
de 0 a 100, y sugerencias sobre qué mejorar.

**Esta llave ya no es opcional.** Sin `GOOGLE_PLACES_API_KEY` configurada,
la herramienta no tiene ningún modo manual de respaldo — le muestra a la
persona un aviso de "vuelve más tarde o agenda una cita". Termina de
configurarla antes de anunciar o enlazar esta página.

## Cómo funciona

- El navegador llama a una función en la nube
  (`netlify/functions/revisar-negocio.js`), que consulta la API de Google
  Places, y si están configuradas, la de Apple Maps y la de Claude
  (Anthropic).
- Si falta la llave de Google, si la búsqueda falla, o si tarda demasiado,
  `aparezco.html` muestra un aviso honesto ("no pudimos completar la
  búsqueda" / "vuelve más tarde") con un botón para reintentar y otro para
  agendar una cita — nunca manda a la persona a buscar en Google o Apple
  Maps por su cuenta.
- Cada dirección IP puede hacer **5 búsquedas automáticas por día**. Al
  llegar al límite, la herramienta avisa que vuelva mañana. Esto evita que
  un script te genere gasto ilimitado.

## Paso 1 — Consigue una llave de la API de Google Places

1. Ve a [console.cloud.google.com](https://console.cloud.google.com) y crea
   un proyecto (o usa uno que ya tengas).
2. En **APIs & Services → Library**, busca **"Places API (New)"** y
   actívala.
3. En **Billing**, conecta una tarjeta y define un presupuesto/alerta
   mensual bajo para empezar (por ejemplo $10–$20). Cada búsqueda hace 2
   consultas de texto y, si encuentra el negocio, una consulta de detalle
   para traer las reseñas — el costo exacto depende de las tarifas vigentes
   de Google (revísalas en la calculadora de precios de Google Maps
   Platform), pero piensa en centavos por búsqueda, no en dólares. El
   límite de 5 por IP al día (ver arriba) acota el gasto de cada visitante.
4. En **APIs & Services → Credentials**, crea una **API key**. Restríngela
   a la "Places API (New)" (Application restrictions → puedes dejarla sin
   restricción de sitio porque esta llave solo la usa tu servidor, nunca el
   navegador de la persona).

## Paso 2 — Agrega la variable de entorno en Netlify

1. En tu sitio dentro de Netlify, ve a **Site configuration → Environment
   variables**.
2. Agrega:

   | Nombre | Valor |
   |---|---|
   | `GOOGLE_PLACES_API_KEY` | La llave que copiaste en el Paso 1 |

3. Guarda y vuelve a desplegar (**Deploys → Trigger deploy → Deploy
   site**).

Con solo esto, la búsqueda de Google ya queda activa: ubicación,
calificación, reseñas y si aparece o no buscando lo que vende, todo
automático.

## Paso 3 — Corre la actualización de la base de datos (para el límite de gasto)

1. Entra a tu proyecto de Supabase → **SQL Editor**.
2. Abre `supabase-schema.sql` en tu carpeta del sitio, busca el bloque
   **"Añadido: límite de gasto para la búsqueda automática de ¿Aparezco?"**
   al final del archivo, y corre solo ese bloque (o el archivo completo —
   los bloques anteriores usan `create table if not exists`, así que
   correrlo entero no rompe nada aunque ya lo hayas corrido antes).
3. Confirma que ya tienes `SUPABASE_SERVICE_ROLE_KEY` en las variables de
   entorno de Netlify (la misma que usa `admin-data.js` — ver
   `INSTRUCCIONES-ADMIN.md`). Sin esa llave, el límite simplemente no se
   aplica; no bloquea la herramienta.

## Paso 4 (opcional) — Apple Maps: solo confirma si existe

Apple **no tiene** una API pública que dé estrellas ni reseñas de negocios
de terceros — solo deja a un negocio administrar su propia ficha ya
reclamada. Lo más que se puede automatizar es confirmar si el nombre existe
como lugar en Apple Maps. Si prefieres no hacer este paso, el sitio se
queda con el paso manual de Apple Maps de siempre (funciona bien).

1. Necesitas una cuenta de **Apple Developer Program** (cuesta $99/año).
2. En [developer.apple.com](https://developer.apple.com) → **Certificates,
   Identifiers & Profiles → Keys**, crea una llave nueva con la
   capacidad **Maps** activada. Descarga el archivo `.p8` — Apple solo te
   deja descargarlo una vez.
3. Anota tu **Team ID** (arriba a la derecha del portal) y el **Key ID** de
   la llave que acabas de crear.
4. En Netlify, agrega estas tres variables:

   | Nombre | Valor |
   |---|---|
   | `APPLE_MAPS_TEAM_ID` | Tu Team ID |
   | `APPLE_MAPS_KEY_ID` | El Key ID de la llave |
   | `APPLE_MAPS_PRIVATE_KEY` | El contenido completo del archivo `.p8`, incluyendo las líneas `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----` |

   Si el campo de Netlify no acepta saltos de línea reales, pega el
   contenido reemplazando cada salto de línea por `\n` (la función ya lo
   convierte de vuelta).

## Paso 5 (opcional) — Sugerencias con IA real

Esto reutiliza la misma llave `ANTHROPIC_API_KEY` que ya configuraste (o
puedes configurar) para Mr. Credit Coach — ver `INSTRUCCIONES-IA.md`. No
hace falta nada adicional.

Por control de gasto, igual que el resto del sitio, **las sugerencias con
IA solo se generan si quien busca inició sesión** (gratis, con su correo).
Sin sesión, o sin la llave configurada, las sugerencias se arman con
reglas fijas sobre los mismos datos reales de Google/Apple — nunca se
inventa nada, con o sin IA.

## Notas importantes

- **Sin `GOOGLE_PLACES_API_KEY` la página no puede buscar nada** — muestra
  el aviso de "vuelve más tarde / agenda una cita". No hay modo manual de
  respaldo, así que no enlaces ni promociones `aparezco.html` hasta que
  esta llave esté puesta y probada en producción.
- **Privacidad:** el nombre, ciudad y giro del negocio sí se mandan a
  Google (y a Apple/Anthropic si los configuraste). `aparezco.html` lo dice
  con claridad antes de que la persona toque el botón "Buscar mi negocio".
- Si necesitas apagar la herramienta temporalmente, quita el enlace del
  menú (`nav.js`/el bloque `<nav>` de cada página) en vez de borrar la
  llave — sin la llave, cualquiera que llegue a la página ve el aviso de
  "no disponible" en vez de un resultado.
- Si algún nombre de campo de la API de Google cambia con el tiempo (Google
  actualiza su API de vez en cuando), revisa los "Function logs" de
  Netlify: `revisar-negocio.js` registra el error exacto ahí sin romper la
  página para quien la esté usando.
