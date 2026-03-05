"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookCopy, Clock3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getContinuePointer, getCoursePointerHref, getProgressSummary } from "@/lib/course-helpers";
import {
  getLastOpenedSubsection,
  listCourseLibrary,
  loadCourseProgress,
  removeCourseFromLibrary,
} from "@/lib/client-storage";
import type { CourseLibraryEntry, UserProgress } from "@/lib/types";
import { formatMinutes } from "@/lib/utils";

export function DashboardClient() {
  const [entries, setEntries] = useState<CourseLibraryEntry[]>([]);
  const [progressByCourse, setProgressByCourse] = useState<
    Record<string, Record<string, UserProgress>>
  >({});

  function refresh() {
    const nextEntries = listCourseLibrary();
    setEntries(nextEntries);
    setProgressByCourse(
      Object.fromEntries(
        nextEntries.map((entry) => [entry.course.id, loadCourseProgress(entry.course.id)]),
      ),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  const heroStats = useMemo(() => {
    const totalCourses = entries.length;
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.course.estimatedMinutes, 0);
    const completedCourses = entries.filter(
      (entry) => getProgressSummary(entry.course, progressByCourse[entry.course.id] ?? {}).percent === 100,
    ).length;

    return { totalCourses, totalMinutes, completedCourses };
  }, [entries, progressByCourse]);

  async function handleDelete(courseId: string) {
    await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
    removeCourseFromLibrary(courseId);
    refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="frosted-panel editorial-shadow rounded-[2rem] p-8 md:p-10"
      >
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
            Dashboard
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-white md:text-6xl">
            Your AI-generated course library.
          </h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            A local-first dashboard for the MVP: see every generated course, your progress, and
            the quickest route back into the next unfinished section.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Courses
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">{heroStats.totalCourses}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Planned learning time
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">
              {formatMinutes(heroStats.totalMinutes)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Completed
            </div>
            <div className="mt-3 text-4xl font-semibold text-white">
              {heroStats.completedCourses}
            </div>
          </div>
        </div>
      </motion.section>

      <section className="mt-10">
        {entries.length ? (
          <div className="grid gap-5">
            {entries.map((entry) => {
              const progress = progressByCourse[entry.course.id] ?? {};
              const summary = getProgressSummary(entry.course, progress);
              const continuePointer = getContinuePointer(
                entry.course,
                progress,
                getLastOpenedSubsection(entry.course.id) ?? undefined,
              );

              return (
                <div
                  key={entry.course.id}
                  className="frosted-panel rounded-[1.75rem] p-6 md:flex md:items-center md:justify-between"
                >
                  <div className="max-w-2xl">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                      {entry.course.experienceLevel} · {entry.course.chapters.length} chapters
                    </div>
                    <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl text-white">
                      {entry.course.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      {entry.course.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
                      <span className="inline-flex items-center gap-2">
                        <BookCopy className="h-4 w-4 text-[var(--accent)]" />
                        {summary.percent}% complete
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-[var(--accent)]" />
                        {formatMinutes(entry.course.estimatedMinutes)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-0 md:justify-end">
                    <Link
                      href={`/course/${entry.course.id}`}
                      className="rounded-full border border-white/10 px-4 py-3 text-sm text-white transition hover:border-white/18"
                    >
                      Open overview
                    </Link>
                    {continuePointer ? (
                      <Link
                        href={getCoursePointerHref(entry.course.id, continuePointer)}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-medium text-black"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry.course.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-400/18 px-4 py-3 text-sm text-rose-100 transition hover:bg-rose-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="frosted-panel rounded-[2rem] p-10 text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-4xl text-white">
              No courses yet
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              Generate a course from the home page and it will appear here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-black"
            >
              Create your first course
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
