import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import BarcodeScanner from "../components/BarcodeScanner";
import { supabase } from "../lib/supabaseClient";
import type { CartRow, Product } from "../types/models";

function PosView() {
  const [cart, setCart] = useState<CartRow[]>([]);
  const [message, setMessage] = useState<string>("Escanea un producto para iniciar la venta.");
  const [loadingCharge, setLoadingCharge] = useState(false);

  const totalVenta = useMemo(
    () => cart.reduce((acc, row) => acc + row.subtotal, 0),
    [cart]
  );

  const columnDefs = useMemo<ColDef<CartRow>[]>(
    () => [
      { field: "barcode", headerName: "Codigo", flex: 1.1 },
      { field: "description", headerName: "Producto", flex: 1.6 },
      {
        field: "precioUnitario",
        headerName: "Precio",
        flex: 0.9,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      },
      { field: "cantidad", headerName: "Cant.", flex: 0.7 },
      {
        field: "subtotal",
        headerName: "Subtotal",
        flex: 0.9,
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

  const cobrar = async () => {
    if (!cart.length) {
      setMessage("No hay productos en el carrito.");
      return;
    }

    setLoadingCharge(true);
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("No hay sesion activa. Inicia sesion para cobrar.");
        return;
      }

      const payload = {
        p_usuario_id: user.id,
        p_total_venta: Number(totalVenta.toFixed(2)),
        p_detalles: cart.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: Number(item.subtotal.toFixed(2))
        }))
      };

      const { error } = await supabase.rpc("registrar_venta_con_detalles", payload);

      if (error) {
        setMessage(`Error al cobrar: ${error.message}`);
        return;
      }

      setCart([]);
      setMessage("Venta registrada correctamente.");
    } finally {
      setLoadingCharge(false);
    }
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Pantalla de Ventas</h2>
        <p className="text-sm text-slate-600">Escaneo continuo arriba y carrito abajo.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Lector de camara</h3>
          <BarcodeScanner onScan={onScan} />
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="ag-theme-quartz h-[350px] w-full">
            <AgGridReact<CartRow>
              rowData={cart}
              columnDefs={columnDefs}
              rowHeight={50}
              domLayout="normal"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xl font-bold">Total: ${totalVenta.toFixed(2)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCart}
                className="rounded-xl border border-slate-300 px-5 py-3 text-base font-semibold"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={cobrar}
                disabled={loadingCharge}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white disabled:opacity-60"
              >
                {loadingCharge ? "Procesando..." : "Cobrar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PosView;
