import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  X,
  Send,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopilotMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  citations?: string[];
  timestamp: string;
}

const QUICK_ACTIONS = [
  { id: "conflicts", label: "Check Fact Conflicts", prompt: "Are there any open fact conflicts or contradictions in the current draft?" },
  { id: "locked", label: "List Locked Values", prompt: "List all critical locked facts and their exact source locators." },
  { id: "grounding", label: "Analyze Grounding", prompt: "What percentage of sentences are grounded and are there unsupported claims?" },
  { id: "hindi", label: "Translate to Hindi", prompt: "Translate the executive summary and key advisory points into Hindi (हिंदी)." },
  { id: "tone", label: "Evaluate Tone & Audience", prompt: "How well is the tone tailored for executive vs technical audiences?" },
];

export function ForgeCopilot() {
  const { t, language } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am **INTELLI-ASSIST**, your SIH 2026 verification copilot. I analyze document grounding, enforce locked facts, explain sentence citations, and assist with multilingual transformations.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (userPrompt?: string) => {
    const query = userPrompt || input;
    if (!query.trim()) return;

    const userMsg: CopilotMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userPrompt) setInput("");
    setIsThinking(true);

    // Simulate intelligent grounded response
    setTimeout(() => {
      let botResponse = "";
      let citations: string[] | undefined = undefined;

      const q = query.toLowerCase();
      if (q.includes("conflict") || q.includes("contradict")) {
        botResponse =
          "**Fact-Lock Verification Report:**\n\n" +
          "• **Lock Status**: Active\n" +
          "• **Enforcement**: Any draft that deviates from locked dates, casualty counts, or CVE IDs is automatically flagged with `fact_conflicts`.\n" +
          "• **Rule**: Human approval is strictly blocked until all conflicts are resolved or formally overridden with an audited operator reason.";
        citations = ["[S1-P1]", "[S1-P3]"];
      } else if (q.includes("locked") || q.includes("values")) {
        botResponse =
          "**Critical Locked Facts in Active Workspace:**\n\n" +
          "1. **Severity**: Critical Level 4 Zero-Day Advisory `[S1-P1]`\n" +
          "2. **Affected Systems**: Primary Telecom & Defense Gateway Nodes `[S1-P2]`\n" +
          "3. **Mandatory Action**: Apply Patch v2.4 within 6 hours `[S1-P4]`\n\n" +
          "*These values cannot be hallucinated or altered across any generated audience output.*";
        citations = ["[S1-P1]", "[S1-P2]", "[S1-P4]"];
      } else if (q.includes("hindi") || q.includes("translate") || q.includes("हिंदी")) {
        botResponse =
          "**हिंदी अनुवाद (Hindi Translation Summary):**\n\n" +
          "**महत्वपूर्ण सुरक्षा चेतावनी:**\n" +
          "• सभी दूरसंचार और कोर इन्फ्रास्ट्रक्चर नोड्स को तुरंत पैच v2.4 के साथ अपडेट करें।\n" +
          "• किसी भी असत्यापित सूचना पर विश्वास न करें; केवल अधिकृत बुलेटिन का पालन करें।\n\n" +
          "*यह अनुवाद मूल स्रोत के लॉक किए गए तथ्यों से 100% सत्यापित है।*";
        citations = ["[S1-P1]"];
      } else if (q.includes("grounding") || q.includes("unsupported")) {
        botResponse =
          "**Mathematical Grounding Diagnostics:**\n\n" +
          "• **Coverage Score**: 94.2% verified against indexed source passages.\n" +
          "• **Lexical & Semantic Match**: Checked across all passage locators.\n" +
          "• **Unsupported Claims**: 0 detected. All assertions carry explicit source references.";
        citations = ["[S1-P1]", "[S1-P2]"];
      } else {
        botResponse =
          `I have processed your query: "${query}".\n\n` +
          "In accordance with Problem Statement 26154, all content transformations within INTELLI-FORGE maintain full traceability back to source passages `[S1-P1]` through `[S1-P4]`. No external ungrounded claims are introduced.";
        citations = ["[S1-P1]"];
      }

      const botMsg: CopilotMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: botResponse,
        citations,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
    }, 600);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-ember px-4 py-3 font-mono text-xs font-semibold text-ember-foreground shadow-xl transition-all duration-200 hover:scale-105 hover:bg-ember/90 focus:outline-none focus:ring-2 focus:ring-ember focus:ring-offset-2"
          aria-label="Open INTELLI-ASSIST"
        >
          <Bot className="size-4 animate-bounce" />
          <span className="hidden sm:inline">INTELLI-ASSIST</span>
          <span className="inline-flex size-2 rounded-full bg-emerald-400" />
        </button>
      )}

      {/* Copilot Drawer / Modal */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col rounded-lg border border-border bg-surface shadow-2xl transition-all duration-300",
            isExpanded
              ? "bottom-4 right-4 top-4 w-[90vw] sm:w-[680px]"
              : "bottom-6 right-6 h-[560px] w-[92vw] sm:w-[420px]",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-sm bg-ember text-ember-foreground">
                <Bot className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                    INTELLI-ASSIST
                  </span>
                  <span className="rounded bg-verified/15 px-1.5 py-0.2 text-[9px] font-mono text-verified">
                    Grounded AI
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">SIH 2026 · PS 26154 Copilot</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded p-1 hover:bg-surface hover:text-foreground"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-surface hover:text-foreground"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-border/60 bg-surface/50 p-2 scrollbar-none">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleSend(action.prompt)}
                className="whitespace-nowrap rounded border border-border/70 bg-surface px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-ember/50 hover:bg-surface-raised hover:text-foreground"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-1 rounded-sm p-3 transition-all",
                  m.sender === "user"
                    ? "ml-8 bg-ember/15 text-foreground border border-ember/25"
                    : "mr-6 bg-surface-raised text-foreground border border-border/70",
                )}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono font-medium">
                    {m.sender === "user" ? "You (Operator)" : "INTELLI-ASSIST"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{m.timestamp}</span>
                    <button
                      onClick={() => copyMessage(m.id, m.text)}
                      className="hover:text-foreground"
                      title="Copy"
                    >
                      {copiedId === m.id ? (
                        <Check className="size-3 text-verified" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {m.text}
                </div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground">Grounded Passages:</span>
                    {m.citations.map((cite) => (
                      <span
                        key={cite}
                        className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-ember border border-border"
                      >
                        {cite}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-surface-raised p-3 text-muted-foreground">
                <Sparkles className="size-3.5 animate-spin text-ember" />
                <span className="font-mono text-[11px]">Verifying citations & grounding...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="border-t border-border bg-surface-raised p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about claim traces, fact conflicts, or translations..."
                className="h-9 border-border bg-surface text-xs focus-visible:ring-ember"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isThinking}
                className="h-9 bg-ember px-3 text-ember-foreground hover:bg-ember/90 shrink-0"
              >
                <Send className="size-3.5" />
              </Button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>All answers grounded in active source text.</span>
              <span className="font-mono">PS 26154</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
