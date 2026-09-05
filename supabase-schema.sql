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
