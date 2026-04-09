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
import cartIcon from "./img/cart.png";
import inventoryIcon from "./img/inventory.png";
import movementIcon from "./img/movement.png";
import saleIcon from "./img/sale.png";

const navItems = [
  { to: "/pos", label: "POS", icon: cartIcon },
  { to: "/admin/inventory", label: "Inventario", icon: inventoryIcon },
  { to: "/admin/movimientos", label: "Movimientos", icon: movementIcon },
  { to: "/admin/reports", label: "Reportes", icon: saleIcon }
];

function App() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("invfac.theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("theme-light", theme === "light");
    window.localStorage.setItem("invfac.theme", theme);
  }, [theme]);

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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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
          <div className="flex items-center gap-2">
            <h1 className="mr-auto text-xl font-bold text-brand-900">InvFac POS</h1>
            <span className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 sm:inline-block">
            {session.user.email}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="whitespace-nowrap rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
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

      <main className="phone-container px-3 py-3 pb-28 sm:px-6 sm:py-5">
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<PosView />} />
          <Route path="/admin/inventory" element={<InventoryView />} />
          <Route path="/admin/movimientos" element={<MovimientosView />} />
          <Route path="/admin/reports" element={<ReportsView />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="phone-container grid grid-cols-4 gap-2 px-3 pb-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={`nav-icon-btn ${
                  active
                    ? "active"
                    : ""
                }`}
              >
                <img src={item.icon} alt={item.label} className="h-7 w-7 object-contain" />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
