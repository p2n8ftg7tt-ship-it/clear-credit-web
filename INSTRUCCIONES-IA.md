# Cómo activar la IA real en Mr. Credit Coach

Mr. Credit Coach (el asistente flotante del sitio) ya funciona sin configuración
adicional: responde con un motor de reglas local que cubre las preguntas más
comunes sobre crédito, casa, auto e hipoteca. Este documento explica cómo darle
**IA real** (Claude, de Anthropic) para que responda con más naturalidad y
pueda seguir la conversación, **solo a clientes que iniciaron sesión** — así
controlas el costo y conviertes esto en un beneficio de cuenta/membresía.

Si no completas estos pasos, el sitio sigue funcionando exactamente igual que
hoy: el asistente simplemente sigue usando sus respuestas locales para todos.

## Cómo funciona

- El botón "Mr. Credit Coach" ya está en 6 páginas del sitio.
- Cuando un cliente con sesión activa (ver `INSTRUCCIONES-CUENTAS.md`) le
  escribe algo, el navegador llama a una función en la nube
  (`netlify/functions/coach.js`) que a su vez llama a la API de Claude.
- Si el cliente no tiene sesión, si la función falla, o si no configuraste la
  llave de API todavía, el asistente responde automáticamente con el motor de
  reglas local — nunca se queda sin responder.
- La función verifica la sesión con Supabase antes de responder, así que
  nadie puede usar tu llave de IA sin haber iniciado sesión en tu sitio.

## Paso 1 — Consigue una llave de API de Anthropic

1. Ve a [console.anthropic.com](https://console.anthropic.com) y crea una
   cuenta (o inicia sesión).
2. Ve a **API Keys** y crea una llave nueva. Cópiala — la necesitarás en el
   paso 3. Guárdala en un lugar seguro; no la compartas ni la pongas en
   ningún archivo HTML o JS del sitio.
3. En **Billing**, agrega un método de pago y define un límite de gasto
   mensual bajo para empezar (por ejemplo $5–$10). El modelo que usa la
   función (`claude-3-5-haiku`) es el más económico de Anthropic — miles de
   respuestas cuestan centavos — pero un límite te protege de sorpresas.

## Paso 2 — Confirma que tu sitio esté conectado a Netlify

Estos pasos asumen que ya publicaste el sitio en Netlify (netlify.com),
conectando tu carpeta o tu repositorio de GitHub. Si todavía no lo hiciste,
hazlo primero — Netlify detecta automáticamente `netlify.toml` y la carpeta
`netlify/functions/`.

## Paso 3 — Agrega las variables de entorno en Netlify

1. En tu sitio dentro de Netlify, ve a **Site configuration → Environment
   variables**.
2. Agrega estas tres variables:

   | Nombre | Valor |
   |---|---|
   | `ANTHROPIC_API_KEY` | La llave que copiaste en el Paso 1 |
   | `SUPABASE_URL` | La misma "Project URL" que usaste en `auth.js` |
   | `SUPABASE_ANON_KEY` | La misma llave "anon public" que usaste en `auth.js` |

3. Guarda y vuelve a desplegar el sitio (**Deploys → Trigger deploy →
   Deploy site**) para que la función tome las variables nuevas.

## Paso 4 — Prueba

1. Abre tu sitio publicado, inicia sesión con una cuenta de prueba
   (`login.html`).
2. Abre Mr. Credit Coach y escribe una pregunta.
3. Si todo está bien configurado, la respuesta llegará generada por Claude en
   1–3 segundos (verás los tres puntos animados mientras "piensa"). Si algo
   falla, no lo notarás como error — simplemente recibirás la respuesta del
   motor local, y en los "Function logs" de Netlify verás el detalle técnico.

## Notas importantes

- **Costo controlado:** cada respuesta está limitada a 400 tokens y a un
  máximo de 500 caracteres por pregunta, y solo clientes con sesión activa
  pueden usarla. Esto mantiene el gasto predecible incluso si el sitio
  crece.
- **Privacidad:** las preguntas y respuestas se envían a la API de Anthropic
  para generar la respuesta, pero no se guardan en tu base de datos ni en
  ningún archivo. No pidas ni compartas números de cuenta, seguro social u
  otra información sensible dentro del chat — el asistente está instruido
  para no solicitarla.
- **No es asesoría profesional:** el mensaje legal debajo del chat y las
  instrucciones internas del asistente dejan claro que es orientación
  educativa, no asesoría legal, financiera o crediticia individualizada.
- **Puedes desactivarlo en cualquier momento** borrando la variable
  `ANTHROPIC_API_KEY` en Netlify — el sitio vuelve a responder solo con el
  motor de reglas local, sin tocar ningún archivo.
