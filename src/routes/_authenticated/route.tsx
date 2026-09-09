import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Activity,
  FileText,
  Home,
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
import { RecentTransformationsSidebar } from "@/components/recent-transformations-sidebar";
import { TopNavbar } from "@/components/navigation/top-navbar";
import { signOutAll } from "@/lib/auth-service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

export function AuthenticatedLayout() {
  const { session, user, loading } = useAuth();
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
    { to: "/", label: t("nav.home", "Home Portal"), icon: Home },
    { to: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard },
    { to: "/upload", label: t("nav.upload", "Upload Source"), icon: Upload },
    { to: "/outputs", label: t("nav.outputs", "Generated Outputs"), icon: FileText },
    {
      to: "/review",
      label: t("nav.review", "Human Review"),
      icon: ListChecks,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
    },
    { to: "/distribution", label: t("nav.distribution", "Distribution"), icon: Send },
    { to: "/audit", label: t("nav.audit", "Audit & Metrics"), icon: Activity },
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface/80 px-6 py-4 shadow-lg backdrop-blur">
          <ShieldCheck className="size-5 animate-spin text-ember" />
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              ContentForge
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Authenticating operator session…
            </p>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = session.user?.email || "operator@contentforge.local";
  const userInitials = (session.user?.user_metadata?.name || userEmail.split("@")[0])
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar Navigation */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/80 bg-sidebar/95 backdrop-blur-sm md:flex">
        {/* Brand Header */}
        <div className="border-b border-border/80 px-5 py-4">
          <Link to="/dashboard" className="group block">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-ember/15 text-ember ring-1 ring-ember/30">
                <ShieldCheck className="size-3.5" />
              </span>
              <span className="font-mono text-sm font-bold tracking-[0.2em] text-foreground group-hover:text-ember transition-colors">
                Content<span className="text-ember">·</span>Forge
              </span>
            </div>
            <p className="mt-1 text-[10px] tracking-wide text-muted-foreground font-sans">
              {t("brand.tagline", "Verified content transformation")}
            </p>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {NAV.map((item) => {
            const isHome = item.to === "/";
            const active = isHome ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-all relative group",
                  active
                    ? "bg-surface-raised text-foreground font-semibold border-l-2 border-ember shadow-xs"
                    : "text-muted-foreground hover:bg-surface-raised/60 hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-transform group-hover:scale-105",
                    active ? "text-ember" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="truncate">{item.label}</span>
                {"badge" in item && item.badge != null && (
                  <span className="ml-auto rounded-full bg-ember/20 px-2 py-0.5 font-mono text-[10px] text-ember font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Logout Card */}
        <div className="border-t border-border/80 p-3 bg-surface/30">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-surface/50 border border-border/40">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ember/20 text-ember font-mono text-xs font-bold ring-1 ring-ember/30">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {session.user?.user_metadata?.name || userEmail.split("@")[0]}
              </p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={async () => {
              await signOutAll();
              navigate({ to: "/" });
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-surface/40 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <LogOut className="size-3.5" />
            <span>{t("nav.signout", "Sign out")}</span>
          </button>
        </div>
      </aside>

      {/* Main App Canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Global Top Navbar */}
        <TopNavbar />

        {/* Mobile Horizontal Sub-nav Bar */}
        <div className="flex gap-2 border-b border-border bg-surface/90 backdrop-blur px-3 py-2 overflow-x-auto md:hidden">
          {NAV.map((item) => {
            const isHome = item.to === "/";
            const active = isHome ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                  active
                    ? "bg-ember/15 text-ember font-semibold border border-ember/30"
                    : "text-muted-foreground hover:text-foreground bg-surface-raised/40",
                )}
              >
                <item.icon className="size-3 text-ember" />
                <span>{item.label}</span>
                {"badge" in item && item.badge != null && (
                  <span className="rounded-full bg-ember px-1 text-[9px] text-ember-foreground font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Floating Grounded Intelligence Copilot */}
      <ForgeCopilot />

      {/* Persistent LocalStorage Recent Transformations Sidebar */}
      <RecentTransformationsSidebar />
    </div>
  );
}
