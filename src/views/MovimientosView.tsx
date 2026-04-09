import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import { useLocation } from "react-router-dom";
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

interface MovimientoDetalleEditRow {
  id: string;
  productoId: string;
  barcode: string;
  description: string;
  cantidad: string;
  costoUnitario: string;
}

interface EditMovimientoModalState {
  movimientoId: string;
  proveedor: string;
  observacion: string;
  detalles: MovimientoDetalleEditRow[];
}

interface DeleteConfirmState {
  movimientoId: string;
  confirmText: string;
}

type MovimientoMode = "manage" | "history";

function MovimientosView() {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [historyRows, setHistoryRows] = useState<MovimientoResumenRow[]>([]);
  const [message, setMessage] = useState("Registra compras de entrada al inventario.");
  const [mode, setMode] = useState<MovimientoMode | null>(null);
  const [showModeModal, setShowModeModal] = useState(true);
  const [editModal, setEditModal] = useState<EditMovimientoModalState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState(false);

  const totalMovimiento = useMemo(
    () => rows.reduce((acc, row) => acc + row.subtotal, 0),
    [rows]
  );

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

  useEffect(() => {
    void loadProducts();
    void loadHistory();
  }, []);

  useEffect(() => {
    const marker = (location.state as { openMenuAt?: number } | null)?.openMenuAt;
    if (!marker) {
      return;
    }
    setShowModeModal(true);
  }, [location.key]);

  const columns = useMemo<ColDef<EntryRow>[]>(
    () => [
      { field: "barcode", headerName: "Codigo", width: 160 },
      { field: "description", headerName: "Producto", width: 240 },
      { field: "cantidad", headerName: "Cantidad", width: 120 },
      {
        field: "costoUnitario",
        headerName: "Costo U.",
        width: 140,
        valueFormatter: (p) => `L ${Number(p.value).toFixed(2)}`
      },
      {
        field: "subtotal",
        headerName: "Subtotal",
        width: 140,
        valueFormatter: (p) => `L ${Number(p.value).toFixed(2)}`
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

  const openEditModal = async (row: MovimientoResumenRow) => {
    const { data, error } = await supabase
      .from("movimientoDetalle")
      .select("id, productoId, cantidad, costoUnitario")
      .eq("movimientoId", row.id)
      .order("createdAt", { ascending: true });

    if (error) {
      setMessage(`No se pudo cargar detalle para editar: ${error.message}`);
      return;
    }

    const detalles = (data ?? []).map((item: any) => {
      const match = products.find((p) => p.id === item.productoId);
      return {
        id: item.id,
        productoId: item.productoId,
        barcode: match?.barcode ?? "",
        description: match?.description ?? "Producto",
        cantidad: String(item.cantidad),
        costoUnitario: String(item.costoUnitario)
      };
    });

    setEditModal({
      movimientoId: row.id,
      proveedor: row.proveedor ?? "",
      observacion: row.observacion ?? "",
      detalles
    });
  };

  const historyColumns = useMemo<ColDef<MovimientoResumenRow>[]>(
    () => [
      { field: "fecha", headerName: "Fecha", width: 130 },
      { field: "proveedor", headerName: "Proveedor", width: 210 },
      { field: "observacion", headerName: "Observacion", width: 260 },
      {
        field: "totalMovimiento",
        headerName: "Total",
        width: 140,
        valueFormatter: (p) => `L ${Number(p.value).toFixed(2)}`
      },
      {
        headerName: "Acciones",
        width: 230,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (p: any) => {
          const row = p.data as MovimientoResumenRow | undefined;
          if (!row) {
            return null;
          }

          return (
            <div className="flex h-full items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void openEditModal(row);
                }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ movimientoId: row.id, confirmText: "" })}
                className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
              >
                Eliminar
              </button>
            </div>
          );
        }
      }
    ],
    [products]
  );

  const addDetail = () => {
    const product = products.find((p) => p.id === selectedId);
    const qty = Number(cantidad);
    const cost = Number(costoUnitario);

    if (!product || !cantidad || !costoUnitario || !Number.isFinite(qty) || !Number.isFinite(cost) || qty <= 0 || cost < 0) {
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

    setCantidad("");
    setCostoUnitario("");
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

    await loadHistory();
    await loadProducts();
  };

  const saveEditMovimiento = async () => {
    if (!editModal) {
      return;
    }

    const detallesPayload = editModal.detalles.map((item) => {
      const qty = Number(item.cantidad);
      const cost = Number(item.costoUnitario);
      return {
        productoId: item.productoId,
        cantidad: qty,
        costoUnitario: Number(cost.toFixed(2)),
        subtotal: Number((qty * cost).toFixed(2))
      };
    });

    const hasInvalid = detallesPayload.some(
      (d) => !Number.isFinite(d.cantidad) || !Number.isFinite(d.costoUnitario) || d.cantidad <= 0 || d.costoUnitario < 0
    );

    if (hasInvalid || !detallesPayload.length) {
      setMessage("Los detalles editados tienen valores invalidos.");
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase.rpc("actualizar_movimiento_entrada", {
        p_movimiento_id: editModal.movimientoId,
        p_proveedor: editModal.proveedor.trim() || null,
        p_observacion: editModal.observacion.trim() || null,
        p_detalles: detallesPayload
      });

      if (error) {
        setMessage(`No se pudo editar movimiento: ${error.message}`);
        return;
      }

      setEditModal(null);
      setMessage("Movimiento actualizado correctamente.");
      await loadHistory();
      await loadProducts();
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteMovimiento = async () => {
    if (!deleteConfirm) {
      return;
    }

    if (deleteConfirm.confirmText.trim() !== "CONFIRMAR") {
      setMessage("Debes escribir CONFIRMAR para anular el movimiento.");
      return;
    }

    setDeletingMovement(true);
    try {
      const { error } = await supabase.rpc("anular_movimiento_entrada", {
        p_movimiento_id: deleteConfirm.movimientoId
      });

      if (error) {
        setMessage(`No se pudo anular movimiento: ${error.message}`);
        return;
      }

      setDeleteConfirm(null);
      setMessage("Movimiento anulado y stock revertido correctamente.");
      await loadHistory();
      await loadProducts();
    } finally {
      setDeletingMovement(false);
    }
  };

  const renderModeContent = () => {
    if (mode === "manage") {
      return (
        <>
          <div className="panel grid grid-cols-2 gap-2 md:grid-cols-6">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="col-span-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm md:col-span-4"
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
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setCantidad("");
                  return;
                }
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  setCantidad(value);
                }
              }}
              type="number"
              min="1"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Cantidad"
            />

            <input
              value={costoUnitario}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setCostoUnitario("");
                  return;
                }
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  setCostoUnitario(value);
                }
              }}
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
            <p className="mt-3 text-lg font-bold">Total movimiento: L {totalMovimiento.toFixed(2)}</p>
          </div>
        </>
      );
    }

    if (mode === "history") {
      return (
        <div className="panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="grid-title mb-0">Movimientos realizados</p>
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
                Registrar movimiento
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("history");
                  setShowModeModal(false);
                }}
                className="module-tab"
              >
                Movimientos realizados
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!showModeModal ? renderModeContent() : null}

      {editModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Editar movimiento</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                value={editModal.proveedor}
                onChange={(e) => setEditModal((prev) => (prev ? { ...prev, proveedor: e.target.value } : prev))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Proveedor"
              />
              <input
                value={editModal.observacion}
                onChange={(e) => setEditModal((prev) => (prev ? { ...prev, observacion: e.target.value } : prev))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Observacion"
              />
            </div>

            <div className="mt-3 max-h-[45dvh] space-y-2 overflow-y-auto pr-1">
              {editModal.detalles.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-2">
                  <p className="text-xs font-semibold text-slate-600">
                    {item.description} {item.barcode ? `(${item.barcode})` : ""}
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditModal((prev) => {
                          if (!prev) {
                            return prev;
                          }
                          const next = [...prev.detalles];
                          next[idx] = { ...next[idx], cantidad: value };
                          return { ...prev, detalles: next };
                        });
                      }}
                      className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      placeholder="Cantidad"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.costoUnitario}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditModal((prev) => {
                          if (!prev) {
                            return prev;
                          }
                          const next = [...prev.detalles];
                          next[idx] = { ...next[idx], costoUnitario: value };
                          return { ...prev, detalles: next };
                        });
                      }}
                      className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      placeholder="Costo unitario"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => {
                  void saveEditMovimiento();
                }}
                className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-rose-700">Confirmar anulacion</h3>
            <p className="mt-2 text-sm text-slate-700">
              Esta accion anulara el movimiento y reducira el stock agregado en productos.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">Escribe CONFIRMAR para continuar.</p>
            <input
              value={deleteConfirm.confirmText}
              onChange={(e) => setDeleteConfirm((prev) => (prev ? { ...prev, confirmText: e.target.value } : prev))}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="CONFIRMAR"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingMovement}
                onClick={() => {
                  void confirmDeleteMovimiento();
                }}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {deletingMovement ? "Anulando..." : "Anular movimiento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!showModeModal ? (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
      ) : null}
    </section>
  );
}

export default MovimientosView;
