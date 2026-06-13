"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && profile?.rol === "entrenador") router.replace("/dashboard");
  }, [loading, profile, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand"><span className="brand-mark"><Dumbbell size={20} /></span> DiegoApp Coach</div>
        <div className="login-copy">
          <h1>Tu equipo.<br />Su progreso.<br /><span>Un solo panel.</span></h1>
          <p>Administra clientes, rutinas, métricas y conversaciones desde una experiencia construida para entrenadores.</p>
        </div>
        <p className="dim">Conectado de forma segura con tu cuenta de DiegoApp.</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="brand"><span className="brand-mark"><Dumbbell size={20} /></span> Panel de coach</div>
          <h2>Bienvenido de vuelta</h2>
          <p className="muted">Usa las mismas credenciales de la aplicación móvil.</p>
          <form className="login-form" onSubmit={submit}>
            {error ? <div className="error">{error}</div> : null}
            <div className="field"><label>Correo electrónico</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="field"><label>Contraseña</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Ingresando..." : "Entrar al panel"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
