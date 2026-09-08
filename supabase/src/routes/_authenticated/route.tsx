import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Activity,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Network,
  Send,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/context/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ForgeCopilot } from "@/components/forge-copilot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

export function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Live count of artefacts awaiting review
  const { data: pendingReviewData } = useLiveQuery(
    ["pending_review_count"] as never,
    async () => {
      const { data } = await supabase
        .from("outputs")
        .select("id, status")
        .in("status", ["generated", "edited"]);
      return (data ?? []).length;
    },
    ["outputs"],
  );

  const pendingReviewCount = pendingReviewData ?? 0;

  const NAV = [
    { to: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard },
    { to: "/upload", label: t("nav.upload", "Upload source"), icon: Upload },
    { to: "/outputs", label: t("nav.outputs", "Generated outputs"), icon: FileText },
    {
      to: "/review",
      label: t("nav.review", "Human review"),
      icon: ListChecks,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { to: "/distribution", label: t("nav.distribution", "Distribution"), icon: Send },
    { to: "/audit", label: t("nav.audit", "Audit & metrics"), icon: Activity },
    { to: "/architecture", label: t("nav.architecture", "Architecture"), icon: Network },
    { to: "/settings", label: t("nav.settings", "Settings"), icon: Settings },
  ] as const;

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", search: { redirect: pathname } });
    }
  }, [loading, session, navigate, pathname]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="label-mono">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <Link to="/dashboard">
            <span className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground">
              INTELLI<span className="text-ember">-</span>FORGE
            </span>
            <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">
              {t("brand.tagline", "Verified content transformation")}
            </p>
          </Link>
        </div>

        {/* Screen Language Switcher in Sidebar */}
        <div className="border-b border-border/70 px-4 py-2 bg-surface/40 flex items-center justify-between">
          <span className="label-mono text-[10px]">Screen Language</span>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors relative",
                  active
                    ? "bg-surface-raised text-foreground font-medium"
                    : "text-muted-foreground hover:bg-surface-raised/60 hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-4", active && "text-ember")} />
                <span className="truncate">{item.label}</span>
                {"badge" in item && item.badge != null && (
                  <span className="ml-auto rounded-full bg-ember/20 px-1.5 py-0.2 font-mono text-[10px] text-ember font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <p className="truncate px-3 pb-2 text-[11px] text-muted-foreground">
            {session.user.email}
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <LogOut className="size-4" />
            {t("nav.signout", "Sign out")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-ember" />
            <span className="font-mono text-xs tracking-[0.2em]">INTELLI-FORGE</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Mobile Nav Bar */}
        <div className="flex gap-2 border-b border-border bg-surface px-3 py-2 overflow-x-auto md:hidden">
          {NAV.slice(0, 6).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "label-mono whitespace-nowrap rounded px-2 py-1 text-[10px]",
                pathname.startsWith(item.to) ? "bg-ember/15 text-ember" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Floating Grounded Intelligence Copilot */}
      <ForgeCopilot />
    </div>
  );
}
