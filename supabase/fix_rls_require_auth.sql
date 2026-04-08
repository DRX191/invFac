-- Enforce login-required access (no public/anon access)
-- Run in Supabase SQL Editor.

alter table public.productos enable row level security;
alter table public."movimientoResumen" enable row level security;
alter table public."movimientoDetalle" enable row level security;
alter table public.ventas enable row level security;
alter table public."ventaDetalles" enable row level security;

drop policy if exists productos_public_all on public.productos;
drop policy if exists productos_auth_all on public.productos;
create policy productos_auth_all
on public.productos
for all
to authenticated
using (true)
with check (true);

drop policy if exists movimiento_resumen_auth_all on public."movimientoResumen";
create policy movimiento_resumen_auth_all
on public."movimientoResumen"
for all
to authenticated
using (true)
with check (true);

drop policy if exists movimiento_detalle_auth_all on public."movimientoDetalle";
create policy movimiento_detalle_auth_all
on public."movimientoDetalle"
for all
to authenticated
using (true)
with check (true);

drop policy if exists ventas_auth_all on public.ventas;
create policy ventas_auth_all
on public.ventas
for all
to authenticated
using (true)
with check (true);

drop policy if exists venta_detalles_auth_all on public."ventaDetalles";
create policy venta_detalles_auth_all
on public."ventaDetalles"
for all
to authenticated
using (true)
with check (true);
