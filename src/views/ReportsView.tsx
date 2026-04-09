import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type { ColDef } from "@ag-grid-community/core";
import { supabase } from "../lib/supabaseClient";

interface ReportRow {
  fechaVenta: string;
  usuarioEmail: string;
  description: string;
  cantidad: number;
  total: number;
}

type Period = "dia" | "semana" | "mes" | "anio";

const periodOptions: Period[] = ["dia", "semana", "mes", "anio"];

function getFromDate(period: Period) {
  const now = new Date();
  switch (period) {
    case "dia":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "semana": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    }
    case "mes":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "anio":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return now;
  }
}

function ReportsView() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [period, setPeriod] = useState<Period>("dia");
  const [message, setMessage] = useState("Consulta ventas por periodo.");

  const columns = useMemo<ColDef<ReportRow>[]>(
    () => [
      { field: "fechaVenta", headerName: "Fecha", width: 130 },
      { field: "usuarioEmail", headerName: "Usuario", width: 230 },
      { field: "description", headerName: "Producto", width: 260 },
      { field: "cantidad", headerName: "Cantidad", width: 120 },
      {
        field: "total",
        headerName: "Total",
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

  const loadReport = async (current: Period) => {
    const fromDate = getFromDate(current).toISOString();

    const { data, error } = await supabase
      .from("vwVentasDetalle")
      .select("*")
      .gte("fechaVenta", fromDate)
      .order("fechaVenta", { ascending: false });

    if (error) {
      setMessage(`Error consultando reporte: ${error.message}`);
      return;
    }

    const formattedRows: ReportRow[] = (data ?? []).map((row: any) => {
      const rawDate = new Date(row.fechaVenta);
      const day = String(rawDate.getDate()).padStart(2, "0");
      const month = String(rawDate.getMonth() + 1).padStart(2, "0");
      const year = rawDate.getFullYear();

      const totalRaw = row.subtotal ?? row.totalVenta ?? 0;

      return {
        fechaVenta: `${day}-${month}-${year}`,
        usuarioEmail: row.usuarioEmail || row.usuarioId || "-",
        description: row.description || "-",
        cantidad: Number(row.cantidad ?? 0),
        total: Number(totalRaw)
      };
    });

    setRows(formattedRows);
    setMessage(`Reporte cargado para periodo: ${current}.`);
  };

  useEffect(() => {
    void loadReport(period);
  }, [period]);

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-2xl font-bold">Reporte de Ventas Detalle</h2>
        <p className="text-sm text-slate-600">Visualiza ventas por dia, semana, mes o anio.</p>
      </header>

      <div className="panel flex flex-wrap gap-2">
        {periodOptions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPeriod(item)}
            className={`rounded-xl px-5 py-3 text-base font-bold ${
              item === period
                ? "bg-brand-700 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="panel">
        <p className="grid-title">Ventas detalladas</p>
        <div className="grid-wrap">
        <div className="ag-theme-quartz h-[52dvh] min-h-[280px] min-w-[900px] w-full">
          <AgGridReact<ReportRow>
            rowData={rows}
            columnDefs={columns}
            defaultColDef={defaultColDef}
            rowHeight={50}
            suppressDragLeaveHidesColumns
            suppressMovableColumns
            overlayNoRowsTemplate="No hay ventas en el periodo seleccionado."
          />
        </div>
        </div>
      </div>

      <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
    </section>
  );
}

export default ReportsView;
