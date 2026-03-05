"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Circle, LockKeyhole, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Chapter, UserProgress } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

interface ChapterCardProps {
  courseId: string;
  chapter: Chapter;
  progressMap: Record<string, UserProgress>;
  isLocked: boolean;
  defaultOpen?: boolean;
}

export function ChapterCard({
  courseId,
  chapter,
  progressMap,
  isLocked,
  defaultOpen = false,
}: ChapterCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const progress = useMemo(() => {
    const completed = chapter.subsections.filter(
      (subsection) => progressMap[subsection.id]?.completed,
    ).length;
    const percent = Math.round((completed / chapter.subsections.length) * 100);

    return { completed, percent };
  }, [chapter.subsections, progressMap]);

  return (
    <div className="frosted-panel rounded-[1.75rem] p-5 md:p-6">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            <span>Chapter {String(chapter.order).padStart(2, "0")}</span>
            <span>{formatMinutes(chapter.estimatedMinutes)}</span>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 text-[var(--danger)]">
                <LockKeyhole className="h-3.5 w-3.5" />
                Locked
              </span>
            ) : progress.percent === 100 ? (
              <span className="inline-flex items-center gap-1 text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                <PlayCircle className="h-3.5 w-3.5" />
                In progress
              </span>
            )}
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-2xl text-white">
              {chapter.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              {chapter.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="relative h-14 w-14 rounded-full border border-white/10 bg-black/10">
            <svg className="-rotate-90 h-14 w-14" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="var(--accent)"
                strokeWidth="5"
                strokeDasharray={163.36}
                strokeDashoffset={163.36 - 163.36 * (progress.percent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
              {progress.percent}%
            </div>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 text-[var(--muted)] transition",
              open && "rotate-180 text-white",
            )}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-3 border-t border-white/6 pt-6">
              {chapter.subsections.map((subsection) => {
                const entry = progressMap[subsection.id];
                const href = `/course/${courseId}/${chapter.order}/${subsection.order}`;

                const content = (
                  <>
                    <div className="flex items-start gap-3">
                      {isLocked ? (
                        <LockKeyhole className="mt-0.5 h-4 w-4" />
                      ) : entry?.completed ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--success)]" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
                      )}
                      <div>
                        <div className="text-sm uppercase tracking-[0.18em] text-white/45">
                          {chapter.order}.{subsection.order}
                        </div>
                        <div className="mt-1 text-base text-white">{subsection.title}</div>
                      </div>
                    </div>

                    <div className="text-sm text-[var(--muted)]">
                      {formatMinutes(subsection.estimatedMinutes)}
                    </div>
                  </>
                );

                return isLocked ? (
                  <div
                    key={subsection.id}
                    className="flex cursor-not-allowed items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/4 px-4 py-4 text-white/35"
                  >
                    {content}
                  </div>
                ) : (
                  <Link
                    key={subsection.id}
                    href={href}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/10 px-4 py-4 transition hover:border-white/16 hover:bg-black/20"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
