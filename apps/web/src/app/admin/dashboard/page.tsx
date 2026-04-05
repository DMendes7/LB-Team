"use client";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <AppShell role="ADMIN" title="Administração">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="font-medium">Usuários e papéis</p>
          <Link href="/admin/users" className="mt-3 inline-block text-sm text-brand-700">
            Gerenciar
          </Link>
        </Card>
        <Card>
          <p className="font-medium">Vínculos</p>
          <Link href="/admin/links" className="mt-3 inline-block text-sm text-brand-700">
            Personal / Nutri ↔ Aluna
          </Link>
        </Card>
        <Card>
          <p className="font-medium">Parâmetros</p>
          <Link href="/admin/settings" className="mt-3 inline-block text-sm text-brand-700">
            streak, mensagens, etc.
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
