import { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import { supabase } from "../lib/supabaseClient";
import type { Product } from "../types/models";
import BarcodeScanner from "../components/BarcodeScanner";

interface ProductForm {
  barcode: string;
  description: string;
  precio: string;
  stockActual: string;
}

type InventoryMode = "manage" | "catalog";

const defaultForm: ProductForm = {
  barcode: "",
  description: "",
  precio: "",
  stockActual: ""
};

function InventoryView() {
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [message, setMessage] = useState("Cargando inventario...");
  const [mode, setMode] = useState<InventoryMode | null>(null);
  const [showModeModal, setShowModeModal] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, barcode, description, precio, stockActual, createdAt, updatedAt")
      .order("description", { ascending: true });

    if (error) {
      setMessage(`Error cargando productos: ${error.message}`);
      return;
    }

    setRows((data ?? []) as Product[]);
    setMessage("Inventario actualizado.");
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const catalogColumns = useMemo<ColDef<Product>[]>(
    () => [
      { field: "barcode", headerName: "Codigo de barras", flex: 1.3 },
      { field: "description", headerName: "Descripcion", flex: 2 },
      {
        field: "precio",
        headerName: "Precio",
        flex: 1,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      },
      { field: "stockActual", headerName: "Stock", flex: 0.8 }
    ],
    []
  );

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      barcode: form.barcode.trim(),
      description: form.description.trim(),
      precio: Number(form.precio),
      stockActual: Number(form.stockActual)
    };

    if (!payload.barcode || !payload.description || payload.precio <= 0 || payload.stockActual < 0) {
      setMessage("Completa todos los campos con valores validos.");
      return;
    }

    if (editingProductId) {
      const { error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", editingProductId);
      if (error) {
        setMessage(`Error al actualizar producto: ${error.message}`);
        return;
      }

      setMessage("Producto actualizado correctamente.");
    } else {
      const { error } = await supabase.from("productos").insert(payload);
      if (error) {
        setMessage(`Error al crear producto: ${error.message}`);
        return;
      }

      setMessage("Producto creado correctamente.");
    }

    setForm(defaultForm);
    setEditingProductId(null);
    await loadProducts();
  };

  const handleScanBarcode = useCallback(async (decodedText: string) => {
    if (!decodedText) {
      return;
    }

    const barcode = decodedText.trim();
    const { data, error } = await supabase
      .from("productos")
      .select("id, barcode, description, precio, stockActual")
      .eq("barcode", barcode)
      .maybeSingle<Product>();

    if (error) {
      setMessage(`Error buscando barcode: ${error.message}`);
      return;
    }

    if (data) {
      setForm({
        barcode: data.barcode,
        description: data.description,
        precio: String(data.precio),
        stockActual: String(data.stockActual)
      });
      setEditingProductId(data.id);
      setMessage(`Producto existente detectado. Editando: ${data.description}`);
      return;
    }

    setEditingProductId(null);
    setForm((prev) => ({
      ...prev,
      barcode,
      description: "",
      precio: "",
      stockActual: ""
    }));
    setMessage(`Codigo nuevo detectado: ${barcode}. Completa datos para crear.`);
  }, []);

  const handleSelectMode = (nextMode: InventoryMode) => {
    setMode(nextMode);
    setShowModeModal(false);
  };

  const renderModeContent = () => {
    if (mode === "manage") {
      return (
        <>
          <div className="panel">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Escanear codigo de barras</h3>
              <button
                type="button"
                onClick={() => setShowModeModal(true)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
              >
                Cambiar modulo
              </button>
            </div>
            <BarcodeScanner onScan={handleScanBarcode} instanceId="inventory-barcode-scanner" compact />
          </div>

          <form onSubmit={saveProduct} className="panel grid gap-3 md:grid-cols-4">
            <input
              value={form.barcode}
              onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
              placeholder="Codigo de barras"
              className="rounded-xl border border-slate-300 px-3 py-3"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descripcion"
              className="rounded-xl border border-slate-300 px-3 py-3"
            />
            <input
              value={form.precio}
              onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
              placeholder="Precio"
              type="number"
              min="0"
              step="0.01"
              className="rounded-xl border border-slate-300 px-3 py-3"
            />
            <input
              value={form.stockActual}
              onChange={(e) => setForm((prev) => ({ ...prev, stockActual: e.target.value }))}
              placeholder="Stock inicial"
              type="number"
              min="0"
              className="rounded-xl border border-slate-300 px-3 py-3"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand-700 px-5 py-3 text-base font-bold text-white md:col-span-4"
            >
              {editingProductId ? "Guardar cambios" : "Crear producto"}
            </button>
            {editingProductId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setForm(defaultForm);
                  setMessage("Modo creacion activado.");
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-base font-semibold md:col-span-4"
              >
                Cancelar edicion
              </button>
            ) : null}
          </form>
        </>
      );
    }

    if (mode === "catalog") {
      return (
        <div className="panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="grid-title mb-0">Catalogo de productos existentes (AG Grid)</p>
            <button
              type="button"
              onClick={() => setShowModeModal(true)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
            >
              Cambiar modulo
            </button>
          </div>
          <div className="ag-theme-quartz h-[54dvh] min-h-[300px] w-full">
            <AgGridReact<Product>
              rowData={rows}
              columnDefs={catalogColumns}
              rowHeight={50}
              overlayNoRowsTemplate="No hay productos registrados aun."
            />
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
          <h2 className="text-2xl font-bold">Inventario</h2>
          <p className="text-sm text-slate-600">Gestion de productos con codigo de barras unico.</p>
        </header>
      ) : null}

      {showModeModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Inventario</h3>
            <p className="mt-1 text-sm text-slate-600">Selecciona el modulo que deseas abrir.</p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => handleSelectMode("manage")}
                className="module-tab active"
              >
                Agregar / Editar productos
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("catalog")}
                className="module-tab"
              >
                Visualizar productos existentes
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

export default InventoryView;
