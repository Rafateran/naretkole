-- ============================================================
-- NARETKOLE — Esquema de base de datos para Supabase
-- Ejecuta TODO este archivo en:  Supabase → SQL Editor → New query
-- (pega, y pulsa "Run"). Es seguro re-ejecutarlo.
-- ============================================================

-- ---------- PERFILES (extiende auth.users con rol) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'cliente',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario actual es admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin');
$$;

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

-- ---------- PRODUCTOS ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null default 'trajes',   -- trajes | quillas | mazos
  orisha text,
  precio numeric not null default 0,
  descripcion text,
  img text, -- URL de portada o arreglo JSON de URLs para una galería
  activo boolean not null default true,
  created_at timestamptz default now()
);
alter table public.products enable row level security;

drop policy if exists "products_read_all" on public.products;
create policy "products_read_all" on public.products
  for select using (true);                      -- cualquiera puede ver el catálogo
drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- PEDIDOS ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  items jsonb not null default '[]',
  total numeric not null default 0,
  envio jsonb,
  estado text not null default 'pendiente_pago',
  created_at timestamptz default now()
);
alter table public.orders enable row level security;

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (true);                 -- permite checkout de invitados y usuarios
drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

-- ---------- ALMACENAMIENTO DE FOTOS ----------
insert into storage.buckets (id, name, public)
  values ('productos','productos', true)
  on conflict (id) do nothing;

drop policy if exists "productos_public_read" on storage.objects;
create policy "productos_public_read" on storage.objects
  for select using (bucket_id = 'productos');
drop policy if exists "productos_admin_insert" on storage.objects;
create policy "productos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'productos' and public.is_admin());
drop policy if exists "productos_admin_update" on storage.objects;
create policy "productos_admin_update" on storage.objects
  for update using (bucket_id = 'productos' and public.is_admin());
drop policy if exists "productos_admin_delete" on storage.objects;
create policy "productos_admin_delete" on storage.objects
  for delete using (bucket_id = 'productos' and public.is_admin());

-- ---------- SEMILLA: los 11 trajes iniciales ----------
insert into public.products (nombre, categoria, orisha, precio, descripcion, img) values
 ('Traje Real Índigo','trajes','Yemayá',285,'Satén azul índigo, encaje plateado y pedrería azul.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_04.png'),
 ('Conjunto Niño Azul','trajes','Niño',180,'Chaqueta azul con pedrería y tutú multicolor.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_10.png'),
 ('Guerrero Rojo Rafia','trajes','Changó',330,'Chaqueta roja tigre, cauríes, faldón de rafia y gorro.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_16.png'),
 ('Vestido Dorado Ochún','trajes','Ochún',310,'Dorado con bordado floral, gorro y pañuelo a juego.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_24.png'),
 ('Príncipe Blanco','trajes','Obatalá',240,'Traje perlado con pantalón bombacho, gorro y corona.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_31.png'),
 ('Conjunto Azul Corona','trajes','Yemayá',220,'Chaqueta azul, tutú de organza y corona a juego.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_36.png'),
 ('Guerrero Tigre Rojo','trajes','Changó',340,'Rojo, blanco y dorado con cauríes y boina a juego.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_40.png'),
 ('Mono Rafia Verde','trajes','Osain',260,'Rafia natural, detalles verdes, cauríes y sombrero.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_43.png'),
 ('Blanco Arcoíris','trajes','Obatalá',295,'Blanco brocado con faldas de organza multicolor.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_46.png'),
 ('Blusa Negra Cauríes','trajes','Osain',145,'Blusa negra con verde y sombrero de cauríes.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_49.png'),
 ('Vino Arcoíris','trajes','Oyá',300,'Vino borgoña con gorro y caídas de organza de colores.','ChatGPT%20Image%2019%20jul%202026%2C%2013_18_53.png');

-- Mazos y Collares
insert into public.products (nombre, categoria, orisha, precio, descripcion, img) values
 ('Mazo Multicolor de la Nación','mazos','Protección',65,'Pulsera plana tejida en verde y dorado con cuentas rojas, negras y blancas.','mazos/mazo%201.png'),
 ('Mazo de Orula','mazos','Orula',60,'Pulsera plana en verde y amarillo, los colores de Orula.','mazos/mazo2.png'),
 ('Mazo Ámbar de Cristal','mazos','Oshún',55,'Racimo de cristales ámbar, miel y perlas doradas.','mazos/mazo%203.png'),
 ('Mazo Blanco de Obatalá','mazos','Obatalá',58,'Racimo de cristales y cuentas blancas nacaradas.','mazos/mazo%204.png'),
 ('Mazo Ojo Protector Azul','mazos','Protección',62,'Cuentas azules y cristal con ojitos de protección.','mazos/mazo%205.png'),
 ('Mazo Esmeralda','mazos','Osain',60,'Racimos verdes con centro de cuentas negras, rojas y blancas.','mazos/mazo%206.png'),
 ('Mazo Verde Noche','mazos','Osain',64,'Racimos de cristal verde oscuro con broches plateados.','mazos/mazo%207.png'),
 ('Mazo de Cauríes y Rafia','mazos','Osain',70,'Puño de rafia natural con cauríes y cuentas verdes y negras.','mazos/mazo%208.png');

-- ============================================================
-- DESPUÉS de registrarte en el sitio con tu correo de admin,
-- ejecuta esta línea (cambia el correo si hace falta) para darte
-- permisos de administrador:
--
--   update public.profiles set rol = 'admin'
--   where email = 'admin@naretkole.com';
-- ============================================================
