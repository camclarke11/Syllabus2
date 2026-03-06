"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Lightbulb, TriangleAlert } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

import type { LessonContent } from "@/lib/types";

interface ContentRendererProps {
  content: LessonContent;
}

const calloutVariants = {
  definition: {
    icon: Lightbulb,
    label: "Definition",
    className: "border-sky-400/30 bg-sky-400/10",
  },
  warning: {
    icon: TriangleAlert,
    label: "Watch for this",
    className: "border-rose-400/30 bg-rose-400/10",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className: "border-emerald-400/30 bg-emerald-400/10",
  },
  "key-concept": {
    icon: Lightbulb,
    label: "Key concept",
    className: "border-[var(--accent)]/35 bg-[var(--accent-soft)]",
  },
} as const;

export function ContentRenderer({ content }: ContentRendererProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function copyCode(index: number, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <div className="space-y-8">
      {content.blocks.map((block, index) => {
        if (block.type === "prose" || block.type === "example" || block.type === "summary") {
          return (
            <motion.section
              key={`${block.type}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35 }}
              className={`rounded-[1.75rem] border p-7 ${
                block.type === "summary"
                  ? "border-[var(--accent)]/25 bg-[var(--accent-soft)]"
                  : block.type === "example"
                    ? "border-white/10 bg-black/15"
                    : "border-white/8 bg-black/10"
              }`}
            >
              {block.type === "example" ? (
                <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                  Example
                </div>
              ) : null}
              {block.type === "summary" ? (
                <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                  Summary
                </div>
              ) : null}
              <div className="prose-markdown text-lg">
                <ReactMarkdown>{block.text}</ReactMarkdown>
              </div>
            </motion.section>
          );
        }

        if (block.type === "callout") {
          const variant = calloutVariants[block.variant];
          const Icon = variant.icon;

          return (
            <motion.section
              key={`${block.type}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35 }}
              className={`rounded-[1.75rem] border p-7 ${variant.className}`}
            >
              <div className="mb-4 flex items-center gap-3 text-sm font-medium text-white">
                <Icon className="h-4.5 w-4.5 text-[var(--accent)]" />
                <span className="uppercase tracking-[0.22em] text-[var(--muted)]">
                  {variant.label}
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-white">{block.title}</h3>
              <p className="mt-3 text-base leading-8 text-white/85">{block.text}</p>
            </motion.section>
          );
        }

        if (block.type === "code") {
          return (
            <motion.section
              key={`${block.type}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0f1118]"
            >
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 text-sm text-[var(--muted)]">
                <span>{block.caption ?? "Code example"}</span>
                <button
                  type="button"
                  onClick={() => void copyCode(index, block.code)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 transition hover:text-white"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-4 w-4 text-[var(--success)]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto px-5 py-5 text-sm leading-7 text-[#eef2ff]">
                <code>{block.code}</code>
              </pre>
            </motion.section>
          );
        }

        if (block.type === "quiz") {
          const selectedIndex = answers[index];
          const hasAnswered = selectedIndex !== undefined;
          const isCorrect = selectedIndex === block.correctIndex;

          return (
            <motion.section
              key={`${block.type}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35 }}
              className="rounded-[1.75rem] border border-white/10 bg-black/15 p-7"
            >
              <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                Quick check
              </div>
              <h3 className="text-2xl font-semibold text-white">{block.question}</h3>
              <div className="mt-5 space-y-3">
                {block.options.map((option, optionIndex) => {
                  const isAnswer = selectedIndex === optionIndex;
                  const optionCorrect = optionIndex === block.correctIndex;

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        hasAnswered
                          ? optionCorrect
                            ? "border-emerald-400/30 bg-emerald-400/10 text-white"
                            : isAnswer
                              ? "border-rose-400/30 bg-rose-400/10 text-white"
                              : "border-white/8 bg-white/5 text-[var(--muted)]"
                          : "border-white/10 bg-white/4 text-white hover:border-white/18 hover:bg-white/8"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence initial={false}>
                {hasAnswered ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div
                      className={`text-sm font-medium ${
                        isCorrect ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Not quite"}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {block.explanation}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.section>
          );
        }

        return null;
      })}
    </div>
  );
}
