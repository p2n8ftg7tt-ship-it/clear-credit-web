# Implementation Plan: Lector de reportes de crédito — Fase 1 (lectura cuenta por cuenta)

**Branch**: `013-lector-credito-metodologia` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-lector-credito-metodologia/spec.md`

**Alcance de este plan**: la Fase 0 ya está implementada (ver spec, US0). Este plan cubre la **Fase 1 / US1** (FR-010 a FR-018) y el rediseño visual del lector en `credito.html`, pedido junto con ella. Las fases 2 a 5 tendrán su propio plan cuando les toque; aquí solo se deja preparado lo que ellas necesitarán del modelo de datos.

## Summary

Hoy el lector busca palabras en todo el texto y no sabe a qué cuenta pertenece cada dato. La Fase 1 añade un **motor de lectura** puro (sin DOM, probado en Node) que convierte las páginas de un reporte de Equifax, Experian, TransUnion o de formato desconocido en un registro estructurado: información personal (sin guardar SSN ni fecha de nacimiento), avisos del archivo, cuentas con todos sus campos y fechas, historial mes a mes, cobranzas, consultas duras y blandas y registros públicos. Cada dato guarda **de dónde salió** (página, sección, etiqueta). Un campo impreso vacío queda como «no reportado», nunca como cero.

La lectura se apoya en **perfiles por buró**: tablas de datos (secciones, etiquetas, códigos de pago, códigos narrativos) con su fuente y fecha de verificación, y un perfil genérico para lo que no se reconozca. El extractor de PDF pasa a entregar **líneas con posición horizontal**, lo que permite ubicar cada código del historial de pagos en su mes; cuando no se puede, el atraso se conserva con la marca «mes no verificable».

En la página, los resultados muestran una nueva sección **«Tus cuentas, una por una»**: cada cuenta es una **ficha** sobre papel rayado (la «copia lavanda» del crédito), con sus campos en una lista de definición, el resaltador solo en las fechas y montos que importan y una **franja de 24 meses** del historial de pagos como único elemento llamativo. La evaluación actual (Fase 0) sigue funcionando al lado; la Fase 2 la reemplazará.

## Technical Context

**Language/Version**: JavaScript ES2020 sin compilación (navegador moderno y Node 24 para pruebas).

**Primary Dependencies**: pdf.js 3.11.174, mammoth y SheetJS, ya cargados por `credito.html` desde cdnjs. No se añade ninguna dependencia.

**Storage**: ninguno. Todo vive en memoria del navegador mientras la página está abierta (Principio II). La Fase 5 decidirá qué se guarda.

**Testing**: `node --test tests/` con fixtures sintéticos en `tests/fixtures/credito/` (páginas inventadas y resultado esperado en JSON), igual que `tests/fixtures/tds/`.

**Target Platform**: sitio estático en Netlify; Chrome, Safari y Firefox recientes, escritorio y teléfono.

**Project Type**: sitio web estático con módulos de navegador que también se cargan en Node (patrón de `tds.js`, `ciudad-sugerida.js`, `cartas-bilingues.js`).

**Performance Goals**: leer y dibujar un reporte de 15 páginas en menos de 10 s en un teléfono de gama media (SC-006); la lectura en sí, sin contar pdf.js, en menos de 300 ms.

**Constraints**: el documento no sale del navegador (FR-018); SSN y fecha de nacimiento no se conservan en el registro (FR-017); nada de analítica con datos del reporte; sin cambios de tamaño de letra del sitio (preferencia del dueño); tokens y fuentes del sistema «Mar en calma» (spec 012).

**Scale/Scope**: 4 perfiles (Equifax, Experian, TransUnion, genérico); reportes de hasta 150 páginas y del orden de 60 cuentas y 80 consultas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple la Fase 1 | Estado |
|---|---|---|
| I. Honestidad y no asesoría | La Fase 1 solo **lee y muestra**; no emite juicios. Los campos vacíos dicen «no reportado». Un mes que no se puede ubicar dice «mes no verificable» en vez de adivinarse. El formato de un buró no reconocido se declara «no verificado». | ✅ |
| II. Privacidad por diseño | La lectura ocurre en el navegador. El registro no guarda SSN ni fecha de nacimiento, solo si el reporte los muestra. Los números de cuenta salen siempre enmascarados. No hay eventos de analítica con datos del reporte (solo el evento categórico existente `reporte-evaluar`). | ✅ |
| III. Funciona sin IA | Motor 100 % local, sin llamadas a servicios. | ✅ |
| IV. Una sola verdad, probada | Cada perfil de buró es la única fuente de sus etiquetas y códigos, con fecha de verificación. Todo lo que el lector muestra sale del registro, no de volver a buscar en el texto. Las pruebas con fixtures cubren los tres burós y el genérico. | ✅ |
| V. Multilingüe | Las etiquetas del reporte se reconocen en inglés y en español. La interfaz de la Fase 1 queda en español con el término legal en inglés entre paréntesis (por ejemplo «Fecha de primera morosidad (DOFD)»). El inglés completo de la interfaz se exige en la Fase 2 (FR-029). | ✅ con nota |
| Sitio estático, sin framework | Dos archivos JS nuevos en la raíz, cargados con `<script defer>` como los demás módulos. Sin compilación. | ✅ |
| Todo lo que está en la raíz se publica | Los perfiles solo contienen etiquetas y códigos públicos de los burós, nada privado. Los fixtures viven en `tests/`, que ya está bloqueado con 404 en `netlify.toml`. El reporte real de Equifax **no** se copia al proyecto. | ✅ |
| Seguridad del navegador | No hay servicios nuevos; la CSP no cambia. | ✅ |
| Formato LF | Archivos nuevos en LF; las ediciones a `credito.html` preservan LF. | ✅ |

**Resultado**: sin violaciones. No hace falta la tabla de complejidad.

**Re-check tras el diseño (Fase 1 del plan)**: el modelo de datos ([data-model.md](./data-model.md)) confirma que `Identidad` solo guarda banderas (`ssnMostrado`, `fechaNacimientoMostrada`), nunca los valores. El contrato de interfaz ([contracts/ui-cuentas.md](./contracts/ui-cuentas.md)) no añade tamaños de letra nuevos: reutiliza la escala `--text-*`. Sigue sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/013-lector-credito-metodologia/
├── spec.md
├── plan.md                    # este archivo
├── research.md                # decisiones de la Fase 1
├── data-model.md              # Reporte, Cuenta, Origen, Perfil… (sirve a las fases 1–5)
├── quickstart.md              # cómo validar la Fase 1
├── contracts/
│   ├── lector-credito-api.md  # interfaz pública de ThemoraLector y de los perfiles
│   └── ui-cuentas.md          # dirección visual y marcado de «Tus cuentas, una por una»
├── checklists/requirements.md
└── tasks.md                   # lo crea /speckit-tasks
```

### Source Code (repository root)

```text
lector-credito.js               # NUEVO — motor: páginas → Reporte (global ThemoraLector + module.exports)
lector-credito-perfiles.js      # NUEVO — perfiles Equifax / Experian / TransUnion / genérico (global ThemoraLectorPerfiles)
credito.html                    # CAMBIA — extractPdf entrega líneas con posición; llama a ThemoraLector;
                                #          dibuja «Tus cuentas, una por una»; CSS del lector rediseñado
tests/
├── lector-credito.test.js      # NUEVO — lectura por buró, orígenes, vacíos, códigos, enmascarado, privacidad
├── lector-credito-perfiles.test.js  # NUEVO — cada perfil completo, con fuente y fecha; códigos únicos
├── credito-fase0.test.js       # existente — debe seguir pasando
├── credito-identidad.test.js   # existente — debe seguir pasando
└── fixtures/credito/
    ├── equifax.json            # páginas sintéticas con el formato Equifax observado (mayo 2026)
    ├── experian.json           # páginas sintéticas según la guía de Experian
    ├── transunion.json         # páginas sintéticas según la guía de TransUnion (incluye versión por correo)
    ├── generico.json           # formato no reconocido
    └── esperado/*.json         # registro esperado para cada fixture
```

**Structure Decision**: mismo patrón plano del proyecto («flat static layout, browser+Node module pattern», spec 003). El motor y los perfiles van separados para que los perfiles, que son datos, se puedan revisar y fechar sin tocar la lógica. No se crea ninguna carpeta `src/`.

## Complexity Tracking

Sin violaciones de la constitución; no aplica.
