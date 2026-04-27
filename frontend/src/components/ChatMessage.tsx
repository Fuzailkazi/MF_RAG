import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bot, User, ShieldAlert, ShieldCheck, ShieldQuestion, CircleAlert } from "lucide-react";
import Markdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  blocked?: boolean;
  scheme?: string | null;
  schemeCategory?: string | null;
  confidence?: number | null;
  confidenceLabel?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "large-cap": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "flexi-cap": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  elss: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const CONFIDENCE_CONFIG: Record<string, { color: string; icon: typeof ShieldCheck; label: string }> = {
  high: {
    color: "text-emerald-600 dark:text-emerald-400",
    icon: ShieldCheck,
    label: "High confidence",
  },
  medium: {
    color: "text-amber-600 dark:text-amber-400",
    icon: ShieldQuestion,
    label: "Medium confidence",
  },
  low: {
    color: "text-red-500 dark:text-red-400",
    icon: CircleAlert,
    label: "Low confidence",
  },
};

export function ChatMessage({
  role,
  content,
  blocked,
  scheme,
  schemeCategory,
  confidence: _confidence,
  confidenceLabel,
}: ChatMessageProps) {
  void _confidence; // used in interface, displayed via confidenceLabel
  const isUser = role === "user";
  const confConfig = confidenceLabel ? CONFIDENCE_CONFIG[confidenceLabel] : null;

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
          isUser
            ? "bg-primary text-primary-foreground"
            : blocked
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : blocked ? (
          <ShieldAlert className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message content */}
      <div className={cn("max-w-[80%] space-y-1.5", isUser ? "items-end" : "items-start")}>
        {/* Top metadata row */}
        {!isUser && (scheme || confConfig) && (
          <div className="flex items-center gap-2 flex-wrap">
            {scheme && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-normal py-0",
                  schemeCategory && CATEGORY_COLORS[schemeCategory]
                )}
              >
                {scheme}
              </Badge>
            )}
            {confConfig && !blocked && (
              <span className={cn("flex items-center gap-1 text-[10px]", confConfig.color)}>
                <confConfig.icon className="h-3 w-3" />
                {confConfig.label}
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : blocked
                ? "bg-destructive/5 border border-destructive/20 rounded-tl-md"
                : "bg-muted rounded-tl-md"
          )}
        >
          {isUser ? (
            <p>{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&_a]:text-primary [&_a]:underline">
              <Markdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {content}
              </Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
