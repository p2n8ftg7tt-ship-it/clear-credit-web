-- =========================================================
-- Themora — esquema de base de datos para cuentas
-- Copia y pega todo este archivo en el "SQL Editor" de tu
-- proyecto de Supabase (menú izquierdo) y presiona "Run".
-- =========================================================

-- Tabla: resúmenes guardados del analizador de reporte de crédito
create table if not exists public.analisis_credito (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  salud text,
  tono text,
  puntaje integer,
  utilizacion integer,
  negativos integer,
  positivos integer,
  conclusion text,
  resumen_json jsonb
);

-- Tabla: cálculos guardados de la calculadora hipotecaria
create table if not exists public.calculos_hipoteca (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  precio numeric,
  pronto_pct numeric,
  tasa numeric,
  plazo integer,
  pago_mensual numeric,
  monto_financiado numeric
);

-- Activa seguridad a nivel de fila: nadie puede leer o modificar
-- filas de otro usuario, ni siquiera con la llave pública "anon".
alter table public.analisis_credito enable row level security;
alter table public.calculos_hipoteca enable row level security;

create policy "analisis_credito: ver solo lo propio"
  on public.analisis_credito for select
  using (auth.uid() = user_id);

create policy "analisis_credito: insertar solo lo propio"
  on public.analisis_credito for insert
  with check (auth.uid() = user_id);

create policy "analisis_credito: borrar solo lo propio"
  on public.analisis_credito for delete
  using (auth.uid() = user_id);

create policy "calculos_hipoteca: ver solo lo propio"
  on public.calculos_hipoteca for select
  using (auth.uid() = user_id);

create policy "calculos_hipoteca: insertar solo lo propio"
  on public.calculos_hipoteca for insert
  with check (auth.uid() = user_id);

create policy "calculos_hipoteca: borrar solo lo propio"
  on public.calculos_hipoteca for delete
  using (auth.uid() = user_id);

-- =========================================================
-- Añadido: preferencias de notificación (página "Mi cuenta")
-- Una fila por usuario. Todavía NO enviamos correos/SMS automáticos
-- — esta tabla solo guarda lo que la persona prefiere para cuando
-- esa función se active.
-- =========================================================
create table if not exists public.preferencias_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alertas_correo boolean not null default true,
  alertas_sms boolean not null default false,
  resumen_semanal boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.preferencias_usuario enable row level security;

create policy "preferencias_usuario: ver solo lo propio"
  on public.preferencias_usuario for select
  using (auth.uid() = user_id);

create policy "preferencias_usuario: insertar solo lo propio"
  on public.preferencias_usuario for insert
  with check (auth.uid() = user_id);

create policy "preferencias_usuario: actualizar solo lo propio"
  on public.preferencias_usuario for update
  using (auth.uid() = user_id);

-- =========================================================
-- Añadido: contenido editable del sitio (panel de administrador)
-- Cualquiera puede LEER esta tabla (es contenido público del sitio),
-- pero solo una cuenta marcada como is_admin puede escribir en ella.
-- Requiere que ya hayas corrido el Paso 1 de INSTRUCCIONES-ADMIN.md
-- (marcarte como administrador) para poder guardar cambios.
-- =========================================================
create table if not exists public.contenido_sitio (
  id text primary key,
  pagina text not null,
  tipo text not null default 'texto',
  etiqueta text,
  valor text,
  updated_at timestamptz not null default now()
);

alter table public.contenido_sitio enable row level security;

create policy "contenido_sitio: lectura publica"
  on public.contenido_sitio for select
  using (true);

create policy "contenido_sitio: solo admin inserta"
  on public.contenido_sitio for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean is true);

create policy "contenido_sitio: solo admin actualiza"
  on public.contenido_sitio for update
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean is true);

-- Espacio de almacenamiento para las imágenes que subas desde el panel.
insert into storage.buckets (id, name, public)
values ('sitio-imagenes', 'sitio-imagenes', true)
on conflict (id) do nothing;

create policy "sitio-imagenes: lectura publica"
  on storage.objects for select
  using (bucket_id = 'sitio-imagenes');

create policy "sitio-imagenes: solo admin sube"
  on storage.objects for insert
  with check (bucket_id = 'sitio-imagenes' and (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean is true);

create policy "sitio-imagenes: solo admin actualiza"
  on storage.objects for update
  using (bucket_id = 'sitio-imagenes' and (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean is true);

create policy "sitio-imagenes: solo admin borra"
  on storage.objects for delete
  using (bucket_id = 'sitio-imagenes' and (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean is true);

-- =========================================================
-- Añadido: límite de gasto para la búsqueda automática de
-- "¿Aparezco?" (netlify/functions/revisar-negocio.js)
-- Cada consulta a Google Maps cuesta dinero real. Esta tabla
-- cuenta cuántas búsquedas hizo cada dirección IP por día, para
-- poder cortar en 5 y que la herramienta siga siendo gratis y
-- sin cuenta para el visitante normal, sin exponerte a que un
-- script la use miles de veces.
-- Solo la llave de servicio (SUPABASE_SERVICE_ROLE_KEY) toca esta
-- tabla — por eso no lleva políticas públicas de lectura/escritura.
-- =========================================================
create table if not exists public.aparezco_contador (
  ip text not null,
  dia date not null,
  veces integer not null default 1,
  primary key (ip, dia)
);

alter table public.aparezco_contador enable row level security;
-- Sin "create policy": con RLS activado y ninguna política, nadie
-- puede leer ni escribir aquí salvo la llave de servicio, que
-- siempre pasa por encima de RLS. Es la misma protección que ya
-- usa contenido_sitio para las escrituras de administrador.

-- =========================================================
-- Añadido: agente de tasas hipotecarias (specs/004-mortgage-rate-agent)
-- Cinco tablas. Solo las funciones de Netlify las tocan, con la llave
-- de servicio (SUPABASE_SERVICE_ROLE_KEY). Por eso NINGUNA lleva
-- políticas: con RLS activado y sin "create policy", el navegador
-- (llave pública) no puede leer ni escribir nada aquí. Los visitantes
-- ven los datos solo a través de la función pública tasas-hipoteca,
-- que devuelve un resumen sin datos internos.
-- =========================================================

-- Una sola fila: el umbral de alerta y el interruptor de lanzamiento.
-- "activo" empieza en false: mientras siga así, el sitio no muestra
-- nada de esta función. Se cambia a true a mano al final de
-- INSTRUCCIONES-TASAS.md.
create table if not exists public.tasas_config (
  id text primary key,                       -- siempre 'principal'
  umbral_pp numeric(4,3) not null default 0.125 check (umbral_pp > 0),
  activo boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.tasas_config (id) values ('principal')
on conflict (id) do nothing;

-- Una observación de una serie de una fuente. La combinación
-- (fuente_id, serie, fecha_fuente) es única para que repetir la
-- corrida del agente nunca duplique filas.
create table if not exists public.tasas_lecturas (
  id bigint generated always as identity primary key,
  fuente_id text not null check (fuente_id in ('freddie-pmms', 'tesoro-10a', 'nyfed-objetivo')),
  serie text not null check (serie in ('pmms30', 'pmms15', 'dgs10', 'fed_hasta', 'fed_desde')),
  valor numeric(5,3) not null,
  fecha_fuente date not null,
  obtenida_en timestamptz not null default now(),
  estado text not null default 'verificada' check (estado in ('verificada', 'retenida')),
  nota text,
  unique (fuente_id, serie, fecha_fuente)
);

-- Lo que la página muestra como cifra titular. Solo lo escribe una
-- corrida de lunes o martes (no las de vigilancia).
create table if not exists public.tasas_publicado (
  id text primary key,                       -- siempre 'actual'
  snapshot jsonb not null,
  publicado_en timestamptz not null default now()
);

-- Avisos de cambio importante. "clave" evita que la misma condición
-- se avise dos veces.
create table if not exists public.tasas_alertas (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('movimiento_semanal', 'tesoro_10a', 'fed_objetivo')),
  termino text check (termino in ('30', '15')),   -- null para Tesoro y Fed
  direccion text not null check (direccion in ('sube', 'baja')),
  magnitud_pp numeric(5,3) not null,
  datos jsonb,
  fecha_fuente date not null,
  fuente_id text not null,
  detectada_en timestamptz not null default now(),
  clave text not null unique,
  estado text not null default 'activa' check (estado in ('activa', 'superada', 'despejada')),
  cerrada_en timestamptz
);

-- Una fila por corrida del agente (la lee el panel de administrador).
create table if not exists public.tasas_corridas (
  id bigint generated always as identity primary key,
  corrida_en timestamptz not null default now(),
  tipo text not null check (tipo in ('publicacion', 'vigilancia')),
  resultado text not null check (resultado in ('ok', 'parcial', 'fallo')),
  fuentes jsonb not null default '{}'::jsonb,
  publicadas integer not null default 0,
  retenidas integer not null default 0,
  alerta_nueva boolean not null default false,
  duracion_ms integer not null default 0
);

alter table public.tasas_config enable row level security;
alter table public.tasas_lecturas enable row level security;
alter table public.tasas_publicado enable row level security;
alter table public.tasas_alertas enable row level security;
alter table public.tasas_corridas enable row level security;
-- Sin "create policy" a propósito (ver el comentario de arriba).
