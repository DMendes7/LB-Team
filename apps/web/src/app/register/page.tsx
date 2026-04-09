"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { notify } from "@/lib/notify";
import { Button, Card } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      notify.warning("Aceite os termos para continuar.");
      return;
    }
    try {
      const res = await api<{ accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || undefined,
          birthDate: birthDate || undefined,
          acceptTerms: true,
        }),
      });
      setToken(res.accessToken);
      notify.success("Conta criada. Complete seu perfil.");
      router.push("/onboarding");
    } catch (e) {
      notify.apiError(e);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-2xl font-bold text-ink-900">Criar conta</h1>
        <p className="mt-1 text-sm text-ink-800/70">Passo rápido — depois personalizamos seu plano.</p>
        <form onSubmit={submit} className="mt-6 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-medium text-brand-900">Nome</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none ring-brand-400 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-900">E-mail</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none ring-brand-400 focus:ring-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-900">Senha (mín. 6)</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none ring-brand-400 focus:ring-2"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-900">Telefone (opcional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none ring-brand-400 focus:ring-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-900">Data de nascimento (opcional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none ring-brand-400 focus:ring-2"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-ink-800/80">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            Li e aceito os termos de uso e política de privacidade.
          </label>
          <Button type="submit" className="w-full">
            Continuar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-brand-700 hover:underline">
            Já tenho conta
          </Link>
        </p>
      </Card>
    </div>
  );
}
