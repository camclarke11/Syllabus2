export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type CourseStatus = "generating" | "ready" | "error";

export interface Course {
  id: string;
  userId: string;
  topic: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  chapters: Chapter[];
  experienceLevel: ExperienceLevel;
  createdAt: string;
  updatedAt: string;
  status: CourseStatus;
}

export interface Chapter {
  id: string;
  courseId: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  subsections: Subsection[];
}

export interface Subsection {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  estimatedMinutes: number;
  content?: LessonContent | null;
}

export interface LessonContent {
  blocks: ContentBlock[];
}

export type ContentBlock =
  | { type: "prose"; text: string }
  | {
      type: "callout";
      title: string;
      text: string;
      variant: "definition" | "warning" | "tip" | "key-concept";
    }
  | { type: "example"; text: string }
  | { type: "code"; language: string; code: string; caption?: string }
  | {
      type: "quiz";
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }
  | { type: "summary"; text: string }
  | { type: "image"; prompt: string; alt: string };

export interface UserProgress {
  userId?: string;
  courseId: string;
  subsectionId: string;
  completed: boolean;
  completedAt?: string;
  scrollPosition?: number;
}

export interface CourseLibraryEntry {
  course: Course;
  lastViewedAt: string;
}

export interface GenerateCourseRequest {
  topic: string;
  experienceLevel: ExperienceLevel;
}

export interface GenerateLessonRequest {
  course?: Course;
  chapterOrder: number;
  subsectionOrder: number;
}
