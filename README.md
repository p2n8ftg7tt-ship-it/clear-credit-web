# Clear Credit: casa y auto separados

Abre `index.html` para elegir una de las dos rutas:

- `comprar-casa.html`: conserva la información hipotecaria y los recorridos interactivos de FHA y préstamo convencional.
- `comprar-auto.html`: incluye el mapa de los 50 estados, tasas de auto nuevo y usado, categorías de crédito y guía del Federal Truth in Lending Disclosure.

## Agente de tasas

`rate-agent.js` usa `auto-rates.js` al abrir la página directamente desde Windows. Si el proyecto se sirve desde un sitio web, también lee `auto-rates.json` con caché desactivada y vuelve a comprobarlo cada 15 minutos.

La automatización “Agente diario de tasas de auto” revisa las fuentes cada mañana y actualiza `auto-rates.json` y `auto-rates.js`. No estima tasas estatales de usados: mantiene `null` cuando la fuente no publica un promedio estatal y la interfaz muestra el promedio nacional de respaldo.

## Mapa

El mapa es un cartograma esquemático de los 50 estados construido con HTML y CSS local. No necesita conexión a internet, D3 ni archivos externos para mostrarse.

## Fuentes de datos

- MonitorBankRates: promedios anunciados nacionales y estatales.
- Experian: promedios de transacciones por categoría de crédito.
- Consumer Financial Protection Bureau y Regulation Z: explicación del Truth in Lending Disclosure.

Las cifras son referencias educativas, no ofertas ni aprobaciones de crédito.
