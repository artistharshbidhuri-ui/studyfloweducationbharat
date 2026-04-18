import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useProfile, useTasks, todayKey } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Calendar, Clock, Loader2, Wand2 } from "lucide-react";
import { generateStudyPlan } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Study Planner — StudyFlow AI" },
      { name: "description", content: "Get a personalized chapter-wise study plan based on your NCERT syllabus, board exam date, and daily schedule." },
      { property: "og:title", content: "AI Study Planner — StudyFlow AI" },
      { property: "og:description", content: "Personalized NCERT-based study schedule for Indian students." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const [profile, setProfile] = useProfile();
  if (!profile) return <Onboarding />;
  return <Planner />;
}

type GeneratedPlan = Awaited<ReturnType<typeof generateStudyPlan>>;

function Planner() {
  const [profile, setProfile] = useProfile();
  const [, setTasks] = useTasks();
  const [examDate, setExamDate] = useState(profile?.examDate ?? "");
  const [dailyHours, setDailyHours] = useState(profile?.dailyHours ?? 2);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);

  if (!profile) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateStudyPlan({
        data: {
          studentClass: profile.studentClass,
          board: profile.board,
          stream: profile.stream,
          subjects: profile.subjects,
          examDate: examDate || undefined,
          dailyHours,
        },
      });
      setPlan(result);
      setProfile({ ...profile, examDate, dailyHours });
      toast.success("Plan generated! Review and add to your schedule.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!plan) return;
    const today = new Date();
    const newTasks = plan.days.flatMap((day, dayIdx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + dayIdx);
      const dateStr = date.toISOString().slice(0, 10);
      return day.tasks.map((t, i) => ({
        id: `${dateStr}-${dayIdx}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        date: dateStr,
        subject: t.subject,
        chapter: t.chapter,
        duration: t.duration,
        type: t.type,
        done: false,
      }));
    });
    setTasks((prev) => {
      // remove future tasks (today onward) and replace
      const past = prev.filter((t) => t.date < todayKey());
      return [...past, ...newTasks];
    });
    toast.success("Plan added to your schedule! 🎉");
    setPlan(null);
  };

  return (
    <AppShell subtitle="Smart planner" title="Plan your week">
      <div className="mt-2 rounded-3xl border border-border gradient-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sm">AI Study Planner</h2>
            <p className="text-xs text-muted-foreground">NCERT-aligned, exam-focused</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Subjects
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.subjects.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-primary/15 text-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Daily study hours
            </Label>
            <div className="grid grid-cols-6 gap-1.5 mt-2">
              {[1, 2, 3, 4, 5, 6].map((h) => (
                <button
                  key={h}
                  onClick={() => setDailyHours(h)}
                  className={cn(
                    "h-10 rounded-xl border text-sm font-semibold transition-all",
                    dailyHours === h
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Exam date (optional)
            </Label>
            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-2 h-11 rounded-xl"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12 rounded-xl gradient-primary glow-primary text-primary-foreground font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating your plan…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI plan
              </>
            )}
          </Button>
        </div>
      </div>

      {plan && (
        <div className="mt-5">
          <div className="rounded-2xl bg-accent/15 border border-accent/30 p-4 mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-accent mb-1">💡 Tip</div>
            <p className="text-sm">{plan.tip}</p>
          </div>

          <div className="space-y-3">
            {plan.days.map((day, i) => (
              <div key={i} className="rounded-2xl border border-border gradient-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">{day.day}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {day.tasks.reduce((a, t) => a + t.duration, 0)} min
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {day.tasks.map((t, j) => (
                    <div key={j} className="px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary uppercase tracking-wide">
                            {t.subject}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary capitalize text-muted-foreground">
                            {t.type}
                          </span>
                        </div>
                        <div className="text-sm font-medium mt-0.5">{t.chapter}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {t.duration}m
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleApply}
            className="w-full h-12 rounded-xl gradient-success text-success-foreground font-semibold mt-4"
          >
            Add to my schedule
          </Button>
        </div>
      )}
    </AppShell>
  );
}
