import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — INTELLI-FORGE" },
      {
        name: "description",
        content: "Sign in to the INTELLI-FORGE operator console to transform and verify content.",
      },
      { property: "og:title", content: "Sign in — INTELLI-FORGE" },
      { property: "og:description", content: "Operator access to the INTELLI-FORGE console." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const destination = search.redirect ?? "/dashboard";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: destination });
    });
  }, [destination, navigate]);

  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  async function handleResendEmail() {
    if (!unconfirmedEmail && !email) {
      toast.error("Please enter your email first.");
      return;
    }
    const target = unconfirmedEmail || email.trim();
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success(
        `Confirmation link resent to ${target}. Please check your inbox & spam folder.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend confirmation email.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data?.session) {
          toast.success("Account created! Logging in...");
          navigate({ to: destination });
        } else if (data?.user) {
          setUnconfirmedEmail(email.trim());
          toast.info(
            "Account created! A confirmation email was sent. Please click the link in your email, or turn off 'Confirm email' in your Supabase dashboard.",
            { duration: 8000 },
          );
          setMode("signin");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("email not confirmed")) {
            setUnconfirmedEmail(email.trim());
            throw new Error(
              "Your email is not confirmed yet. Check your inbox/spam for the confirmation link, or disable 'Confirm email' in your Supabase dashboard.",
            );
          }
          if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
            throw new Error(
              "Account not found or incorrect password. If you haven't created an account yet, click 'Create one' below.",
            );
          }
          throw error;
        }
        if (data?.session) {
          toast.success("Signed in successfully.");
          navigate({ to: destination });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(destination)}`,
        },
      });
      if (error) {
        toast.error(
          error.message ||
            "Google sign-in is not configured yet. You can sign up/in instantly with Email & Password below!",
        );
      }
    } catch (err) {
      toast.error(
        "Google sign-in is not configured yet. You can sign up/in instantly with Email & Password below!",
      );
    }
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-sm border border-border bg-surface p-8">
        <Link to="/" className="font-mono text-sm font-semibold tracking-[0.22em] text-foreground">
          INTELLI<span className="text-ember">-</span>FORGE
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "signin" ? "Operator sign in" : "Create operator account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your sources, artefacts and audit trail are private to your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@organisation.gov.in"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full font-mono text-xs uppercase tracking-widest"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-mono">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={handleGoogle} className="w-full">
          Continue with Google
        </Button>

        {unconfirmedEmail && (
          <div className="mt-4 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <p className="font-semibold">Email confirmation pending for:</p>
            <p className="font-mono text-[11px] text-foreground mt-0.5">{unconfirmedEmail}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Check your inbox & spam for the link, or click below to resend.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={busy}
              className="mt-2.5 w-full text-xs h-8 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
            >
              Resend Confirmation Email
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
