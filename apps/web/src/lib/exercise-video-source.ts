/** Rótulos para personal e aluna saberem se o vídeo é arquivo, YouTube, link direto, etc. */

export type ExerciseVideoSourceInfo = {
  kind: "file" | "youtube" | "vimeo" | "direct";
  /** Linha principal (tipo de origem). */
  label: string;
  /** Nome do arquivo, host, URL curta… */
  detail: string | null;
};

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function getExerciseVideoSourceInfo(
  videoUrl: string | null | undefined,
  videoFileKey: string | null | undefined,
  videoOriginalName: string | null | undefined,
): ExerciseVideoSourceInfo | null {
  if (videoFileKey) {
    const stored = videoOriginalName?.trim() || videoFileKey.split("/").pop() || "vídeo";
    const ext = stored.match(/\.([^.]+)$/i)?.[1]?.toUpperCase();
    return {
      kind: "file",
      label: ext ? `Arquivo · .${ext}` : "Arquivo enviado",
      detail: stored,
    };
  }
  const u = videoUrl?.trim();
  if (!u) return null;
  if (/youtu\.be|youtube\.com/i.test(u)) {
    return { kind: "youtube", label: "YouTube", detail: truncate(u, 48) };
  }
  if (/vimeo\.com/i.test(u)) {
    return { kind: "vimeo", label: "Vimeo", detail: truncate(u, 48) };
  }
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.replace(/^www\./, "");
    return { kind: "direct", label: "Link direto", detail: `${host} · ${truncate(u, 40)}` };
  } catch {
    return { kind: "direct", label: "Link", detail: truncate(u, 48) };
  }
}

/** Texto curto para miniatura (modo compacto do player). */
export function exerciseVideoCaption(
  videoUrl: string | null | undefined,
  videoFileKey: string | null | undefined,
  videoOriginalName: string | null | undefined,
): string | null {
  const info = getExerciseVideoSourceInfo(videoUrl, videoFileKey, videoOriginalName);
  if (!info) return null;
  if (info.detail && info.kind === "file") return `${info.label}\n${info.detail}`;
  return info.detail ? `${info.label} · ${info.detail}` : info.label;
}
