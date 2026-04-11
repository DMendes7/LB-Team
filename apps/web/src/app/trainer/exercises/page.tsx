"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { api, apiForm } from "@/lib/api";
import { getExerciseVideoSourceInfo } from "@/lib/exercise-video-source";
import { notify } from "@/lib/notify";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExerciseVideoPanel } from "@/components/ExerciseVideoPanel";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

type FitnessLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

type ExerciseRow = {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  level: FitnessLevel;
  type: string;
  description: string | null;
  instructions: string | null;
  videoUrl: string | null;
  videoFileKey: string | null;
  videoOriginalName: string | null;
  imageUrl: string | null;
  equipment: string | null;
  contraindications: string | null;
  tags: string | null;
  technicalNotes: string | null;
};

const emptyForm = {
  name: "",
  category: "Geral",
  muscleGroup: "",
  level: "BEGINNER" as FitnessLevel,
  type: "Força",
  description: "",
  instructions: "",
  videoUrl: "",
  imageUrl: "",
  equipment: "",
  contraindications: "",
  tags: "",
  technicalNotes: "",
};

const ICON_STROKE = 2;

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

export default function TrainerExercisesPage() {
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  /** `null` = criar novo; string = id do exercício em edição */
  const [formModalExerciseId, setFormModalExerciseId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formModalError, setFormModalError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ExerciseRow[]>("/trainer/exercises")
      .then(setRows)
      .catch((e) => {
        notify.apiError(e);
        setRows([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreateModal() {
    setFormModalError("");
    setForm(emptyForm);
    setFormModalExerciseId(null);
    setFormModalOpen(true);
  }

  function openEditModal(e: ExerciseRow) {
    setFormModalError("");
    setFormModalExerciseId(e.id);
    setForm({
      name: e.name,
      category: e.category,
      muscleGroup: e.muscleGroup,
      level: e.level,
      type: e.type,
      description: e.description ?? "",
      instructions: e.instructions ?? "",
      videoUrl: e.videoUrl ?? "",
      imageUrl: e.imageUrl ?? "",
      equipment: e.equipment ?? "",
      contraindications: e.contraindications ?? "",
      tags: e.tags ?? "",
      technicalNotes: e.technicalNotes ?? "",
    });
    setFormModalOpen(true);
  }

  function closeFormModal() {
    setFormModalOpen(false);
    setFormModalError("");
    setFormModalExerciseId(null);
  }

  async function save() {
    setFormModalError("");
    const body = {
      name: form.name.trim(),
      category: form.category.trim(),
      muscleGroup: form.muscleGroup.trim(),
      level: form.level,
      type: form.type.trim(),
      description: form.description.trim() || undefined,
      instructions: form.instructions.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      equipment: form.equipment.trim() || undefined,
      contraindications: form.contraindications.trim() || undefined,
      tags: form.tags.trim() || undefined,
      technicalNotes: form.technicalNotes.trim() || undefined,
    };
    if (!body.name || !body.muscleGroup) {
      const msg = "Nome e grupo muscular são obrigatórios.";
      notify.warning(msg);
      setFormModalError(msg);
      return;
    }
    setFormSaving(true);
    try {
      if (formModalExerciseId === null) {
        await api("/trainer/exercises", { method: "POST", body: JSON.stringify(body) });
        notify.success("Exercício criado.");
      } else {
        await api(`/trainer/exercises/${formModalExerciseId}`, { method: "PATCH", body: JSON.stringify(body) });
        notify.success("Exercício atualizado.");
      }
      closeFormModal();
      load();
    } catch (e) {
      notify.apiError(e);
      setFormModalError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setFormSaving(false);
    }
  }

  async function executeDeleteExercise() {
    const id = confirmDeleteId;
    if (!id) return;
    try {
      await api(`/trainer/exercises/${id}`, { method: "DELETE" });
      if (formModalExerciseId === id) closeFormModal();
      setConfirmDeleteId(null);
      notify.success("Exercício excluído.");
      load();
    } catch (e) {
      notify.apiError(e);
    }
  }

  async function onVideoFile(id: string, file: File | null) {
    if (!file) return;
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiForm(`/trainer/exercises/${id}/video`, fd);
      notify.success("Vídeo enviado.");
      load();
    } catch (e) {
      notify.apiError(e);
    } finally {
      setUploadingId(null);
    }
  }

  async function clearUploadedVideo(id: string) {
    try {
      await api(`/trainer/exercises/${id}/video`, { method: "DELETE" });
      notify.success("Arquivo de vídeo removido.");
      load();
    } catch (e) {
      notify.apiError(e);
    }
  }

  async function clearVideoLink(id: string) {
    try {
      await api(`/trainer/exercises/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ videoUrl: null }),
      });
      notify.success("Link do vídeo removido.");
      load();
    } catch (e) {
      notify.apiError(e);
    }
  }

  return (
    <AppShell role="TRAINER" title="Banco de exercícios">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-800/75">
          Cadastre exercícios com vídeo por <strong>link</strong> (YouTube, Vimeo, URL direta) ou envie um arquivo{" "}
          <strong>MP4 / MOV / WebM</strong>. Use a pré-visualização ao lado para conferir o que a aluna vê no treino.
        </p>
        <Button type="button" className="shrink-0" onClick={openCreateModal}>
          Novo exercício
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-800/70">
          Nenhum exercício ainda. Clique em <strong>Novo exercício</strong> para cadastrar o primeiro.
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((e) => {
            const src = getExerciseVideoSourceInfo(e.videoUrl, e.videoFileKey, e.videoOriginalName);
            const hasVideo = !!(e.videoFileKey || e.videoUrl?.trim());
            const fileInputId = `exercise-video-file-${e.id}`;
            return (
              <li key={e.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-ink-900">{e.name}</p>
                      <p className="mt-0.5 text-xs text-ink-800/65">
                        {e.muscleGroup} · {e.category}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="shrink-0" onClick={() => openEditModal(e)}>
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" className="shrink-0" onClick={() => setConfirmDeleteId(e.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-brand-100 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">Vídeo</p>
                    <div
                      className={`mt-2 flex flex-col gap-4 ${hasVideo ? "sm:flex-row sm:items-start sm:gap-5" : ""}`}
                    >
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2.5">
                          {src ? (
                            <>
                              <p className="text-sm font-medium text-ink-900">{src.label}</p>
                              {src.detail && (
                                <p className="mt-0.5 break-all font-mono text-xs text-ink-800/80" title={src.detail}>
                                  {src.detail}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-ink-800/65">
                              Sem vídeo. Use <strong>Editar</strong> para colocar um link ou envie um arquivo abaixo.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                        <input
                          id={fileInputId}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                          className="sr-only"
                          disabled={uploadingId === e.id}
                          onChange={(ev) => {
                            onVideoFile(e.id, ev.target.files?.[0] ?? null);
                            ev.target.value = "";
                          }}
                        />
                        <label
                          htmlFor={fileInputId}
                          className={clsx(
                            "inline-flex min-h-[2.5rem] flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 sm:flex-none",
                            uploadingId === e.id
                              ? "cursor-not-allowed border-brand-200 bg-brand-50/50 text-ink-800/50"
                              : "border-brand-300 text-brand-800 hover:bg-brand-50",
                          )}
                        >
                          {uploadingId === e.id ? "Enviando…" : e.videoFileKey ? "Trocar arquivo" : "Enviar arquivo"}
                        </label>
                        {e.videoFileKey && (
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 text-ink-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            aria-label="Remover vídeo em arquivo"
                            disabled={uploadingId === e.id}
                            onClick={() => void clearUploadedVideo(e.id)}
                          >
                            <IconTrash className="h-5 w-5" />
                          </button>
                        )}
                        {e.videoUrl?.trim() && !e.videoFileKey && (
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 text-ink-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            aria-label="Remover link do vídeo"
                            onClick={() => void clearVideoLink(e.id)}
                          >
                            <IconTrash className="h-5 w-5" />
                          </button>
                        )}
                        </div>
                      </div>
                      {hasVideo && (
                        <div className="flex shrink-0 flex-col items-center self-center sm:self-start">
                          <p className="mb-2 hidden text-center text-[10px] font-medium uppercase tracking-wide text-brand-800 sm:block">
                            Pré-visualização
                          </p>
                          <ExerciseVideoPanel
                            compact
                            title={e.name}
                            videoUrl={e.videoUrl}
                            videoFileKey={e.videoFileKey}
                            videoOriginalName={e.videoOriginalName}
                            posterUrl={e.imageUrl}
                          />
                          <p className="mt-2 max-w-[6.5rem] text-center text-[10px] text-ink-800/60 sm:hidden">
                            Toque para ver em tela cheia
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {formModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercise-form-title"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeFormModal();
          }}
        >
          <Card className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl p-5 shadow-xl">
            <h2 id="exercise-form-title" className="font-display text-lg font-bold text-ink-900">
              {formModalExerciseId === null ? "Novo exercício" : "Editar exercício"}
            </h2>
            <p className="mt-1 text-sm text-ink-800/75">
              {formModalExerciseId === null
                ? "Preencha os dados. Você pode enviar o vídeo em arquivo depois, na lista."
                : "Ajuste os campos. Vídeo em arquivo é gerenciado na lista do exercício."}
            </p>
            {formModalError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {formModalError}
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-ink-800/70">Nome</span>
                <input
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(ev) => {
                    setForm((f) => ({ ...f, name: ev.target.value }));
                    if (formModalError) setFormModalError("");
                  }}
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-800/70">Grupo muscular</span>
                <input
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={form.muscleGroup}
                  onChange={(ev) => setForm((f) => ({ ...f, muscleGroup: ev.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-800/70">Categoria</span>
                <input
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(ev) => setForm((f) => ({ ...f, category: ev.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-800/70">Tipo</span>
                <input
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(ev) => setForm((f) => ({ ...f, type: ev.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-800/70">Nível</span>
                <select
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  value={form.level}
                  onChange={(ev) => setForm((f) => ({ ...f, level: ev.target.value as FitnessLevel }))}
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-ink-800/70">URL do vídeo (opcional)</span>
                <input
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  placeholder="https://..."
                  value={form.videoUrl}
                  onChange={(ev) => setForm((f) => ({ ...f, videoUrl: ev.target.value }))}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-ink-800/70">Descrição</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(ev) => setForm((f) => ({ ...f, description: ev.target.value }))}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-ink-800/70">Instruções de execução</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                  rows={3}
                  value={form.instructions}
                  onChange={(ev) => setForm((f) => ({ ...f, instructions: ev.target.value }))}
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={formSaving} onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button type="button" disabled={formSaving} onClick={() => void save()}>
                {formSaving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Excluir exercício"
        description="Esta ação não pode ser desfeita. O exercício deixa de aparecer nas fichas; vídeos em arquivo serão removidos do servidor."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={executeDeleteExercise}
      />
    </AppShell>
  );
}
