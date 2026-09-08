import { AlertTriangle, CircleDashed, ShieldCheck, ShieldX } from "lucide-react";

import { cn } from "@/lib/utils";

export type TrustState = "unverified" | "verifying" | "verified" | "attention" | "failed";

const MAP: Record<
  TrustState,
  { label: string; className: string; Icon: typeof ShieldCheck }
> = {
  unverified: {
    label: "Unverified",
    className: "text-muted-foreground border-border",
    Icon: CircleDashed,
  },
  verifying: {
    label: "Verifying",
    className: "text-attention border-attention/40 animate-pulse",
    Icon: CircleDashed,
  },
  verified: {
    label: "Verified",
    className: "text-verified border-verified/40 bg-verified/10",
    Icon: ShieldCheck,
  },
  attention: {
    label: "Needs attention",
    className: "text-attention border-attention/40 bg-attention/10",
    Icon: AlertTriangle,
  },
  failed: {
    label: "Conflict",
    className: "text-conflict border-conflict/50 bg-conflict/10",
    Icon: ShieldX,
  },
};

export function TrustBadge({
  state,
  className,
}: {
  state: string | null | undefined;
  className?: string;
}) {
  const config = MAP[(state as TrustState) ?? "unverified"] ?? MAP.unverified;
  const { Icon } = config;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}

export function CheckStatusDot({ status }: { status: string }) {
  const tone =
    status === "pass"
      ? "bg-verified"
      : status === "warn"
        ? "bg-attention"
        : status === "fail"
          ? "bg-conflict"
          : "bg-muted-foreground animate-pulse";
  return <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone)} />;
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-sm border border-attention/40 bg-attention/10 px-3 py-2 text-xs text-attention",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Sample data. This scenario is fictional and provided for demonstration — every processing
        step you see runs for real against it.
      </span>
    </div>
  );
}
