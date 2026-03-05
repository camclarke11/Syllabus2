import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getAdjacentPointers, getSubsectionByOrders } from "@/lib/course-helpers";
import { buildLessonPrompt, buildSyllabusPrompt } from "@/lib/prompts";
import type {
  Chapter,
  ContentBlock,
  Course,
  ExperienceLevel,
  LessonContent,
  Subsection,
} from "@/lib/types";
import { isLikelyProgrammingTopic, toTitleCase } from "@/lib/utils";

const outlineSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(12),
  estimatedMinutes: z.number().int().positive(),
  chapters: z
    .array(
      z.object({
        order: z.number().int().positive(),
        title: z.string().min(3),
        description: z.string().min(12),
        estimatedMinutes: z.number().int().positive(),
        subsections: z
          .array(
            z.object({
              order: z.number().int().positive(),
              title: z.string().min(3),
              estimatedMinutes: z.number().int().positive(),
            }),
          )
          .min(2),
      }),
    )
    .min(4),
});

const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("prose"), text: z.string().min(10) }),
  z.object({
    type: z.literal("callout"),
    title: z.string().min(2),
    text: z.string().min(10),
    variant: z.enum(["definition", "warning", "tip", "key-concept"]),
  }),
  z.object({ type: z.literal("example"), text: z.string().min(10) }),
  z.object({
    type: z.literal("code"),
    language: z.string().min(1),
    code: z.string().min(5),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("quiz"),
    question: z.string().min(10),
    options: z.array(z.string().min(1)).min(2),
    correctIndex: z.number().int().nonnegative(),
    explanation: z.string().min(10),
  }),
  z.object({ type: z.literal("summary"), text: z.string().min(10) }),
  z.object({
    type: z.literal("image"),
    prompt: z.string().min(3),
    alt: z.string().min(3),
  }),
]);

const lessonSchema = z.union([
  z.array(contentBlockSchema),
  z.object({ blocks: z.array(contentBlockSchema) }),
]);

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function extractJsonPayload(text: string) {
  const start = Math.min(
    ...["{", "["]
      .map((character) => text.indexOf(character))
      .filter((index) => index >= 0),
  );

  if (!Number.isFinite(start)) {
    throw new Error("No JSON payload detected in model response.");
  }

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const end = text.lastIndexOf(close);

  if (end < start) {
    throw new Error("JSON payload appears truncated.");
  }

  return text.slice(start, end + 1);
}

async function askAnthropic(prompt: string, maxTokens: number) {
  const client = getAnthropicClient();

  if (!client) {
    return null;
  }

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function levelDescriptor(level: ExperienceLevel) {
  switch (level) {
    case "advanced":
      return "move quickly through fundamentals and spend more time on nuance, trade-offs, and expert judgement";
    case "intermediate":
      return "assume some familiarity and focus on connecting concepts into usable patterns";
    default:
      return "start from first principles and explain ideas in plain language without dumbing them down";
  }
}

function buildFallbackOutline(topic: string, experienceLevel: ExperienceLevel) {
  const cleanTopic = toTitleCase(topic);
  const programmingTopic = isLikelyProgrammingTopic(topic);

  const chapters = [
    {
      title: `What ${cleanTopic} Really Covers`,
      description: `Build a working mental map of ${cleanTopic} so later lessons have something solid to attach to.`,
      subsectionTitles: [
        `How practitioners define ${cleanTopic}`,
        `${cleanTopic} in the real world`,
        `The questions this course will answer`,
      ],
    },
    {
      title: `The Core Ideas Behind ${cleanTopic}`,
      description: `Learn the vocabulary, moving parts, and conceptual anchors that make the rest of the course feel legible.`,
      subsectionTitles: [
        `The essential language of ${cleanTopic}`,
        `The mental model that makes ${cleanTopic} click`,
        `How the main concepts relate to one another`,
      ],
    },
    {
      title: `${cleanTopic} from First Principles`,
      description: `Slow down and examine the deeper mechanisms that explain why ${cleanTopic} behaves the way it does.`,
      subsectionTitles: [
        `The building blocks underneath ${cleanTopic}`,
        `What causes the most common outcomes`,
        `Where beginners usually get confused`,
      ],
    },
    {
      title: programmingTopic
        ? `Tools, Setup, and a First Useful Workflow`
        : `Methods, Frameworks, and Practical Approaches`,
      description: programmingTopic
        ? `Set up the essential tooling and understand the simplest workflow that produces a real result.`
        : `Look at the practical frameworks people use to move from theory into action.`,
      subsectionTitles: programmingTopic
        ? [
            `The toolchain around ${cleanTopic}`,
            `A minimal setup that avoids friction`,
            `Your first useful workflow`,
          ]
        : [
            `A reliable framework for approaching ${cleanTopic}`,
            `How to structure a first practice session`,
            `Choosing methods that fit the goal`,
          ],
    },
    {
      title: `Working Through a Concrete Example`,
      description: `See the ideas in motion through a fully explained example rather than isolated definitions.`,
      subsectionTitles: [
        `A simple end-to-end example`,
        `How to reason through each decision`,
        `What this example teaches you to notice`,
      ],
    },
    {
      title: `Patterns, Techniques, and Shortcuts`,
      description: `Identify repeatable moves that help you make faster, more confident decisions.`,
      subsectionTitles: [
        `High-leverage patterns in ${cleanTopic}`,
        `Techniques that save time and reduce mistakes`,
        `When to use which approach`,
      ],
    },
    {
      title: `Common Mistakes and How to Recover`,
      description: `Learn the traps, misconceptions, and false moves that block progress for most learners.`,
      subsectionTitles: [
        `The most common misconceptions`,
        `Diagnosing a weak result`,
        `Getting back on track quickly`,
      ],
    },
    {
      title:
        experienceLevel === "advanced"
          ? `Advanced Judgement and Trade-offs`
          : `From Competence to Confidence`,
      description:
        experienceLevel === "advanced"
          ? `Focus on judgement calls, constraints, and trade-offs that separate fluent practitioners from formula followers.`
          : `Turn isolated knowledge into repeatable skill by learning how experienced people think through ambiguity.`,
      subsectionTitles:
        experienceLevel === "advanced"
          ? [
              `Trade-offs inside ${cleanTopic}`,
              `Choosing between strong options`,
              `Recognising advanced edge cases`,
            ]
          : [
              `How experienced learners think`,
              `Recognising what matters most`,
              `Building confidence through repetition`,
            ],
    },
    {
      title: `Applying ${cleanTopic} to Bigger Problems`,
      description: `Use what you have learned on broader, messier scenarios that feel more like reality.`,
      subsectionTitles: [
        `${cleanTopic} in complex situations`,
        `Adapting the fundamentals to new contexts`,
        `Evaluating what good looks like`,
      ],
    },
    {
      title: `A Roadmap for Continued Mastery`,
      description: `Leave the course with a practical plan for improving after the structured lessons end.`,
      subsectionTitles: [
        `How to keep practising after this course`,
        `Projects, drills, or exercises worth doing next`,
        `How to tell you are genuinely improving`,
      ],
    },
  ];

  const estimatedMinutes = chapters.length * 25;

  return {
    title: programmingTopic ? `Build Fluency in ${cleanTopic}` : `A Guided Course in ${cleanTopic}`,
    description: `A structured ${experienceLevel} path through ${cleanTopic} that helps you ${levelDescriptor(
      experienceLevel,
    )}.`,
    estimatedMinutes,
    chapters: chapters.map((chapter, index) => ({
      order: index + 1,
      title: chapter.title,
      description: chapter.description,
      estimatedMinutes: 20 + (index % 3) * 5,
      subsections: chapter.subsectionTitles.map((title, subsectionIndex) => ({
        order: subsectionIndex + 1,
        title,
        estimatedMinutes: 6 + subsectionIndex * 2,
      })),
    })),
  };
}

function createCourseFromOutline(input: {
  topic: string;
  experienceLevel: ExperienceLevel;
  outline: z.infer<typeof outlineSchema>;
}) {
  const courseId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const chapters: Chapter[] = input.outline.chapters.map((chapter) => {
    const chapterId = crypto.randomUUID();

    return {
      id: chapterId,
      courseId,
      order: chapter.order,
      title: chapter.title,
      description: chapter.description,
      estimatedMinutes: chapter.estimatedMinutes,
      subsections: chapter.subsections.map((subsection) => ({
        id: crypto.randomUUID(),
        chapterId,
        order: subsection.order,
        title: subsection.title,
        estimatedMinutes: subsection.estimatedMinutes,
        content: null,
      })),
    };
  });

  return {
    id: courseId,
    userId: "local-user",
    topic: input.topic,
    title: input.outline.title,
    description: input.outline.description,
    estimatedMinutes: input.outline.estimatedMinutes,
    chapters,
    experienceLevel: input.experienceLevel,
    createdAt,
    updatedAt: createdAt,
    status: "ready",
  } satisfies Course;
}

function buildCodeExample(topic: string, subsection: Subsection) {
  if (/typescript/i.test(topic)) {
    return {
      language: "typescript",
      code: `type LessonProgress = {\n  subsection: string;\n  completed: boolean;\n};\n\nfunction nextUnfinished(progress: LessonProgress[]) {\n  return progress.find((entry) => !entry.completed);\n}\n\nconsole.log(nextUnfinished([\n  { subsection: "${subsection.title}", completed: false },\n]));`,
      caption: "A small TypeScript example that turns the idea into something concrete.",
    };
  }

  if (/python/i.test(topic)) {
    return {
      language: "python",
      code: `progress = [\n    {"section": "${subsection.title}", "completed": False},\n]\n\nnext_section = next((item for item in progress if not item["completed"]), None)\nprint(next_section)`,
      caption: "A simple Python version of the same idea.",
    };
  }

  if (/sql/i.test(topic)) {
    return {
      language: "sql",
      code: `SELECT subsection_id, completed\nFROM user_progress\nWHERE course_id = 'example-course'\nORDER BY completed ASC, subsection_id ASC\nLIMIT 1;`,
      caption: "SQL can express the same logic in a declarative way.",
    };
  }

  return {
    language: "javascript",
    code: `const concept = {\n  section: "${subsection.title}",\n  takeaway: "Break the idea into observable steps.",\n};\n\nconsole.log(\`${subsection.title}: \${concept.takeaway}\`);`,
    caption: "Use a tiny example to turn an abstract idea into a visible sequence.",
  };
}

function buildFallbackLesson(course: Course, chapter: Chapter, subsection: Subsection): LessonContent {
  const { previous, next } = getAdjacentPointers(course, chapter.order, subsection.order);
  const topic = course.topic;
  const programmingTopic = isLikelyProgrammingTopic(topic);

  const blocks: ContentBlock[] = [
    {
      type: "prose",
      text: `**${subsection.title}** sits at an important point in this course because it turns the chapter theme into something you can actually *work with*. In plain English, this section is about learning how to notice the shape of the idea, not just memorise a definition.\n\nWhen people struggle with **${topic}**, it is often because everything feels equally important. The trick is to separate the stable ideas from the surface detail. In this section, we will keep asking: *What is the core move here? What changes from example to example, and what stays the same?* That is how a subject starts feeling learnable instead of slippery.`,
    },
    {
      type: "callout",
      title: "Key concept",
      text: `${subsection.title} becomes easier when you treat it as a pattern for making better decisions, not a pile of isolated facts. The goal is to build recognition: seeing what kind of situation you are in, what signals matter, and which response is appropriate.`,
      variant: "key-concept",
    },
    {
      type: "prose",
      text: `A useful way to think about this is like learning to read a map. At first, you notice labels. Then you start noticing **relationships**: distance, terrain, and routes. ${toTitleCase(
        topic,
      )} works similarly. Surface details matter, but the real leverage comes from understanding how the parts influence one another.\n\n${
        previous
          ? `As we saw in **${previous.subsection.title}**, the earlier concepts give us context.`
          : `Because this is an early section, we are laying the groundwork for the rest of the course.`
      } Here, the focus shifts from *what the topic contains* to *how you can reason through it in practice*. That is what makes the knowledge portable.`,
    },
    {
      type: "example",
      text: `Imagine explaining **${subsection.title}** to a curious friend over coffee. You would probably avoid jargon at first. You would start with a concrete situation, point out the few details that really matter, and then connect those details back to the bigger idea. That is exactly the approach you should use when learning this material yourself: move from **specific example -> underlying pattern -> practical takeaway**.`,
    },
  ];

  if (programmingTopic) {
    const example = buildCodeExample(topic, subsection);

    blocks.push({
      type: "code",
      language: example.language,
      code: example.code,
      caption: example.caption,
    });
  }

  blocks.push(
    {
      type: "prose",
      text: `The deeper lesson is that fluency grows when you can make small predictions. If you change one variable, what do you expect to happen? If a result looks wrong, where would you inspect first? Those prediction habits are far more valuable than trying to memorise every possible case.\n\nFor that reason, spend less time asking "Can I repeat the definition?" and more time asking "Can I explain why this example behaves the way it does?" If the answer is yes, you are building real understanding. If the answer is no, go back and simplify the story until it becomes obvious.`,
    },
    {
      type: "quiz",
      question: `What is the main goal of this section on "${subsection.title}"?`,
      options: [
        "To memorise as many details as possible without worrying about context",
        "To recognise the pattern beneath the details so you can reason through new situations",
        "To finish the section quickly and move on before confusion appears",
        "To avoid examples until the theory is completely mastered",
      ],
      correctIndex: 1,
      explanation:
        "The section is designed to help the learner spot durable patterns and use them to reason, not just store disconnected facts.",
    },
    {
      type: "quiz",
      question: `Which study move best supports mastery in ${topic}?`,
      options: [
        "Test yourself with small predictions and explain outcomes in your own words",
        "Read once and trust that familiarity equals competence",
        "Collect more terminology before trying any examples",
        "Skip reflection and only focus on speed",
      ],
      correctIndex: 0,
      explanation:
        "Making small predictions forces you to connect ideas, reveal gaps, and turn passive reading into active understanding.",
    },
    {
      type: "summary",
      text: `**In summary:** ${subsection.title} is about building a practical mental model. Focus on the pattern, use examples generously, and keep testing yourself with "what would happen if...?" questions. ${
        next
          ? `That prepares you nicely for **${next.subsection.title}**, where the same ideas will be pushed into a slightly richer context.`
          : `That closes the loop on this part of the course and gives you a strong base for review or further practice.`
      }`,
    },
  );

  return { blocks };
}

export async function generateCourse(input: {
  topic: string;
  experienceLevel: ExperienceLevel;
}) {
  let outline = buildFallbackOutline(input.topic, input.experienceLevel);

  try {
    const responseText = await askAnthropic(
      buildSyllabusPrompt(input.topic, input.experienceLevel),
      4000,
    );

    if (responseText) {
      outline = outlineSchema.parse(JSON.parse(extractJsonPayload(responseText)));
    }
  } catch {
    // A deterministic fallback keeps the product usable without an API key.
  }

  return createCourseFromOutline({
    topic: input.topic,
    experienceLevel: input.experienceLevel,
    outline: outlineSchema.parse(outline),
  });
}

export async function generateLessonContent(input: {
  course: Course;
  chapterOrder: number;
  subsectionOrder: number;
}) {
  const located = getSubsectionByOrders(
    input.course,
    input.chapterOrder,
    input.subsectionOrder,
  );

  if (!located) {
    throw new Error("Requested subsection could not be found in the course outline.");
  }

  const { chapter, subsection } = located;
  let content = buildFallbackLesson(input.course, chapter, subsection);

  try {
    const { previous, next } = getAdjacentPointers(
      input.course,
      input.chapterOrder,
      input.subsectionOrder,
    );
    const responseText = await askAnthropic(
      buildLessonPrompt({
        course: input.course,
        chapter,
        subsection,
        previousSubsection: previous?.subsection,
        nextSubsection: next?.subsection,
      }),
      6000,
    );

    if (responseText) {
      const parsed = lessonSchema.parse(JSON.parse(extractJsonPayload(responseText)));
      content = Array.isArray(parsed) ? { blocks: parsed } : parsed;
    }
  } catch {
    // Intentionally silent; the fallback lesson keeps the experience responsive.
  }

  return content;
}
