import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import BarcodeScanner from "../components/BarcodeScanner";
import { supabase } from "../lib/supabaseClient";
import type { CartRow, Product } from "../types/models";

function PosView() {
  const [cart, setCart] = useState<CartRow[]>([]);
  const [message, setMessage] = useState<string>("Escanea un producto para iniciar la venta.");
  const [loadingBuy, setLoadingBuy] = useState(false);

  const totalVenta = useMemo(
    () => cart.reduce((acc, row) => acc + row.subtotal, 0),
    [cart]
  );

  const totalItems = useMemo(
    () => cart.reduce((acc, row) => acc + row.cantidad, 0),
    [cart]
  );

  const adjustQuantity = useCallback((productoId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((row) => {
          if (row.productoId !== productoId) {
            return row;
          }
          const nextQty = row.cantidad + delta;
          if (nextQty <= 0) {
            return null;
          }
          return {
            ...row,
            cantidad: nextQty,
            subtotal: Number((nextQty * row.precioUnitario).toFixed(2))
          };
        })
        .filter((row): row is CartRow => Boolean(row));
    });
  }, []);

  const columnDefs = useMemo<ColDef<CartRow>[]>(
    () => [
      {
        field: "description",
        headerName: "Producto",
        width: 260
      },
      {
        field: "cantidad",
        headerName: "Cantidad",
        width: 160,
        sortable: false,
        cellRenderer: (p: any) => {
          const row = p.data as CartRow | undefined;
          if (!row) {
            return null;
          }

          return (
            <div className="qty-cell">
              <button
                type="button"
                className="qty-btn"
                onClick={() => adjustQuantity(row.productoId, -1)}
                aria-label="Quitar uno"
              >
                <span className="material-symbols-rounded">remove</span>
              </button>
              <span className="qty-value">{row.cantidad}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => adjustQuantity(row.productoId, 1)}
                aria-label="Agregar uno"
              >
                <span className="material-symbols-rounded">add</span>
              </button>
            </div>
          );
        }
      },
      {
        field: "subtotal",
        headerName: "Precio",
        width: 140,
        valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`
      }
    ],
    [adjustQuantity]
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

  const comprar = async () => {
    if (!cart.length) {
      setMessage("No hay productos en el carrito.");
      return;
    }

    setLoadingBuy(true);
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("No hay sesion activa. Inicia sesion para registrar la compra.");
        return;
      }

      const payload = {
        p_usuario_id: user.id,
        p_usuario_email: user.email ?? "",
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
        setMessage(`Error al registrar la compra: ${error.message}`);
        return;
      }

      setCart([]);
      setMessage("Compra registrada correctamente.");
    } finally {
      setLoadingBuy(false);
    }
  };

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Compra de productos</h2>
        <p className="text-sm text-slate-600">Escanea productos y registra la compra.</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel space-y-3">
          <BarcodeScanner onScan={onScan} compact />
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
        </div>

        <div className="panel">
          <p className="grid-title">Carrito</p>
          <div className="grid-wrap">
          <div className="ag-theme-quartz h-[34dvh] min-h-[220px] min-w-[320px] w-full">
            <AgGridReact<CartRow>
              rowData={cart}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={50}
              suppressDragLeaveHidesColumns
              suppressMovableColumns
              overlayNoRowsTemplate="No hay productos en el carrito. Escanea para agregar."
              domLayout="normal"
            />
          </div>
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
              <button
                type="button"
                onClick={clearCart}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Limpiar carrito
              </button>
              <button
                type="button"
                onClick={comprar}
                disabled={loadingBuy}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {loadingBuy ? "Guardando..." : "Comprar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PosView;
