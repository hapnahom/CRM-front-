import { DateInfo } from '@/types/commons/dateInfo';

export interface CourseCategory extends DateInfo {
  id: string;
  title: string;
  description: string;
  tenantId: string;
}

export interface CourseLessonMaterial extends DateInfo {
  id: string;
  courseLessonId: string;
  title: string;
  description: string | null;
  article: string | null;
  videos: string[];
  attachments: string[];
  order: number;
  timeToFinishMinutes: number | null;
  tenantId: string;
}

export interface CourseLesson extends DateInfo {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  courseLessonMaterials: CourseLessonMaterial[];
  tenantId: string;
}

export interface CourseUser extends DateInfo {
  id: string;
  courseId: string;
  userId: string;
  tenantId: string;
}

export interface CourseDepartment extends DateInfo {
  id: string;
  courseId: string;
  departmentId: string;
  tenantId: string;
}

export interface Course extends DateInfo {
  id: string;
  title: string;
  overview: string | null;
  thumbnail: string | null;
  courseCategoryId: string;
  courseCategory: CourseCategory;
  courseLessons: CourseLesson[];
  preparedBy: string;
  isDraft: boolean;
  tenantId: string;
}
