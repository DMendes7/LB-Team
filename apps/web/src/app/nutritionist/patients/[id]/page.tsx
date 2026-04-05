"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type PatientUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  studentProfile: { fitnessLevel: string | null } | null;
};

type DetailRes = {
  student: PatientUser;
  insights: {
    dietAssignment: {
      kind: "override" | "group" | "none";
      template: { id: string; title: string } | null;
      groupName: string | null;
    };
  };
};

type TemplateOpt = { id: string; title: string };
type GroupOpt = { id: string; name: string };

export default function NutritionistPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailRes | null>(null);
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [pickTemplate, setPickTemplate] = useState("");
  const [pickGroup, setPickGroup] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api<DetailRes>(`/nutritionist/patients/${id}`).then(setData).catch(() => setData(null));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<TemplateOpt[]>("/nutritionist/templates").then((t) => setTemplates(t.map((x) => ({ id: x.id, title: x.title }))));
    api<GroupOpt[]>("/nutritionist/groups").then((g) => setGroups(g.map((x) => ({ id: x.id, name: x.name }))));
  }, []);

  async function assignOverride() {
    if (!id || !pickTemplate) return;
    setMsg(null);
    try {
      await api(`/nutritionist/patients/${id}/override`, {
        method: "POST",
        body: JSON.stringify({ templateId: pickTemplate }),
      });
      setMsg("Plano nutricional individual aplicado.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  async function clearOverride() {
    if (!id) return;
    setMsg(null);
    try {
      await api(`/nutritionist/patients/${id}/nutrition-override`, { method: "DELETE" });
      setMsg("Plano individual removido.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  async function addToGroup() {
    if (!id || !pickGroup) return;
    setMsg(null);
    try {
      await api(`/nutritionist/groups/${pickGroup}/members`, {
        method: "POST",
        body: JSON.stringify({ studentIds: [id] }),
      });
      setMsg("Paciente incluído no grupo.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  async function sendNote() {
    if (!id || !note.trim()) return;
    setMsg(null);
    try {
      await api(`/nutritionist/patients/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ text: note.trim() }),
      });
      setNote("");
      setMsg("Observação registrada.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  }

  const s = data?.student;
  const da = data?.insights.dietAssignment;

  return (
    <AppShell role="NUTRITIONIST" title={s?.name ?? "Paciente"}>
      {msg && <p className="mb-3 text-sm text-brand-800">{msg}</p>}
      {!data && <p className="text-sm text-ink-800/75">Carregando…</p>}
      {s && (
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink-900">Dados</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-800/60">E-mail</dt>
                <dd>{s.email}</dd>
              </div>
              <div>
                <dt className="text-ink-800/60">Telefone</dt>
                <dd>{s.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-800/60">Nível (cadastro)</dt>
                <dd>{s.studentProfile?.fitnessLevel ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-ink-900">Dieta atual</h2>
            <p className="mt-2 text-sm text-ink-800/85">
              {da?.kind === "none" && "Nenhum plano nutricional vinculado."}
              {da?.kind === "override" && (
                <>
                  <strong>Plano individual:</strong> {da.template?.title}
                </>
              )}
              {da?.kind === "group" && (
                <>
                  <strong>Grupo:</strong> {da.groupName} · {da.template?.title}
                </>
              )}
            </p>
            <div className="mt-4 flex flex-col gap-3 border-t border-brand-100 pt-4 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="text-sm">
                <span className="text-ink-800/70">Plano individual</span>
                <select
                  className="mt-1 block w-full min-w-[200px] rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={pickTemplate}
                  onChange={(e) => setPickTemplate(e.target.value)}
                >
                  <option value="">Escolha um plano…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="button" onClick={assignOverride}>
                Aplicar
              </Button>
              <Button type="button" variant="outline" onClick={clearOverride}>
                Remover individual
              </Button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm">
                <span className="text-ink-800/70">Grupo nutricional</span>
                <select
                  className="mt-1 block w-full min-w-[200px] rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={pickGroup}
                  onChange={(e) => setPickGroup(e.target.value)}
                >
                  <option value="">Escolha um grupo…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="button" variant="outline" onClick={addToGroup}>
                Incluir no grupo
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-800/60">
              Apenas a nutricionista altera dieta; o treino é responsabilidade da personal.
            </p>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-ink-900">Observação</h2>
            <textarea
              className="mt-2 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anotação interna…"
            />
            <Button type="button" className="mt-2" onClick={sendNote}>
              Salvar observação
            </Button>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
