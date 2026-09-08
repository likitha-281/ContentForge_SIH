import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Workspace settings — INTELLI-FORGE" },
      {
        name: "description",
        content: "Your account, workspace isolation rules and the verification thresholds in force.",
      },
      { property: "og:title", content: "Workspace settings — INTELLI-FORGE" },
      { property: "og:description", content: "Account and verification policy for your workspace." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Settings" />
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <section className="rounded-sm border border-border bg-surface p-5">
          <p className="label-mono">Account</p>
          <p className="mt-2 text-sm text-foreground">{user?.email}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{user?.id}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Every source, artefact, claim and audit event is scoped to this account by row-level
            security in the database. No other operator can read your workspace.
          </p>
        </section>
        <section className="rounded-sm border border-border bg-surface p-5">
          <p className="label-mono">Verification policy in force</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· Locked facts must appear unchanged in every artefact.</li>
            <li>· Approval is blocked while any fact conflict is open or unresolved.</li>
            <li>· Any reviewer edit forces a full re-verification before approval.</li>
            <li>· Distribution is available only for approved artefacts.</li>
            <li>· Audit events are append-only and hash-chained.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
