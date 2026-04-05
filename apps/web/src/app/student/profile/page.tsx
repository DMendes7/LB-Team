"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function ProfilePage() {
  const [me, setMe] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api("/auth/me").then(setMe);
  }, []);

  return (
    <AppShell role="STUDENT" title="Perfil">
      <Card>
        <pre className="overflow-auto text-xs text-ink-800/80">{JSON.stringify(me, null, 2)}</pre>
      </Card>
    </AppShell>
  );
}
