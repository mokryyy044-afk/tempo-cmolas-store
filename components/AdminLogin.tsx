"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export function AdminLogin() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then((response) => {
      if (response.ok) {
        window.location.href = "/admin/";
      }
    }).catch(() => {
      // Login screen stays visible when there is no backend session.
    });
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Niepoprawny login lub hasło.");
        setLoading(false);
        return;
      }
      window.location.href = "/admin/";
    } catch {
      setError("Nie udało się połączyć z panelem logowania.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#050b16] px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(11,99,206,0.35),transparent_28%),radial-gradient(circle_at_88%_74%,rgba(158,203,255,0.14),transparent_24%)]" />
      <section className="relative w-full max-w-md rounded border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded bg-[#0b63ce] text-lg font-black text-white">TC</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9ecbff]">CMS Tempo Cmolas</p>
            <h1 className="mt-1 text-3xl font-black uppercase">Logowanie</h1>
          </div>
        </div>

        <form onSubmit={submitLogin} className="mt-8 grid gap-4">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/62">
            Login
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="mt-2 h-12 w-full rounded border border-white/14 bg-white/10 px-3 text-base font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#9ecbff] focus:ring-4 focus:ring-[#0b63ce]/20"
              placeholder="Login"
            />
          </label>

          <label className="text-xs font-black uppercase tracking-[0.16em] text-white/62">
            Hasło
            <div className="mt-2 flex h-12 items-center rounded border border-white/14 bg-white/10 focus-within:border-[#9ecbff] focus-within:ring-4 focus-within:ring-[#0b63ce]/20">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-base font-bold text-white outline-none placeholder:text-white/35"
                placeholder="Hasło"
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                className="grid h-12 w-12 place-items-center text-white/70 transition hover:text-white"
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <p className="rounded border border-white/10 bg-white/8 p-3 text-sm font-bold leading-6 text-white/62">
            Ze względów bezpieczeństwa panel wymaga ponownego logowania po odświeżeniu strony.
          </p>

          {error ? <div className="rounded border border-red-400/30 bg-red-500/12 p-3 text-sm font-black text-red-100">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded bg-[#0b63ce] text-sm font-black uppercase text-white transition hover:bg-[#084da3] disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? <LockKeyhole size={18} /> : <ShieldCheck size={18} />}
            {loading ? "Sprawdzam dane..." : "Wejdź do panelu"}
          </button>
        </form>

      </section>
    </main>
  );
}
