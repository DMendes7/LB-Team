"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Card } from "@/components/ui";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  template: { id: string; name: string };
  _count: { members: number };
};

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  template: { id: string; name: string };
  members: {
    studentId: string;
    joinedAt: string;
    student: { id: string; name: string; email: string };
  }[];
  _count: { members: number };
};

type TemplateOpt = { id: string; name: string };

type StudentLink = { student: { id: string; name: string; email: string } };

/** Espessura única para ícones da lista (pessoa + lixeira) ficarem com o mesmo peso visual. */
const ICON_STROKE = 2;

function IconPerson({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={ICON_STROKE} />
      <path
        d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
        stroke="currentColor"
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 7h16" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" />
      <path
        d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"
        stroke="currentColor"
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"
        stroke="currentColor"
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" />
    </svg>
  );
}

export default function TrainerGroupsPage() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createTemplateId, setCreateTemplateId] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTemplateId, setEditTemplateId] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pickAddStudent, setPickAddStudent] = useState("");
  const [addMemberSaving, setAddMemberSaving] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);

  const load = useCallback(() => {
    api<GroupRow[]>("/trainer/workout-groups").then(setRows).catch(() => setRows([]));
  }, []);

  useEffect(() => {
    load();
    api<TemplateOpt[]>("/trainer/workout-templates").then((t) =>
      setTemplates(t.map((x) => ({ id: x.id, name: x.name }))),
    );
    api<StudentLink[]>("/trainer/students").then(setStudents).catch(() => setStudents([]));
  }, [load]);

  useEffect(() => {
    if (!createOpen || templates.length === 0) return;
    setCreateTemplateId((prev) => (prev && templates.some((t) => t.id === prev) ? prev : templates[0].id));
  }, [createOpen, templates]);

  const refreshDetail = useCallback(async (groupId: string) => {
    try {
      const d = await api<GroupDetail>(`/trainer/workout-groups/${groupId}`);
      setDetail(d);
      setEditName(d.name);
      setEditDescription(d.description ?? "");
      setEditTemplateId(d.templateId);
    } catch {
      setDetailFeedback({ kind: "err", text: "Não foi possível recarregar o grupo." });
    }
  }, []);

  const openDetail = useCallback(
    (groupId: string) => {
      setDetailGroupId(groupId);
      setDetail(null);
      setDetailLoading(true);
      setDetailFeedback(null);
      setPickAddStudent("");
      api<GroupDetail>(`/trainer/workout-groups/${groupId}`)
        .then((d) => {
          setDetail(d);
          setEditName(d.name);
          setEditDescription(d.description ?? "");
          setEditTemplateId(d.templateId);
        })
        .catch(() => {
          setDetail(null);
          setDetailFeedback({ kind: "err", text: "Grupo não encontrado ou sem permissão." });
        })
        .finally(() => setDetailLoading(false));
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setDetailGroupId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailFeedback(null);
    setPickAddStudent("");
    setDeleteGroupOpen(false);
  }, []);

  const memberIds = useMemo(() => new Set(detail?.members.map((m) => m.studentId) ?? []), [detail]);

  const studentsNotInGroup = useMemo(
    () => students.filter((r) => !memberIds.has(r.student.id)),
    [students, memberIds],
  );

  function openCreateModal() {
    setMsg(null);
    setCreateError("");
    setCreateName("");
    setCreateDescription("");
    setCreateTemplateId(templates[0]?.id ?? "");
    setCreateOpen(true);
  }

  async function submitCreate() {
    setCreateError("");
    if (!createName.trim() || !createTemplateId) {
      setCreateError("Nome e modelo de treino são obrigatórios.");
      return;
    }
    setCreateSaving(true);
    try {
      await api("/trainer/workout-groups", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          templateId: createTemplateId,
        }),
      });
      setCreateOpen(false);
      load();
      setMsg("Grupo criado.");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar grupo");
    } finally {
      setCreateSaving(false);
    }
  }

  async function saveGroupInfo() {
    if (!detailGroupId) return;
    setDetailFeedback(null);
    if (!editName.trim()) {
      setDetailFeedback({ kind: "err", text: "O nome do grupo não pode ser vazio." });
      return;
    }
    setDetailSaving(true);
    try {
      await api(`/trainer/workout-groups/${detailGroupId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() === "" ? null : editDescription.trim(),
          templateId: editTemplateId,
        }),
      });
      await refreshDetail(detailGroupId);
      load();
      setDetailFeedback({ kind: "ok", text: "Alterações salvas." });
    } catch (e) {
      setDetailFeedback({ kind: "err", text: e instanceof Error ? e.message : "Erro ao salvar." });
    } finally {
      setDetailSaving(false);
    }
  }

  async function addMember() {
    if (!detailGroupId || !pickAddStudent) return;
    setDetailFeedback(null);
    setAddMemberSaving(true);
    try {
      await api(`/trainer/workout-groups/${detailGroupId}/members`, {
        method: "POST",
        body: JSON.stringify({ studentIds: [pickAddStudent] }),
      });
      setPickAddStudent("");
      await refreshDetail(detailGroupId);
      load();
      setDetailFeedback({ kind: "ok", text: "Aluna adicionada ao grupo." });
    } catch (e) {
      setDetailFeedback({ kind: "err", text: e instanceof Error ? e.message : "Erro ao adicionar aluna." });
    } finally {
      setAddMemberSaving(false);
    }
  }

  async function executeRemoveMember() {
    if (!detailGroupId || !memberToRemove) return;
    setDetailFeedback(null);
    try {
      await api(`/trainer/workout-groups/${detailGroupId}/members/${memberToRemove.id}`, { method: "DELETE" });
      setMemberToRemove(null);
      await refreshDetail(detailGroupId);
      load();
      setDetailFeedback({ kind: "ok", text: "Aluna removida do grupo." });
    } catch (e) {
      setDetailFeedback({ kind: "err", text: e instanceof Error ? e.message : "Erro ao remover." });
    }
  }

  async function executeDeleteGroup() {
    if (!detailGroupId) return;
    setDetailFeedback(null);
    try {
      await api(`/trainer/workout-groups/${detailGroupId}`, { method: "DELETE" });
      closeDetail();
      load();
      setMsg("Grupo excluído.");
    } catch (e) {
      setDetailFeedback({ kind: "err", text: e instanceof Error ? e.message : "Erro ao excluir grupo." });
    }
  }

  const editorHref = detail ? `/trainer/workouts?t=${encodeURIComponent(detail.templateId)}` : "#";

  return (
    <AppShell role="TRAINER" title="Grupos de treino">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-800/75">
          Cada grupo usa um <strong>modelo de treino</strong> compartilhado. Inclua ou remova alunas por aqui; também é
          possível incluir pelo perfil da aluna.
        </p>
        <Button type="button" className="shrink-0" onClick={openCreateModal}>
          Novo grupo
        </Button>
      </div>
      {msg && <p className="mb-3 text-sm text-brand-800">{msg}</p>}

      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-800/70">
          Nenhum grupo ainda. Clique em <strong>Novo grupo</strong> para criar o primeiro.
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((g) => (
            <li key={g.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink-900">{g.name}</p>
                  {g.description && <p className="mt-1 text-sm text-ink-800/70">{g.description}</p>}
                  <p className="mt-2 text-xs text-ink-800/65">
                    Modelo: <strong>{g.template?.name}</strong> · {g._count.members}{" "}
                    {g._count.members === 1 ? "aluna" : "alunas"}
                  </p>
                </div>
                <Button type="button" variant="outline" className="shrink-0" onClick={() => openDetail(g.id)}>
                  Abrir grupo
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setCreateOpen(false);
              setCreateError("");
            }
          }}
        >
          <Card className="w-full max-w-md rounded-2xl p-5 shadow-xl">
            <h2 id="create-group-title" className="font-display text-lg font-bold text-ink-900">
              Novo grupo
            </h2>
            <p className="mt-1 text-sm text-ink-800/75">Defina nome, descrição opcional e o modelo de treino do grupo.</p>
            {createError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {createError}
              </p>
            )}
            <label className="mt-4 block text-sm">
              <span className="text-ink-800/70">Nome</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value);
                  if (createError) setCreateError("");
                }}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-ink-800/70">Descrição (opcional)</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-ink-800/70">Modelo de treino</span>
              <select
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={createTemplateId}
                onChange={(e) => setCreateTemplateId(e.target.value)}
                disabled={!templates.length}
              >
                {templates.length === 0 ? (
                  <option value="">Crie um modelo na aba Treinos</option>
                ) : (
                  templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={createSaving}
                onClick={() => {
                  setCreateOpen(false);
                  setCreateError("");
                }}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={createSaving || !templates.length} onClick={() => void submitCreate()}>
                {createSaving ? "Criando…" : "Criar grupo"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {detailGroupId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-group-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <Card className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl p-5 shadow-xl sm:max-w-xl">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-brand-100 pb-3">
              <h2 id="detail-group-title" className="font-display text-lg font-bold text-ink-900">
                Grupo de treino
              </h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-ink-800/70 hover:bg-brand-50 hover:text-ink-900"
                onClick={closeDetail}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              {detailLoading && <p className="text-sm text-ink-800/70">Carregando…</p>}
              {!detailLoading && !detail && detailFeedback?.kind === "err" && (
                <p className="text-sm text-red-700">{detailFeedback.text}</p>
              )}
              {!detailLoading && detail && (
                <>
                  {detailFeedback && (
                    <p
                      className={`mb-3 rounded-lg px-3 py-2 text-sm ${
                        detailFeedback.kind === "err"
                          ? "border border-red-200 bg-red-50 text-red-800"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      }`}
                      role="status"
                    >
                      {detailFeedback.text}
                    </p>
                  )}

                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-800">Informações</h3>
                    <label className="block text-sm">
                      <span className="text-ink-800/70">Nome</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-800/70">Descrição (opcional)</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-800/70">Modelo de treino</span>
                      <select
                        className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                        value={editTemplateId}
                        onChange={(e) => setEditTemplateId(e.target.value)}
                        disabled={!templates.length}
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button type="button" disabled={detailSaving} onClick={() => void saveGroupInfo()}>
                        {detailSaving ? "Salvando…" : "Salvar alterações"}
                      </Button>
                      <Link
                        href={editorHref}
                        className="inline-flex items-center justify-center rounded-xl border border-brand-200 px-4 py-2 text-center text-sm font-semibold text-brand-800 hover:bg-brand-50"
                      >
                        Editar ficha no editor
                      </Link>
                    </div>
                  </section>

                  <section className="mt-6 border-t border-brand-100 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-800">Alunas no grupo</h3>
                    <p className="mt-1 text-xs text-ink-800/60">{detail._count.members} no total</p>
                    {detail.members.length === 0 ? (
                      <p className="mt-3 text-sm text-ink-800/65">Nenhuma aluna neste grupo.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {detail.members.map((m) => (
                          <li
                            key={m.studentId}
                            className="flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-ink-900">{m.student.name}</p>
                              <p className="truncate text-xs text-ink-800/65">{m.student.email}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Link
                                href={`/trainer/students/${m.student.id}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-700 transition-colors hover:bg-brand-100"
                                title="Ver perfil"
                                aria-label={`Perfil de ${m.student.name}`}
                              >
                                <IconPerson className="h-6 w-6 shrink-0" />
                              </Link>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 w-10 shrink-0 p-0 text-red-700 hover:bg-red-50"
                                title="Remover do grupo"
                                aria-label={`Remover ${m.student.name} do grupo`}
                                onClick={() => setMemberToRemove({ id: m.studentId, name: m.student.name })}
                              >
                                <IconTrash className="h-6 w-6 shrink-0" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {studentsNotInGroup.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <label className="block flex-1 text-sm">
                          <span className="text-ink-800/70">Adicionar aluna</span>
                          <select
                            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                            value={pickAddStudent}
                            onChange={(e) => setPickAddStudent(e.target.value)}
                          >
                            <option value="">Escolha uma aluna…</option>
                            {studentsNotInGroup.map((r) => (
                              <option key={r.student.id} value={r.student.id}>
                                {r.student.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!pickAddStudent || addMemberSaving}
                          onClick={() => void addMember()}
                        >
                          {addMemberSaving ? "…" : "Adicionar"}
                        </Button>
                      </div>
                    )}
                    {studentsNotInGroup.length === 0 && students.length > 0 && detail.members.length > 0 && (
                      <p className="mt-3 text-xs text-ink-800/60">Todas as suas alunas já estão neste grupo.</p>
                    )}
                    {students.length === 0 && (
                      <p className="mt-3 text-xs text-ink-800/60">
                        Você ainda não tem alunas vinculadas. Vincule alunas para poder adicioná-las aos grupos.
                      </p>
                    )}
                  </section>

                  <section className="mt-6 border-t border-red-100 pt-4">
                    <Button type="button" variant="outline" className="border-red-200 text-red-800 hover:bg-red-50" onClick={() => setDeleteGroupOpen(true)}>
                      Excluir grupo
                    </Button>
                    <p className="mt-2 text-xs text-ink-800/55">
                      As alunas saem do grupo e o grupo some da lista. O modelo de treino continua na aba Treinos.
                    </p>
                  </section>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!memberToRemove}
        title="Remover aluna do grupo"
        description={
          memberToRemove
            ? `${memberToRemove.name} deixa de fazer parte deste grupo. A ficha dela no app segue as regras do perfil (outros grupos ou treinos vinculados).`
            : ""
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setMemberToRemove(null)}
        onConfirm={() => void executeRemoveMember()}
      />

      <ConfirmDialog
        open={deleteGroupOpen && !!detail}
        title="Excluir grupo de treino"
        description={
          detail
            ? `O grupo “${detail.name}” será apagado. As alunas serão removidas do grupo; modelos de treino não são excluídos.`
            : ""
        }
        confirmLabel="Excluir grupo"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setDeleteGroupOpen(false)}
        onConfirm={() => void executeDeleteGroup()}
      />
    </AppShell>
  );
}
