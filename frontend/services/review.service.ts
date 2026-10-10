import { api } from "@/lib/api";
import { Submission } from "@/types/exam.types";
import {
    AnswerGrade,
    GradeActionResult,
    GradingSettings,
    ReviewQueueItem,
    SubmissionReview,
    TimelineEntry,
} from "@/types/review.types";

export interface CriterionScoreIn {
    id: string;
    score: number;
    justification?: string;
}

export const reviewService = {
    getQueue: async (examId: string, escalatedOnly = false): Promise<ReviewQueueItem[]> => {
        const response = await api.get(`/exams/${examId}/review-queue`, { params: { escalated_only: escalatedOnly } });
        return response.data;
    },

    getReview: async (submissionId: string): Promise<SubmissionReview> => {
        const response = await api.get(`/submissions/${submissionId}/review`);
        return response.data;
    },

    /** A page image as an object URL (the request needs the bearer token, so no plain <img src>). */
    getPageImage: async (submissionId: string, page: number): Promise<string> => {
        const response = await api.get(`/submissions/${submissionId}/pages/${page}/image`, { responseType: "blob" });
        return URL.createObjectURL(response.data);
    },

    getTimeline: async (submissionId: string): Promise<TimelineEntry[]> => {
        const response = await api.get(`/submissions/${submissionId}/timeline`);
        return response.data;
    },

    override: async (
        submissionId: string, questionId: string,
        body: { expected_grade_id: string; criteria: CriterionScoreIn[]; reason: string; feedback?: string },
    ): Promise<GradeActionResult> => {
        const response = await api.post(`/submissions/${submissionId}/answers/${questionId}/override`, body);
        return response.data;
    },

    resolve: async (submissionId: string, questionId: string, grade: AnswerGrade, reason?: string): Promise<GradeActionResult> => {
        const response = await api.post(`/submissions/${submissionId}/answers/${questionId}/resolve`, {
            expected_grade_id: grade.id, reason: reason || undefined,
        });
        return response.data;
    },

    editTranscript: async (submissionId: string, questionId: string, text: string, reason: string): Promise<Submission> => {
        const response = await api.patch(`/submissions/${submissionId}/answers/${questionId}/transcript`, { text, reason });
        return response.data;
    },

    approve: async (submissionId: string, reason?: string): Promise<Submission> => {
        const response = await api.post(`/submissions/${submissionId}/approve`, { reason: reason || undefined });
        return response.data;
    },

    unapprove: async (submissionId: string, reason?: string): Promise<Submission> => {
        const response = await api.post(`/submissions/${submissionId}/unapprove`, { reason: reason || undefined });
        return response.data;
    },

    regrade: async (submissionId: string, reason?: string): Promise<Submission> => {
        const response = await api.post(`/submissions/${submissionId}/regrade`, { reason: reason || undefined });
        return response.data;
    },

    publishExam: async (examId: string): Promise<{ published: number; not_approved: number }> => {
        const response = await api.post(`/exams/${examId}/publish`);
        return response.data;
    },

    getGradingSettings: async (examId: string): Promise<GradingSettings> => {
        const response = await api.get(`/exams/${examId}/grading-settings`);
        return response.data;
    },

    updateGradingSettings: async (examId: string, changes: Partial<GradingSettings>): Promise<GradingSettings> => {
        const response = await api.patch(`/exams/${examId}/grading-settings`, changes);
        return response.data;
    },
};
