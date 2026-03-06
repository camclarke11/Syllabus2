"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { listCourseLibrary, saveCourseToLibrary } from "@/lib/client-storage";
import type { Course, ExperienceLevel } from "@/lib/types";
import { isTopicDisallowed, isTopicTooVague } from "@/lib/utils";

const exampleTopics = [
  "Quantum Computing",
  "French Cooking",
  "TypeScript",
  "Music Theory",
  "Stoic Philosophy",
  "Machine Learning",
  "Screenwriting",
  "UK Data Protection Law",
];

export function HomeClient() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);

  useEffect(() => {
    setRecentCourses(listCourseLibrary().map((entry) => entry.course).slice(0, 4));
  }, []);

  const canSubmit = useMemo(() => topic.trim().length > 0 && !isGenerating, [topic, isGenerating]);

  async function handleSubmit(nextTopic?: string) {
    const value = (nextTopic ?? topic).trim();

    if (!value) {
      setError("Start with a specific topic so the syllabus has something real to work with.");
      return;
    }

    if (isTopicTooVague(value)) {
      setError("Try a more specific prompt, like 'intro to neuroscience' rather than 'science'.");
      return;
    }

    if (isTopicDisallowed(value)) {
      setError("That topic is not supported. Try a safe educational topic instead.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setTopic(value);

    try {
      const response = await fetch("/api/courses/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: value,
          experienceLevel,
        }),
      });

      const payload = (await response.json()) as { course?: Course; error?: string };

      if (!response.ok || !payload.course) {
        throw new Error(payload.error ?? "Course generation failed.");
      }

      saveCourseToLibrary(payload.course);
      router.push(`/course/${payload.course.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while generating the course.",
      );
      setIsGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl flex-col px-6 pb-16 pt-10">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-5"
        >
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            AI-generated courses on anything
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-tight tracking-tight text-white md:text-7xl">
            Learn any topic as a beautifully structured course.
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
            Topic to syllabus, syllabus to lessons, lessons to mastery. Syllabus turns a
            single prompt into an immersive, chapter-by-chapter learning experience.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="editorial-shadow frosted-panel w-full max-w-3xl rounded-[2rem] p-5 md:p-6"
        >
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="topic">
                What do you want to learn?
              </label>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-4 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="mb-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  What do you want to learn?
                </div>
                <input
                  id="topic"
                  autoFocus
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canSubmit) {
                      void handleSubmit();
                    }
                  }}
                  placeholder="Type any topic..."
                  className="w-full bg-transparent text-xl text-white outline-none placeholder:text-white/28 md:text-2xl"
                />
              </div>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[1.5rem] bg-[var(--accent)] px-6 text-base font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    Start course
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <BookOpenText className="h-4 w-4" />
                Experience level
              </div>
              <div className="flex flex-wrap gap-2">
                {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setExperienceLevel(level)}
                    className={`rounded-full border px-4 py-2 text-sm capitalize transition ${
                      experienceLevel === level
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                        : "border-white/10 bg-white/5 text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {exampleTopics.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void handleSubmit(example)}
                  className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-[var(--muted)] transition hover:border-white/20 hover:bg-white/8 hover:text-[var(--text)]"
                >
                  {example}
                </button>
              ))}
            </div>

            {error ? <p className="text-left text-sm text-[var(--danger)]">{error}</p> : null}

            {isGenerating ? (
              <div className="grid gap-3 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                <div className="text-left text-sm text-[var(--muted)]">
                  Drafting a chapter-by-chapter syllabus...
                </div>
                {Array.from({ length: 6 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0.25, x: -8 }}
                    animate={{ opacity: [0.35, 0.85, 0.35], x: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: index * 0.12,
                    }}
                    className="h-14 rounded-2xl border border-white/6 bg-white/5"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>

        <section className="grid w-full max-w-4xl gap-6 pt-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="frosted-panel rounded-[1.75rem] p-6 text-left">
            <div className="mb-3 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              The learning loop
            </div>
            <div className="space-y-4 text-[var(--muted)]">
              {[
                "Type any topic and get a full syllabus in seconds.",
                "Enter a focused lesson view with prose, callouts, quizzes, and code when relevant.",
                "Track progress automatically as you scroll and pick up exactly where you left off.",
              ].map((line, index) => (
                <div key={line} className="flex gap-4">
                  <span className="mt-0.5 text-sm font-semibold text-white/45">0{index + 1}</span>
                  <p className="text-base leading-7">{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="frosted-panel rounded-[1.75rem] p-6 text-left">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                  Recent courses
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Resume your last few generated courses.
                </p>
              </div>
              <Link href="/dashboard" className="text-sm text-white/80 transition hover:text-white">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {recentCourses.length ? (
                recentCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/course/${course.id}`}
                    className="block rounded-2xl border border-white/8 bg-black/15 p-4 transition hover:border-white/16 hover:bg-black/20"
                  >
                    <div className="font-medium text-white">{course.title}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {course.chapters.length} chapters · {course.experienceLevel}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-7 text-[var(--muted)]">
                  Your generated courses will show up here once you create one.
                </p>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
