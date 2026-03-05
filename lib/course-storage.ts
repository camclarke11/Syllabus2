import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Course, LessonContent } from "@/lib/types";

const DATA_ROOT = path.join(process.cwd(), ".syllabus-data");
const COURSES_ROOT = path.join(DATA_ROOT, "courses");

function getCoursePath(courseId: string) {
  return path.join(COURSES_ROOT, `${courseId}.json`);
}

function getContentPath(courseId: string, subsectionId: string) {
  return path.join(DATA_ROOT, "content", courseId, `${subsectionId}.json`);
}

async function ensurePathExists(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function saveCourse(course: Course) {
  const filePath = getCoursePath(course.id);
  await ensurePathExists(filePath);
  await writeFile(filePath, JSON.stringify(course, null, 2), "utf8");
}

export async function readCourse(courseId: string) {
  try {
    const contents = await readFile(getCoursePath(courseId), "utf8");
    return JSON.parse(contents) as Course;
  } catch {
    return null;
  }
}

export async function deleteCourse(courseId: string) {
  await rm(getCoursePath(courseId), { force: true });
  await rm(path.join(DATA_ROOT, "content", courseId), {
    force: true,
    recursive: true,
  });
}

export async function saveLessonContent(
  courseId: string,
  subsectionId: string,
  content: LessonContent,
) {
  const filePath = getContentPath(courseId, subsectionId);
  await ensurePathExists(filePath);
  await writeFile(filePath, JSON.stringify(content, null, 2), "utf8");
}

export async function readLessonContent(courseId: string, subsectionId: string) {
  try {
    const contents = await readFile(getContentPath(courseId, subsectionId), "utf8");
    return JSON.parse(contents) as LessonContent;
  } catch {
    return null;
  }
}
