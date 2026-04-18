import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useProfile } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Compass, GraduationCap, MapPin, BookCheck } from "lucide-react";
import { careerGuidance } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/career")({
  head: () => ({
    meta: [
      { title: "Career Guidance — StudyFlow AI" },
      {
        name: "description",
        content:
          "Discover the best Indian career paths based on your interests and strengths. Includes JEE, NEET, CUET, CLAT exam guidance and roadmaps.",
      },
      { property: "og:title", content: "Career Guidance for Indian Students" },
      {
        property: "og:description",
        content: "AI-powered career suggestions with exams, colleges, and step-by-step roadmaps.",
      },
    ],
  }),
  component: CareerPage,
});

function CareerPage() {
  const [profile] = useProfile();
  if (!profile) return <Onboarding />;
  return <Career />;
}

type CareerResult = Awaited<ReturnType<typeof careerGuidance>>;

function Career() {
  const [profile] = useProfile();
  const [interests, setInterests] = useState("");
  const [strengths, setStrengths] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CareerResult | null>(null);

  if (!profile) return null;

  const submit = async () => {
    if (interests.trim().length < 3 || strengths.trim().length < 3) {
      toast.error("Please tell us a bit more about your interests and strengths");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await careerGuidance({
        data: {
          studentClass: profile.studentClass,
          stream: profile.stream,
          interests: interests.trim(),
          strengths: strengths.trim(),
          language: profile.language,
        },
      });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell subtitle="Find your path" title="Career Guide">
      {!result && (
        <div className="mt-2 rounded-3xl border border-border gradient-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Tell us about yourself</h2>
              <p className="text-xs text-muted-foreground">India-focused career roadmaps</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                What are your interests?
              </Label>
              <Textarea
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. coding, drawing, business, helping people, science experiments..."
                maxLength={500}
                rows={3}
                className="mt-2 rounded-xl resize-none"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                What are you good at?
              </Label>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="e.g. maths, communication, memorising, problem-solving, art..."
                maxLength={500}
                rows={3}
                className="mt-2 rounded-xl resize-none"
              />
            </div>
            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary glow-primary text-primary-foreground font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Finding careers for you…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get my career path
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-2 space-y-4">
          <div className="rounded-2xl bg-accent/15 border border-accent/30 p-4">
            <p className="text-sm">
              <span className="font-bold text-accent">{result.careers.length} career paths</span>{" "}
              picked for you based on your profile
            </p>
          </div>

          {result.careers.map((c, i) => (
            <div key={i} className="rounded-3xl border border-border gradient-card overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/30">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{c.whyFit}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {c.requiredExams.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                      <BookCheck className="h-3.5 w-3.5" />
                      Required exams
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.requiredExams.map((e) => (
                        <span
                          key={e}
                          className="text-xs px-2.5 py-1 rounded-lg bg-primary/15 text-foreground font-semibold"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Roadmap
                  </div>
                  <ol className="space-y-2">
                    {c.roadmap.map((step, j) => (
                      <li key={j} className="flex gap-3 text-sm">
                        <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {j + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {c.topColleges.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Top colleges
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.topColleges.map((col) => (
                        <span
                          key={col}
                          className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-foreground"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button
            onClick={() => setResult(null)}
            variant="outline"
            className="w-full h-12 rounded-xl"
          >
            Try again with different inputs
          </Button>
        </div>
      )}
    </AppShell>
  );
}
