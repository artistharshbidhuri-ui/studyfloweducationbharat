// Indian education system data
export type Board = "CBSE" | "ICSE" | "State";
export type Stream = "Science-PCM" | "Science-PCB" | "Commerce" | "Arts";

export interface Profile {
  name: string;
  studentClass: number; // 6-12
  board: Board;
  stream?: Stream;
  subjects: string[];
  examDate?: string; // ISO
  dailyHours: number;
  language: "english" | "hinglish";
}

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  chapter: string;
  duration: number; // minutes
  type: "study" | "revision" | "practice";
  done: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DayLog {
  date: string;
  minutes: number;
  tasksDone: number;
  tasksSkipped?: number;
}

// ---------- QUIZ ----------
export type QuizMode = "chapter" | "rapid" | "exam";
export type Difficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // length 4
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
  marks?: number;
}

export interface QuizAttempt {
  id: string;
  date: string; // YYYY-MM-DD
  mode: QuizMode;
  subject: string;
  chapter?: string;
  total: number;
  correct: number;
  timeSeconds: number;
  pointsEarned: number;
}

// ---------- SKILLS ----------
export type SkillType = "drawing" | "music" | "dance";
export type SkillLevel = "beginner" | "intermediate";

export interface SkillTask {
  id: string;
  day: number; // 1..N
  title: string;
  description: string;
  durationMin: number;
  done: boolean;
}

export interface SkillUpload {
  id: string;
  date: string;
  taskId?: string;
  dataUrl: string; // base64 image
  feedback?: string;
  rating?: number; // 1..5
}

export interface SkillPlan {
  skill: SkillType;
  level: SkillLevel;
  dailyMinutes: number;
  startedAt: string;
  tasks: SkillTask[];
  uploads: SkillUpload[];
}

// ---------- GAMIFICATION ----------
export interface Gamification {
  points: number;
  badges: string[]; // badge ids
}

export const BADGES: Record<string, { name: string; emoji: string; desc: string }> = {
  first_quiz: { name: "First Quiz", emoji: "🎯", desc: "Completed your first quiz" },
  quiz_master: { name: "Quiz Master", emoji: "🏆", desc: "Score 90%+ on a quiz" },
  rapid_fire: { name: "Lightning", emoji: "⚡", desc: "Finish a Rapid Fire quiz" },
  streak_7: { name: "7-Day Streak", emoji: "🔥", desc: "7 days in a row" },
  skill_starter: { name: "Skill Starter", emoji: "🎨", desc: "Started a skill plan" },
  skill_5: { name: "5 Days Practice", emoji: "🌟", desc: "5 skill tasks done" },
};

export function levelFromPoints(points: number): { level: string; next: number; progress: number } {
  const tiers = [
    { name: "Beginner", at: 0 },
    { name: "Learner", at: 100 },
    { name: "Achiever", at: 300 },
    { name: "Expert", at: 700 },
    { name: "Master", at: 1500 },
  ];
  let current = tiers[0];
  let next = tiers[1];
  for (let i = 0; i < tiers.length; i++) {
    if (points >= tiers[i].at) {
      current = tiers[i];
      next = tiers[i + 1] ?? tiers[i];
    }
  }
  const span = next.at - current.at || 1;
  const progress = next === current ? 100 : Math.min(100, ((points - current.at) / span) * 100);
  return { level: current.name, next: next.at, progress };
}

export const BOARDS: { value: Board; label: string }[] = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "State", label: "State Board" },
];

export const STREAMS: { value: Stream; label: string }[] = [
  { value: "Science-PCM", label: "Science (PCM)" },
  { value: "Science-PCB", label: "Science (PCB)" },
  { value: "Commerce", label: "Commerce" },
  { value: "Arts", label: "Arts / Humanities" },
];

export const SUBJECTS_BY_CLASS: Record<number, Record<string, string[]>> = {
  6: { default: ["Maths", "Science", "Social Science", "English", "Hindi"] },
  7: { default: ["Maths", "Science", "Social Science", "English", "Hindi"] },
  8: { default: ["Maths", "Science", "Social Science", "English", "Hindi"] },
  9: { default: ["Maths", "Science", "Social Science", "English", "Hindi"] },
  10: { default: ["Maths", "Science", "Social Science", "English", "Hindi"] },
  11: {
    "Science-PCM": ["Physics", "Chemistry", "Maths", "English"],
    "Science-PCB": ["Physics", "Chemistry", "Biology", "English"],
    Commerce: ["Accountancy", "Business Studies", "Economics", "English"],
    Arts: ["History", "Political Science", "Geography", "English"],
  },
  12: {
    "Science-PCM": ["Physics", "Chemistry", "Maths", "English"],
    "Science-PCB": ["Physics", "Chemistry", "Biology", "English"],
    Commerce: ["Accountancy", "Business Studies", "Economics", "English"],
    Arts: ["History", "Political Science", "Geography", "English"],
  },
};

export function getSubjectsFor(profile: Pick<Profile, "studentClass" | "stream">): string[] {
  const classMap = SUBJECTS_BY_CLASS[profile.studentClass];
  if (!classMap) return ["Maths", "Science", "English"];
  if (profile.studentClass >= 11 && profile.stream && classMap[profile.stream]) {
    return classMap[profile.stream];
  }
  return classMap.default || Object.values(classMap)[0];
}
