import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import { supabase } from "../lib/supabaseClient";
import type { CartRow, Product } from "../types/models";

interface EntryRow extends CartRow {
  costoUnitario: number;
}

interface MovimientoResumenRow {
  id: string;
  fecha: string;
  proveedor: string | null;
  observacion: string | null;
  totalMovimiento: number;
}

type MovimientoMode = "manage" | "history";

function MovimientosView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("0");
  const [proveedor, setProveedor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [historyRows, setHistoryRows] = useState<MovimientoResumenRow[]>([]);
  const [message, setMessage] = useState("Registra compras de entrada al inventario.");
  const [mode, setMode] = useState<MovimientoMode | null>(null);
  const [showModeModal, setShowModeModal] = useState(true);

  const totalMovimiento = useMemo(
    () => rows.reduce((acc, row) => acc + row.subtotal, 0),
    [rows]
  );

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, barcode, description, precio, stockActual, createdAt, updatedAt")
        .order("description", { ascending: true });

      if (error) {
        setMessage(`No se pudieron cargar productos: ${error.message}`);
        return;
      }

      setProducts((data ?? []) as Product[]);
    };

    const loadHistory = async () => {
      const { data, error } = await supabase
        .from("movimientoResumen")
        .select("id, fecha, proveedor, observacion, totalMovimiento")
        .order("fecha", { ascending: false })
        .limit(150);

      if (error) {
        setMessage(`No se pudo cargar historial: ${error.message}`);
        return;
      }

      const formatted = (data ?? []).map((item: any) => {
        const dt = new Date(item.fecha);
        const day = String(dt.getDate()).padStart(2, "0");
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const year = dt.getFullYear();
        return {
          ...item,
          fecha: `${day}-${month}-${year}`
        };
      });

      setHistoryRows(formatted as MovimientoResumenRow[]);
    };

    void loadProducts();
    void loadHistory();
  }, []);

  const columns = useMemo<ColDef<EntryRow>[]>(
    () => [
      { field: "barcode", headerName: "Codigo", width: 160 },
      { field: "description", headerName: "Producto", width: 240 },
      { field: "cantidad", headerName: "Cantidad", width: 120 },
      {
        field: "costoUnitario",
        headerName: "Costo U.",
        width: 140,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      },
      {
        field: "subtotal",
        headerName: "Subtotal",
        width: 140,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      }
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      minWidth: 120,
      resizable: true,
      sortable: true,
      lockVisible: true,
      suppressMovable: true,
      suppressHeaderMenuButton: true
    }),
    []
  );

  const historyColumns = useMemo<ColDef<MovimientoResumenRow>[]>(
    () => [
      { field: "fecha", headerName: "Fecha", width: 130 },
      { field: "proveedor", headerName: "Proveedor", width: 210 },
      { field: "observacion", headerName: "Observacion", width: 260 },
      {
        field: "totalMovimiento",
        headerName: "Total",
        width: 140,
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
          description: product.description,
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
    setMessage(`Detalle agregado: ${product.description}`);
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

    const { data } = await supabase
      .from("movimientoResumen")
      .select("id, fecha, proveedor, observacion, totalMovimiento")
      .order("fecha", { ascending: false })
      .limit(150);

    const formatted = (data ?? []).map((item: any) => {
      const dt = new Date(item.fecha);
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return {
        ...item,
        fecha: `${day}-${month}-${year}`
      };
    });
    setHistoryRows(formatted as MovimientoResumenRow[]);
  };

  const renderModeContent = () => {
    if (mode === "manage") {
      return (
        <>
          <div className="panel grid grid-cols-2 gap-2 md:grid-cols-6">
            <div className="col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModeModal(true)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
              >
                Cambiar modulo
              </button>
            </div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="col-span-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm md:col-span-3"
            >
              <option value="">Selecciona producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.description} ({product.barcode})
                </option>
              ))}
            </select>

            <input
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              type="number"
              min="1"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Cantidad"
            />

            <input
              value={costoUnitario}
              onChange={(e) => setCostoUnitario(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Costo unitario"
            />

            <input
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="col-span-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm md:col-span-2"
              placeholder="Proveedor (opcional)"
            />

            <button
              type="button"
              onClick={addDetail}
              className="col-span-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white md:col-span-1"
            >
              Agregar
            </button>

            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="col-span-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm md:col-span-5"
              placeholder="Observacion"
            />

            <button
              type="button"
              onClick={guardarMovimiento}
              className="col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white md:col-span-1"
            >
              Guardar movimiento
            </button>
          </div>

          <div className="panel">
            <p className="grid-title">Detalle del movimiento</p>
            <div className="grid-wrap">
            <div className="ag-theme-quartz h-[27dvh] min-h-[170px] min-w-[760px] w-full">
              <AgGridReact<EntryRow>
                rowData={rows}
                columnDefs={columns}
                defaultColDef={defaultColDef}
                rowHeight={50}
                suppressDragLeaveHidesColumns
                suppressMovableColumns
              />
            </div>
            </div>
            <p className="mt-3 text-lg font-bold">Total movimiento: ${totalMovimiento.toFixed(2)}</p>
          </div>
        </>
      );
    }

    if (mode === "history") {
      return (
        <div className="panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="grid-title mb-0">Movimientos registrados</p>
            <button
              type="button"
              onClick={() => setShowModeModal(true)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
            >
              Cambiar modulo
            </button>
          </div>
          <div className="grid-wrap">
            <div className="ag-theme-quartz h-[52dvh] min-h-[280px] min-w-[740px] w-full">
              <AgGridReact<MovimientoResumenRow>
                rowData={historyRows}
                columnDefs={historyColumns}
                defaultColDef={defaultColDef}
                rowHeight={50}
                suppressDragLeaveHidesColumns
                suppressMovableColumns
                overlayNoRowsTemplate="No hay movimientos registrados."
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="space-y-3">
      {!showModeModal ? (
        <header>
          <h2 className="text-2xl font-bold">Movimientos de Entrada</h2>
          <p className="text-sm text-slate-600">Registra compras para incrementar stock.</p>
        </header>
      ) : null}

      {showModeModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Movimientos</h3>
            <p className="mt-1 text-sm text-slate-600">Selecciona el modulo que deseas abrir.</p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("manage");
                  setShowModeModal(false);
                }}
                className="module-tab active"
              >
                Agregar / Editar movimientos
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("history");
                  setShowModeModal(false);
                }}
                className="module-tab"
              >
                Inventario de movimientos
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!showModeModal ? renderModeContent() : null}

      {!showModeModal ? (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
      ) : null}
    </section>
  );
}

export default MovimientosView;
