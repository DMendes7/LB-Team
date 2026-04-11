"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type Me = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  role: string;
  createdAt: string;
  profile: {
    weightKg: number | null;
    heightCm: number | null;
    termsAcceptedAt: string | null;
  } | null;
  studentProfile: {
    goal: string | null;
    fitnessLevel: string | null;
    weeklyTarget: string | null;
    limitationsNotes: string | null;
    onboardingCompleted: boolean;
    physicalLimitations: { id: string; category: string; description: string }[];
    onboardingAnswers: { key: string; value: string }[];
  } | null;
};

const GOAL_PT: Record<string, string> = {
  WEIGHT_LOSS: "Emagrecimento",
  HYPERTROPHY: "Hipertrofia",
};

const LEVEL_PT: Record<string, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

const WEEKLY_PT: Record<string, string> = {
  TWO: "2x na semana",
  THREE: "3x na semana",
  FOUR: "4x na semana",
  FIVE: "5x na semana",
  SIX: "6x na semana",
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await api<Me>("/auth/me");
      setMe(u);
      setName(u.name ?? "");
      setPhone(u.phone ?? "");
      setBirthDate(toDateInput(u.birthDate));
      setWeightKg(u.profile?.weightKg != null ? String(u.profile.weightKg) : "");
      setHeightCm(u.profile?.heightCm != null ? String(u.profile.heightCm) : "");
    } catch (e) {
      notify.apiError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const w = weightKg.trim() === "" ? undefined : Number(weightKg.replace(",", "."));
      const h = heightCm.trim() === "" ? undefined : Number(heightCm.replace(",", "."));
      if (w !== undefined && !Number.isNaN(w) && (w < 30 || w > 300)) {
        notify.warning("Peso deve estar entre 30 e 300 kg.");
        setSaving(false);
        return;
      }
      if (h !== undefined && !Number.isNaN(h) && (h < 100 || h > 250)) {
        notify.warning("Altura deve estar entre 100 e 250 cm.");
        setSaving(false);
        return;
      }
      const body: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim() || undefined,
      };
      if (birthDate.trim()) body.birthDate = birthDate.trim();
      if (w !== undefined && !Number.isNaN(w)) body.weightKg = w;
      if (h !== undefined && !Number.isNaN(h)) body.heightCm = h;

      const updated = await api<Me>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setMe(updated);
      notify.success("Dados salvos.");
    } catch (err) {
      notify.apiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      notify.warning("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.warning("A confirmação da nova senha não confere.");
      return;
    }
    setPwLoading(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify.success("Senha atualizada.");
    } catch (err) {
      notify.apiError(err);
    } finally {
      setPwLoading(false);
    }
  }

  if (loading || !me) {
    return (
      <AppShell role="STUDENT" title="Perfil">
        <p className="text-sm text-ink-800/75">Carregando…</p>
      </AppShell>
    );
  }

  const sp = me.studentProfile;
  const isStudent = me.role === "STUDENT";

  return (
    <AppShell role="STUDENT" title="Perfil">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Conta</p>
          <p className="mt-1 text-sm text-ink-800/70">E-mail de login não pode ser alterado aqui.</p>
          <div className="mt-4 space-y-1 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-sm">
            <p>
              <span className="text-ink-800/60">E-mail</span>{" "}
              <span className="font-medium text-ink-900">{me.email}</span>
            </p>
            <p className="text-xs text-ink-800/55">
              Conta criada em{" "}
              {new Date(me.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </Card>

        <Card>
          <form onSubmit={saveProfile} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Seus dados</p>
          <label className="block text-sm">
            <span className="text-ink-800/75">Nome</span>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-800/75">Telefone</span>
            <input
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Opcional"
              autoComplete="tel"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-800/75">Data de nascimento</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-800/75">Peso (kg)</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm tabular-nums"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Ex.: 65,5"
                inputMode="decimal"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-800/75">Altura (cm)</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm tabular-nums"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Ex.: 168"
                inputMode="numeric"
              />
            </label>
          </div>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={savePassword} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Segurança</p>
          <p className="text-sm text-ink-800/70">Redefina sua senha informando a senha atual.</p>
          <label className="block text-sm">
            <span className="text-ink-800/75">Senha atual</span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-800/75">Nova senha</span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-800/75">Confirmar nova senha</span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <Button type="submit" variant="outline" disabled={pwLoading || !currentPassword || !newPassword}>
            {pwLoading ? "Atualizando…" : "Atualizar senha"}
          </Button>
          </form>
        </Card>

        {isStudent && !sp && (
          <Card>
            <p className="text-sm text-ink-800/80">
              Ainda não há registro de onboarding nesta conta. Quando você completar o questionário inicial no app, as
              informações aparecerão aqui.
            </p>
          </Card>
        )}

        {isStudent && sp && (
          <Card className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Preferências (onboarding)</p>
            <p className="text-sm text-ink-800/70">
              Informações que você definiu no cadastro. Para alterar, fale com sua personal ou refaça o onboarding quando
              disponível.
            </p>
            <dl className="grid gap-3 text-sm">
              {sp.goal && (
                <div className="flex justify-between gap-4 rounded-lg border border-brand-100 bg-white/80 px-3 py-2">
                  <dt className="text-ink-800/65">Objetivo</dt>
                  <dd className="font-medium text-ink-900">{GOAL_PT[sp.goal] ?? sp.goal}</dd>
                </div>
              )}
              {sp.fitnessLevel && (
                <div className="flex justify-between gap-4 rounded-lg border border-brand-100 bg-white/80 px-3 py-2">
                  <dt className="text-ink-800/65">Nível</dt>
                  <dd className="font-medium text-ink-900">{LEVEL_PT[sp.fitnessLevel] ?? sp.fitnessLevel}</dd>
                </div>
              )}
              {sp.weeklyTarget && (
                <div className="flex justify-between gap-4 rounded-lg border border-brand-100 bg-white/80 px-3 py-2">
                  <dt className="text-ink-800/65">Frequência desejada</dt>
                  <dd className="font-medium text-ink-900">{WEEKLY_PT[sp.weeklyTarget] ?? sp.weeklyTarget}</dd>
                </div>
              )}
              {sp.limitationsNotes?.trim() && (
                <div className="rounded-lg border border-brand-100 bg-white/80 px-3 py-2">
                  <dt className="text-ink-800/65">Observações</dt>
                  <dd className="mt-1 text-ink-900">{sp.limitationsNotes}</dd>
                </div>
              )}
              <p className="text-xs text-ink-800/50">
                Onboarding {sp.onboardingCompleted ? "concluído" : "em andamento"}.
              </p>
            </dl>
            {sp.physicalLimitations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-800/80">Limitações informadas</p>
                <ul className="mt-2 space-y-2">
                  {sp.physicalLimitations.map((l) => (
                    <li key={l.id} className="rounded-lg border border-amber-100/80 bg-amber-50/40 px-3 py-2 text-sm">
                      <span className="font-medium text-ink-900">{l.category}</span>
                      <p className="mt-1 text-ink-800/80">{l.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sp.onboardingAnswers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-800/80">Respostas</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {sp.onboardingAnswers.map((a) => (
                    <li key={a.key} className="rounded-lg border border-brand-100 px-3 py-2">
                      <span className="text-xs uppercase tracking-wide text-ink-800/50">{a.key}</span>
                      <p className="mt-1 text-ink-900">{a.value}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
