# Cómo funciona "Listar negocio" (Google Maps + Apple Maps)

Esta es la nueva página `listar-negocio.html`, enlazada en el menú de todo el
sitio como **"Listar negocio"**. Es un servicio pagado donde tú actúas como
intermediario: el cliente te envía los datos de su negocio por un formulario,
y tú configuras su ficha en Google Maps (Google Business Profile) y Apple
Maps (Apple Business Connect).

## Precio

**$49.99** por los dos mapas juntos (Google + Apple), marcado en la página
como **"precio de lanzamiento"**. Esa etiqueta es intencional: te deja subir
el precio más adelante (los negocios similares independientes cobran entre
$100 y $300, y agencias más grandes cobran más) sin sentir que le cambias las
reglas a un cliente que ya pagó un precio distinto — los primeros clientes
guardan su precio, los nuevos ven el que tú decidas después.

Si más adelante quieres cambiar el precio mostrado en la página, dime la
cifra nueva y lo actualizo en un momento.

## Costo real de las plataformas: cero

Tanto **Google Business Profile** como **Apple Business Connect** son
completamente gratis para el dueño del negocio — no hay cuota de inscripción
ni suscripción. Los $49.99 son enteramente tu margen por el trabajo de
configurarlo; no tienes que pagarle nada a Google ni a Apple para ofrecer
este servicio.

## Cómo se ve para el cliente

1. Llega a "Listar negocio" desde el menú.
2. Ve el precio, cómo funciona, y qué incluye.
3. Llena el formulario con los datos de su negocio: nombre, dirección,
   teléfono, categoría, horario, sitio web/redes (opcional), descripción, y
   si ya tiene o no una cuenta de Gmail para el negocio.
4. Al enviar, ve un mensaje de confirmación en la misma página (sin
   recargar) diciendo que le vas a escribir para confirmar el pago y los
   próximos pasos.

## Dónde ves las solicitudes

Igual que con el formulario de contacto y el de interés en planes: en tu
panel de Netlify, ve a **Forms** → verás una entrada nueva llamada
`listar-negocio`. Ahí aparecen todos los datos que llenó el cliente,
incluyendo su nombre, correo y teléfono para contactarlo. Puedes activar
notificaciones por correo para este formulario en **Forms → listar-negocio →
Settings and usage → Form notifications**, así te avisa apenas alguien lo
envía.

## Cómo cobrar

Igual que con los planes: no hay cobro automático conectado todavía. Te
contactas con el cliente (Zelle, Cash App, Venmo, o lo que ya uses),
confirmas el pago, y ahí empiezas el trabajo de configurar sus perfiles.

## Paso a paso: qué hacer cuando te llegan los datos

1. Ves la solicitud en **Netlify → Forms → listar-negocio** (o te llega por
   correo si activaste las notificaciones).
2. Contactas al cliente para confirmar el pago (Zelle, Cash App, Venmo, etc).
3. Una vez pagado, configuras su perfil en Google y en Apple con los datos
   que te mandó — los pasos exactos de cada uno están abajo.
4. Cuando quede aprobado en los dos, le escribes al cliente para
   confirmarle que ya está visible, y le mandas una captura o el enlace de
   su ficha.

### En Google Maps (Google Business Profile)

1. Entra a [business.google.com](https://business.google.com) con tu cuenta
   (o la que uses para este trabajo).
2. Busca el negocio por nombre y dirección.
   - Si ya aparece pero nadie lo ha reclamado, dale clic en **"Reclamar este
     negocio"**.
   - Si no aparece, dale clic en **"Agregar tu negocio"**.
3. Llena categoría, teléfono, dirección, horario y sitio web con los datos
   que te mandó el cliente en el formulario.
4. Verifica el negocio. Google ofrece varios métodos (ya no existe la
   verificación por correo postal):
   - **Por video**: es el más común para perfiles nuevos. Grabas un video
     corto mostrando el letrero o la entrada del negocio, algo del interior
     (mostrador, mercancía) y algo que pruebe que administras el lugar
     (licencia del negocio, punto de venta). Google lo revisa en 3–5 días
     hábiles.
   - **Por teléfono o correo**: a veces disponible si el negocio ya tenía
     algún historial en Google — Google manda un código al número o correo
     del negocio, y queda verificado casi al instante.
5. **Si el cliente ya tenía un perfil creado**, no hace falta reclamarlo tú:
   pídele que entre a su perfil → **Configuración → Administradores de la
   empresa** y te agregue como **"Gerente"** con tu correo.

### En Apple Maps (Apple Business Connect)

1. Entra a [businessconnect.apple.com](https://businessconnect.apple.com)
   con un Apple ID — mejor uno dedicado a tu trabajo (no el personal del
   cliente), así no dependes de la cuenta de nadie más.
2. Busca el negocio por nombre.
   - Si aparece, dale clic en **"Reclamar"**.
   - Si no aparece, dale clic en **"Agregar una nueva ubicación"**.
3. Llena la dirección (eligiéndola de la lista que te sugiere, no
   escribiéndola libre), categoría, teléfono y horario con los datos del
   formulario.
4. Verifica la propiedad del negocio con uno de estos dos métodos:
   - **Código por teléfono**: Apple manda un código al número del negocio
     que registraste.
   - **Documento**: subes un contrato de renta, póliza de seguro o factura
     de servicios que muestre el nombre y la dirección del negocio.
5. Apple revisa la solicitud en unos días hasta una semana, y te avisa por
   correo cuando la aprueba.
6. **Si el cliente ya tenía cuenta**, en vez de reclamar tú el negocio,
   pídele que vaya a **Company/Access** dentro de su cuenta de Apple
   Business Connect y te invite con tu **Partner ID**, dándote el rol de
   **"Manager"**.

## Cómo hacer el trabajo sin pedir contraseñas

Este punto es importante y ya está explicado en la página misma para que el
cliente se sienta seguro: **nunca le pidas la contraseña de su cuenta de
Gmail ni de su negocio.**

- **Si el cliente ya tiene un perfil de Google Business Profile o Apple
  Business Connect**, pídele que te agregue como **"administrador"** o
  **"gerente"** usando tu propio correo — ambas plataformas tienen esta
  opción de invitar a alguien sin compartir la contraseña de la cuenta
  principal.
- **Si el cliente no tiene ninguna cuenta todavía** (responde "No" o "No
  estoy seguro" en el formulario), lo más simple es crear tú mismo el perfil
  del negocio usando tu propio correo o uno nuevo dedicado a esto, y luego —
  si el cliente quiere tener acceso directo más adelante — agregarlo a él
  como gerente adicional desde ahí.
- Nunca hace falta que nadie te comparta una contraseña para ninguno de los
  dos pasos.

## Notas importantes

- El formulario no sube fotos todavía (se dejó fuera a propósito para
  mantenerlo simple) — si el cliente quiere agregar fotos del negocio,
  pídeselas por correo o WhatsApp después de que te contacte.
- Si más adelante quieres agregar más servicios digitales a la página
  (además de Google + Apple Maps), este mismo patrón de formulario se puede
  reutilizar o ampliar — dime cuándo quieras dar ese paso.
