-- Migration: store seller email in ventas and expose it in report view.

alter table public.ventas
  add column if not exists "usuarioEmail" text;

create or replace view public."vwVentasDetalle" as
select
  v.id as "ventaId",
  v."createdAt" as "fechaVenta",
  coalesce(v."usuarioEmail", '') as "usuarioEmail",
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

create or replace function public.registrar_venta_con_detalles(
  p_usuario_id uuid,
  p_usuario_email text,
  p_total_venta numeric,
  p_detalles jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_venta_id uuid;
  v_item jsonb;
begin
  insert into public.ventas ("totalVenta", "usuarioId", "usuarioEmail")
  values (p_total_venta, p_usuario_id, p_usuario_email)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_detalles)
  loop
    insert into public."ventaDetalles" (
      "ventaId", "productoId", cantidad, "precioUnitario", subtotal
    )
    values (
      v_venta_id,
      (v_item->>'productoId')::uuid,
      (v_item->>'cantidad')::int,
      (v_item->>'precioUnitario')::numeric,
      (v_item->>'subtotal')::numeric
    );

    update public.productos
    set "stockActual" = "stockActual" - (v_item->>'cantidad')::int
    where id = (v_item->>'productoId')::uuid;
  end loop;

  return v_venta_id;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'registrar_venta_con_detalles'
      and pg_get_function_identity_arguments(oid) = 'p_usuario_id uuid, p_total_venta numeric, p_detalles jsonb'
  ) then
    execute 'revoke execute on function public.registrar_venta_con_detalles(uuid, numeric, jsonb) from authenticated';
  end if;
end
$$;

grant execute on function public.registrar_venta_con_detalles(uuid, text, numeric, jsonb) to authenticated;
