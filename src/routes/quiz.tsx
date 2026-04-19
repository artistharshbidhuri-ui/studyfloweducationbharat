import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useProfile,
  useQuizzes,
  useGame,
  recordQuizAttempt,
  addPoints,
  todayKey,
} from "@/lib/store";
import { getSubjectsFor, levelFromPoints } from "@/lib/education";
import type { QuizMode, QuizQuestion, QuizAttempt } from "@/lib/education";
import { generateQuiz } from "@/lib/ai.functions";
import {
  Brain,
  Zap,
  Trophy,
  Clock,
  Check,
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Mode — StudyFlow AI" },
      { name: "description", content: "AI-generated quizzes for CBSE/ICSE/State Board students. Practice MCQs, rapid fire and exam simulation." },
      { property: "og:title", content: "Quiz Mode — StudyFlow AI" },
      { property: "og:description", content: "Gamified quizzes aligned with NCERT syllabus." },
    ],
  }),
  component: QuizPage,
});

type Phase = "select" | "loading" | "playing" | "result";

const MODES: { id: QuizMode; title: string; desc: string; icon: typeof Brain; tone: string }[] = [
  {
    id: "chapter",
    title: "Chapter Mastery",
    desc: "10 MCQs from one chapter, easy to hard",
    icon: Brain,
    tone: "from-primary to-accent",
  },
  {
    id: "rapid",
    title: "Rapid Fire",
    desc: "10 quick questions, 30 sec each",
    icon: Zap,
    tone: "from-streak to-warning",
  },
  {
    id: "exam",
    title: "Exam Simulation",
    desc: "Mixed chapter, marks-based, timed",
    icon: Trophy,
    tone: "from-success to-accent",
  },
];

function QuizPage() {
  const [profile] = useProfile();
  const [quizzes] = useQuizzes();
  const [game] = useGame();
  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<QuizMode>("chapter");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [timer, setTimer] = useState(30);

  const subjects = useMemo(() => (profile ? getSubjectsFor(profile) : []), [profile]);
  const level = levelFromPoints(game.points);

  // Per-question timer for rapid + exam
  const useTimer = mode === "rapid" || mode === "exam";
  useEffect(() => {
    if (phase !== "playing" || !useTimer) return;
    setTimer(mode === "rapid" ? 30 : 60);
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          handlePick(-1, true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  if (!profile) {
    return (
      <AppShell title="Quiz">
        <p className="text-sm text-muted-foreground">Complete onboarding first.</p>
      </AppShell>
    );
  }

  const start = async () => {
    if (!subject) {
      toast.error("Pick a subject first");
      return;
    }
    setPhase("loading");
    try {
      const res = await generateQuiz({
        data: {
          studentClass: profile.studentClass,
          board: profile.board,
          subject,
          chapter: chapter || undefined,
          mode,
          count: mode === "rapid" ? 10 : 10,
          language: profile.language,
        },
      });
      const qs: QuizQuestion[] = res.questions.map((q, i) => ({
        id: String(i),
        ...q,
      }));
      setQuestions(qs);
      setIdx(0);
      setPicked(null);
      setAnswers([]);
      setStartedAt(Date.now());
      setPhase("playing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate quiz");
      setPhase("select");
    }
  };

  const handlePick = (i: number, fromTimeout = false) => {
    if (picked !== null && !fromTimeout) return;
    setPicked(i);
    if (mode === "rapid") {
      // auto-advance fast
      setTimeout(() => next(i), 600);
    }
  };

  const next = (overridePick?: number) => {
    const choice = overridePick ?? picked ?? -1;
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);
    if (idx + 1 >= questions.length) {
      finish(newAnswers);
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  const finish = (allAnswers: number[]) => {
    const correct = allAnswers.reduce(
      (acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0),
      0,
    );
    const total = questions.length;
    const timeSec = Math.round((Date.now() - startedAt) / 1000);
    const points =
      correct * (mode === "exam" ? 15 : mode === "rapid" ? 8 : 10) +
      (correct === total ? 25 : 0);

    const newBadges: string[] = [];
    if (quizzes.length === 0) newBadges.push("first_quiz");
    if (correct / total >= 0.9) newBadges.push("quiz_master");
    if (mode === "rapid") newBadges.push("rapid_fire");

    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      date: todayKey(),
      mode,
      subject,
      chapter: chapter || undefined,
      total,
      correct,
      timeSeconds: timeSec,
      pointsEarned: points,
    };
    recordQuizAttempt(attempt);
    addPoints(points, newBadges);
    if (newBadges.length) {
      toast.success(`🎉 Earned ${newBadges.length} badge${newBadges.length > 1 ? "s" : ""}!`);
    }
    setPhase("result");
  };

  const reset = () => {
    setPhase("select");
    setQuestions([]);
    setSubject("");
    setChapter("");
  };

  // ----- Render phases -----
  if (phase === "loading") {
    return (
      <AppShell title="Generating quiz" subtitle="Hang tight">
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center animate-pulse glow-primary">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">AI is crafting your questions…</p>
        </div>
      </AppShell>
    );
  }

  if (phase === "playing" && questions[idx]) {
    const q = questions[idx];
    const showFeedback = picked !== null;
    return (
      <AppShell
        title={`Question ${idx + 1}/${questions.length}`}
        subtitle={`${subject}${chapter ? ` • ${chapter}` : ""}`}
      >
        <Progress value={((idx + (showFeedback ? 1 : 0)) / questions.length) * 100} className="mt-2" />
        {useTimer && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className={cn("font-bold", timer <= 5 && "text-destructive")}>{timer}s</span>
            <span className="capitalize ml-auto px-2 py-0.5 rounded bg-secondary">{q.difficulty}</span>
          </div>
        )}
        <div className="mt-4 rounded-3xl border border-border gradient-card p-5">
          <p className="font-semibold leading-relaxed">{q.question}</p>
          {q.marks && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-accent">
              {q.marks} marks
            </span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isPicked = picked === i;
            return (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={showFeedback}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-3",
                  !showFeedback && "border-border gradient-card hover:border-primary/40 active:scale-[0.99]",
                  showFeedback && isCorrect && "border-success/60 bg-success/15",
                  showFeedback && isPicked && !isCorrect && "border-destructive/60 bg-destructive/15",
                  showFeedback && !isCorrect && !isPicked && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                    showFeedback && isCorrect && "bg-success border-success text-success-foreground",
                    showFeedback && isPicked && !isCorrect && "bg-destructive border-destructive text-destructive-foreground",
                    !showFeedback && "border-muted-foreground",
                  )}
                >
                  {showFeedback && isCorrect ? <Check className="h-4 w-4" /> : showFeedback && isPicked ? <X className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm">{opt}</span>
              </button>
            );
          })}
        </div>
        {showFeedback && (
          <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
              Explanation
            </div>
            <p className="text-sm text-foreground/90">{q.explanation}</p>
          </div>
        )}
        {showFeedback && mode !== "rapid" && (
          <Button onClick={() => next()} className="mt-5 w-full rounded-2xl h-12 gradient-primary text-primary-foreground font-bold">
            {idx + 1 >= questions.length ? "See Results" : "Next Question"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </AppShell>
    );
  }

  if (phase === "result") {
    const correct = answers.reduce(
      (acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0),
      0,
    );
    const pct = Math.round((correct / questions.length) * 100);
    const pointsEarned = quizzes[0]?.pointsEarned ?? 0;
    return (
      <AppShell title="Results" subtitle="Quiz complete">
        <div className={cn(
          "mt-2 rounded-3xl p-6 text-center relative overflow-hidden",
          pct >= 80 ? "gradient-success" : pct >= 50 ? "gradient-primary" : "gradient-streak",
        )}>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative">
            <Trophy className="h-12 w-12 text-primary-foreground mx-auto mb-2" />
            <div className="text-6xl font-bold text-primary-foreground">{pct}%</div>
            <div className="text-sm text-primary-foreground/80 mt-1">
              {correct} of {questions.length} correct
            </div>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-primary-foreground">
              <Sparkles className="h-3 w-3" /> +{pointsEarned} points
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border gradient-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Level</div>
            <div className="text-lg font-bold mt-0.5">{level.level}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total points</div>
            <div className="text-lg font-bold">{game.points}</div>
          </div>
        </div>
        <Progress value={level.progress} className="mt-2" />

        <h3 className="mt-6 text-sm font-bold">Review</h3>
        <div className="mt-2 space-y-2">
          {questions.map((q, i) => {
            const ok = answers[i] === q.correctIndex;
            return (
              <div key={q.id} className={cn("rounded-2xl border p-3", ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
                <div className="flex items-start gap-2">
                  <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5", ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{q.question}</p>
                    {!ok && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Correct: <span className="text-success font-semibold">{q.options[q.correctIndex]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={reset} className="mt-5 w-full rounded-2xl h-12 gradient-primary text-primary-foreground font-bold">
          <RotateCcw className="h-4 w-4 mr-2" /> New Quiz
        </Button>
      </AppShell>
    );
  }

  // SELECT phase
  const recent = quizzes.slice(0, 3);
  return (
    <AppShell title="Quiz" subtitle="Learn by playing">
      {/* Level + points */}
      <div className="rounded-3xl gradient-primary p-5 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary-foreground/80 font-bold">Level</div>
            <div className="text-3xl font-bold text-primary-foreground mt-1">{level.level}</div>
            <div className="text-xs text-primary-foreground/80 mt-0.5">{game.points} points</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-primary-foreground/80 font-bold">Badges</div>
            <div className="text-2xl mt-1">{game.badges.length > 0 ? game.badges.slice(0, 4).map(b => "🏅").join("") : "—"}</div>
            <div className="text-xs text-primary-foreground/80">{game.badges.length} earned</div>
          </div>
        </div>
        <Progress value={level.progress} className="mt-3 bg-white/20" />
      </div>

      {/* Mode picker */}
      <h3 className="mt-5 text-sm font-bold">Pick a mode</h3>
      <div className="mt-2 space-y-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "w-full rounded-2xl border p-4 text-left flex items-center gap-3 transition-all",
              mode === m.id ? "border-primary/60 bg-primary/10 glow-primary" : "border-border gradient-card",
            )}
          >
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0", m.tone)}>
              <m.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{m.title}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </div>
            {mode === m.id && <Check className="h-5 w-5 text-primary" />}
          </button>
        ))}
      </div>

      {/* Subject + chapter */}
      <div className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                  subject === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {mode === "chapter" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chapter (optional)</label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Trigonometry, Cell Structure"
              className="mt-2 w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      <Button
        onClick={start}
        disabled={!subject}
        className="mt-5 w-full rounded-2xl h-12 gradient-primary text-primary-foreground font-bold disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4 mr-2" /> Start Quiz
      </Button>

      {recent.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-bold">Recent attempts</h3>
          <div className="mt-2 space-y-2">
            {recent.map((q) => (
              <div key={q.id} className="rounded-2xl border border-border gradient-card p-3 flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                  q.correct / q.total >= 0.7 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                  {Math.round((q.correct / q.total) * 100)}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{q.subject}{q.chapter ? ` • ${q.chapter}` : ""}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{q.mode} • {q.correct}/{q.total} • +{q.pointsEarned}pts</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
