# Cómo funciona "Formar negocio" (LLC + EIN)

Esta es la nueva página `formar-negocio.html`, enlazada en el menú de todo el
sitio como **"Formar negocio"**. Es un servicio pagado de **preparación y
presentación de trámites** (no asesoría legal): el cliente te cuenta qué
negocio quiere abrir, tú preparas y presentas la formación de su LLC ante el
estado y tramitas su EIN (número de identificación federal) con el IRS.

Está pensado para funcionar en **cualquier estado** (el EIN siempre es
federal, y el proceso de formar una LLC sigue el mismo patrón general en
todo el país), con una sección aparte donde le das más detalle a **Virginia**
específicamente, con montos reales.

## Lo más importante: los límites legales

Esto es más delicado que "Listar negocio", porque toca papeleo oficial y
datos sensibles. Tenlo siempre presente:

1. **No eres un despacho de abogados, y la página lo dice claramente.** Tú
   preparas y presentas documentos con la información que el cliente te da —
   no le aconsejas qué tipo de entidad le conviene, ni lo representas
   legalmente. Si un cliente tiene una situación complicada (varios socios,
   inversionistas, un negocio muy regulado, temas de inmigración), la página
   ya le recomienda hablar primero con un abogado o contador.
2. **Una licencia profesional (como la de contratista) es personal e
   intransferible.** El examen, los años de experiencia y el historial los
   tiene que cumplir la persona misma — tú NO puedes sacarle esa licencia a
   nadie. Lo que sí puedes hacer es registrar la empresa (la LLC) detrás de
   ese negocio, y darle al cliente la lista de lo que necesita para la
   licencia como guía educativa.
3. **El EIN siempre es gratis con el IRS.** Nunca le digas a un cliente que
   le estás "vendiendo" un EIN — tu tarifa es por el trabajo de hacer el
   trámite por él, el número en sí no tiene costo. La página ya lo aclara.

Si más adelante quieres ofrecer esto a mayor escala, vale la pena que un
abogado revise el texto exacto de la página una vez, para confirmar que el
lenguaje se mantiene del lado de "preparación de documentos" y no cruza a
"asesoría legal" en tu estado.

## Dónde ves las solicitudes

Igual que con los otros formularios del sitio: en tu panel de Netlify, ve a
**Forms** → verás una entrada nueva llamada `formar-negocio`. Ahí aparecen
los datos generales que llenó el cliente (nombre, correo, teléfono, estado,
nombre deseado para la empresa, giro del negocio, cuántos dueños, y una
descripción). Puedes activar notificaciones por correo en **Forms →
formar-negocio → Settings and usage → Form notifications**.

## Muy importante: qué NO pedir por el formulario público

El formulario de la página **a propósito no incluye** número de seguro
social, ITIN, ni ningún otro dato sensible — ni siquiera lo intentes agregar
ahí. Netlify Forms no es un lugar seguro para ese tipo de información (no
está pensado para datos tan sensibles, y cualquiera con acceso a tu panel
lo vería sin cifrar).

Cuando de verdad necesites el número de seguro social o ITIN del cliente
(por ejemplo, para tramitar el EIN), pídeselo **después, en privado** —
por teléfono, o por un correo directo uno a uno — nunca por un formulario
público del sitio. Bórralo de tu correo o notas en cuanto termines el
trámite.

## Paso a paso: qué hacer cuando te llegan los datos

1. Ves la solicitud en **Netlify → Forms → formar-negocio**.
2. Contactas al cliente para confirmar el pago y para pedirle, en privado,
   cualquier dato sensible que haga falta (como el número de seguro social
   del dueño, necesario para el EIN).
3. Preparas y presentas la formación de la LLC ante la agencia del estado
   correspondiente (en Virginia, la SCC — ver abajo).
4. Tramitas el EIN directo con el IRS. El trámite es gratis y lo puedes
   hacer tú mismo como tercero autorizado, siempre que el cliente te dé
   autorización firmada — la solicitud se hace en una sola sesión en el
   sitio del IRS (no se puede guardar a la mitad, así que ten los datos
   listos antes de empezar).
5. Le mandas al cliente sus documentos aprobados, la plantilla de acuerdo
   operativo, y una guía de próximos pasos (cuenta bancaria del negocio,
   licencias locales, fecha del próximo reporte anual).

### En Virginia (los montos que ya están en la página)

- **Formación de la LLC**: $100, presentado ante la **Comisión Estatal de
  Corporaciones (SCC)** — [scc.virginia.gov](https://www.scc.virginia.gov).
  En línea, normalmente se procesa el mismo día.
- **Reporte anual**: $50 cada año, antes del último día del mes en que se
  formó la LLC — si no se paga a tiempo hay un recargo de $25, y si se
  atrasa mucho el estado puede disolver la empresa.
- **Agente registrado obligatorio**: toda LLC de Virginia necesita un
  agente registrado con dirección física en el estado (no se permite un
  apartado postal). Si vives en Virginia, puedes ofrecerte tú mismo como
  agente registrado de tus clientes — pero eso es una responsabilidad legal
  continua (tienes que estar disponible para recibir notificaciones legales
  a nombre de esa empresa), así que decide con calma si quieres ofrecerlo
  de una vez o dejarlo para más adelante.

### En otros estados

El patrón general es el mismo (formar la entidad ante la agencia del estado
+ EIN federal con el IRS), pero cada estado tiene su propia agencia, su
propia cuota y sus propios plazos. Cuando te llegue una solicitud de un
estado que no sea Virginia, confírmale al cliente los montos exactos de su
estado antes de cobrarle nada — la página ya le avisa que se lo vas a
confirmar antes de empezar.

## Precio

- **Tu tarifa de servicio**: $149 (marcado como "precio de lanzamiento",
  igual que hiciste con "Listar negocio" — puedes subirlo más adelante sin
  afectar a tus primeros clientes).
- **Cuota del estado**: aparte, se la cobras junto con tu tarifa o el
  cliente la paga directo — en Virginia son $100.

Si más adelante quieres cambiar el precio mostrado en la página, dime la
cifra nueva y lo actualizo en un momento.

## Cómo cobrar

Igual que con los otros servicios del sitio: no hay cobro automático
conectado todavía. Te contactas con el cliente (Zelle, Cash App, Venmo, o lo
que ya uses), confirmas el pago, y ahí empiezas el trámite.
