import type { Chapter, Course, ExperienceLevel, Subsection } from "@/lib/types";

export function buildSyllabusPrompt(topic: string, experienceLevel: ExperienceLevel) {
  return `You are a world-class curriculum designer and educator. A user wants to learn about the following topic:

TOPIC: "${topic}"
LEVEL: "${experienceLevel}" (beginner | intermediate | advanced)

Generate a comprehensive, well-structured course outline. Return ONLY valid JSON matching this schema:

{
  "title": "string — polished course title",
  "description": "string — 1-2 sentence course summary",
  "estimatedMinutes": number,
  "chapters": [
    {
      "order": number,
      "title": "string — clear, specific chapter title",
      "description": "string — what the learner will understand after this chapter",
      "estimatedMinutes": number,
      "subsections": [
        {
          "order": number,
          "title": "string — specific subsection title",
          "estimatedMinutes": number
        }
      ]
    }
  ]
}

Guidelines:
- Target 8-15 chapters depending on topic breadth
- Each chapter should have 2-5 subsections
- Start with foundational concepts, build to advanced material
- Make titles specific and descriptive
- Time estimates should be realistic for reading plus comprehension`;
}

export function buildLessonPrompt(input: {
  course: Course;
  chapter: Chapter;
  subsection: Subsection;
  previousSubsection?: Subsection | null;
  nextSubsection?: Subsection | null;
}) {
  const outline = input.course.chapters.map((chapter) => ({
    order: chapter.order,
    title: chapter.title,
    subsections: chapter.subsections.map((subsection) => ({
      order: subsection.order,
      title: subsection.title,
    })),
  }));

  return `You are an expert educator writing a lesson for an online learning platform.

COURSE: "${input.course.title}"
CHAPTER ${input.chapter.order}: "${input.chapter.title}"
SUBSECTION ${input.subsection.order}: "${input.subsection.title}"
LEVEL: "${input.course.experienceLevel}"
PREVIOUS SECTION: "${input.previousSubsection?.title ?? "This is the first section"}"
NEXT SECTION: "${input.nextSubsection?.title ?? "This is the final section"}"

FULL COURSE OUTLINE:
${JSON.stringify(outline, null, 2)}

Write an engaging lesson. Return ONLY valid JSON as an array of content blocks:
[
  { "type": "prose", "text": "Markdown string" },
  { "type": "callout", "title": "string", "text": "string", "variant": "definition|warning|tip|key-concept" },
  { "type": "example", "text": "Markdown string" },
  { "type": "code", "language": "string", "code": "string", "caption": "optional string" },
  { "type": "quiz", "question": "string", "options": ["string"], "correctIndex": number, "explanation": "string" },
  { "type": "summary", "text": "Markdown string" }
]

Guidelines:
- Warm, conversational tone
- Use concrete examples and analogies
- Include at least one callout
- Include 1-2 quizzes
- End with a summary
- Reference previous sections naturally where relevant`;
}
