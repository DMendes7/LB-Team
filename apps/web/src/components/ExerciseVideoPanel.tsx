"use client";

import { useEffect, useRef, useState } from "react";
import { fileVideoUrl, youtubeEmbedUrl, youtubeVideoId } from "@/lib/api";

type Props = {
  title: string;
  videoUrl: string | null;
  videoFileKey: string | null;
  /** Capa do exercício (URL) ou miniatura do primeiro frame. */
  posterUrl: string | null;
  /** Miniatura menor na ficha (lista de exercícios). */
  compact?: boolean;
};

function exitFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  doc.webkitExitFullscreen?.();
}

export function ExerciseVideoPanel({ title, videoUrl, videoFileKey, posterUrl, compact }: Props) {
  const fileSrc = fileVideoUrl(videoFileKey);
  const ytEmbed = youtubeEmbedUrl(videoUrl);
  const ytId = youtubeVideoId(videoUrl);
  const directUrl = !fileSrc && !ytEmbed && videoUrl?.trim() ? videoUrl.trim() : null;

  const [open, setOpen] = useState(false);

  if (!fileSrc && !ytEmbed && !directUrl) return null;

  const thumbSrc = fileSrc ?? directUrl ?? null;
  const ytThumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null;

  const frameClass = compact
    ? "aspect-[9/16] w-[78px] shrink-0 overflow-hidden rounded-xl border border-brand-200/80 bg-ink-900/10 shadow-sm sm:w-[86px]"
    : "aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-2xl border border-brand-200 bg-ink-900/10 shadow-md md:max-w-none";

  const playClass = compact
    ? "flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-base text-white shadow-md backdrop-blur-sm"
    : "flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-2xl text-white shadow-lg backdrop-blur-sm";

  return (
    <>
      <button
        type="button"
        aria-label={`Abrir vídeo em tela cheia: ${title}`}
        className={`group relative mx-auto overflow-hidden ${frameClass}`}
        onClick={() => setOpen(true)}
      >
        {ytThumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ytThumb} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        )}
        {thumbSrc && !ytThumb && (
          <video
            className="h-full w-full object-cover"
            src={thumbSrc}
            muted
            playsInline
            preload="metadata"
            poster={posterUrl ?? undefined}
          />
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/25">
          <span className={playClass}>▶</span>
        </span>
      </button>

      {open && (
        <VideoFullscreenOverlay
          title={title}
          fileSrc={fileSrc}
          directUrl={directUrl}
          ytEmbed={ytEmbed}
          onClose={() => {
            exitFullscreen();
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function VideoFullscreenOverlay({
  title,
  fileSrc,
  directUrl,
  ytEmbed,
  onClose,
}: {
  title: string;
  fileSrc: string | null;
  directUrl: string | null;
  ytEmbed: string | null;
  onClose: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enteredFsRef = useRef(false);

  const src = fileSrc ?? directUrl;

  useEffect(() => {
    const shell = shellRef.current;
    if (shell) {
      const anyShell = shell as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
      const req = shell.requestFullscreen?.() ?? anyShell.webkitRequestFullscreen?.();
      const p = req && typeof (req as Promise<void>).then === "function" ? (req as Promise<void>) : Promise.resolve();
      void p.then(() => {
        enteredFsRef.current = !!document.fullscreenElement;
      }).catch(() => {});
    }

    const v = videoRef.current;
    if (v && src) {
      void v.play().catch(() => {});
    }

    const onFsChange = () => {
      const fs =
        document.fullscreenElement ??
        (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
      if (!fs && enteredFsRef.current) onClose();
      if (fs) enteredFsRef.current = true;
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as EventListener);
    };
  }, [src, onClose]);

  const iframeSrc = ytEmbed
    ? `${ytEmbed}${ytEmbed.includes("?") ? "&" : "?"}autoplay=1&rel=0`
    : null;

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black"
      role="dialog"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-[310] rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md"
        onClick={() => {
          exitFullscreen();
          onClose();
        }}
      >
        Fechar
      </button>

      {src && (
        <video
          ref={videoRef}
          className="max-h-[100dvh] max-w-full"
          src={src}
          controls
          playsInline
          autoPlay
        />
      )}
      {iframeSrc && (
        <iframe
          title={title}
          className="aspect-video h-auto w-full max-h-[100dvh] max-w-[100vw] border-0"
          src={iframeSrc}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
}
