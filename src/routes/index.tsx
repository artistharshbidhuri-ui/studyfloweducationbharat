import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useProfile, useTasks, useLogs, computeStreak, todayKey, logProgress } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import {
  Flame,
  Clock,
  BookOpen,
  Target,
  ArrowRight,
  Sparkles,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyFlow AI — Smart Study Companion for Indian Students" },
      {
        name: "description",
        content:
          "AI-powered study planner, doubt solver and career guide for CBSE, ICSE & State Board students from Class 6 to 12.",
      },
      { property: "og:title", content: "StudyFlow AI — Smart Study Companion" },
      {
        property: "og:description",
        content:
          "Plan studies, solve doubts in Hinglish, track streaks, and get career guidance — all in one app.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [profile] = useProfile();
  if (!profile) return <Onboarding />;
  return <Dashboard />;
}

function Dashboard() {
  const [profile] = useProfile();
  const [tasks, setTasks] = useTasks();
  const [logs] = useLogs();

  if (!profile) return null;

  const today = todayKey();
  const todayTasks = tasks.filter((t) => t.date === today);
  const completedToday = todayTasks.filter((t) => t.done).length;
  const totalToday = todayTasks.length;
  const streak = computeStreak(logs);
  const minutesToday = logs.find((l) => l.date === today)?.minutes ?? 0;
  const weekLogs = lastNDays(7).map((date) => logs.find((l) => l.date === date)?.minutes ?? 0);
  const weekTotal = weekLogs.reduce((a, b) => a + b, 0);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nowDone = !t.done;
        if (nowDone) logProgress(t.duration, 1);
        else logProgress(-t.duration, -1);
        return { ...t, done: nowDone };
      }),
    );
  };

  const greeting = greetingFor(new Date());

  return (
    <AppShell subtitle={greeting} title={`Hi ${profile.name} 👋`}>
      {/* Streak hero */}
      <div className="mt-2 rounded-3xl gradient-streak p-5 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute right-4 bottom-4 h-16 w-16 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-warning-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-warning-foreground/80">
                Streak
              </span>
            </div>
            <div className="mt-1 text-5xl font-bold text-warning-foreground">{streak}</div>
            <div className="text-sm text-warning-foreground/80">
              {streak === 1 ? "day" : "days"} in a row
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-warning-foreground/80 font-bold">
              Today
            </div>
            <div className="text-3xl font-bold text-warning-foreground mt-1">{minutesToday}m</div>
            <div className="text-xs text-warning-foreground/80">studied</div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Today"
          value={`${completedToday}/${totalToday || 0}`}
          sub="tasks done"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="This week"
          value={`${Math.round(weekTotal / 60)}h`}
          sub={`${weekTotal} min`}
        />
      </div>

      {/* Week chart */}
      <div className="mt-3 rounded-3xl border border-border gradient-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold">This week</h2>
            <p className="text-xs text-muted-foreground">Daily study minutes</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 h-24">
          {weekLogs.map((m, i) => {
            const max = Math.max(...weekLogs, 60);
            const h = Math.max(6, (m / max) * 96);
            const isToday = i === weekLogs.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    isToday ? "gradient-primary" : "bg-secondary",
                  )}
                  style={{ height: `${h}px` }}
                />
                <span
                  className={cn(
                    "text-[10px]",
                    isToday ? "text-primary font-bold" : "text-muted-foreground",
                  )}
                >
                  {dayLabel(i)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's plan */}
      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Today's plan
        </h2>
        <Link to="/planner" className="text-xs text-primary font-semibold flex items-center gap-1">
          Plan more <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {totalToday === 0 ? (
        <Link
          to="/planner"
          className="mt-3 block rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
          <div className="font-semibold">Generate your first plan</div>
          <div className="text-xs text-muted-foreground mt-1">
            AI will create a chapter-wise schedule for you
          </div>
        </Link>
      ) : (
        <div className="mt-3 space-y-2">
          {todayTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                t.done
                  ? "border-success/40 bg-success/10"
                  : "border-border gradient-card hover:border-primary/40",
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  t.done ? "bg-success border-success" : "border-muted-foreground",
                )}
              >
                {t.done && (
                  <Check className="h-3.5 w-3.5 text-success-foreground" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">
                    {t.subject}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">
                    {t.type}
                  </span>
                </div>
                <div
                  className={cn(
                    "text-sm font-medium mt-0.5 truncate",
                    t.done && "line-through opacity-60",
                  )}
                >
                  {t.chapter}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t.duration}m
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          to="/doubt"
          className="rounded-2xl border border-border gradient-card p-4 hover:border-primary/40 transition-colors"
        >
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary mb-2">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="font-semibold text-sm">Solve a doubt</div>
          <div className="text-xs text-muted-foreground mt-0.5">Ask anything in Hinglish</div>
        </Link>
        <Link
          to="/career"
          className="rounded-2xl border border-border gradient-card p-4 hover:border-primary/40 transition-colors"
        >
          <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="font-semibold text-sm">Career path</div>
          <div className="text-xs text-muted-foreground mt-0.5">Find your fit</div>
        </Link>
      </div>

      {/* Profile pill */}
      <div className="mt-6 mb-2 rounded-2xl border border-border bg-secondary/30 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Your profile
          </div>
          <div className="text-sm font-medium mt-1">
            Class {profile.studentClass} • {profile.board}
            {profile.stream ? ` • ${profile.stream.replace("Science-", "")}` : ""}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Reset profile and start over?")) {
              localStorage.removeItem("studyflow:profile");
              window.location.reload();
            }
          }}
          className="rounded-xl text-xs"
        >
          Edit
        </Button>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border gradient-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function dayLabel(i: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
