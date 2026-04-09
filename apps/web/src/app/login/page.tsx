"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { notify } from "@/lib/notify";
import { Button, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api<{ accessToken: string; user: { role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
      notify.success("Login feito com sucesso.");
      const r = res.user.role;
      if (r === "STUDENT") router.push("/student/dashboard");
      else if (r === "TRAINER") router.push("/trainer/dashboard");
      else if (r === "NUTRITIONIST") router.push("/nutritionist/dashboard");
      else router.push("/admin/dashboard");
    } catch (e) {
      notify.apiError(e);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-bold text-ink-900">Bem-vinda de volta</h1>
        <p className="mt-1 text-sm text-ink-800/70">Entre para continuar sua sequência.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-brand-900">E-mail</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none ring-brand-400 focus:ring-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-900">Senha</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-sm outline-none ring-brand-400 focus:ring-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-800/70">
          <Link href="/forgot-password" className="text-brand-700 hover:underline">
            Esqueci a senha
          </Link>
          {" · "}
          <Link href="/register" className="text-brand-700 hover:underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </div>
  );
}
