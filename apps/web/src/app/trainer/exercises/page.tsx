"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiForm } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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

export default function TrainerExercisesPage() {
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
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

  function startCreate() {
    setEditingId("new");
    setForm(emptyForm);
  }

  function startEdit(e: ExerciseRow) {
    setEditingId(e.id);
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
  }

  async function save() {
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
      notify.warning("Nome e grupo muscular são obrigatórios.");
      return;
    }
    try {
      if (editingId === "new") {
        await api("/trainer/exercises", { method: "POST", body: JSON.stringify(body) });
        notify.success("Exercício criado.");
      } else if (editingId) {
        await api(`/trainer/exercises/${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
        notify.success("Exercício atualizado.");
      }
      setEditingId(null);
      load();
    } catch (e) {
      notify.apiError(e);
    }
  }

  async function executeDeleteExercise() {
    const id = confirmDeleteId;
    if (!id) return;
    try {
      await api(`/trainer/exercises/${id}`, { method: "DELETE" });
      if (editingId === id) setEditingId(null);
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
      notify.success("Vídeo removido.");
      load();
    } catch (e) {
      notify.apiError(e);
    }
  }

  return (
    <AppShell role="TRAINER" title="Banco de exercícios">
      <p className="mb-4 text-sm text-ink-800/75">
        Cadastre exercícios com vídeo por <strong>link</strong> (YouTube, Vimeo, URL direta) ou envie um arquivo{" "}
        <strong>MP4 / MOV / WebM</strong>. As alunas veem o vídeo na tela do treino.
      </p>
      <div className="mb-6">
        <Button type="button" onClick={startCreate}>
          Novo exercício
        </Button>
      </div>

      {(editingId === "new" || (editingId && editingId !== "new")) && (
        <Card className="mb-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {editingId === "new" ? "Novo exercício" : "Editar exercício"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-ink-800/70">Nome</span>
              <input
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(ev) => setForm((f) => ({ ...f, name: ev.target.value }))}
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
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={save}>
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {rows.map((e) => (
        <Card key={e.id} className="mb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-ink-900">{e.name}</p>
              <p className="text-xs text-ink-800/65">
                {e.muscleGroup} · {e.category}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => startEdit(e)}>
                Editar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmDeleteId(e.id)}>
                Excluir
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-brand-100 pt-3 text-sm">
            <label className="flex flex-wrap items-center gap-2">
              <span className="text-ink-800/70">Enviar vídeo (arquivo):</span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                disabled={uploadingId === e.id}
                onChange={(ev) => onVideoFile(e.id, ev.target.files?.[0] ?? null)}
              />
            </label>
            {(e.videoUrl || e.videoFileKey) && (
              <p className="text-xs text-ink-800/80">
                {e.videoFileKey ? "Vídeo em arquivo no servidor." : "Vídeo por link."}{" "}
                {e.videoFileKey && (
                  <button
                    type="button"
                    className="text-brand-700 underline"
                    onClick={() => clearUploadedVideo(e.id)}
                  >
                    Remover arquivo
                  </button>
                )}
              </p>
            )}
          </div>
        </Card>
      ))}
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
