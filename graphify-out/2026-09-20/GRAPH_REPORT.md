# Graph Report - MyWeb  (2026-09-20)

## Corpus Check
- 80 files · ~302,843 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .bat 1, .ico 1)

## Summary
- 794 nodes · 1053 edges · 70 communities (55 shown, 15 thin omitted)
- Extraction: 89% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9417a46`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Informe de auditoria y hoja de ruta (Themora)
- auth.js
- privacidad.html (privacy retention table)
- comprar-casa.html (Comprar casa page)
- autocompletar-direccion.test.js
- explain-letter.js
- herramientas.html (calculators)
- revisar-negocio.js
- Servicio Listar negocio ($49.99 precio de lanzamiento)
- zyron-brain.js
- credit-coach.js
- autocompletar-direccion.js
- conectar
- Feature Specification: Automatic Address Autocomplete
- explain-auto-contract.js
- admin-data.js
- mortgage-accelerator.js
- Tasks: [FEATURE NAME]
- analyzer.js
- auth-helpers.js
- coach.js
- rate-agent.js
- design-taste-frontend Skill (Anti-Slop Frontend)
- Themora brand mark (gold and navy ribbon T)
- Credito hero 1: credit dispute letter to Experian with bureau scores and dispute checklist
- Delete account flow (deleteAllMyData, eliminarCuenta)
- Hero: young couple with laptop, cash and US flag
- quick-calculators.js
- normalize
- zyron-leyes.js
- cms.js
- Themora header logo: gold and navy ribbon T mark
- agForm submit handler (Netlify Forms POST)
- speckit-analyze/SKILL.md
- Execution Steps
- common.ps1
- Feature Specification: [FEATURE NAME]
- speckit-plan/SKILL.md
- speckit-specify/SKILL.md
- speckit-tasks/SKILL.md
- Planes Basico $4.99 / Estandar $9.99 / Premium $14.99
- Core Principles
- Core Principles
- Supabase (auth y base de datos)
- Implementation Plan: [FEATURE]
- speckit-checklist/SKILL.md
- speckit-clarify/SKILL.md
- speckit-implement/SKILL.md
- cuenta.html (My account page)
- Stripe Invoicing (facturas en borrador)
- speckit-constitution/SKILL.md
- Motor de busqueda de opciones (comparadores propuestos)
- Disallow admin.html y cuenta.html
- admin.html (panel de administrador)
- create-new-feature.ps1
- nav.js
- speckit-taskstoissues/SKILL.md
- [CHECKLIST TYPE] Checklist: [FEATURE NAME]
- applyUpdatedUser
- updateNavLink
- signOut
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `privacidad.html (privacy retention table)` - 15 edges
2. `conectar()` - 14 edges
3. `handler()` - 13 edges
4. `Tasks: [FEATURE NAME]` - 13 edges
5. `submitQuestion()` - 11 edges
6. `handler()` - 11 edges
7. `responder()` - 11 edges
8. `contacto.html (Contact page)` - 11 edges
9. `cuenta.html (My account page)` - 11 edges
10. `handler()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Propuesta de membresias (Gratis / Plus / Familia)` --semantically_similar_to--> `Planes Basico $4.99 / Estandar $9.99 / Premium $14.99`  [INFERRED] [semantically similar]
  INFORME-CREDITO-CLARO.md → INSTRUCCIONES-PLANES.md
- `extractPdf / extractWord / extractExcel (local document text extraction)` --semantically_similar_to--> `Contract page photo upload and AI extraction (ctLeerPaginas)`  [INFERRED] [semantically similar]
  credito.html → contrato-auto.html
- `Pre-form warning: do not send SSN or deadlines notice` --semantically_similar_to--> `Send-encrypted notice: pages leave device to Anthropic, no copy kept`  [INFERRED] [semantically similar]
  contacto.html → contrato-auto.html
- `Local-only processing: report stays on device` --semantically_similar_to--> `Send-encrypted notice: pages leave device to Anthropic, no copy kept`  [INFERRED] [semantically similar]
  credito.html → contrato-auto.html
- `FHA vs conventional comparator (calcular, simularFha, simularConv)` --semantically_similar_to--> `calcular / pagoMensual (true cost of add-ons with interest)`  [INFERRED] [semantically similar]
  comprar-casa.html → contrato-auto.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Features backed by CCAuth account API** — cuenta_saved_history_lists, cuenta_profile_management, cuenta_notification_preferences, cuenta_delete_account_flow, credito_save_analysis, auth [EXTRACTED 1.00]
- **Financial calculators on herramientas page** — herramientas_mortgage_calculator, herramientas_quick_calculators, herramientas_mortgage_accelerator, herramientas_dealer_contract_simulator [EXTRACTED 1.00]
- **Supabase authentication methods (email, Google, Microsoft, phone)** — instrucciones_cuentas_supabase, instrucciones_login_social_google_oauth, instrucciones_login_social_microsoft_azure, instrucciones_login_social_phone_sms [EXTRACTED 1.00]
- **Themora account authentication flow** — login_signup_flow, login_signin_flow, login_social_oauth, login_password_recovery, login_ccauth, login_themora_auth_helpers [EXTRACTED 1.00]
- **Data handling and privacy disclosures** — privacidad_credit_report_local, privacidad_documents_sent_table, privacidad_auto_redaction, privacidad_third_parties, privacidad_retention_table, privacidad_deletion_rights [EXTRACTED 1.00]
- **Paid service terms: pricing, payment, stages, refunds** — terminos_paid_services, terminos_payment_methods, terminos_refund_stages, terminos_reference_number, terminos_prices_from_pago_js [EXTRACTED 1.00]
- **Client-side financial calculators reflecting true cost** — comprar_casa_fha_vs_conv_comparator, contrato_auto_calcular, contrato_auto_escenario, comprar_casa_fha_mip_example [INFERRED 0.75]
- **Tu negocio nav group: service pages** — formar_negocio, listar_negocio, index [INFERRED 0.75]
- **Admin panel management surfaces** — admin_renderstats, admin_contenteditor, admin_facturas, admin_loadadmindata [INFERRED 0.85]
- **Comprar auto stage-based guidance content** — comprar_auto_etapas, comprar_auto_rate_map, comprar_auto_credit_tiers, comprar_auto_tila_reader, comprar_auto_sin_ssn [INFERRED 0.85]
- **Credito page hero image set** — images_credito_hero_1, images_credito_hero_2, images_credito_hero_3, images_credito_hero_4 [INFERRED 0.85]
- **Explicit data-flow disclosure before user uploads or writes sensitive data** — credito_local_processing_privacy, contrato_auto_send_notice, contacto_pre_form_warning, cuenta_honest_delete_copy [INFERRED 0.85]
- **Cartas Claras privacy-preserving analysis pipeline** — cartas_claras_extractfromfile, cartas_claras_redactsensitive, cartas_claras_callexplainletter, cartas_claras_pedirpermisofoto, cartas_claras_privacy_model [INFERRED 0.85]
- **Manual paid-service intake via Netlify Forms plus manual payment** — instrucciones_formar_negocio_service, instrucciones_listar_negocio_service, instrucciones_planes_manual_activation, instrucciones_formar_negocio_netlify_forms [INFERRED 0.85]
- **Netlify functions holding server-only secrets (coach, admin-data, revisar-negocio, Stripe)** — instrucciones_ia_coach_function, instrucciones_admin_admin_data_function, netlify_functions_revisar_negocio, instrucciones_pagos_stripe_secret_key [INFERRED 0.85]
- **Themora icon size variants** — apple_touch_icon, favicon_16, favicon_32, favicon_48, favicon, icon_192, icon_512 [INFERRED 0.85]
- **Themora page hero banner images** — images_hero_compra_auto, images_hero_compra_casa, images_hero_familia, images_listar_negocio_hero, images_quienes_somos_hero [INFERRED 0.85]

## Communities (70 total, 15 thin omitted)

### Community 0 - "Informe de auditoria y hoja de ruta (Themora)"
Cohesion: 0.21
Nodes (12): Informe de auditoria y hoja de ruta (Themora), Analizador de reporte de credito (credito.html), Lista de lanzamiento, Propuesta de membresias (Gratis / Plus / Familia), Mr. Credit Coach (widget de chat), Tanda de Credito (idea de negocio ROSCA), Privacidad: solo se guarda un resumen, no el documento, Instrucciones: activar IA real en Mr. Credit Coach (+4 more)

### Community 1 - "auth.js"
Cohesion: 0.09
Nodes (4): getTrialDaysLeft(), isInTrial(), signUp(), trialDaysLeft()

### Community 2 - "privacidad.html (privacy retention table)"
Cohesion: 0.05
Nodes (53): contacto.html (Contact page), Form messages retained 24 months in Netlify, bloqueCompleto(), esc(), lineaCorta(), lineaRegistro(), pintar(), login.html (Iniciar sesión / Crear cuenta page) (+45 more)

### Community 3 - "comprar-casa.html (Comprar casa page)"
Cohesion: 0.06
Nodes (44): Panel de administrador (admin.html), COLOR_FIELDS brand colors (safe editable palette), Supabase table contenido_sitio, CMS content editor (loadContentEditor, publish, applyPreview), netlify function admin-data, Cobrar con tarjeta (facturas panel, Stripe draft invoice), loadAdminData (fetch admin-data, show states), renderStats / renderBarRows (+36 more)

### Community 4 - "autocompletar-direccion.test.js"
Cohesion: 0.08
Nodes (23): ref_node_assert, ref_node_path, ref_node_test, assert, consolaReal, detalle(), errores, evento() (+15 more)

### Community 5 - "explain-letter.js"
Cohesion: 0.10
Nodes (26): Luca (HBS) Yelp study: one star = 5-9% revenue, In-memory only, no account privacy stance, resultado renderer (score, scorecard, suggestions), Business presence search flow (apIr1 click -> revisar-negocio), callExplainLetter (POST explain-letter), classifyLetterLocally / detectScam, extractFromFile (extractPdf, extractWord, extractImage OCR), handleAnalyze (letter analysis orchestration) (+18 more)

### Community 6 - "herramientas.html (calculators)"
Cohesion: 0.10
Nodes (27): formar-negocio.html (LLC + EIN service page), FinCEN BOI report change (2026 removal for domestic entities), EIN (free from IRS) and SS-4, fnForm intake form, Educational 6-step guide to register an LLC yourself, LLC formation + EIN filing service ($149 + state fee), Never collect SSN/ITIN policy, Not a law firm / paperwork-only disclaimer and state-regulation limits (Virginia focus) (+19 more)

### Community 7 - "revisar-negocio.js"
Cohesion: 0.18
Nodes (21): Apple Maps API (solo confirma existencia), base64url(), buscarGoogle(), cabecerasServicio(), calcularCompetencia(), consultarApple(), consultarGoogle(), conTiempo() (+13 more)

### Community 8 - "Servicio Listar negocio ($49.99 precio de lanzamiento)"
Cohesion: 0.14
Nodes (15): Instrucciones: busqueda automatica en Aparezco, aparezco.html (herramienta Aparezco), Scorecard de negocio (puntaje 0-100 vs competencia), Instrucciones: Formar negocio (LLC + EIN), Limites legales (no es asesoria legal, licencia intransferible, EIN gratis), Netlify Forms (formar-negocio, listar-negocio, plan-interes), No pedir SSN/ITIN en formulario publico de Netlify Forms, Servicio de preparacion de LLC y EIN ($149) (+7 more)

### Community 9 - "zyron-brain.js"
Cohesion: 0.19
Nodes (16): buscarFrases(), buscarGlosario(), coincideFrase(), coincidePalabra(), cuenta(), detectarIdioma(), etiquetaEnlace(), pareceSensible() (+8 more)

### Community 10 - "credit-coach.js"
Cohesion: 0.21
Nodes (16): addMessage(), addTyping(), answerFallback(), answerLocal(), aplicarIdiomaUI(), ask(), askAI(), close() (+8 more)

### Community 11 - "autocompletar-direccion.js"
Cohesion: 0.21
Nodes (17): armarDireccion(), armarSugerencias(), dentroDelLimite(), esDireccion(), googleApiKey(), handler(), hostsPermitidos(), limpiar() (+9 more)

### Community 12 - "conectar"
Cohesion: 0.29
Nodes (13): conectar(), abrir(), apagarPorFalla(), cerrar(), decir(), desactivar(), elegir(), llamar() (+5 more)

### Community 13 - "Feature Specification: Automatic Address Autocomplete"
Cohesion: 0.10
Nodes (19): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Automatic Address Autocomplete, Assumptions, Current State (observed before writing this spec), Edge Cases (+11 more)

### Community 14 - "explain-auto-contract.js"
Cohesion: 0.12
Nodes (25): Netlify Forms contact form with honeypot, Pre-form warning: do not send SSN or deadlines notice, Contract page photo upload and AI extraction (ctLeerPaginas), Send-encrypted notice: pages leave device to Anthropic, no copy kept, extractPdf / extractWord / extractExcel (local document text extraction), Local-only processing: report stays on device, comprimirDentroDelTope(), escalar() (+17 more)

### Community 15 - "admin-data.js"
Cohesion: 0.29
Nodes (13): average(), cabecerasServicio(), corsHeaders(), daysAgo(), fetchAllRows(), fetchAllUsers(), handler(), jsonResponse() (+5 more)

### Community 17 - "mortgage-accelerator.js"
Cohesion: 0.32
Nodes (10): calcular(), limpiarCalculados(), limpiarSalida(), marcarCalculados(), marcarOrigen(), mesesPara(), mostrarAviso(), pagoMensual() (+2 more)

### Community 18 - "Tasks: [FEATURE NAME]"
Cohesion: 0.07
Nodes (26): Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for User Story 1, Implementation for User Story 2, Implementation for User Story 3, Implementation Strategy, Incremental Delivery, MVP First (User Story 1 Only) (+18 more)

### Community 19 - "analyzer.js"
Cohesion: 0.29
Nodes (6): extractText(), formatSize(), renderResults(), runAnalysis(), showError(), showFileReady()

### Community 20 - "auth-helpers.js"
Cohesion: 0.33
Nodes (8): esComun(), esPatron(), evaluar(), montarSugerenciasCorreo(), cerrar(), elegir(), pintar(), normalizar()

### Community 21 - "coach.js"
Cohesion: 0.29
Nodes (8): containsSensitive(), corsHeaders(), { DIGESTO_LEYES }, handler(), IDIOMAS_VALIDOS, jsonResponse(), verifySupabaseUser(), netlify_functions_leyes_digest_digesto_leyes

### Community 22 - "rate-agent.js"
Cohesion: 0.40
Nodes (9): applyData(), colorFor(), darken(), loadRates(), moveTooltip(), renderMap(), selectState(), svgEl() (+1 more)

### Community 23 - "design-taste-frontend Skill (Anti-Slop Frontend)"
Cohesion: 0.33
Nodes (9): design-taste-frontend Skill (Anti-Slop Frontend), AI Tells (Forbidden Patterns, Em-Dash Ban), Block Library Contract, Brief Inference / Design Read, Dark Mode Protocol and Page Theme Lock, Default Architecture (Tailwind v4, Motion, Phosphor icons), Brief to Design System Map, Redesign Protocol (audit-first, preservation rules) (+1 more)

### Community 25 - "Credito hero 1: credit dispute letter to Experian with bureau scores and dispute checklist"
Cohesion: 0.53
Nodes (6): Cartas hero: Van Gogh-style painting of stressed man reading IRS legal notice, Compass logo icon (navy/teal gradient, Themora brand mark), Credito hero 1: credit dispute letter to Experian with bureau scores and dispute checklist, Credito hero 2: smiling man with house keys at laptop showing Finanzas Claras guide, Credito hero 3: close-up of hand typing on laptop with AI finance-expert prompt, Credito hero 4: three professionals seated before Experian, Equifax, TransUnion logos

### Community 26 - "Delete account flow (deleteAllMyData, eliminarCuenta)"
Cohesion: 0.38
Nodes (6): Delete account flow (deleteAllMyData, eliminarCuenta), Honest delete copy: instant data delete vs manual email/password closure, handler(), HEADERS, respuesta(), usuarioDelToken()

### Community 27 - "Hero: young couple with laptop, cash and US flag"
Cohesion: 0.67
Nodes (4): Hero: Hispanic family with salesman at car dealership, Hero: Hispanic family with realtor reviewing home purchase agreement, Hero: young couple with laptop, cash and US flag, Hero: map pin and navigation app icons (business listing)

### Community 28 - "quick-calculators.js"
Cohesion: 0.83
Nodes (3): band(), calc(), guidance()

### Community 29 - "normalize"
Cohesion: 1.00
Nodes (3): normalize(), score(), search()

### Community 32 - "Themora header logo: gold and navy ribbon T mark"
Cohesion: 1.00
Nodes (3): Themora header logo: gold and navy ribbon T mark, Hero: Themora marble goddess statue with owl, tarot-style card (Wisdom, Opportunity, Clarity, Prosperity), Themora brand: A wiser today, a brighter tomorrow

### Community 38 - "speckit-analyze/SKILL.md"
Cohesion: 0.08
Nodes (25): 1. Initialize Analysis Context, 2. Load Artifacts (Progressive Disclosure), 3. Build Semantic Models, 4. Detection Passes (Token-Efficient Analysis), 5. Severity Assignment, 6. Produce Compact Analysis Report, 7. Provide Next Actions, 8. Offer Remediation (+17 more)

### Community 39 - "Execution Steps"
Cohesion: 0.12
Nodes (15): 1. Initialize Convergence Context, 2. Load Artifacts (Progressive Disclosure), 3. Build the Intent Inventory, 4. Assess the Codebase and Classify Findings, 5. Assign Severity, 6. Present the In-Session Findings Summary, 7. Append Convergence Tasks (or report converged), 8. Provide Next Actions (Handoff) (+7 more)

### Community 40 - "common.ps1"
Cohesion: 0.23
Nodes (13): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-NormalizedPriority(), Get-Python3Command(), Get-RepoRoot() (+5 more)

### Community 41 - "Feature Specification: [FEATURE NAME]"
Cohesion: 0.15
Nodes (12): Assumptions, Edge Cases, Feature Specification: [FEATURE NAME], Functional Requirements, Key Entities *(include if feature involves data)*, Measurable Outcomes, Requirements *(mandatory)*, Success Criteria *(mandatory)* (+4 more)

### Community 42 - "speckit-plan/SKILL.md"
Cohesion: 0.18
Nodes (10): Completion Report, Done When, Key rules, Mandatory Post-Execution Hooks, Outline, Phase 0: Outline & Research, Phase 1: Design & Contracts, Phases (+2 more)

### Community 43 - "speckit-specify/SKILL.md"
Cohesion: 0.18
Nodes (10): Completion Report, Done When, For AI Generation, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, Quick Guidelines, Section Requirements (+2 more)

### Community 44 - "speckit-tasks/SKILL.md"
Cohesion: 0.18
Nodes (10): Checklist Format (REQUIRED), Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Phase Structure, Pre-Execution Checks, Task Generation Rules (+2 more)

### Community 45 - "Planes Basico $4.99 / Estandar $9.99 / Premium $14.99"
Cohesion: 0.22
Nodes (11): netlify/functions/admin-data.js (verificacion server-side), Marca is_admin en app_metadata, SUPABASE_SERVICE_ROLE_KEY, Limite de 5 busquedas por IP al dia, IA solo con sesion iniciada (control de costo, 400 tokens), STRIPE_SECRET_KEY (Netlify env), Instrucciones: planes de pago, Campo plan en app_metadata (no editable por el cliente) (+3 more)

### Community 46 - "Core Principles"
Cohesion: 0.18
Nodes (10): Core Principles, Flujo de desarrollo y calidad, Governance, I. Honestidad y no asesoría (NON-NEGOTIABLE), II. Privacidad por diseño, III. Funciona sin IA, IV. Una sola verdad, probada, Restricciones técnicas y de despliegue (+2 more)

### Community 47 - "Core Principles"
Cohesion: 0.18
Nodes (10): Core Principles, Governance, [PRINCIPLE_1_NAME], [PRINCIPLE_2_NAME], [PRINCIPLE_3_NAME], [PRINCIPLE_4_NAME], [PRINCIPLE_5_NAME], [PROJECT_NAME] Constitution (+2 more)

### Community 48 - "Supabase (auth y base de datos)"
Cohesion: 0.31
Nodes (9): GOOGLE_PLACES_API_KEY (Places API New), Instrucciones: activar login con Supabase, Site URL y Redirect URLs de confirmacion, Supabase (auth y base de datos), Instrucciones: login con Google, Microsoft y telefono, Apple Sign-In removido ($99/ano), Google OAuth provider, Microsoft (Azure) OAuth provider (+1 more)

### Community 49 - "Implementation Plan: [FEATURE]"
Cohesion: 0.22
Nodes (8): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: [FEATURE], Project Structure, Source Code (repository root), Summary, Technical Context

### Community 50 - "speckit-checklist/SKILL.md"
Cohesion: 0.25
Nodes (7): Anti-Examples: What NOT To Do, Checklist Purpose: "Unit Tests for English", Example Checklist Types & Sample Items, Execution Steps, Post-Execution Checks, Pre-Execution Checks, User Input

### Community 51 - "speckit-clarify/SKILL.md"
Cohesion: 0.29
Nodes (6): Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, User Input

### Community 52 - "speckit-implement/SKILL.md"
Cohesion: 0.29
Nodes (6): Completion Report, Done When, Mandatory Post-Execution Hooks, Outline, Pre-Execution Checks, User Input

### Community 53 - "cuenta.html (My account page)"
Cohesion: 0.17
Nodes (13): credito.html (Credit fundamentals and report analyzer page), AnnualCreditReport.com official free reports callout, Dispute letter generators (identity correction, bureau dispute, debt validation), Credit report analyzer (runAnalysis, evaluateDocument), Save analysis to account (CCAuth.saveAnalysis), Score models, score ranges, factors and three bureaus education, cuenta.html (My account page), Notification preference toggles (loadPreferences, toggleAndSave) (+5 more)

### Community 54 - "Stripe Invoicing (facturas en borrador)"
Cohesion: 0.29
Nodes (7): Instrucciones: cobrar con tarjeta (Stripe), Tarjeta (proteccion de disputa) vs Zelle (sin proteccion), empresa.js (nombre visible del negocio), pago.js (FACTURA_CON_TARJETA, MEDIOS_DE_COBRO), Reembolsos y disputas (chargebacks), Importe fijado en servidor, factura siempre en borrador, Stripe Invoicing (facturas en borrador)

### Community 55 - "speckit-constitution/SKILL.md"
Cohesion: 0.33
Nodes (5): Outline, Post-Execution Checks, Pre-Execution Checks, Scope Guard, User Input

### Community 56 - "Motor de busqueda de opciones (comparadores propuestos)"
Cohesion: 0.40
Nodes (6): Motor de busqueda de opciones (comparadores propuestos), README: Themora casa y auto separados, comprar-auto.html (mapa de 50 estados, tasas, TILA), comprar-casa.html (hipoteca FHA y convencional), rate-agent.js / auto-rates.js / auto-rates.json (agente de tasas), Fuentes de tasas (MonitorBankRates, Experian, CFPB Reg Z)

### Community 57 - "Disallow admin.html y cuenta.html"
Cohesion: 0.33
Nodes (5): SEO y metadatos (favicon, Open Graph, sitemap), auth.js (SUPABASE_URL y anon key), cuenta.html y login.html, Disallow admin.html y cuenta.html, Sitemap https://mithemora.com/sitemap.xml

### Community 58 - "admin.html (panel de administrador)"
Cohesion: 0.40
Nodes (6): Instrucciones: panel de administrador, admin.html (panel de administrador), Editor de colores de marca (5 selectores), Tabla contenido_sitio y bucket sitio-imagenes, Editor de contenido con vista previa y publicacion, supabase-schema.sql (analisis_credito, calculos_hipoteca, RLS)

### Community 60 - "nav.js"
Cohesion: 0.60
Nodes (4): onChange(), close(), closeAll(), open()

### Community 61 - "speckit-taskstoissues/SKILL.md"
Cohesion: 0.40
Nodes (4): Outline, Post-Execution Checks, Pre-Execution Checks, User Input

### Community 62 - "[CHECKLIST TYPE] Checklist: [FEATURE NAME]"
Cohesion: 0.40
Nodes (4): [Category 1], [Category 2], [CHECKLIST TYPE] Checklist: [FEATURE NAME], Notes

### Community 63 - "applyUpdatedUser"
Cohesion: 0.50
Nodes (4): applyUpdatedUser(), notify(), updateName(), updateProfile()

### Community 64 - "updateNavLink"
Cohesion: 0.50
Nodes (4): getProfileIdentity(), positionNavLink(), renderAvatar(), updateNavLink()

## Ambiguous Edges - Review These
- `Compass logo icon (navy/teal gradient, Themora brand mark)` → `Credito hero 2: smiling man with house keys at laptop showing Finanzas Claras guide`  [AMBIGUOUS]
  images/compass.jpg · relation: conceptually_related_to
- `Hero: young couple with laptop, cash and US flag` → `Hero: map pin and navigation app icons (business listing)`  [AMBIGUOUS]
  images/listar-negocio-hero.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **250 isolated node(s):** `porIp`, `porSesion`, `TIPOS_DE_DIRECCION`, `TIPOS_QUE_NO_SON_DIRECCION`, `{ DIGESTO_LEYES }` (+245 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Compass logo icon (navy/teal gradient, Themora brand mark)` and `Credito hero 2: smiling man with house keys at laptop showing Finanzas Claras guide`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Hero: young couple with laptop, cash and US flag` and `Hero: map pin and navigation app icons (business listing)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `handleAnalyze (letter analysis orchestration)` connect `explain-letter.js` to `explain-auto-contract.js`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `Contract page photo upload and AI extraction (ctLeerPaginas)` connect `explain-auto-contract.js` to `auth.js`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `porIp`, `porSesion`, `TIPOS_DE_DIRECCION` to the rest of the system?**
  _250 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._
- **Should `privacidad.html (privacy retention table)` be split into smaller, more focused modules?**
  _Cohesion score 0.052600818234950324 - nodes in this community are weakly interconnected._