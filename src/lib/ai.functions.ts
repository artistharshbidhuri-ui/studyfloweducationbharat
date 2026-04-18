import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

async function callAI(messages: { role: string; content: string }[], opts?: { tools?: unknown[]; tool_choice?: unknown }) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error("AI service is not configured. Please contact support.");
  }

  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
    messages,
  };
  if (opts?.tools) body.tools = opts.tools;
  if (opts?.tool_choice) body.tool_choice = opts.tool_choice;

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error("Too many requests right now. Please wait a moment and try again.");
  }
  if (res.status === 402) {
    throw new Error("AI usage limit reached. Please add credits to continue.");
  }
  if (!res.ok) {
    const text = await res.text();
    console.error("AI gateway error:", res.status, text);
    throw new Error("AI service is temporarily unavailable. Please try again.");
  }

  return res.json();
}

// ---------- DOUBT SOLVER ----------
const doubtSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  language: z.enum(["english", "hinglish"]),
  studentClass: z.number().min(6).max(12),
  board: z.string().min(1).max(20),
  subject: z.string().max(50).optional(),
});

export const solveDoubt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => doubtSchema.parse(input))
  .handler(async ({ data }) => {
    const langInstruction =
      data.language === "hinglish"
        ? "Respond in Hinglish (mix of Hindi written in Roman script and English). Be friendly and casual. Example: 'Yeh chapter bahut important hai for board exams.'"
        : "Respond in clear, simple English.";

    const systemPrompt = `You are StudyFlow AI, an expert tutor for Indian students (Class ${data.studentClass}, ${data.board} board${data.subject ? `, subject: ${data.subject}` : ""}).

${langInstruction}

Your job:
1. Give a SIMPLE explanation (2-3 lines) — like a friend explaining
2. Provide STEP-BY-STEP solution (numbered steps)
3. Add a "Board Exam Answer" section formatted as a 3-5 mark answer (concise, key points, definitions if needed)

Stay STRICTLY focused on NCERT curriculum. Use markdown headings (### Simple Explanation, ### Step-by-Step, ### Board Exam Answer). Avoid jargon. Keep it crisp.`;

    const result = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: data.question },
    ]);

    const answer = result.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate an answer.";
    return { answer };
  });

// ---------- STUDY PLAN ----------
const planSchema = z.object({
  studentClass: z.number().min(6).max(12),
  board: z.string().min(1).max(20),
  stream: z.string().max(30).optional(),
  subjects: z.array(z.string().min(1).max(50)).min(1).max(8),
  examDate: z.string().max(20).optional(),
  dailyHours: z.number().min(1).max(12),
});

export const generateStudyPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => planSchema.parse(input))
  .handler(async ({ data }) => {
    const systemPrompt = `You are an expert study planner for Indian school students. Create a realistic, exam-focused weekly plan based on NCERT syllabus.`;

    const userPrompt = `Create a 7-day study plan for:
- Class ${data.studentClass} (${data.board}${data.stream ? `, ${data.stream}` : ""})
- Subjects: ${data.subjects.join(", ")}
- Daily study time: ${data.dailyHours} hours
${data.examDate ? `- Exam date: ${data.examDate}` : "- No specific exam date"}

Pick the most important NCERT chapters. Mix study + revision + practice. Keep tasks 30–60 minutes each.`;

    const result = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "create_study_plan",
              description: "Output a structured 7-day study plan",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string", description: "Day label like 'Day 1', 'Day 2'" },
                        tasks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              subject: { type: "string" },
                              chapter: { type: "string", description: "NCERT chapter or topic" },
                              duration: { type: "number", description: "Minutes" },
                              type: { type: "string", enum: ["study", "revision", "practice"] },
                            },
                            required: ["subject", "chapter", "duration", "type"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["day", "tasks"],
                      additionalProperties: false,
                    },
                  },
                  tip: { type: "string", description: "One short motivating tip for the week" },
                },
                required: ["days", "tip"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_study_plan" } },
      },
    );

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a valid plan. Please try again.");
    }
    const parsed = JSON.parse(toolCall.function.arguments) as {
      days: { day: string; tasks: { subject: string; chapter: string; duration: number; type: "study" | "revision" | "practice" }[] }[];
      tip: string;
    };
    return parsed;
  });

// ---------- CAREER GUIDANCE ----------
const careerSchema = z.object({
  studentClass: z.number().min(6).max(12),
  stream: z.string().max(30).optional(),
  interests: z.string().trim().min(3).max(500),
  strengths: z.string().trim().min(3).max(500),
  language: z.enum(["english", "hinglish"]),
});

export const careerGuidance = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => careerSchema.parse(input))
  .handler(async ({ data }) => {
    const langInstruction =
      data.language === "hinglish"
        ? "Use Hinglish (Hindi in Roman script + English) where natural. Friendly tone."
        : "Use clear simple English.";

    const systemPrompt = `You are a career counselor for Indian students. Recommend India-relevant careers.
${langInstruction}
Focus on Indian career paths: Engineering (JEE), Medical (NEET), CA/CS/CMA, Design (NID/NIFT/UCEED), Government jobs (UPSC, SSC, Banking), Defence (NDA), Law (CLAT), Hotel Management, Pure Sciences, Commerce careers, Liberal Arts.

For each career: include required exams (JEE Main, NEET, CUET, CLAT, etc.), study path, and a short roadmap.`;

    const userPrompt = `Student profile:
- Class ${data.studentClass}${data.stream ? ` (${data.stream})` : ""}
- Interests: ${data.interests}
- Strengths: ${data.strengths}

Suggest 3 best-fit Indian career paths.`;

    const result = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "career_recommendations",
              description: "Recommend 3 Indian career paths with roadmaps",
              parameters: {
                type: "object",
                properties: {
                  careers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        whyFit: { type: "string", description: "1-2 sentences" },
                        requiredExams: { type: "array", items: { type: "string" } },
                        roadmap: { type: "array", items: { type: "string" }, description: "5-6 step roadmap" },
                        topColleges: { type: "array", items: { type: "string" }, description: "2-4 Indian colleges" },
                      },
                      required: ["title", "whyFit", "requiredExams", "roadmap", "topColleges"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["careers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "career_recommendations" } },
      },
    );

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return valid recommendations. Please try again.");
    }
    return JSON.parse(toolCall.function.arguments) as {
      careers: {
        title: string;
        whyFit: string;
        requiredExams: string[];
        roadmap: string[];
        topColleges: string[];
      }[];
    };
  });
