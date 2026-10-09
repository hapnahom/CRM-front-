import { create, StateCreator } from 'zustand';
import { Course, CourseLesson, CourseLessonMaterial } from '@/types/tna/course';
import { UploadFile } from 'antd';

type TnaManagementCoursePageState = {
  isShowAddLesson: boolean;
  course: Course | null;
  refetchCourse: any;
  lessonId: string | null;

  isShowLessonMaterial: boolean;
  lesson: CourseLesson | null;
  lessonMaterial: CourseLessonMaterial | null;
  activeKey: string | string[] | undefined;
};

type TnaManagementCoursePageAction = {
  setIsShowAddLesson: (isShowAddLesson: boolean) => void;
  setCourse: (course: Course | null) => void;
  setRefetchCourse: (refetch: any) => void;
  setLessonId: (lessonId: string | null) => void;

  setIsShowLessonMaterial: (isShowLessonMaterial: boolean) => void;
  setLesson: (lesson: CourseLesson | null) => void;
  setLessonMaterial: (lessonMaterial: CourseLessonMaterial | null) => void;
  setActiveKey: (activeKey: string | string[] | undefined) => void; // ✅ should be a function
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;

  fileAttachmentList: UploadFile[];
  setFileAttachmentList: (fileAttachmentList: UploadFile[]) => void;

  isFileUploadLoading: Record<string, boolean>;
  setIsFileUploadLoading: (
    isFileUploadLoading: Record<string, boolean>,
  ) => void;
};

const tnaManagementCoursePageSlice: StateCreator<
  TnaManagementCoursePageState & TnaManagementCoursePageAction
> = (set) => ({
  isShowAddLesson: false,
  setIsShowAddLesson: (isShowAddLesson: boolean) => {
    set({ isShowAddLesson });
  },

  isFileUploadLoading: {
    video: false,
    attachment: false,
  },
  setIsFileUploadLoading: (isFileUploadLoading: Record<string, boolean>) => {
    set({ isFileUploadLoading });
  },

  course: null,
  setCourse: (course: Course | null) => {
    set({ course });
  },

  fileAttachmentList: [],
  setFileAttachmentList: (fileAttachmentList: UploadFile[]) => {
    set({ fileAttachmentList });
  },

  fileList: [],
  setFileList: (fileList: UploadFile[]) => {
    set({ fileList });
  },

  refetchCourse: null,
  setRefetchCourse: (refetch: any) => {
    set({ refetchCourse: refetch });
  },

  lessonId: null,
  setLessonId: (lessonId: string | null) => {
    set({ lessonId });
  },

  isShowLessonMaterial: false,
  setIsShowLessonMaterial: (isShowLessonMaterial: boolean) => {
    set({ isShowLessonMaterial });
  },

  lesson: null,
  setLesson: (lesson) => {
    set({ lesson });
  },

  lessonMaterial: null,
  setLessonMaterial: (lessonMaterial: CourseLessonMaterial | null) => {
    set({ lessonMaterial });
  },

  activeKey: undefined,
  setActiveKey: (activeKey: string | string[] | undefined) => {
    set({ activeKey });
  },
});

export const useTnaManagementCoursePageStore = create<
  TnaManagementCoursePageState & TnaManagementCoursePageAction
>(tnaManagementCoursePageSlice);
