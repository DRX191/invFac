import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import PosView from "./views/PosView";
import InventoryView from "./views/InventoryView";
import MovimientosView from "./views/MovimientosView";
import ReportsView from "./views/ReportsView";
import LoginView from "./views/LoginView";
import ResetPasswordView from "./views/ResetPasswordView";
import { isSupabaseConfigured, supabaseConfigError } from "./lib/supabaseClient";
import { supabase } from "./lib/supabaseClient";

const navItems = [
  { to: "/pos", label: "POS" },
  { to: "/admin/inventory", label: "Inventario" },
  { to: "/admin/movimientos", label: "Movimientos" },
  { to: "/admin/reports", label: "Reportes" }
];

function App() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingAuth(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingAuth(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {supabaseConfigError}
        </div>
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          Verificando sesion...
        </p>
      </div>
    );
  }

  if (location.pathname === "/auth/reset-password") {
    if (session) {
      return <Navigate to="/pos" replace />;
    }
    return <ResetPasswordView />;
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="mobile-shell bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="phone-container px-3 py-3 sm:px-6">
          <div className="mb-2 flex items-center gap-2">
            <h1 className="mr-auto text-xl font-bold text-brand-900">InvFac POS</h1>
            <span className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 sm:inline-block">
            {session.user.email}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-700 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-brand-600 hover:text-brand-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleSignOut}
              className="whitespace-nowrap rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <main className="phone-container px-3 py-3 sm:px-6 sm:py-5">
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
