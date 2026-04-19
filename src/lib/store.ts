// Local-storage backed store with React subscribe pattern
import { useEffect, useState } from "react";
import type {
  Profile,
  Task,
  ChatMessage,
  DayLog,
  QuizAttempt,
  SkillPlan,
  Gamification,
} from "./education";

const KEYS = {
  profile: "studyflow:profile",
  tasks: "studyflow:tasks",
  chat: "studyflow:chat",
  logs: "studyflow:logs",
  quizzes: "studyflow:quizzes",
  skill: "studyflow:skill",
  game: "studyflow:game",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function useStored<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(read(key, fallback));
    const handler = (e: StorageEvent) => {
      if (e.key === key || e.key === null) setValue(read(key, fallback));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      write(key, next);
      return next;
    });
  };
  return [value, update];
}

export const useProfile = () => useStored<Profile | null>(KEYS.profile, null);
export const useTasks = () => useStored<Task[]>(KEYS.tasks, []);
export const useChat = () => useStored<ChatMessage[]>(KEYS.chat, []);
export const useLogs = () => useStored<DayLog[]>(KEYS.logs, []);
export const useQuizzes = () => useStored<QuizAttempt[]>(KEYS.quizzes, []);
export const useSkill = () => useStored<SkillPlan | null>(KEYS.skill, null);
export const useGame = () =>
  useStored<Gamification>(KEYS.game, { points: 0, badges: [] });

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeStreak(logs: DayLog[]): number {
  if (logs.length === 0) return 0;
  const set = new Set(logs.filter((l) => l.minutes > 0).map((l) => l.date));
  let streak = 0;
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) {
    d.setDate(d.getDate() - 1);
  }
  while (set.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function logProgress(minutes: number, tasksDone: number) {
  const date = todayKey();
  const logs = read<DayLog[]>(KEYS.logs, []);
  const existing = logs.find((l) => l.date === date);
  if (existing) {
    existing.minutes += minutes;
    existing.tasksDone += tasksDone;
  } else {
    logs.push({ date, minutes, tasksDone });
  }
  write(KEYS.logs, logs);
}

export function addPoints(points: number, badges: string[] = []) {
  const game = read<Gamification>(KEYS.game, { points: 0, badges: [] });
  game.points += points;
  for (const b of badges) {
    if (!game.badges.includes(b)) game.badges.push(b);
  }
  write(KEYS.game, game);
}

export function recordQuizAttempt(attempt: QuizAttempt) {
  const list = read<QuizAttempt[]>(KEYS.quizzes, []);
  list.unshift(attempt);
  write(KEYS.quizzes, list.slice(0, 100));
}

// ---------- Weakness detection ----------
export interface WeaknessInsight {
  subject: string;
  reason: string;
  severity: "low" | "medium" | "high";
  topic?: string;
}

export function detectWeaknesses(
  tasks: Task[],
  quizzes: QuizAttempt[],
  chat: ChatMessage[],
): WeaknessInsight[] {
  const insights: WeaknessInsight[] = [];
  const subjectStats = new Map<
    string,
    { total: number; done: number; skipped: number; quizCorrect: number; quizTotal: number; doubts: number }
  >();

  const get = (s: string) => {
    if (!subjectStats.has(s))
      subjectStats.set(s, { total: 0, done: 0, skipped: 0, quizCorrect: 0, quizTotal: 0, doubts: 0 });
    return subjectStats.get(s)!;
  };

  // tasks past 14 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  for (const t of tasks) {
    if (new Date(t.date) < cutoff) continue;
    const s = get(t.subject);
    s.total++;
    if (t.done) s.done++;
    else if (new Date(t.date) < new Date(todayKey())) s.skipped++;
  }

  for (const q of quizzes.slice(0, 30)) {
    const s = get(q.subject);
    s.quizCorrect += q.correct;
    s.quizTotal += q.total;
  }

  // Doubt heuristic: count subject mention in user messages
  for (const m of chat.slice(-30)) {
    if (m.role !== "user") continue;
    const lower = m.content.toLowerCase();
    for (const subj of subjectStats.keys()) {
      if (lower.includes(subj.toLowerCase())) {
        get(subj).doubts++;
      }
    }
  }

  for (const [subject, s] of subjectStats) {
    const completion = s.total ? s.done / s.total : 1;
    const accuracy = s.quizTotal ? s.quizCorrect / s.quizTotal : 1;
    if (s.skipped >= 2 && completion < 0.5) {
      insights.push({
        subject,
        reason: `Skipped ${s.skipped} ${subject} tasks recently`,
        severity: "high",
      });
    } else if (s.quizTotal >= 5 && accuracy < 0.5) {
      insights.push({
        subject,
        reason: `Only ${Math.round(accuracy * 100)}% accuracy on ${subject} quizzes`,
        severity: "high",
      });
    } else if (s.doubts >= 2) {
      insights.push({
        subject,
        reason: `Asked ${s.doubts} doubts about ${subject}`,
        severity: "medium",
      });
    } else if (s.skipped >= 1 && completion < 0.7) {
      insights.push({
        subject,
        reason: `Low completion in ${subject}`,
        severity: "low",
      });
    }
  }

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// Subject-wise stats for charts
export function subjectStats(tasks: Task[], quizzes: QuizAttempt[]) {
  const map = new Map<string, { studyMin: number; quizAcc: number; quizCount: number }>();
  for (const t of tasks) {
    if (!t.done) continue;
    const e = map.get(t.subject) ?? { studyMin: 0, quizAcc: 0, quizCount: 0 };
    e.studyMin += t.duration;
    map.set(t.subject, e);
  }
  for (const q of quizzes) {
    const e = map.get(q.subject) ?? { studyMin: 0, quizAcc: 0, quizCount: 0 };
    e.quizAcc = (e.quizAcc * e.quizCount + (q.correct / q.total) * 100) / (e.quizCount + 1);
    e.quizCount++;
    map.set(q.subject, e);
  }
  return Array.from(map.entries()).map(([subject, v]) => ({ subject, ...v }));
}
