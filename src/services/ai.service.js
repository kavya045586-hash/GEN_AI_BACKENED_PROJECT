const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');

// ---------- schemas (validate whatever the AI returns) ----------
const str = z.preprocess((v) => v ?? '', z.string());
const arr = (item) => z.preprocess((v) => v ?? [], z.array(item));

const qaSchema = z.object({ question: str, intention: str, answer: str });

const reportSchema = z.object({
  title: str,
  matchScore: z.preprocess((v) => Number(v ?? 0), z.number().min(0).max(100)),
  technicalQuestions: arr(qaSchema),
  behavioralQuestions: arr(qaSchema),
  skillGaps: arr(
    z.object({
      skill: str,
      severity: z
        .preprocess((v) => String(v ?? 'medium').toLowerCase(), z.enum(['low', 'medium', 'high']))
        .catch('medium'),
    })
  ),
  preparationPlan: arr(
    z.object({
      day: z.preprocess((v) => Number(v ?? 0), z.number()),
      focus: str,
      tasks: arr(z.string()),
    })
  ),
});

const resumeSchema = z.object({
  name: str,
  email: str,
  phone: str,
  location: str,
  links: arr(z.string()),
  summary: str,
  skills: arr(z.string()),
  experience: arr(z.object({ title: str, company: str, dates: str, bullets: arr(z.string()) })),
  projects: arr(z.object({ name: str, dates: str, bullets: arr(z.string()) })),
  education: arr(z.object({ degree: str, institution: str, dates: str })),
});

// ---------- Gemini client ----------
let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is not set in .env');
    err.status = 500;
    throw err;
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const clip = (text, max = 12000) => String(text || '').slice(0, max);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Errors Google describes as temporary (overloaded, rate limited, server hiccup)
const isTemporary = (err) =>
  [429, 500, 503, 504].includes(err.status) ||
  /UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(String(err.message || ''));

async function askForJson(prompt, schema) {
  const ai = getClient();

  // Main model first, then an optional fallback model if the main one keeps failing
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash'];
  if (process.env.GEMINI_FALLBACK_MODEL) models.push(process.env.GEMINI_FALLBACK_MODEL);

  const MAX_ATTEMPTS = 4;
  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.4 },
        });

        const raw = (response.text || '')
          .replace(/^\s*```(?:json)?/i, '')
          .replace(/```\s*$/, '')
          .trim();

        const parsed = schema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
          const shapeError = new Error(`AI response had the wrong shape (${details})`);
          shapeError.retryable = true;
          throw shapeError;
        }
        return parsed.data;
      } catch (err) {
        lastError = err;
        const retryable = isTemporary(err) || err.retryable || err instanceof SyntaxError;
        if (!retryable) break; // e.g. bad API key or unknown model: go to the next model
        if (attempt < MAX_ATTEMPTS) {
          const wait = isTemporary(err) ? 2000 * 2 ** (attempt - 1) : 500; // 2s, 4s, 8s
          console.warn(`Gemini attempt ${attempt} on ${model} failed (${err.status || err.name}); retrying in ${wait}ms`);
          await sleep(wait);
        }
      }
    }
  }

  const busy = lastError && isTemporary(lastError);
  const err = new Error(
    busy
      ? 'The AI service is busy right now. Please try again in a minute.'
      : `AI generation failed: ${lastError ? lastError.message : 'unknown error'}`
  );
  err.status = busy ? 503 : 502;
  throw err;
}

// ---------- public functions ----------
async function generateInterviewReport({ resumeText, selfDescription, jobDescription }) {
  const prompt = `You are an expert technical interviewer and career coach.
Analyse the candidate against the job description and produce an interview preparation report.

RESUME:
${clip(resumeText) || '(not provided)'}

SELF DESCRIPTION:
${clip(selfDescription, 4000) || '(not provided)'}

JOB DESCRIPTION:
${clip(jobDescription)}

Return ONLY a JSON object with exactly this shape:
{
  "title": "the target job title taken from the job description",
  "matchScore": 0-100 integer showing how well the candidate fits the role,
  "technicalQuestions": [ { "question": "", "intention": "why the interviewer asks this", "answer": "a strong suggested answer tailored to this candidate" } ],
  "behavioralQuestions": [ { "question": "", "intention": "", "answer": "" } ],
  "skillGaps": [ { "skill": "", "severity": "low" | "medium" | "high" } ],
  "preparationPlan": [ { "day": 1, "focus": "", "tasks": ["", ""] } ]
}
Rules: give 6 to 8 technicalQuestions, 4 to 5 behavioralQuestions, a 7 day preparationPlan,
and only list real skill gaps based on the job description versus the resume.
Be specific to this candidate and role. Do not invent experience the candidate does not have.`;

  return askForJson(prompt, reportSchema);
}

async function generateResumeData({ resumeText, selfDescription, jobDescription }) {
  const prompt = `You are a professional resume writer.
Rewrite the candidate's resume so it is tailored to the job description.

CURRENT RESUME:
${clip(resumeText) || '(not provided)'}

SELF DESCRIPTION:
${clip(selfDescription, 4000) || '(not provided)'}

TARGET JOB DESCRIPTION:
${clip(jobDescription)}

Return ONLY a JSON object with exactly this shape:
{
  "name": "", "email": "", "phone": "", "location": "",
  "links": ["linkedin / github / portfolio urls"],
  "summary": "2-3 sentence professional summary aimed at this role",
  "skills": ["", ""],
  "experience": [ { "title": "", "company": "", "dates": "e.g. Jun 2024 - Aug 2024", "bullets": ["", ""] } ],
  "projects": [ { "name": "", "dates": "", "bullets": ["", ""] } ],
  "education": [ { "degree": "", "institution": "", "dates": "" } ]
}
Rules: use ONLY facts present in the resume or self description. Never invent employers, degrees,
dates, links, or numbers. Reorder and reword to highlight what matches the job description.
Use an empty string or empty array when something is unknown. Keep bullets short and action-oriented.`;

  return askForJson(prompt, resumeSchema);
}

module.exports = { generateInterviewReport, generateResumeData, schemas: { reportSchema, resumeSchema } };
