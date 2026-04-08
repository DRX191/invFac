import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import BarcodeScanner from "../components/BarcodeScanner";
import { supabase } from "../lib/supabaseClient";
import type { CartRow, Product } from "../types/models";

function PosView() {
  const [cart, setCart] = useState<CartRow[]>([]);
  const [message, setMessage] = useState<string>("Escanea un producto para iniciar la venta.");

  const totalVenta = useMemo(
    () => cart.reduce((acc, row) => acc + row.subtotal, 0),
    [cart]
  );

  const totalItems = useMemo(
    () => cart.reduce((acc, row) => acc + row.cantidad, 0),
    [cart]
  );

  const columnDefs = useMemo<ColDef<CartRow>[]>(
    () => [
      {
        field: "description",
        headerName: "Producto",
        flex: 2,
        valueGetter: (p) => {
          const row = p.data;
          if (!row) {
            return "";
          }
          return row.cantidad > 1 ? `${row.description} x${row.cantidad}` : row.description;
        }
      },
      {
        field: "subtotal",
        headerName: "Precio",
        flex: 1,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      }
    ],
    []
  );

  const onScan = useCallback(async (barcode: string) => {
    if (!barcode) {
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .select("id, barcode, description, precio, stockActual")
      .eq("barcode", barcode)
      .maybeSingle<Product>();

    if (error) {
      setMessage(`Error consultando producto: ${error.message}`);
      return;
    }

    if (!data) {
      setMessage(`No existe producto para barcode ${barcode}.`);
      return;
    }

    if (data.stockActual <= 0) {
      setMessage(`Producto sin stock: ${data.description}.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((row) => row.productoId === data.id);
      if (existing) {
        return prev.map((row) => {
          if (row.productoId !== data.id) {
            return row;
          }
          const cantidad = row.cantidad + 1;
          return {
            ...row,
            cantidad,
            subtotal: Number((cantidad * row.precioUnitario).toFixed(2))
          };
        });
      }

      return [
        {
          productoId: data.id,
          barcode: data.barcode,
          description: data.description,
          precioUnitario: Number(data.precio),
          cantidad: 1,
          subtotal: Number(data.precio)
        },
        ...prev
      ];
    });

    setMessage(`Agregado: ${data.description}`);
  }, []);

  const clearCart = () => {
    setCart([]);
    setMessage("Carrito limpio.");
  };

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Pantalla de Ventas</h2>
        <p className="text-sm text-slate-600">Escaneo continuo arriba y carrito abajo.</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel space-y-3">
          <h3 className="text-lg font-semibold">Lector de camara</h3>
          <BarcodeScanner onScan={onScan} />
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
        </div>

        <div className="panel">
          <p className="grid-title">Carrito (AG Grid)</p>
          <div className="ag-theme-quartz h-[34dvh] min-h-[220px] w-full">
            <AgGridReact<CartRow>
              rowData={cart}
              columnDefs={columnDefs}
              rowHeight={50}
              overlayNoRowsTemplate="No hay productos en el carrito. Escanea para agregar."
              domLayout="normal"
            />
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen de compra</p>
            <div className="mt-1 flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-600">Productos agregados</p>
                <p className="text-lg font-bold text-slate-900">{totalItems}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Total actual</p>
                <p className="text-2xl font-extrabold text-slate-900">${totalVenta.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-amber-700">Facturacion deshabilitada por ahora.</p>
              <button
                type="button"
                onClick={clearCart}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Limpiar carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PosView;
