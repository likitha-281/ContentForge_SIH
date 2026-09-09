import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { formatSupabaseAuthIssue, isGoogleAuthEnabled } from "@/lib/auth-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Operator Access — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Sign in or register for the INTELLI-FORGE verified content transformation console.",
      },
      { property: "og:title", content: "Operator Access — INTELLI-FORGE" },
      { property: "og:description", content: "Secure operator access to INTELLI-FORGE." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Email confirmation state
  const [confirmationNotice, setConfirmationNotice] = useState<{
    email: string;
    show: boolean;
    isUnconfirmedLogin?: boolean;
  }>({ email: "", show: false });

  // Google OAuth configuration guidance modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const destination = search.redirect ?? "/dashboard";

  // Listen to Supabase auth state and redirect once session is confirmed
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: destination });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED")) {
        navigate({ to: destination });
      }
    });

    return () => subscription.unsubscribe();
  }, [destination, navigate]);

  // Handle email/password sign-in and sign-up
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: fullName.trim() || cleanEmail.split("@")[0],
            },
          },
        });

        if (error) {
          toast.error(formatSupabaseAuthIssue(error.message));
          return;
        }

        // Check if email confirmation is required by Supabase
        if (data.user && !data.session) {
          setConfirmationNotice({
            email: cleanEmail,
            show: true,
            isUnconfirmedLogin: false,
          });
          toast.info("Account registered! Email confirmation required.");
          return;
        }

        if (data.session) {
          toast.success("Account created and authenticated!");
          navigate({ to: destination });
          return;
        }
      } else {
        // Sign-in mode
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          const errMsg = error.message.toLowerCase();
          if (errMsg.includes("email not confirmed") || (error as any).code === "email_not_confirmed") {
            setConfirmationNotice({
              email: cleanEmail,
              show: true,
              isUnconfirmedLogin: true,
            });
            toast.error("Account email is not confirmed yet. Please verify your inbox.");
          } else {
            toast.error(error.message || "Invalid login credentials.");
          }
          return;
        }

        if (data.session) {
          toast.success("Authenticated successfully.");
          navigate({ to: destination });
          return;
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication error occurred.");
    } finally {
      setBusy(false);
    }
  }

  // Handle Google OAuth
  async function handleGoogleSignIn() {
    if (!isGoogleAuthEnabled()) {
      setShowGoogleModal(true);
      toast.error(
        "Google sign-in is not enabled yet. Add the OAuth client ID and secret in Supabase first.",
      );
      return;
    }

    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        const friendly = formatSupabaseAuthIssue(error.message);
        if (
          error.message.toLowerCase().includes("missing oauth secret") ||
          error.message.toLowerCase().includes("validation_failed") ||
          error.message.toLowerCase().includes("unsupported provider")
        ) {
          setShowGoogleModal(true);
        }
        toast.error(friendly);
      }
    } catch (err: any) {
      const friendly = formatSupabaseAuthIssue(err?.message || "Google authentication failed.");
      toast.error(friendly);
    } finally {
      setGoogleBusy(false);
    }
  }

  // Handle resending verification email
  async function handleResendEmail() {
    if (!confirmationNotice.email) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationNotice.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) {
        toast.error(formatSupabaseAuthIssue(error.message));
      } else {
        toast.success(`Verification link resent to ${confirmationNotice.email}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend confirmation email.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-ember/10 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-80 w-80 rounded-full bg-surface-raised/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 text-ember" />
            <span>Back to Home Portal</span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            SIH 2026 PS 26154
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-5">
            <div>
              <span className="font-mono text-xs font-bold tracking-[0.25em] text-foreground">
                INTELLI<span className="text-ember">-</span>FORGE
              </span>
              <p className="mt-1 text-xs text-muted-foreground font-sans">
                Verified Content Transformation Console
              </p>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg bg-ember/15 text-ember ring-1 ring-ember/30">
              <ShieldCheck className="size-4.5" />
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="mt-6 flex rounded-lg border border-border/60 bg-background/60 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setConfirmationNotice({ email: "", show: false });
              }}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all",
                mode === "signin"
                  ? "bg-surface text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setConfirmationNotice({ email: "", show: false });
              }}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all",
                mode === "signup"
                  ? "bg-surface text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Create Account
            </button>
          </div>

          {/* Confirmation Notice Screen */}
          {confirmationNotice.show ? (
            <div className="mt-6 rounded-lg border border-ember/30 bg-ember/10 p-5">
              <div className="flex items-start gap-3">
                <Mail className="size-5 text-ember shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {confirmationNotice.isUnconfirmedLogin
                      ? "Email Confirmation Required"
                      : "Check Your Email"}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A confirmation link was dispatched to{" "}
                    <strong className="text-foreground">{confirmationNotice.email}</strong>.
                    Please verify your email address to activate your Supabase identity.
                  </p>
                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResendEmail}
                      className="text-xs border-ember/30 bg-surface/80 hover:bg-surface"
                    >
                      <RefreshCw className="size-3 mr-1.5 text-ember" />
                      Resend Confirmation Email
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmationNotice({ email: "", show: false })}
                      className="text-xs text-muted-foreground"
                    >
                      Back to sign in
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {isGoogleAuthEnabled() && (
                <div className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={googleBusy || busy}
                    className="w-full border-border/80 bg-background/80 hover:bg-surface-raised font-sans text-xs font-medium py-5 shadow-xs"
                  >
                    <GoogleIcon className="mr-2 size-4" />
                    <span>Continue with Google</span>
                  </Button>
                </div>
              )}

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <span className="relative bg-surface px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {isGoogleAuthEnabled() ? "or email access" : "email access"}
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-mono">Full Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-xs bg-background/60 border-border/70 focus-visible:ring-ember/40"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-mono">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      placeholder="operator@organisation.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs bg-background/60 border-border/70 focus-visible:ring-ember/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-mono">Password</Label>
                    {mode === "signin" && (
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        Min. 6 chars
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-xs bg-background/60 border-border/70 focus-visible:ring-ember/40"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-ember hover:bg-ember/90 text-ember-foreground font-mono text-xs font-semibold py-5 shadow-sm"
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="size-3.5 animate-spin" />
                      Authenticating with Supabase...
                    </span>
                  ) : mode === "signin" ? (
                    <span className="flex items-center justify-center gap-1.5">
                      Sign In to Console
                      <ArrowRight className="size-3.5" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Create Operator Account
                      <ArrowRight className="size-3.5" />
                    </span>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Security Guarantee */}
          <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Lock className="size-3 text-ember" />
              Supabase Auth & RLS
            </span>
            <span>SIH 2026</span>
          </div>
        </div>
      </div>

      {/* Google OAuth Configuration Guide Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <GoogleIcon className="size-5" />
                <h3 className="text-sm font-semibold text-foreground">
                  Google OAuth Configuration Notice
                </h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-muted-foreground">
              <p>
                Supabase Auth Google provider is active, but requires Google Cloud OAuth credentials to complete the redirect flow.
              </p>
              <div className="rounded-lg border border-border/80 bg-background/80 p-3 space-y-2 font-mono text-[11px]">
                <p className="text-foreground font-semibold">To enable Google OAuth for this project:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Open <a href="https://supabase.com/dashboard/project/toqcdcapidfcgxfdqcvy/auth/providers" target="_blank" rel="noreferrer" className="text-ember underline">Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Google</a></li>
                  <li>In Google Cloud Console, create an OAuth 2.0 Client ID for Web Application.</li>
                  <li>Set Authorized Redirect URI to:
                    <code className="block mt-1 p-1 bg-surface-raised rounded text-foreground font-mono select-all">
                      https://toqcdcapidfcgxfdqcvy.supabase.co/auth/v1/callback
                    </code>
                  </li>
                  <li>Paste the Client ID and Client Secret into Supabase and Save.</li>
                </ol>
              </div>
              <p>
                In the meantime, you can register and sign in directly using email and password above.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={() => setShowGoogleModal(false)}>
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
