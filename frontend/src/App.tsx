import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { HelpFab } from "@/components/HelpFab";
import { Calculators } from "@/components/Calculators";
import {
  TriangleAlert,
  Loader2,
  Moon,
  Sun,
  Trash2,
  Sparkles,
  BarChart3,
  Calculator,
  MessageSquareText,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
  blocked?: boolean;
  scheme?: string | null;
  schemeCategory?: string | null;
  confidence?: number | null;
  confidenceLabel?: string | null;
}

interface APIResponse {
  answer: string;
  category: string;
  scheme: string | null;
  scheme_category: string | null;
  source_url: string | null;
  confidence: number | null;
  confidence_label: string | null;
  blocked: boolean;
}

const SCHEMES = [
  {
    name: "Mirae Asset Large Cap Fund",
    amc: "Mirae Asset",
    category: "large-cap",
    categoryLabel: "Large Cap",
    highlights: [
      "What is the expense ratio?",
      "What is the exit load?",
      "What is the minimum SIP amount?",
      "Is it an open-ended scheme?",
    ],
  },
  {
    name: "Parag Parikh Flexi Cap Fund",
    amc: "PPFAS Mutual Fund",
    category: "flexi-cap",
    categoryLabel: "Flexi Cap",
    highlights: [
      "What is the expense ratio?",
      "What is the risk level?",
      "Is it an open-ended scheme?",
      "What is the exit load?",
    ],
  },
  {
    name: "Axis ELSS Tax Saver Fund",
    amc: "Axis Mutual Fund",
    category: "elss",
    categoryLabel: "ELSS",
    highlights: [
      "What is the lock-in period?",
      "What is the minimum SIP amount?",
      "What is the expense ratio?",
      "What is the exit load?",
    ],
  },
];

// General queries used in suggestions grid above

// Resource sections moved to HelpFab component

async function askAPI(
  query: string,
  history: { role: string; content: string }[]
): Promise<APIResponse> {
  const res = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, conversation_history: history }),
  });
  if (!res.ok) throw new Error("API request failed");
  return res.json();
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [started, setStarted] = useState(false);
  const [page, setPage] = useState<"chat" | "calc">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const getConversationHistory = (): { role: string; content: string }[] => {
    return messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  };

  const handleSend = async (query: string) => {
    if (!started) setStarted(true);
    const history = getConversationHistory();
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const data = await askAPI(query, history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          blocked: data.blocked,
          scheme: data.scheme,
          schemeCategory: data.scheme_category,
          confidence: data.confidence,
          confidenceLabel: data.confidence_label,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong. Please make sure the API server is running on port 8000.",
          blocked: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemeAsk = (schemeName: string, question: string) => {
    handleSend(`${question.replace("?", "")} of ${schemeName}?`);
  };

  const clearChat = () => {
    setMessages([]);
    setStarted(false);
  };

  // Landing page — single viewport, no scroll
  if (!started) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 border-b px-4 sm:px-6 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">MF FAQ Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant={page === "chat" ? "default" : "ghost"} size="sm" onClick={() => setPage("chat")} className="h-8 text-xs cursor-pointer gap-1">
                <MessageSquareText className="h-3.5 w-3.5" /><span className="hidden sm:inline">FAQ</span>
              </Button>
              <Button variant={page === "calc" ? "default" : "ghost"} size="sm" onClick={() => setPage("calc")} className="h-8 text-xs cursor-pointer gap-1">
                <Calculator className="h-3.5 w-3.5" /><span className="hidden sm:inline">Calculators</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme" className="h-8 w-8 cursor-pointer">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 overflow-y-auto">
          {page === "calc" ? (
            <div className="max-w-2xl w-full py-6"><Calculators /></div>
          ) : (
          <div className="max-w-2xl w-full space-y-6">
            {/* Hero — compact */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                Powered by RAG + GPT-4o
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Mutual Fund FAQ Assistant
              </h1>
              <p className="text-sm text-muted-foreground">
                Factual answers from official AMC, AMFI & SEBI sources. No advice. No opinions.
              </p>
            </div>

            {/* Scheme pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {SCHEMES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleSchemeAsk(s.name, "What is the expense ratio?")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card hover:bg-muted transition-colors duration-200 cursor-pointer text-xs"
                >
                  <span className="font-medium">{s.name.split(" ").slice(0, 3).join(" ")}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                    {s.categoryLabel}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Suggested questions grid — compact */}
            <div className="grid grid-cols-2 gap-2">
              {[
                "What is the expense ratio of Mirae Asset Large Cap Fund?",
                "What is the lock-in period for ELSS?",
                "What is the risk level of Parag Parikh Flexi Cap Fund?",
                "What is the minimum SIP for Axis ELSS?",
                "What is a Systematic Investment Plan?",
                "What is the riskometer in mutual funds?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border bg-card hover:bg-muted transition-colors duration-200 text-muted-foreground hover:text-foreground cursor-pointer leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
          )}
        </div>

        {/* Disclaimer as footer */}
        <footer className="shrink-0 border-t px-4 sm:px-6 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <TriangleAlert className="h-3 w-3 text-amber-500 shrink-0" />
            <span>
              Facts-only. No investment advice. Mutual fund investments are subject to market risks.
            </span>
          </div>
        </footer>

        <HelpFab />
      </div>
    );
  }

  // Chat view
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                MF FAQ Assistant
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Factual answers from official sources
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="New chat"
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark(!dark)}
              className="h-8 w-8"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="shrink-0 px-4 sm:px-6 pt-2">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 py-1.5">
            <TriangleAlert className="h-3 w-3 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-[11px]">
              <strong>Facts-only.</strong> No investment advice. Mutual fund
              investments are subject to market risks.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-5 pb-4">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                blocked={msg.blocked}
                scheme={msg.scheme}
                schemeCategory={msg.schemeCategory}
                confidence={msg.confidence}
                confidenceLabel={msg.confidenceLabel}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t px-4 sm:px-6 py-2">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            19 official sources | 1,496 vectors | April 2026
          </p>
          <div className="flex gap-1.5">
            <Badge variant="secondary" className="text-[10px] py-0">
              Mirae Large Cap
            </Badge>
            <Badge variant="secondary" className="text-[10px] py-0">
              PPFAS Flexi Cap
            </Badge>
            <Badge variant="secondary" className="text-[10px] py-0">
              Axis ELSS
            </Badge>
          </div>
        </div>
      </footer>

      <HelpFab />
    </div>
  );
}

export default App;
