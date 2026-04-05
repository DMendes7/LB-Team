export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lb_token");
}

export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("lb_token", t);
  else localStorage.removeItem("lb_token");
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as object),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  if (res.status === 204 || text.trim() === "") {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida da API (JSON esperado).");
  }
}

/** Upload multipart (ex.: vídeo de exercício). Não define Content-Type para o browser enviar boundary. */
export async function apiForm<T = unknown>(path: string, form: FormData, method: "POST" | "PATCH" = "POST"): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fileVideoUrl(videoFileKey: string | null | undefined): string | null {
  if (!videoFileKey) return null;
  return `${API_BASE}/files/${videoFileKey}`;
}

/** URL de vídeo do exercício: link externo ou arquivo na API. */
export function exerciseVideoSrc(
  videoUrl: string | null | undefined,
  videoFileKey: string | null | undefined,
): string | null {
  if (videoUrl?.trim()) return videoUrl.trim();
  return fileVideoUrl(videoFileKey);
}

/** Se for URL do YouTube, retorna URL de embed; senão null. */
export function youtubeEmbedUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl?.trim()) return null;
  const u = videoUrl.trim();
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function youtubeVideoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl?.trim()) return null;
  const m = videoUrl.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}
