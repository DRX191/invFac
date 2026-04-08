import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function ResetPasswordView() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Abre este enlace desde el correo de recuperacion y define una nueva contrasena.");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const accessToken = params.get("access_token");

    if (type === "recovery" && accessToken) {
      setMessage("Token de recuperacion detectado. Ya puedes cambiar tu contrasena.");
      return;
    }

    setMessage(
      "No se detecto token de recuperacion. Solicita un nuevo correo de recuperacion e intenta de nuevo."
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setMessage("Debes completar ambos campos de contrasena.");
      return;
    }

    if (password.length < 6) {
      setMessage("La nueva contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(`No se pudo actualizar la contrasena: ${error.message}`);
      return;
    }

    setMessage("Contrasena actualizada. Ya puedes volver al login e iniciar sesion.");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Recuperar contrasena</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ingresa tu nueva contrasena para restaurar el acceso al sistema.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contrasena"
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar contrasena"
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-700 px-5 py-3 text-base font-bold text-white disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Actualizar contrasena"}
          </button>
        </form>

        <a href="/" className="mt-4 inline-block text-sm font-semibold text-brand-700">
          Volver al login
        </a>

        <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
      </section>
    </div>
  );
}

export default ResetPasswordView;
