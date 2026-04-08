import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ingresa con tu usuario para usar el sistema.");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("Debes ingresar correo y contrasena.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      setMessage(`No se pudo iniciar sesion: ${error.message}`);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage("Sesion iniciada correctamente.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">InvFac POS</h1>
        <p className="mt-1 text-sm text-slate-600">Acceso requerido para operar inventario, movimientos y ventas.</p>

        <form onSubmit={handleSignIn} className="mt-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contrasena"
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-700 px-5 py-3 text-base font-bold text-white disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>

        <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
      </section>
    </div>
  );
}

export default LoginView;
