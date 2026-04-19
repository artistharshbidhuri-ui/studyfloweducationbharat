import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useProfile,
  useSkill,
  useTasks,
  useGame,
  addPoints,
  todayKey,
} from "@/lib/store";
import type { SkillType, SkillLevel, SkillPlan } from "@/lib/education";
import { generateSkillPlan, critiqueDrawing } from "@/lib/ai.functions";
import {
  Palette,
  Music,
  Sparkles,
  Check,
  Upload,
  Star,
  Lightbulb,
  RotateCcw,
  Camera,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "Skill Growth — StudyFlow AI" },
      { name: "description", content: "Build creative skills daily — drawing, music, dance — with AI-guided practice and feedback." },
      { property: "og:title", content: "Skill Growth — StudyFlow AI" },
      { property: "og:description", content: "Daily creative practice with AI feedback." },
    ],
  }),
  component: SkillsPage,
});

const SKILL_META: Record<SkillType, { icon: typeof Palette; tone: string; emoji: string; supportsUpload: boolean }> = {
  drawing: { icon: Palette, tone: "from-primary to-accent", emoji: "🎨", supportsUpload: true },
  music: { icon: Music, tone: "from-streak to-warning", emoji: "🎵", supportsUpload: false },
  dance: { icon: Sparkles, tone: "from-success to-accent", emoji: "💃", supportsUpload: false },
};

function SkillsPage() {
  const [profile] = useProfile();
  const [skill, setSkill] = useSkill();
  const [tasks] = useTasks();
  const [game] = useGame();
  const [creating, setCreating] = useState(false);
  const [pickedSkill, setPickedSkill] = useState<SkillType>("drawing");
  const [pickedLevel, setPickedLevel] = useState<SkillLevel>("beginner");
  const [pickedTime, setPickedTime] = useState(20);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) {
    return (
      <AppShell title="Skills">
        <p className="text-sm text-muted-foreground">Complete onboarding first.</p>
      </AppShell>
    );
  }

  const today = todayKey();
  const todayStudyDone = tasks.some((t) => t.date === today && t.done);
  const studyPending = tasks.filter((t) => t.date === today && !t.done).length;

  const createPlan = async () => {
    setCreating(true);
    try {
      const res = await generateSkillPlan({
        data: {
          skill: pickedSkill,
          level: pickedLevel,
          dailyMinutes: pickedTime,
          days: 14,
        },
      });
      const plan: SkillPlan = {
        skill: pickedSkill,
        level: pickedLevel,
        dailyMinutes: pickedTime,
        startedAt: today,
        tasks: res.tasks.map((t, i) => ({
          id: crypto.randomUUID(),
          day: t.day ?? i + 1,
          title: t.title,
          description: t.description,
          durationMin: t.durationMin,
          done: false,
        })),
        uploads: [],
      };
      setSkill(plan);
      addPoints(15, ["skill_starter"]);
      toast.success("Skill plan created! 🎨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create plan");
    } finally {
      setCreating(false);
    }
  };

  const completeTask = (taskId: string) => {
    if (!skill) return;
    const updated = {
      ...skill,
      tasks: skill.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    };
    setSkill(updated);
    const becameDone = updated.tasks.find((t) => t.id === taskId)?.done;
    if (becameDone) {
      const doneCount = updated.tasks.filter((t) => t.done).length;
      const badges = doneCount === 5 ? ["skill_5"] : [];
      addPoints(20, badges);
      toast.success("+20 points");
    }
  };

  const handleUpload = async (file: File, taskId?: string) => {
    if (!skill) return;
    if (file.size > 5_000_000) {
      toast.error("Image too large. Please use under 5MB.");
      return;
    }
    setUploading(true);
    setActiveTaskId(taskId ?? null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const task = skill.tasks.find((t) => t.id === taskId);
        const fb = await critiqueDrawing({
          data: {
            imageDataUrl: dataUrl,
            level: skill.level,
            taskHint: task?.title,
          },
        });
        const upload = {
          id: crypto.randomUUID(),
          date: today,
          taskId,
          dataUrl,
          feedback: `${fb.praise}\n\n${fb.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
          rating: fb.rating,
        };
        setSkill({ ...skill, uploads: [upload, ...skill.uploads] });
        addPoints(10);
        toast.success("AI reviewed your drawing!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't review image");
      } finally {
        setUploading(false);
        setActiveTaskId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // ------- No plan yet -------
  if (!skill) {
    return (
      <AppShell title="Skills" subtitle="Grow creative side">
        <div className="rounded-3xl gradient-primary p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative">
            <Palette className="h-7 w-7 text-primary-foreground" />
            <h2 className="mt-2 text-2xl font-bold text-primary-foreground">Pick a skill</h2>
            <p className="text-sm text-primary-foreground/80 mt-1">
              AI builds you a 14-day practice plan
            </p>
          </div>
        </div>

        <h3 className="mt-5 text-sm font-bold">Skill</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(SKILL_META) as SkillType[]).map((s) => {
            const m = SKILL_META[s];
            return (
              <button
                key={s}
                onClick={() => setPickedSkill(s)}
                className={cn(
                  "rounded-2xl border p-4 text-center transition-all",
                  pickedSkill === s ? "border-primary/60 bg-primary/10 glow-primary" : "border-border gradient-card",
                )}
              >
                <div className="text-3xl">{m.emoji}</div>
                <div className="mt-1 text-xs font-semibold capitalize">{s}</div>
              </button>
            );
          })}
        </div>

        <h3 className="mt-5 text-sm font-bold">Level</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["beginner", "intermediate"] as SkillLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setPickedLevel(l)}
              className={cn(
                "rounded-2xl border p-3 text-sm font-semibold capitalize transition-all",
                pickedLevel === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40",
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <h3 className="mt-5 text-sm font-bold">Daily practice ({pickedTime} min)</h3>
        <input
          type="range"
          min={10}
          max={60}
          step={5}
          value={pickedTime}
          onChange={(e) => setPickedTime(Number(e.target.value))}
          className="mt-3 w-full accent-primary"
        />

        <Button
          onClick={createPlan}
          disabled={creating}
          className="mt-5 w-full rounded-2xl h-12 gradient-primary text-primary-foreground font-bold"
        >
          {creating ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" /> Creating plan…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" /> Generate Plan
            </>
          )}
        </Button>
      </AppShell>
    );
  }

  // ------- Active plan -------
  const meta = SKILL_META[skill.skill];
  const doneCount = skill.tasks.filter((t) => t.done).length;
  const total = skill.tasks.length;
  const todayTask = skill.tasks.find((t) => !t.done) ?? skill.tasks[skill.tasks.length - 1];

  return (
    <AppShell title="Skills" subtitle={`${skill.skill} • ${skill.level}`} rightSlot={
      <button
        onClick={() => {
          if (confirm("Reset skill plan?")) setSkill(null);
        }}
        className="text-xs text-muted-foreground hover:text-foreground p-2"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    }>
      {/* Hero */}
      <div className={cn("rounded-3xl bg-gradient-to-br p-5 relative overflow-hidden", meta.tone)}>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">{skill.skill}</div>
            <div className="mt-1 text-4xl font-bold text-primary-foreground">{doneCount}/{total}</div>
            <div className="text-sm text-primary-foreground/80">days done</div>
          </div>
          <div className="text-5xl">{meta.emoji}</div>
        </div>
        <Progress value={(doneCount / total) * 100} className="mt-3 bg-white/20" />
      </div>

      {/* Balance reminder */}
      {studyPending > 0 && (
        <div className="mt-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90">
            <span className="font-bold">Study first:</span> {studyPending} task{studyPending > 1 ? "s" : ""} pending today. Finish those, then practice your skill.
          </p>
        </div>
      )}

      {/* Today's task */}
      {todayTask && (
        <>
          <h3 className="mt-5 text-sm font-bold">Today's practice</h3>
          <div className={cn(
            "mt-2 rounded-3xl border p-5",
            todayTask.done ? "border-success/40 bg-success/10" : "border-border gradient-card",
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Day {todayTask.day}</div>
                <h4 className={cn("mt-1 text-lg font-bold", todayTask.done && "line-through opacity-60")}>{todayTask.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{todayTask.description}</p>
                <div className="text-xs text-muted-foreground mt-2">⏱️ {todayTask.durationMin} min</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => completeTask(todayTask.id)}
                className={cn(
                  "flex-1 rounded-2xl",
                  todayTask.done ? "bg-secondary text-foreground" : "gradient-primary text-primary-foreground",
                )}
              >
                <Check className="h-4 w-4 mr-1" />
                {todayTask.done ? "Done" : "Mark done"}
              </Button>
              {meta.supportsUpload && !todayTask.done && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f, todayTask.id);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded-2xl"
                  >
                    {uploading && activeTaskId === todayTask.id ? (
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
            {!meta.supportsUpload && (
              <p className="mt-3 text-[11px] text-muted-foreground italic">
                📹 Audio/video review coming soon
              </p>
            )}
          </div>
        </>
      )}

      {/* Recent uploads + AI feedback */}
      {skill.uploads.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-bold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" /> AI Feedback
          </h3>
          <div className="mt-2 space-y-3">
            {skill.uploads.slice(0, 3).map((u) => (
              <div key={u.id} className="rounded-2xl border border-border gradient-card p-3">
                <div className="flex gap-3">
                  <img
                    src={u.dataUrl}
                    alt="Drawing"
                    className="h-20 w-20 rounded-xl object-cover border border-border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            i < (u.rating ?? 0) ? "fill-warning text-warning" : "text-muted-foreground",
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs whitespace-pre-line text-foreground/85">{u.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Full plan */}
      <h3 className="mt-6 text-sm font-bold">14-Day plan</h3>
      <div className="mt-2 space-y-2">
        {skill.tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => completeTask(t.id)}
            className={cn(
              "w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all",
              t.done ? "border-success/30 bg-success/5" : "border-border gradient-card hover:border-primary/40",
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
              t.done ? "bg-success border-success text-success-foreground" : "border-muted-foreground text-muted-foreground",
            )}>
              {t.done ? <Check className="h-4 w-4" /> : t.day}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn("text-sm font-semibold truncate", t.done && "line-through opacity-60")}>{t.title}</div>
              <div className="text-[11px] text-muted-foreground">{t.durationMin} min</div>
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
