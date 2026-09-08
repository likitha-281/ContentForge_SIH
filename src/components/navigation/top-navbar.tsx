import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  ListChecks,
  FileText,
  Activity,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { signOutAll } from "@/lib/auth-service";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TopNavbar() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const handleSignOut = async () => {
    await signOutAll();
    toast.info("Signed out of operator console.");
    navigate({ to: "/" });
  };

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Operator";
  const userEmail = user?.email || "operator@intelliforge.ai";
  const userRole = user?.user_metadata?.role || "Certified Operator";

  // Section title based on pathname
  const getSectionTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return t("nav.dashboard", "Dashboard");
    if (path.startsWith("/upload")) return t("nav.upload", "Source Intake");
    if (path.startsWith("/outputs")) return t("nav.outputs", "Generated Outputs");
    if (path.startsWith("/review")) return t("nav.review", "Human Review");
    if (path.startsWith("/distribution")) return t("nav.distribution", "Distribution");
    if (path.startsWith("/audit")) return t("nav.audit", "Audit & Metrics");
    if (path.startsWith("/architecture")) return t("nav.architecture", "Architecture");
    if (path.startsWith("/settings")) return t("nav.settings", "Settings");
    return t("nav.console", "Console");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/70 bg-background/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Breadcrumbs & Home Shortcut */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-raised hover:text-foreground border border-transparent hover:border-border"
          title="Return to Public Home Portal"
        >
          <Home className="size-3.5 text-ember" />
          <span className="hidden sm:inline font-mono">{t("topbar.home", "Home")}</span>
        </Link>

        <span className="text-border">/</span>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-foreground hover:text-ember transition-colors"
          >
            INTELLI-FORGE
          </Link>
          <span className="text-muted-foreground text-xs hidden sm:inline">·</span>
          <span className="font-mono text-xs text-ember font-medium hidden sm:inline">
            {getSectionTitle(pathname)}
          </span>
        </div>
      </div>

      {/* Center: Live Engine Status Pill */}
      <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono tracking-wide">{t("topbar.status", "Pipeline Active · Fact Lock Ready")}</span>
      </div>

      {/* Right: Actions, Language, and Operator Identity */}
      <div className="flex items-center gap-2.5">
        {/* Quick Upload Action */}
        <Link
          to="/upload"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-sm bg-ember/15 px-2.5 py-1 text-xs font-semibold text-ember border border-ember/30 hover:bg-ember/25 transition-all"
        >
          <Upload className="size-3" />
          <span>{t("topbar.newIntake", "New Intake")}</span>
        </Link>

        {/* Screen Language Switcher */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        {/* User Identity Chip */}
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-surface/70 pl-2 pr-1.5 py-1 text-xs">
          <div className="flex size-6 items-center justify-center rounded-full bg-ember/20 text-ember text-[10px] font-bold font-mono">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden xl:block text-left mr-1">
            <p className="text-[11px] font-medium leading-none text-foreground truncate max-w-[120px]">
              {displayName}
            </p>
            <p className="text-[9px] font-mono text-muted-foreground leading-none mt-0.5">
              {userRole}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title={t("nav.signout", "Sign out")}
            className="rounded p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
