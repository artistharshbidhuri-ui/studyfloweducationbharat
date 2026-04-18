import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useProfile, useChat } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageCircle, Sparkles, Trash2, Languages } from "lucide-react";
import { solveDoubt } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/education";

export const Route = createFileRoute("/doubt")({
  head: () => ({
    meta: [
      { title: "AI Doubt Solver — StudyFlow AI" },
      { name: "description", content: "Ask any study question and get NCERT-based explanations in Hinglish or English with step-by-step solutions and board exam answers." },
      { property: "og:title", content: "AI Doubt Solver — StudyFlow AI" },
      { property: "og:description", content: "Get instant homework help with board exam answer format." },
    ],
  }),
  component: DoubtPage,
});

function DoubtPage() {
  const [profile] = useProfile();
  if (!profile) return <Onboarding />;
  return <DoubtSolver />;
}

const SUGGESTIONS_BY_LANG = {
  english: [
    "Explain Newton's Second Law with example",
    "What is the difference between mitosis and meiosis?",
    "Solve: Find roots of x² - 5x + 6 = 0",
    "Explain photosynthesis step by step",
  ],
  hinglish: [
    "Newton ka second law explain karo example ke saath",
    "Mitosis aur meiosis mein kya difference hai?",
    "x² - 5x + 6 = 0 ka solution kya hai?",
    "Photosynthesis ko simple words mein samjhao",
  ],
};

function DoubtSolver() {
  const [profile, setProfile] = useProfile();
  const [messages, setMessages] = useChat();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!profile) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const { answer } = await solveDoubt({
        data: {
          question: trimmed,
          language: profile.language,
          studentClass: profile.studentClass,
          board: profile.board,
        },
      });
      const aiMsg: ChatMessage = {
        id: `${Date.now()}-a`,
        role: "assistant",
        content: answer,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    setProfile({
      ...profile,
      language: profile.language === "english" ? "hinglish" : "english",
    });
  };

  const empty = messages.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen flex flex-col pb-24 relative">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

        {/* Header */}
        <header className="relative px-5 pt-6 pb-3 flex items-center justify-between border-b border-border bg-background/60 backdrop-blur-md sticky top-0 z-30">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Doubt Solver
            </p>
            <h1 className="text-xl font-bold">Ask anything 🤔</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLang}
              className="rounded-xl text-xs h-9"
            >
              <Languages className="h-3.5 w-3.5 mr-1" />
              {profile.language === "english" ? "EN" : "Hinglish"}
            </Button>
            {!empty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Clear chat?")) setMessages([]);
                }}
                className="rounded-xl h-9 w-9 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 relative">
          {empty ? (
            <div className="flex flex-col items-center justify-center text-center pt-8">
              <div className="h-16 w-16 rounded-3xl gradient-primary glow-primary flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-bold">What's your doubt?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
                NCERT-based explanations with board exam answer format
              </p>
              <div className="w-full space-y-2">
                <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground text-left">
                  Try asking
                </p>
                {SUGGESTIONS_BY_LANG[profile.language].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left rounded-2xl border border-border gradient-card p-3 hover:border-primary/40 transition-colors text-sm flex items-start gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent">
          <div className="relative flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-xl">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={profile.language === "hinglish" ? "Apna doubt likhiye..." : "Type your doubt..."}
              maxLength={2000}
              rows={1}
              className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 min-h-[40px] max-h-32"
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="h-10 w-10 rounded-2xl gradient-primary p-0 shrink-0"
            >
              <Send className="h-4 w-4 text-primary-foreground" />
            </Button>
          </div>
        </div>
      </div>
      {/* @ts-expect-error Server Component */}
      <BottomNavWrapper />
    </div>
  );
}

function BottomNavWrapper() {
  // BottomNav fixed at bottom; render it
  // This wrapper exists so we can keep the chat layout custom
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BottomNav } = require("@/components/BottomNav");
  return <BottomNav />;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm",
          isUser
            ? "gradient-primary text-primary-foreground rounded-br-md"
            : "border border-border gradient-card rounded-bl-md",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <FormattedAnswer content={message.content} />
        )}
      </div>
    </div>
  );
}

function FormattedAnswer({ content }: { content: string }) {
  // Lightweight markdown rendering: ### headings, **bold**, lists, paragraphs
  const blocks = content.split(/\n\n+/);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, i) => {
        const headingMatch = block.match(/^#{2,4}\s+(.+)/);
        if (headingMatch) {
          return (
            <h4 key={i} className="font-bold text-primary text-sm mt-2 first:mt-0">
              {headingMatch[1]}
            </h4>
          );
        }
        // List
        if (/^(\d+\.|[-*])\s/m.test(block)) {
          const items = block.split("\n").filter(Boolean);
          return (
            <ul key={i} className="space-y-1 ml-4 list-disc">
              {items.map((item, j) => (
                <li key={j}>
                  <InlineFormat text={item.replace(/^(\d+\.|[-*])\s/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <InlineFormat text={block} />
          </p>
        );
      })}
    </div>
  );
}

function InlineFormat({ text }: { text: string }) {
  // Bold and inline code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code key={i} className="px-1 py-0.5 rounded bg-secondary text-xs font-mono">
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
