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
type ReportMode = "predeterminado" | "ajustado";

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: "dia", label: "Diario" },
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensual" },
  { value: "anio", label: "Anual" }
];

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
  const [users, setUsers] = useState<string[]>([]);
  const [reportMode, setReportMode] = useState<ReportMode>("predeterminado");
  const [period, setPeriod] = useState<Period>("dia");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
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

  const applyReportQuery = async (params: {
    periodValue: Period;
    userValue: string;
    useCustom: boolean;
    fromDate?: string;
    toDate?: string;
  }) => {
    const {
      periodValue,
      userValue,
      useCustom,
      fromDate,
      toDate
    } = params;

    const baseFrom = useCustom
      ? new Date(`${fromDate}T00:00:00`)
      : getFromDate(periodValue);
    const baseTo = useCustom
      ? new Date(`${toDate}T23:59:59.999`)
      : null;

    let query = supabase
      .from("vwVentasDetalle")
      .select("*")
      .gte("fechaVenta", baseFrom.toISOString())
      .order("fechaVenta", { ascending: false });

    if (baseTo) {
      query = query.lte("fechaVenta", baseTo.toISOString());
    }

    if (userValue !== "ALL") {
      query = query.eq("usuarioEmail", userValue);
    }

    const { data, error } = await query;

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
    const periodText = periodOptions.find((item) => item.value === periodValue)?.label ?? periodValue;
    const userText = userValue === "ALL" ? "todos" : userValue;
    const customText = useCustom && fromDate && toDate ? ` (${fromDate} a ${toDate})` : "";
    setMessage(`Reporte cargado: ${periodText}, usuario ${userText}${customText}.`);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("vwVentasDetalle")
      .select("usuarioEmail")
      .not("usuarioEmail", "is", null)
      .order("usuarioEmail", { ascending: true })
      .limit(2000);

    if (error) {
      setMessage(`No se pudieron cargar usuarios: ${error.message}`);
      return;
    }

    const uniques = Array.from(new Set((data ?? []).map((row: any) => String(row.usuarioEmail || "").trim()).filter(Boolean)));
    setUsers(uniques);
  };

  const runPresetReport = async (nextPeriod: Period, nextUser: string) => {
    await applyReportQuery({
      periodValue: nextPeriod,
      userValue: nextUser,
      useCustom: false
    });
  };

  const runCustomReport = async () => {
    if (!customFrom || !customTo) {
      setMessage("Selecciona fecha inicial y final para modo custom.");
      return;
    }

    if (customFrom > customTo) {
      setMessage("La fecha inicial no puede ser mayor a la fecha final.");
      return;
    }

    await applyReportQuery({
      periodValue: period,
      userValue: selectedUser,
      useCustom: true,
      fromDate: customFrom,
      toDate: customTo
    });
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (reportMode === "predeterminado") {
      void runPresetReport(period, selectedUser);
      return;
    }

    if (!customFrom || !customTo) {
      setRows([]);
      setMessage("Selecciona fecha inicial y final para modo ajustado.");
      return;
    }

    if (customFrom > customTo) {
      setRows([]);
      setMessage("La fecha inicial no puede ser mayor a la fecha final.");
      return;
    }

    void runCustomReport();
  }, [period, selectedUser, reportMode, customFrom, customTo]);

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-2xl font-bold">Reporte de Ventas Detalle</h2>
        <p className="text-sm text-slate-600">Filtra ventas por periodo, usuario o rango personalizado.</p>
      </header>

      <div className="panel grid gap-2 md:grid-cols-4">
        <select
          value={reportMode}
          onChange={(e) => setReportMode(e.target.value as ReportMode)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="predeterminado">Predeterminado</option>
          <option value="ajustado">Ajustado</option>
        </select>

        {reportMode === "predeterminado" ? (
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {periodOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
        )}

        {reportMode === "ajustado" ? (
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
        ) : null}

        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="ALL">Todos los usuarios</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>

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
