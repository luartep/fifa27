"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al iniciar sesión.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          ⚽ Mundial <span>2026</span>
        </div>
        <div className="login-sub">Panel de Mercados · Acceso privado</div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Clave</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #080b12;
          padding: 20px;
        }
        .login-card {
          width: 100%;
          max-width: 360px;
          background: #0f1420;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px 28px;
        }
        .login-logo {
          font-family: "Bebas Neue", sans-serif;
          font-size: 26px;
          letter-spacing: 0.08em;
          color: #fff;
          text-align: center;
        }
        .login-logo span {
          color: #f5c842;
        }
        .login-sub {
          text-align: center;
          font-size: 11px;
          color: #5a6888;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 6px;
          margin-bottom: 26px;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5a6888;
        }
        input {
          background: #080b12;
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 8px;
          padding: 11px 12px;
          color: #dde4f2;
          font-size: 14px;
          outline: none;
        }
        input:focus {
          border-color: #4f8ef7;
          box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.15);
        }
        .login-error {
          background: rgba(240, 82, 82, 0.12);
          border: 1px solid rgba(240, 82, 82, 0.25);
          color: #f05252;
          font-size: 12px;
          padding: 9px 11px;
          border-radius: 8px;
        }
        button {
          background: linear-gradient(135deg, #4f8ef7, #3a72e0);
          border: none;
          border-radius: 9px;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 12px;
          cursor: pointer;
          margin-top: 4px;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
