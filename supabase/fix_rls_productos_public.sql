-- Fix for: "new row violates row-level security policy for table productos"
-- Use this when the frontend runs without login (anon role).

alter table public.productos enable row level security;

drop policy if exists productos_auth_all on public.productos;
drop policy if exists productos_public_all on public.productos;

create policy productos_public_all
on public.productos
for all
to public
using (true)
with check (true);
