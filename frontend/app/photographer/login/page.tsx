"use client";

import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function cleanEmail(value: string) {
    return value.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "").replace(/\s+/g, "").replace(/＠/g, "@");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(cleanEmail(email), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message.includes("valid email") ? "Please enter a valid email address." : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} />
          Mode selection
        </Link>
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-rosewood/10 text-rosewood">
          <Camera size={24} />
        </div>
        <h1 className="text-3xl font-bold">Photographer Login</h1>
        <p className="mt-2 text-sm text-slate-500">Access your event dashboard and uploaded galleries.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <input className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3" type="email" value={email} onChange={(e) => setEmail(cleanEmail(e.target.value))} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Password</span>
            <input className="focus-ring mt-1 w-full rounded-lg border border-slate-300 px-4 py-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New here? <Link className="font-semibold text-rosewood" href="/photographer/register">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
