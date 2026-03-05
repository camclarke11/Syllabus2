import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `~${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!remainder) {
    return `~${hours} hr`;
  }

  return `~${hours} hr ${remainder} min`;
}

export function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isLikelyProgrammingTopic(topic: string) {
  return /(code|coding|program|javascript|typescript|python|java|go|rust|react|next\.js|sql|css|html|api|node)/i.test(
    topic,
  );
}

export function isTopicTooVague(topic: string) {
  const normalized = topic.trim().toLowerCase();

  if (normalized.length < 4) {
    return true;
  }

  return ["stuff", "things", "science", "history", "technology", "art"].includes(
    normalized,
  );
}

export function isTopicDisallowed(topic: string) {
  return /(how to hurt|make a bomb|kill|genocide|terrorism|meth)/i.test(topic);
}
