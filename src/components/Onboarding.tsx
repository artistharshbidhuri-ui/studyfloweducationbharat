import { useState } from "react";
import { useProfile } from "@/lib/store";
import { BOARDS, STREAMS, getSubjectsFor, type Board, type Stream } from "@/lib/education";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, GraduationCap, Languages } from "lucide-react";

export function Onboarding() {
  const [, setProfile] = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState<number>(10);
  const [board, setBoard] = useState<Board>("CBSE");
  const [stream, setStream] = useState<Stream>("Science-PCM");
  const [dailyHours, setDailyHours] = useState(2);
  const [language, setLanguage] = useState<"english" | "hinglish">("english");

  const finish = () => {
    const subjects = getSubjectsFor({ studentClass, stream });
    setProfile({
      name: name.trim() || "Student",
      studentClass,
      board,
      stream: studentClass >= 11 ? stream : undefined,
      subjects,
      dailyHours,
      language,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary glow-primary mb-4">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">
            Welcome to <span className="text-gradient">StudyFlow AI</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Your AI study buddy for board exams 🇮🇳</p>
        </div>

        <div className="rounded-3xl border border-border gradient-card p-6 shadow-xl">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm">What's your name?</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav"
                  maxLength={50}
                  className="mt-2 h-12 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-sm">Preferred language</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["english", "hinglish"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`h-12 rounded-xl border text-sm font-medium transition-all ${
                        language === l
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Languages className="h-4 w-4 inline mr-1.5" />
                      {l === "english" ? "English" : "Hinglish"}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setStep(1)} className="w-full h-12 rounded-xl gradient-primary glow-primary text-primary-foreground font-semibold">
                Next
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm">Class</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                    <button
                      key={c}
                      onClick={() => setStudentClass(c)}
                      className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                        studentClass === c ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm">Board</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {BOARDS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setBoard(b.value)}
                      className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                        board === b.value ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              {studentClass >= 11 && (
                <div>
                  <Label className="text-sm">Stream</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {STREAMS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStream(s.value)}
                        className={`h-11 rounded-xl border text-xs font-medium transition-all ${
                          stream === s.value ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-12 rounded-xl">
                  Back
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm">Daily study time (hours)</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <button
                      key={h}
                      onClick={() => setDailyHours(h)}
                      className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                        dailyHours === h ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Your subjects
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {getSubjectsFor({ studentClass, stream }).map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-primary/15 text-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                  Back
                </Button>
                <Button onClick={finish} className="flex-1 h-12 rounded-xl gradient-primary glow-primary text-primary-foreground font-semibold">
                  Start Learning
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Your data stays on your device. No login needed.
        </p>
      </div>
    </div>
  );
}
