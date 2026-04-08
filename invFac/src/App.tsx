import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import PosView from "./views/PosView";
import InventoryView from "./views/InventoryView";
import MovimientosView from "./views/MovimientosView";
import ReportsView from "./views/ReportsView";

const navItems = [
  { to: "/pos", label: "POS" },
  { to: "/admin/inventory", label: "Inventario" },
  { to: "/admin/movimientos", label: "Movimientos" },
  { to: "/admin/reports", label: "Reportes" }
];

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:px-6">
          <h1 className="mr-auto text-lg font-bold text-brand-900 sm:text-xl">InvFac POS</h1>
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-brand-700 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-brand-600 hover:text-brand-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<PosView />} />
          <Route path="/admin/inventory" element={<InventoryView />} />
          <Route path="/admin/movimientos" element={<MovimientosView />} />
          <Route path="/admin/reports" element={<ReportsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
