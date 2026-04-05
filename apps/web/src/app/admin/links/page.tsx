import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function AdminLinksPage() {
  return (
    <AppShell role="ADMIN" title="Vínculos">
      <Card>
        <ul className="list-inside list-disc space-y-2 text-sm text-ink-800/85">
          <li>
            <code className="rounded bg-brand-100 px-1">POST /admin/links/trainer-student</code> corpo:{" "}
            <code>trainerId</code>, <code>studentId</code>
          </li>
          <li>
            <code className="rounded bg-brand-100 px-1">POST /admin/links/nutritionist-student</code> corpo:{" "}
            <code>nutritionistId</code>, <code>studentId</code>
          </li>
        </ul>
      </Card>
    </AppShell>
  );
}
