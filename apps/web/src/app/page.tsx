import Link from "next/link";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-brand-50/50 to-brand-100/30">
      <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-orange-300/25 blur-3xl" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <span className="font-display text-xl font-bold text-brand-700">LB Team</span>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button>Começar</Button>
          </Link>
        </div>
      </header>
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-12 md:pt-20">
        <p className="mb-4 inline-block rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-800">
          Para mulheres reais
        </p>
        <h1 className="font-display max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl lg:text-6xl">
          Constância em primeiro lugar.{" "}
          <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-transparent">
            Evolução que cabe na sua rotina.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-800/80">
          Treino gamificado com progressão por frequência, apoio emocional em dias difíceis e nutrição flexível — sem
          infantilizar sua jornada.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/register">
            <Button className="px-8 py-3 text-base">Criar conta</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="px-8 py-3 text-base">
              Já tenho conta
            </Button>
          </Link>
        </div>
        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Progressão por presença", d: "Suba de nível pela constância semanal, não só por carga." },
            { t: "Adaptação ao dia", d: "Cansada, sem tempo ou com dor — o app sugere ajustes sem culpa." },
            { t: "Personal + nutri separados", d: "Cada profissional no seu módulo, com grupos e individualização." },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-2xl border border-brand-100/80 bg-white/70 p-5 shadow-sm backdrop-blur"
            >
              <h3 className="font-display font-semibold text-brand-800">{x.t}</h3>
              <p className="mt-2 text-sm text-ink-800/75">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
