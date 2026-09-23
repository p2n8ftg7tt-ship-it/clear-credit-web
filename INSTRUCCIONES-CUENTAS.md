# Cómo activar el login en Themora

Tu sitio es 100% archivos estáticos (HTML/CSS/JS), así que para tener cuentas de
verdad (con contraseña, sesión y una base de datos) necesitas un servicio externo
que maneje eso por ti. Usamos **Supabase** porque es gratis para tu volumen actual,
no requiere que aprendas a programar un backend, y funciona directamente desde el
navegador con un par de líneas de JavaScript.

Con esto, tus clientes van a poder:
- Crear una cuenta con correo y contraseña.
- Iniciar sesión y cerrar sesión.
- Guardar un resumen de su análisis de reporte de crédito (no el documento).
- Guardar los cálculos que hagan en la calculadora hipotecaria.
- Ver todo eso de nuevo en `cuenta.html` cuando regresen.

## Paso 1 — Crea el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratis.
2. Crea un "New Project". Ponle el nombre que quieras (por ejemplo `credito-claro`).
   Elige una contraseña de base de datos y guárdala en un lugar seguro (no la
   necesitas para este sitio, pero Supabase te la pide).
3. Espera 1-2 minutos mientras se crea el proyecto.

## Paso 2 — Crea las tablas

1. Dentro del proyecto, abre **SQL Editor** en el menú de la izquierda.
2. Abre el archivo `supabase-schema.sql` que te entregué junto con este documento,
   copia todo su contenido y pégalo en el editor.
3. Presiona **Run**. Esto crea las tablas `analisis_credito` y `calculos_hipoteca`,
   y activa reglas de seguridad para que cada cliente solo pueda ver y borrar
   su propia información — ni siquiera tú puedes ver los datos de otro usuario
   usando la llave pública del sitio.

## Paso 3 — Copia tus llaves

1. Ve a **Settings → API** (ícono de engranaje, abajo a la izquierda).
2. Copia el valor de **Project URL**.
3. Copia el valor de **anon public** (la llave pública, no la `service_role`,
   esa nunca debe usarse en el navegador).

## Paso 4 — Pega las llaves en `auth.js`

Abre `auth.js` y reemplaza estas dos líneas cerca del inicio del archivo:

```js
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-LLAVE-PUBLICA-ANON";
```

con tus valores reales. Guarda el archivo.

## Paso 5 — Confirma el método de acceso (Email)

En Supabase, ve a **Authentication → Providers** y confirma que **Email** esté
activado (lo está por defecto). Si quieres que tus clientes puedan entrar
inmediatamente después de registrarse, sin confirmar su correo primero, ve a
**Authentication → Settings** y desactiva "Confirm email" — es más simple para
empezar, pero puedes activarlo después si prefieres verificar los correos.

## Paso 5b — Dile a Supabase cuál es tu sitio real (para que el enlace de confirmación funcione)

Si dejas activado "Confirm email" del Paso 5, Supabase le manda a cada cliente
nuevo un correo con un enlace de confirmación. Ese enlace, después de
confirmar, tiene que regresar al cliente a **tu sitio real** — pero Supabase
no sabe cuál es tu sitio hasta que se lo dices. Si te saltas este paso, la
persona hace clic en "Confirmar" y le aparece una página en blanco o un
error, aunque la cuenta sí se haya creado correctamente.

1. En Supabase, ve a **Authentication → URL Configuration**.
2. En **Site URL**, pon la dirección de tu sitio publicado (por ejemplo
   `https://tu-sitio.netlify.app`, o tu dominio propio si ya lo conectaste).
   Sin `/` al final.
3. En **Redirect URLs**, agrega esa misma dirección seguida de `/**` (por
   ejemplo `https://tu-sitio.netlify.app/**`) — el `/**` le dice a Supabase
   que acepte cualquier página de tu sitio como destino después de confirmar,
   no solo la de inicio.
4. Guarda. Los enlaces de confirmación que se manden a partir de ahora ya van
   a regresar al cliente a `cuenta.html` de tu sitio, ya con la sesión
   iniciada — no hace falta que vuelva a poner su contraseña.

**Si cambias de dominio más adelante** (por ejemplo, conectas un dominio
propio en vez de usar el de Netlify), tienes que repetir este paso con la
nueva dirección — si no, los enlaces de confirmación seguirán apuntando al
dominio viejo.

## Paso 5c — Seguridad y correos en español (panel de Supabase)

Estas opciones viven en el panel de Supabase, no en el código del sitio.
El formulario ya exige 10 caracteres, pero eso se puede saltar llamando a
Supabase directo con la llave pública — por eso el mismo mínimo tiene que
estar también del lado de Supabase.

1. **Authentication → Providers → Email** (o *Sign In / Providers*):
   - **Minimum password length:** `10` (por defecto es 6).
   - **Password requirements:** déjalo en "No required characters" — la
     guía del NIST recomienda largo, no símbolos obligatorios.
   - **Leaked password protection:** actívalo si tu plan lo permite (plan
     Pro). Rechaza contraseñas que aparecen en filtraciones conocidas.
   - **Secure email change:** activado (pide confirmar en ambos correos).
2. **Authentication → Rate Limits:** los valores por defecto ya frenan la
   fuerza bruta por dirección IP (el sitio muestra "Hubo demasiados
   intentos seguidos…" cuando Supabase corta). No los subas sin motivo.
   Nota: con el servidor de correo incluido de Supabase solo salen unos
   pocos correos por hora. Cuando tengas más clientes, conecta tu propio
   SMTP (Resend, SendGrid, etc.) en **Authentication → Emails → SMTP
   Settings**; si no, los correos de confirmación y recuperación dejan de
   llegar sin aviso.
3. **Authentication → Emails → Templates:** Supabase los manda en inglés
   por defecto. Reemplaza cada uno con el texto de abajo (el asunto va en
   *Subject* y el resto en *Body*). No borres `{{ .ConfirmationURL }}`: es
   el enlace.

**Confirm signup** — Asunto: `Confirma tu cuenta de Themora`

```html
<h2>¡Bienvenido a Themora!</h2>
<p>Gracias por crear tu cuenta. Para activarla, haz clic en el botón:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#d9a84a;color:#2a2118;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Confirmar mi correo</a></p>
<p>Si tú no creaste esta cuenta, ignora este mensaje: no pasará nada.</p>
```

**Reset password** — Asunto: `Elige tu nueva contraseña de Themora`

```html
<h2>¿Olvidaste tu contraseña?</h2>
<p>Recibimos un pedido para cambiar la contraseña de tu cuenta. Haz clic en el botón para elegir una nueva:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#d9a84a;color:#2a2118;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Elegir nueva contraseña</a></p>
<p>Por seguridad, el enlace dura poco tiempo y funciona una sola vez.</p>
<p>Si tú no lo pediste, ignora este mensaje: tu contraseña no cambia.</p>
```

**Change email address** — Asunto: `Confirma tu nuevo correo en Themora`

```html
<h2>Confirma tu nuevo correo</h2>
<p>Pediste cambiar el correo de tu cuenta de {{ .Email }} a {{ .NewEmail }}. Haz clic para confirmarlo:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#d9a84a;color:#2a2118;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Confirmar el cambio</a></p>
<p>Si tú no lo pediste, no hagas clic y escríbenos desde la página de Contacto.</p>
```

## Paso 6 — Publica el sitio

Estos archivos nuevos ya están conectados a tu sitio:

- `auth.js` — maneja registro, login, logout y guardado de datos.
- `login.html` — página para iniciar sesión o crear cuenta.
- `cuenta.html` — panel donde el cliente ve lo que ha guardado.

Y modifiqué estos archivos existentes para agregar el enlace "Iniciar sesión" en
el menú y conectar los botones de "Guardar":

- `index.html`, `credito.html`, `comprar-casa-auto.html`, `herramientas.html`,
  `contacto.html` — se agregó el enlace de cuenta al menú y los scripts de Supabase.
- `credito.html` — se agregó el botón "Guardar en mi cuenta" junto a los resultados
  del analizador.
- `herramientas.html` y `mortgage-calculator.js` — se agregó el botón "Guardar este
  cálculo" en la calculadora hipotecaria.
- `styles.css` — se agregaron los estilos para el login, la cuenta y los botones
  de guardar.

Sube estos archivos junto con el resto de tu sitio a donde lo tengas publicado
(Netlify, GitHub Pages, o cualquier hosting estático — no necesitan configuración
especial de servidor porque todo se conecta directo a Supabase desde el navegador
del cliente).

## Notas importantes

- **Gratis hasta cierto punto:** el plan gratuito de Supabase incluye 50,000
  inicios de sesión activos al mes y 500 MB de base de datos — de sobra para
  un sitio que está empezando. Si tu proyecto está inactivo 7 días seguidos
  (sin ninguna consulta a la base de datos), Supabase lo pausa automáticamente;
  solo entra al panel y reactívalo con un clic si eso pasa.
- **Privacidad:** seguimos sin subir el documento del reporte de crédito a
  ningún servidor — el analizador sigue procesando todo en el navegador. Lo
  único que se guarda si el cliente presiona "Guardar" es un resumen (puntaje
  detectado, cantidad de señales positivas/negativas, la conclusión).
- **No es asesoría legal ni de seguridad:** esta configuración es razonable para
  un sitio educativo con datos no sensibles como los que guardamos aquí. Si más
  adelante quieres guardar información más sensible (documentos completos,
  número de cuenta, etc.), conviene una revisión de seguridad más profunda.

## ¿Quieres que también puedan entrar con Google, Apple, Microsoft o su teléfono?

`login.html` ya tiene los botones y el código listos para eso. Solo falta que
actives cada proveedor desde el panel de Supabase — son pasos de configuración
externos a este sitio, con su propio documento: ver
**`INSTRUCCIONES-LOGIN-SOCIAL.md`**.
