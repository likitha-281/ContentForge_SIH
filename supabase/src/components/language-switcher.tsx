import { Globe } from "lucide-react";
import { useI18n } from "@/context/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, currentLanguageInfo, languages } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-ember",
          className,
        )}
      >
        <span className="text-sm">{currentLanguageInfo.flag}</span>
        <span className="font-mono text-xs">{currentLanguageInfo.nativeName}</span>
        <Globe className="size-3 text-muted-foreground ml-0.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto border-border bg-surface">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors cursor-pointer",
              language === lang.code
                ? "bg-ember/15 text-ember font-semibold"
                : "text-foreground hover:bg-surface-raised",
            )}
          >
            <span>{lang.flag}</span>
            <span className="font-medium">{lang.nativeName}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
