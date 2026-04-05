import Link from "next/link";
import { Card } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <h1 className="font-display text-xl font-bold">Recuperação de senha</h1>
        <p className="mt-3 text-sm text-ink-800/75">
          Em produção, enviaríamos um link por e-mail. Esta versão demo concentra o fluxo principal; configure SMTP ou
          provedor (Resend, SendGrid) no backend para ativar.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline">
          Voltar ao login
        </Link>
      </Card>
    </div>
  );
}
