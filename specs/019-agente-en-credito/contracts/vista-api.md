# Contrato — `ThemoraAgenteVista` (`agente-credito-vista.js`)

UMD. Funciones puras: reciben datos y devuelven **strings de HTML** en las que todo texto variable pasa por `escapar`. No tocan el DOM, no hacen llamadas de red y no guardan nada.

## Textos fijos

```js
AVISO = 'Esto es información educativa, no asesoría legal ni financiera. Revisa tu reporte original antes de actuar.'

TIPO_PASO = { disputar: 'Disputar', pagar: 'Pagar', esperar: 'Esperar', proteger: 'Proteger', revisar: 'Revisar' }

MOTIVO_RESPALDO = {
  sin_sesion:          'Inicia sesión para usar el análisis con IA. Mientras tanto, aquí tienes los cálculos de tu reporte.',
  limite_diario:       'Ya usaste tus 3 análisis con IA de hoy. Puedes volver a usarlo mañana. Aquí tienes los cálculos de tu reporte.',
  ia_no_disponible:    'El análisis con IA no está disponible en este momento. Aquí tienes los cálculos de tu reporte.',
  demasiadas_vueltas:  'El análisis con IA no terminó a tiempo. Aquí tienes los cálculos de tu reporte.',
  respuesta_no_valida: 'El análisis con IA no pasó nuestras revisiones de calidad. Aquí tienes los cálculos de tu reporte.',
  datos_rechazados:    'Para proteger tus datos, no enviamos este reporte a la IA. Aquí tienes los cálculos de tu reporte.',
  no_configurado:      'El análisis con IA todavía no está activado en este sitio. Aquí tienes los cálculos de tu reporte.'
}

FALTA = { falta_nombre: 'tu nombre', falta_direccion: 'tu dirección', falta_destinatario: 'a quién va dirigida (no reconocimos el buró)', falta_cobrador: 'los datos del cobrador' }
```

## `textoEvento(codigo, privado) → string`

| Código | Texto |
|---|---|
| `etiquetando` | `Quitando tus datos personales antes de enviar` |
| `enviando:1` | `Enviando tu reporte sin datos personales al agente` |
| `enviando:N` (N > 1) | `El agente sigue revisando (paso N)` |
| `reintentando:N` | `Volviendo a intentar` |
| `herramienta:calcularFechaSalida:X` | `Calculando hasta cuándo puede aparecer la cuenta X (ACREEDOR)` |
| `herramienta:calcularUtilizacion` | `Calculando cuánto usas de tus tarjetas` |
| `herramienta:buscarPosiblesDuplicados` | `Buscando deudas que podrían estar dos veces` |
| `herramienta:contarConsultasDuras` | `Contando las consultas duras del último año` |
| `terminado` | `Listo` |
| `respaldo:<motivo>` | `MOTIVO_RESPALDO[motivo]` |
| cualquier otro | `Trabajando…` |

ACREEDOR sale de `privado.cuentas[X].acreedor`. Si no está, va solo «cuenta X».

## `renderMarcar({ cuentas, datos }) → html`

- `cuentas`: `[{ id, acreedor, frase }]`; `datos`: `[{ etiqueta, tipo, valor }]`.
- Devuelve un `<form class="cr-marcar" id="crMarcarForm">` con:
  - `<fieldset>` «Cuentas»: `<label><input type="checkbox" name="marca-cuenta" value="<id>"> ACREEDOR — frase</label>`;
  - `<fieldset>` «Tus datos personales»: `<label><input type="checkbox" name="marca-dato" value="<etiqueta>"> tipo: valor</label>`;
  - botones `<button type="submit">Analizar</button>` y `<button type="button" data-accion="cancelar-marcar">Cancelar</button>`.
- Todas las casillas empiezan sin marcar.
- Va encabezado por `<h4>¿Hay algo que no reconoces?</h4>` y la frase «Marca solo lo que no es tuyo. El agente lo tendrá en cuenta. Tus datos se quedan en este dispositivo.».

## `renderResultado(resultado, privado) → html`

- **`modo: 'ia'`**: `<section class="cr-agente-resultado">` con:
  - `<h3>Lo que encontró el agente</h3>`;
  - `<p class="cr-agente-diagnostico">`;
  - `<ol class="cr-agente-plan">`: cada paso es un `<li data-tipo="…">` con `<span class="cr-agente-tipo">TIPO_PASO</span>`, las cuentas «Cuenta A (ACME BANK)», `<ul class="cr-agente-hechos">` (cada hecho con `<span class="cr-fuente" data-fuente="reporte|herramienta">del reporte|calculado</span>`), `<p class="cr-agente-interpretacion">` y `<p class="cr-agente-accion">`;
  - `despues`, `preguntasParaTi`, `verificar` y `datosPersonales` como listas con títulos «Después», «Preguntas para ti», «Para verificar» y «Datos personales para revisar». Una lista vacía no se pinta;
  - `<p class="cr-aviso">AVISO</p>`.
- **`modo: 'local'`**: `<section class="cr-agente-resultado" data-modo="local">` con:
  - `<p class="cr-agente-motivo">MOTIVO_RESPALDO[motivo]</p>`;
  - «Fechas de salida»: una línea por cuenta calculada, con `salida` y «(estimada)» si `estimada`, o «no se puede calcular» con su motivo;
  - «Uso de tus tarjetas»: porcentaje por tarjeta y total, o «sin dato»;
  - «Posibles deudas repetidas»: los pares;
  - «Consultas duras en 12 meses»: el total;
  - el AVISO.
- Una herramienta en `null` muestra «No se pudo calcular».

## `renderAgenteEnCirculo(resultado, letra, privado) → html`

Si `resultado.modo === 'ia'` y algún paso del plan incluye `letra` en `cuentas`: `<section class="cr-agente-circulo"><h5>Lo que dice el agente</h5>…pasos (mismo formato que en el plan)…</section>`. Si no, `''`.

## `renderCarta(borrador, textoFinal?) → html`

`<article class="cr-carta-agente" data-id="carta-1" data-estado="…">` con:

1. Un título por tipo: «Disputa al buró», «Validación de deuda» o «Corrección de datos personales». Después, el destinatario (`destino.destinatario` o, en la validación, «el cobrador») y las cuentas «ACREEDOR (termina en 0123)».
2. Un `<fieldset>` «Tus datos», con `<input data-campo="remitente.givenNames">` y los demás campos (`firstSurname`, `secondSurname`, `street`, `city`, `state`, `postalCode`, `currentPhone`), con los valores actuales en `value`. En `debt-validation`, también el `<fieldset>` «Datos del cobrador» (`cobrador.nombre`, `calle`, `ciudad`, `estado`, `cp`).
3. Las dos casillas `data-confirmacion="inexacta"` («Revisé que esta información es inexacta»; en la validación: «Quiero pedir la validación de esta deuda») y `data-confirmacion="yoEnvio"` («Yo envío esta carta»), marcadas según `confirmaciones`.
4. El estado:
   - `incompleto` → «Falta: tu nombre, tu dirección» (con `FALTA`);
   - `borrador` → «Marca las dos confirmaciones para aprobarla»;
   - `aprobada` → «Aprobada: lista para que la envíes tú».
5. **Solo si está `aprobada` y viene `textoFinal`:**
   - las dos columnas, con el marcado existente de la página: `<div class="cr-letter-pair" role="group" aria-label="Carta en español y en inglés">` y, por cada bloque de `textoFinal.bloques`, un `<div class="cr-letter-row">` con `<div class="cr-letter-cell es" lang="es">` y `<div class="cr-letter-cell en" lang="en">`, una línea por `<p>`;
   - el botón `<button type="button" data-accion="copiar-carta" data-id="…">Copiar carta en inglés</button>`;
   - la guía en `<ol class="cr-carta-guia">`.

Nunca hay un `<form action>`, un `mailto:` ni nada que envíe la carta.
