# Contract — Vista del resumen en `credito.html` (#analizar-reporte)

Lo que la página promete mostrar. Las pruebas de `tests/credito-resumen-ui.test.js` comprueban estructura y textos; la estética se revisa a ojo con la guía de `quickstart.md`.

## Orden de la pantalla de resultado

```text
┌ Pasos del agente ─────────────────────────────────────────────┐
│ ✓ Observé tu reporte de Experian del 23 de mayo de 2026 (23 p.)│
│ ✓ Leí 5 cuentas, tus datos personales y 14 consultas duras     │
│ ✓ Revisé cada cuenta contra la FCRA y la FDCPA                 │
│ ● Encontré 2 cuentas con problemas                             │
└────────────────────────────────────────────────────────────────┘
┌ Datos generales (copia lavanda, ancho completo) ──────────────┐
│ Ana Prueba Ejemplo                      Experian · 23 may 2026│
│ Seguro Social   Este reporte no lo muestra                    │
│ Dirección       100 Calle Falsa, Ciudad Ejemplo FL  y 3 más   │
│ Teléfono        (555) 010-0000                                │
│ Cuentas         5  (2 abiertas, 3 cerradas)                   │
│ Consultas duras 14 [ícono]     Consultas blandas 40 [ícono]   │
│ Registros públicos 0                                          │
└───────────────────────────────────────────────────────────────┘
┌ Cuentas abiertas ┐
│ 2: 2 tarjetas    │
└──────────────────┘
Cuentas con problemas
 ( BE )        ( BE )
 Blue Eagle    Blue Eagle
 Charge-off,   Atraso de 30 días,
 feb. 2026     feb. 2026
┌ Análisis de la cuenta abierta ────────────────────────────────┐
│ Qué vimos · Qué significa para ti · Qué dice la ley ·         │
│ Qué puedes hacer · [Preparar carta de disputa]                │
└───────────────────────────────────────────────────────────────┘
[Analizar otro documento] [Imprimir] [Guardar en mi cuenta]
Aviso educativo
```

(Los datos personales del dibujo son inventados; las pruebas también usan datos inventados.)

## Elementos e identificadores

| Id / clase | Qué es | Reglas |
|---|---|---|
| `#crPasos` | `<ol aria-live="polite">` con 4 `<li data-estado>` | Estados `pendiente`, `en_curso`, `hecho`, `fallido` |
| `#crDatosGenerales` | Cuadro grande, `<section aria-labelledby>` | Sin «No visible»; SSN `xxx-xx-1234` o frase de ausencia |
| `#crConsultasDuras`, `#crConsultasBlandas` | `<button aria-expanded aria-controls>` con ícono y número | Abren `#crCartelDuras` / `#crCartelBlandas` (`popover`); Escape y toque fuera cierran |
| `#crAbiertas` | Cuadro pequeño | Solo tipos con cuentas |
| `#crProblemas` | Fila de `<button class="cr-circulo" data-gravedad aria-expanded aria-controls="crAnalisis">` | Texto oculto visualmente con la gravedad; si no hay problemas, un `<p>` tranquilo y ningún botón |
| `#crAnalisis` | Panel único | Cuatro partes con `<h4>`; foco al título al abrir; formulario de carta plegado |
| `#crResetButton`, `#crPrintButton`, `#crSaveButton` | Se conservan | Imprimir usa el resumen nuevo |

## Lo que deja de mostrarse

`#crKpis`, `.cr-summary` (tabla por tipo), `#crCuentas` («Tus cuentas, una por una»), `.cr-groups` (negativos/positivos) y `.cr-strategy` (plan repetido). Su código de pintado se borra cuando la vista nueva esté probada (historia 5), no antes.

## Texto

- «consumidor», nunca «cliente».
- Sin «debes», «no pagues», «es ilegal».
- Fechas en español largo («23 de mayo de 2026») en datos generales; abreviadas («feb. 2026») bajo los círculos.
- Todo texto del reporte pasa por `escapeHtml`.

## Accesibilidad

Foco visible con `--focus-ring`; círculos ≥ 44 px; gravedad en texto además de color; contraste ≥ 4.5:1 para iniciales; `prefers-reduced-motion` sin animaciones.
