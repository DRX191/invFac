-- Run this in Supabase SQL Editor if your table currently has `descripcion`
-- and the app expects `description`.

alter table if exists public.productos
  add column if not exists description text;

update public.productos
set description = descripcion
where description is null
  and descripcion is not null;

alter table public.productos
  alter column description set not null;

alter table public.productos
  drop column if exists descripcion;

create or replace view public."vwVentasDetalle" as
select
  v.id as "ventaId",
  v."createdAt" as "fechaVenta",
  v."usuarioId",
  vd.id as "ventaDetalleId",
  p.barcode,
  p.description,
  vd.cantidad,
  vd."precioUnitario",
  vd.subtotal,
  v."totalVenta"
from public.ventas v
join public."ventaDetalles" vd on vd."ventaId" = v.id
join public.productos p on p.id = vd."productoId";
