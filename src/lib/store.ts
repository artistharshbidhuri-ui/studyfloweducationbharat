// Local-storage backed store with React subscribe pattern
import { useEffect, useState } from "react";
import type { Profile, Task, ChatMessage, DayLog } from "./education";

const KEYS = {
  profile: "studyflow:profile",
  tasks: "studyflow:tasks",
  chat: "studyflow:chat",
  logs: "studyflow:logs",
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

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeStreak(logs: DayLog[]): number {
  if (logs.length === 0) return 0;
  const set = new Set(logs.filter((l) => l.minutes > 0).map((l) => l.date));
  let streak = 0;
  const d = new Date();
  // allow today not to count if no progress yet — start from yesterday in that case
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
