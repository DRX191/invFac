import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { CellValueChangedEvent, ColDef } from "@ag-grid-community/core";
import { supabase } from "../lib/supabaseClient";
import type { Product } from "../types/models";
import BarcodeScanner from "../components/BarcodeScanner";

interface ProductForm {
  barcode: string;
  descripcion: string;
  precio: string;
  stockActual: string;
}

const defaultForm: ProductForm = {
  barcode: "",
  descripcion: "",
  precio: "",
  stockActual: ""
};

function InventoryView() {
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [message, setMessage] = useState("Cargando inventario...");
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, barcode, descripcion, precio, stockActual, createdAt, updatedAt")
      .order("descripcion", { ascending: true });

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

  const columns = useMemo<ColDef<Product>[]>(
    () => [
      { field: "barcode", headerName: "Codigo de barras", flex: 1.3 },
      { field: "descripcion", headerName: "Descripcion", flex: 1.8 },
      {
        field: "precio",
        headerName: "Precio",
        editable: true,
        flex: 1,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      },
      {
        field: "stockActual",
        headerName: "Stock",
        editable: true,
        flex: 0.8
      }
    ],
    []
  );

  const onCellValueChanged = async (event: CellValueChangedEvent<Product>) => {
    const id = event.data.id;
    const payload = {
      precio: Number(event.data.precio),
      stockActual: Number(event.data.stockActual)
    };

    const { error } = await supabase.from("productos").update(payload).eq("id", id);

    if (error) {
      setMessage(`No se pudo guardar la edicion: ${error.message}`);
      await loadProducts();
      return;
    }

    setMessage("Producto actualizado correctamente.");
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      barcode: form.barcode.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio),
      stockActual: Number(form.stockActual)
    };

    if (!payload.barcode || !payload.descripcion || payload.precio <= 0 || payload.stockActual < 0) {
      setMessage("Completa todos los campos con valores validos.");
      return;
    }

    const { error } = await supabase.from("productos").insert(payload);
    if (error) {
      setMessage(`Error al crear producto: ${error.message}`);
      return;
    }

    setForm(defaultForm);
    setMessage("Producto creado correctamente.");
    await loadProducts();
  };

  const handleScanBarcode = (decodedText: string) => {
    if (!decodedText) {
      return;
    }

    setForm((prev) => ({ ...prev, barcode: decodedText }));
    setMessage(`Codigo escaneado: ${decodedText}`);
    setScannerOpen(false);
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Inventario</h2>
        <p className="text-sm text-slate-600">Gestion de productos con codigo de barras unico.</p>
      </header>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Escanear codigo de barras</h3>
          <button
            type="button"
            onClick={() => setScannerOpen((prev) => !prev)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            {scannerOpen ? "Cerrar camara" : "Abrir camara"}
          </button>
        </div>
        {scannerOpen ? (
          <BarcodeScanner onScan={handleScanBarcode} />
        ) : (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Abre la camara para escanear y autocompletar el barcode del producto.
          </p>
        )}
      </div>

      <form onSubmit={saveProduct} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={form.barcode}
          onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
          placeholder="Codigo de barras"
          className="rounded-xl border border-slate-300 px-3 py-3"
        />
        <input
          value={form.descripcion}
          onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
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
          Crear producto
        </button>
      </form>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="ag-theme-quartz h-[460px] w-full">
          <AgGridReact<Product>
            rowData={rows}
            columnDefs={columns}
            rowHeight={50}
            onCellValueChanged={onCellValueChanged}
          />
        </div>
      </div>

      <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
    </section>
  );
}

export default InventoryView;
