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
