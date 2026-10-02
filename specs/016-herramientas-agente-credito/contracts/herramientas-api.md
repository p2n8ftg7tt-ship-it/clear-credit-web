# Contrato — `ThemoraHerramientas` (`herramientas-credito.js`)

Módulo UMD, igual que `lector-credito.js` y `analista-credito.js`:

```js
// Navegador:  <script src="herramientas-credito.js"></script>  →  window.ThemoraHerramientas
// Node:       const H = require('./herramientas-credito.js');
// Netlify:    const H = require('../../herramientas-credito.js');   (como revisar-negocio.js con tds.js)
```

No toca el DOM, no hace llamadas de red, no lee el reloj, no guarda nada y no depende de otros archivos. Las formas de salida están en `../data-model.md`.

## Funciones

### `calcularFechaSalida(cuenta, { hoy }) → ResultadoFechaSalida`

- `cuenta`: una `Cuenta` (spec 013).
- `hoy`: `'AAAA-MM-DD'`.
- Reglas: FR-010 a FR-019; research R3, R4 y R5.

### `calcularUtilizacion(cuentas) → ResultadoUtilizacion`

- `cuentas`: `Cuenta[]`.
- Reglas: FR-020 a FR-026; research R6.

### `buscarPosiblesDuplicados(cuentas) → PosibleDuplicado[]`

- `cuentas`: `Cuenta[]`.
- Reglas: FR-027 a FR-032; research R7.

### `contarConsultasDuras(consultas, { hoy, meses = 12 }) → ConteoConsultasDuras`

- `consultas`: `Consulta[]`.
- Reglas: FR-033 a FR-037.

### `ejecutar(nombre, reporte, opciones) → resultado`

- Busca `nombre` en `CATALOGO` y le pasa `reporte` (un `Reporte` completo) y `opciones`.
- `calcularFechaSalida` con `opciones.cuentaId` devuelve un `ResultadoFechaSalida`; sin él, devuelve un arreglo con uno por cuenta, en orden por `cuentaId`.
- Es el punto de entrada que usará el agente de la fase siguiente.

### `CATALOGO`

Arreglo congelado de `{ nombre, version, alcance }`, sin funciones expuestas. Sirve para listar las herramientas disponibles.

## Garantías

1. **Determinismo**: llamadas repetidas con entradas iguales (`deepStrictEqual`) dan salidas iguales (`deepStrictEqual`), en cualquier zona horaria.
2. **Sin mutación**: la entrada no se modifica. La prueba congela el fixture con `Object.freeze` profundo y comprueba que no se lanza ningún error.
3. **Sin texto para el consumidor**: solo códigos, números, fechas ISO y textos copiados tal cual del reporte (`marcaVendida.texto`, `responsabilidad`, `empresa`).
4. **Sin datos personales**: no aparecen campos de `identidad`, números de cuenta ni contactos.
5. **Errores**: solo `TypeError` por uso indebido (`data-model.md`, «Errores de uso»). Los datos faltantes nunca lanzan errores.

## Ejemplo (ACME/ZETA, hoy `2026-10-01`)

```js
H.calcularFechaSalida(acme, { hoy: '2026-10-01' })
// {
//   cuentaId: 'A', regla: 'cobranza_o_chargeoff', estado: 'calculado', motivo: null,
//   caracter: 'calculo_informativo',
//   fechas: [{
//     reglaBase: '7_anos_mas_180_dias',
//     base: { campo: 'dofd', valor: '2021-03', origen: { pagina: 1, seccion: 'adversas', etiqueta: 'Date of 1st Delinquency', linea: 9 } },
//     salida: '2028-09', precision: 'mes', estimada: true, motivoEstimacion: 'dofd_sin_dia_exacto',
//     rango: { desde: '2028-08', hasta: '2028-09' }, yaPaso: false
//   }],
//   omitidos: [], avisos: []
// }
```
