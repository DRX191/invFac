create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  description text not null,
  precio numeric(12,2) not null check (precio > 0),
  "stockActual" int not null default 0 check ("stockActual" >= 0),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_productos_barcode on public.productos (barcode);

drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
before update on public.productos
for each row
execute function public.set_updated_at();

create table if not exists public."movimientoResumen" (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  "tipoMovimiento" text not null check ("tipoMovimiento" in ('ENTRADA')),
  proveedor text,
  observacion text,
  "totalMovimiento" numeric(14,2) not null check ("totalMovimiento" >= 0),
  "usuarioId" uuid not null references auth.users(id),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."movimientoDetalle" (
  id uuid primary key default gen_random_uuid(),
  "movimientoId" uuid not null references public."movimientoResumen"(id) on delete cascade,
  "productoId" uuid not null references public.productos(id),
  cantidad int not null check (cantidad > 0),
  "costoUnitario" numeric(12,2) not null check ("costoUnitario" >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

drop trigger if exists trg_mov_resumen_updated_at on public."movimientoResumen";
create trigger trg_mov_resumen_updated_at
before update on public."movimientoResumen"
for each row
execute function public.set_updated_at();

drop trigger if exists trg_mov_detalle_updated_at on public."movimientoDetalle";
create trigger trg_mov_detalle_updated_at
before update on public."movimientoDetalle"
for each row
execute function public.set_updated_at();

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  "createdAt" timestamptz not null default now(),
  "totalVenta" numeric(14,2) not null check ("totalVenta" >= 0),
  "usuarioEmail" text,
  "usuarioId" uuid not null references auth.users(id)
);

create table if not exists public."ventaDetalles" (
  id uuid primary key default gen_random_uuid(),
  "ventaId" uuid not null references public.ventas(id) on delete cascade,
  "productoId" uuid not null references public.productos(id),
  cantidad int not null check (cantidad > 0),
  "precioUnitario" numeric(12,2) not null check ("precioUnitario" >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  "createdAt" timestamptz not null default now()
);

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

alter table public.productos enable row level security;
alter table public."movimientoResumen" enable row level security;
alter table public."movimientoDetalle" enable row level security;
alter table public.ventas enable row level security;
alter table public."ventaDetalles" enable row level security;

drop policy if exists productos_auth_all on public.productos;
drop policy if exists productos_public_all on public.productos;
create policy productos_auth_all on public.productos
for all to authenticated using (true) with check (true);

drop policy if exists movimiento_resumen_auth_all on public."movimientoResumen";
create policy movimiento_resumen_auth_all on public."movimientoResumen"
for all to authenticated using (true) with check (true);

drop policy if exists movimiento_detalle_auth_all on public."movimientoDetalle";
create policy movimiento_detalle_auth_all on public."movimientoDetalle"
for all to authenticated using (true) with check (true);

drop policy if exists ventas_auth_all on public.ventas;
create policy ventas_auth_all on public.ventas
for all to authenticated using (true) with check (true);

drop policy if exists venta_detalles_auth_all on public."ventaDetalles";
create policy venta_detalles_auth_all on public."ventaDetalles"
for all to authenticated using (true) with check (true);

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

create or replace function public.registrar_movimiento_entrada(
  p_usuario_id uuid,
  p_proveedor text,
  p_observacion text,
  p_total_movimiento numeric,
  p_detalles jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_movimiento_id uuid;
  v_item jsonb;
begin
  insert into public."movimientoResumen" (
    "tipoMovimiento", proveedor, observacion, "totalMovimiento", "usuarioId"
  )
  values ('ENTRADA', p_proveedor, p_observacion, p_total_movimiento, p_usuario_id)
  returning id into v_movimiento_id;

  for v_item in select * from jsonb_array_elements(p_detalles)
  loop
    insert into public."movimientoDetalle" (
      "movimientoId", "productoId", cantidad, "costoUnitario", subtotal
    )
    values (
      v_movimiento_id,
      (v_item->>'productoId')::uuid,
      (v_item->>'cantidad')::int,
      (v_item->>'costoUnitario')::numeric,
      (v_item->>'subtotal')::numeric
    );

    update public.productos
    set "stockActual" = "stockActual" + (v_item->>'cantidad')::int
    where id = (v_item->>'productoId')::uuid;
  end loop;

  return v_movimiento_id;
end;
$$;

create or replace function public.anular_movimiento_entrada(
  p_movimiento_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_exists uuid;
  v_item record;
  v_stock int;
begin
  select id into v_exists
  from public."movimientoResumen"
  where id = p_movimiento_id;

  if v_exists is null then
    raise exception 'Movimiento no encontrado.';
  end if;

  for v_item in
    select "productoId" as producto_id, sum(cantidad)::int as cantidad_total
    from public."movimientoDetalle"
    where "movimientoId" = p_movimiento_id
    group by "productoId"
  loop
    select "stockActual" into v_stock
    from public.productos
    where id = v_item.producto_id
    for update;

    if v_stock is null then
      raise exception 'Producto % no existe.', v_item.producto_id;
    end if;

    if v_stock < v_item.cantidad_total then
      raise exception 'No se puede anular: stock insuficiente para producto %.', v_item.producto_id;
    end if;
  end loop;

  for v_item in
    select "productoId" as producto_id, sum(cantidad)::int as cantidad_total
    from public."movimientoDetalle"
    where "movimientoId" = p_movimiento_id
    group by "productoId"
  loop
    update public.productos
    set "stockActual" = "stockActual" - v_item.cantidad_total
    where id = v_item.producto_id;
  end loop;

  delete from public."movimientoResumen"
  where id = p_movimiento_id;
end;
$$;

create or replace function public.actualizar_movimiento_entrada(
  p_movimiento_id uuid,
  p_proveedor text,
  p_observacion text,
  p_detalles jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_exists uuid;
  v_item jsonb;
  v_delta record;
  v_stock int;
begin
  select id into v_exists
  from public."movimientoResumen"
  where id = p_movimiento_id;

  if v_exists is null then
    raise exception 'Movimiento no encontrado.';
  end if;

  create temporary table tmp_mov_detalles (
    producto_id uuid not null,
    cantidad int not null,
    costo_unitario numeric(12,2) not null,
    subtotal numeric(14,2) not null
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_detalles)
  loop
    insert into tmp_mov_detalles (producto_id, cantidad, costo_unitario, subtotal)
    values (
      (v_item->>'productoId')::uuid,
      (v_item->>'cantidad')::int,
      (v_item->>'costoUnitario')::numeric,
      (v_item->>'subtotal')::numeric
    );
  end loop;

  if not exists (select 1 from tmp_mov_detalles) then
    raise exception 'Debes enviar al menos un detalle.';
  end if;

  for v_delta in
    with old_q as (
      select "productoId" as producto_id, sum(cantidad)::int as qty
      from public."movimientoDetalle"
      where "movimientoId" = p_movimiento_id
      group by "productoId"
    ),
    new_q as (
      select producto_id, sum(cantidad)::int as qty
      from tmp_mov_detalles
      group by producto_id
    )
    select
      coalesce(n.producto_id, o.producto_id) as producto_id,
      coalesce(n.qty, 0) - coalesce(o.qty, 0) as delta_qty
    from old_q o
    full outer join new_q n on n.producto_id = o.producto_id
  loop
    if v_delta.delta_qty < 0 then
      select "stockActual" into v_stock
      from public.productos
      where id = v_delta.producto_id
      for update;

      if v_stock is null then
        raise exception 'Producto % no existe.', v_delta.producto_id;
      end if;

      if v_stock < abs(v_delta.delta_qty) then
        raise exception 'No se puede actualizar: stock insuficiente para producto %.', v_delta.producto_id;
      end if;
    end if;
  end loop;

  for v_delta in
    with old_q as (
      select "productoId" as producto_id, sum(cantidad)::int as qty
      from public."movimientoDetalle"
      where "movimientoId" = p_movimiento_id
      group by "productoId"
    ),
    new_q as (
      select producto_id, sum(cantidad)::int as qty
      from tmp_mov_detalles
      group by producto_id
    )
    select
      coalesce(n.producto_id, o.producto_id) as producto_id,
      coalesce(n.qty, 0) - coalesce(o.qty, 0) as delta_qty
    from old_q o
    full outer join new_q n on n.producto_id = o.producto_id
  loop
    if v_delta.delta_qty <> 0 then
      update public.productos
      set "stockActual" = "stockActual" + v_delta.delta_qty
      where id = v_delta.producto_id;
    end if;
  end loop;

  delete from public."movimientoDetalle"
  where "movimientoId" = p_movimiento_id;

  insert into public."movimientoDetalle" (
    "movimientoId", "productoId", cantidad, "costoUnitario", subtotal
  )
  select
    p_movimiento_id,
    producto_id,
    cantidad,
    costo_unitario,
    subtotal
  from tmp_mov_detalles;

  update public."movimientoResumen"
  set
    proveedor = p_proveedor,
    observacion = p_observacion,
    "totalMovimiento" = (select coalesce(sum(subtotal), 0) from tmp_mov_detalles)
  where id = p_movimiento_id;
end;
$$;

grant execute on function public.registrar_venta_con_detalles(uuid, text, numeric, jsonb) to authenticated;
grant execute on function public.registrar_movimiento_entrada(uuid, text, text, numeric, jsonb) to authenticated;
grant execute on function public.anular_movimiento_entrada(uuid) to authenticated;
grant execute on function public.actualizar_movimiento_entrada(uuid, text, text, jsonb) to authenticated;
