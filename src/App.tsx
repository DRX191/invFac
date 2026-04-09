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
import dmIcon from "./img/dm.png";
import wmIcon from "./img/wm.png";

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
  const [showUserMenu, setShowUserMenu] = useState(false);

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
    setShowUserMenu(false);
  }, [location.pathname]);

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
    setShowUserMenu(false);
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
          <div className="relative flex min-w-0 items-center gap-2">
            <h1 className="mr-auto text-xl font-extrabold tracking-tight text-brand-900">Pulperia Marifer</h1>

            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="max-w-[128px] truncate rounded-xl border border-slate-300 bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 sm:max-w-[210px] sm:px-3 sm:text-sm"
            >
              {session.user.email}
            </button>

            {showUserMenu ? (
              <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-slate-300 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <img
                    src={theme === "dark" ? wmIcon : dmIcon}
                    alt={theme === "dark" ? "Modo claro" : "Modo oscuro"}
                    className="h-5 w-5 object-contain"
                  />
                  {theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Cerrar sesion
                </button>
              </div>
            ) : null}
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
                <img
                  src={item.icon}
                  alt={item.label}
                  className={`h-7 w-7 object-contain ${item.to === "/pos" ? "cart-nav-icon" : ""}`}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
