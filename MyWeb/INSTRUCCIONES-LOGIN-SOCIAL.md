# Cómo activar el login con Google, Microsoft y teléfono

Esta guía es para el login "profesional" que agregamos a `login.html`: además de
correo y contraseña (que ya funciona en cuanto sigas `INSTRUCCIONES-CUENTAS.md`),
la página ahora también tiene botones para entrar con **Google** y
**Microsoft**, y un método de **teléfono** (código por mensaje de texto).

**Importante:** el código ya está listo y funcionando para los tres métodos.
Lo que falta es que TÚ actives cada uno desde el panel de Supabase — son pasos
de configuración, no de programación, pero cada proveedor requiere que tengas
(o crees) una cuenta de desarrollador con esa empresa. No necesitas activarlos
todos a la vez: puedes activar solo Google primero, por ejemplo, y los demás
botones simplemente mostrarán "Este método de acceso no está activado todavía"
si alguien los toca antes de que los configures.

**Nota sobre Apple:** quitamos el botón "Continuar con Apple" del sitio
porque requiere pagar $99 USD/año por una membresía de Apple Developer solo
para activarlo — no tiene versión gratis. Si más adelante quieres agregarlo
(por ejemplo, si conviertes el sitio en app móvil y ya vas a pagar esa
membresía de todas formas), dímelo y lo agregamos de nuevo; el código para
conectarlo con Supabase es el mismo patrón que Google y Microsoft.

## Antes de empezar

Todo esto asume que ya completaste `INSTRUCCIONES-CUENTAS.md` — es decir, ya
tienes un proyecto de Supabase conectado en `auth.js`. Si no, haz eso primero.

---

## Google

Es el más simple de los dos proveedores de redes sociales.

1. Ve a [console.cloud.google.com](https://console.cloud.google.com/) y crea un
   proyecto (o usa uno existente).
2. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth**. Elige
   "Externo", completa el nombre de la app ("Themora") y tu correo de
   contacto.
3. Ve a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente
   de OAuth**. Tipo de aplicación: **Aplicación web**.
4. En "Orígenes de JavaScript autorizados" agrega tu dominio (por ejemplo
   `https://tu-sitio.netlify.app`). En "URI de redirección autorizados" pega la
   URL de callback que te da Supabase (la encuentras en el paso 6).
5. Copia el **ID de cliente** y el **secreto de cliente** que te genera Google.
6. En Supabase, ve a **Authentication → Providers → Google**, actívalo, y pega
   ahí el ID de cliente y el secreto. Supabase te muestra en esa misma pantalla
   la URL de callback que debes haber pegado en el paso 4.
7. Guarda. Listo — el botón "Continuar con Google" ya funciona.

**Costo:** gratis.

---

## Microsoft (Azure)

1. Ve a [portal.azure.com](https://portal.azure.com/) → **Azure Active
   Directory → Registros de aplicaciones → Nuevo registro**.
2. Nombre: "Themora". En "URI de redirección" elige tipo **Web** y pega
   la URL de callback que te muestra Supabase (**Authentication → Providers →
   Azure** en Supabase).
3. Una vez creado, copia el **ID de aplicación (cliente)** y el **ID de
   directorio (inquilino)**.
4. Ve a **Certificados y secretos → Nuevo secreto de cliente**, créalo y copia
   el **valor** (no el ID) inmediatamente — Azure solo lo muestra una vez.
5. En Supabase, ve a **Authentication → Providers → Azure**, actívalo, y pega
   el ID de aplicación, el secreto, y el ID de inquilino.
6. Guarda. El botón "Continuar con Microsoft" ya funciona.

**Costo:** gratis para este uso (cuentas personales/organizacionales estándar).

---

## Teléfono (código por SMS)

A diferencia de los dos anteriores, esto no es "iniciar sesión con una cuenta
que ya existe en otro lado" — es Supabase enviando un mensaje de texto real,
así que **tiene un costo por cada mensaje enviado**, sin importar si la persona
completa el inicio de sesión o no.

1. Necesitas una cuenta con un proveedor de SMS compatible con Supabase. El más
   común es **Twilio** ([twilio.com](https://www.twilio.com/)) — hay otros
   (MessageBird/Vonage, TextLocal) si prefieres.
2. En Twilio, crea una cuenta, verifica tu identidad, y compra un número de
   teléfono con capacidad de enviar SMS (tiene un costo mensual pequeño por el
   número, más un costo por cada mensaje enviado — revisa los precios actuales
   en su sitio, cambian por país).
3. Copia tu **Account SID**, tu **Auth Token**, y el número que compraste.
4. En Supabase, ve a **Authentication → Providers → Phone**, actívalo, elige
   Twilio como proveedor, y pega esos tres datos.
5. Guarda. El método "Teléfono" en `login.html` ya funciona — enviará un código
   de 6 dígitos por SMS y la persona lo escribe para entrar. Si es la primera
   vez que ese número inicia sesión, Supabase crea la cuenta automáticamente
   (no hace falta un formulario de registro aparte para teléfono).

**Costo:** variable según el proveedor y el volumen de mensajes — revisa el
precio por SMS antes de activarlo, porque a diferencia de Google/Apple/
Microsoft, aquí cada intento de inicio de sesión cuesta dinero real, incluso
si la persona no completa el proceso.

**Recomendación:** si quieres controlar el gasto al principio, puedes lanzar el
sitio con solo Google (gratis, rápido de configurar) y el correo/contraseña
que ya tenías, y agregar teléfono y los otros proveedores más adelante según
te lo pidan tus usuarios.

---

## Qué hace el sitio si un método no está configurado

No necesitas activar los tres para lanzar el sitio. Si alguien toca un botón
de un proveedor que no has activado en Supabase, o intenta usar el teléfono
antes de configurar el SMS, el sitio le muestra un mensaje claro ("Este método
de acceso no está activado todavía en el sitio. Prueba con otro método.") en
vez de romperse o quedarse sin responder — el resto de la página sigue
funcionando con normalidad.
