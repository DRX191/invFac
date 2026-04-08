import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import { supabase } from "../lib/supabaseClient";
import type { CartRow, Product } from "../types/models";

interface EntryRow extends CartRow {
  costoUnitario: number;
}

function MovimientosView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("0");
  const [proveedor, setProveedor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [message, setMessage] = useState("Registra compras de entrada al inventario.");

  const totalMovimiento = useMemo(
    () => rows.reduce((acc, row) => acc + row.subtotal, 0),
    [rows]
  );

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, barcode, descripcion, precio, stockActual, createdAt, updatedAt")
        .order("descripcion", { ascending: true });

      if (error) {
        setMessage(`No se pudieron cargar productos: ${error.message}`);
        return;
      }

      setProducts((data ?? []) as Product[]);
    };

    void loadProducts();
  }, []);

  const columns = useMemo<ColDef<EntryRow>[]>(
    () => [
      { field: "barcode", headerName: "Codigo", flex: 1.1 },
      { field: "descripcion", headerName: "Producto", flex: 1.8 },
      { field: "cantidad", headerName: "Cantidad", flex: 0.8 },
      {
        field: "costoUnitario",
        headerName: "Costo U.",
        flex: 1,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      },
      {
        field: "subtotal",
        headerName: "Subtotal",
        flex: 1,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      }
    ],
    []
  );

  const addDetail = () => {
    const product = products.find((p) => p.id === selectedId);
    const qty = Number(cantidad);
    const cost = Number(costoUnitario);

    if (!product || qty <= 0 || cost < 0) {
      setMessage("Selecciona producto y valores validos.");
      return;
    }

    setRows((prev) => {
      const existing = prev.find((row) => row.productoId === product.id);
      if (existing) {
        return prev.map((row) => {
          if (row.productoId !== product.id) {
            return row;
          }
          const newQty = row.cantidad + qty;
          return {
            ...row,
            cantidad: newQty,
            costoUnitario: cost,
            subtotal: Number((newQty * cost).toFixed(2))
          };
        });
      }

      return [
        {
          productoId: product.id,
          barcode: product.barcode,
          descripcion: product.descripcion,
          precioUnitario: Number(product.precio),
          cantidad: qty,
          costoUnitario: cost,
          subtotal: Number((qty * cost).toFixed(2))
        },
        ...prev
      ];
    });

    setCantidad("1");
    setCostoUnitario("0");
    setMessage(`Detalle agregado: ${product.descripcion}`);
  };

  const guardarMovimiento = async () => {
    if (!rows.length) {
      setMessage("No hay detalles para guardar.");
      return;
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Debes iniciar sesion para registrar movimientos.");
      return;
    }

    const payload = {
      p_usuario_id: user.id,
      p_proveedor: proveedor || null,
      p_observacion: observacion || null,
      p_total_movimiento: Number(totalMovimiento.toFixed(2)),
      p_detalles: rows.map((r) => ({
        productoId: r.productoId,
        cantidad: r.cantidad,
        costoUnitario: Number(r.costoUnitario.toFixed(2)),
        subtotal: Number(r.subtotal.toFixed(2))
      }))
    };

    const { error } = await supabase.rpc("registrar_movimiento_entrada", payload);
    if (error) {
      setMessage(`No se pudo guardar el movimiento: ${error.message}`);
      return;
    }

    setRows([]);
    setProveedor("");
    setObservacion("");
    setMessage("Movimiento de entrada registrado y stock actualizado.");
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Movimientos de Entrada</h2>
        <p className="text-sm text-slate-600">Registra compras para incrementar stock.</p>
      </header>

      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-6">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-3 md:col-span-2"
        >
          <option value="">Selecciona producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.descripcion} ({product.barcode})
            </option>
          ))}
        </select>

        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          type="number"
          min="1"
          className="rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Cantidad"
        />

        <input
          value={costoUnitario}
          onChange={(e) => setCostoUnitario(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          className="rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Costo unitario"
        />

        <input
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Proveedor (opcional)"
        />

        <button
          type="button"
          onClick={addDetail}
          className="rounded-xl bg-brand-700 px-4 py-3 text-base font-bold text-white"
        >
          Agregar
        </button>

        <input
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-3 md:col-span-5"
          placeholder="Observacion"
        />

        <button
          type="button"
          onClick={guardarMovimiento}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold text-white md:col-span-1"
        >
          Guardar movimiento
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="ag-theme-quartz h-[420px] w-full">
          <AgGridReact<EntryRow> rowData={rows} columnDefs={columns} rowHeight={50} />
        </div>
        <p className="mt-3 text-lg font-bold">Total movimiento: ${totalMovimiento.toFixed(2)}</p>
      </div>

      <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
    </section>
  );
}

export default MovimientosView;
