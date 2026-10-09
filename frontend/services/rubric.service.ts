import { api } from "@/lib/api";
import { Criterion, QuestionRubricStatus, RubricKind, RubricSpecRecord, Subject } from "@/types/review.types";

export interface RubricSpecEdit {
    kind: RubricKind;
    subject: Subject;
    criteria: Criterion[];
    grading_notes?: string | null;
}

export const rubricService = {
    getStatus: async (examId: string): Promise<QuestionRubricStatus[]> => {
        const response = await api.get(`/exams/${examId}/rubric-status`);
        return response.data;
    },

    /** The question's current parsed rubric, or null if it hasn't been parsed yet. */
    getSpec: async (examId: string, questionId: string): Promise<RubricSpecRecord | null> => {
        try {
            const response = await api.get(`/exams/${examId}/questions/${questionId}/rubric-spec`);
            return response.data;
        } catch (err) {
            if ((err as { response?: { status?: number } }).response?.status === 404) return null;
            throw err;
        }
    },

    saveSpec: async (examId: string, questionId: string, spec: RubricSpecEdit): Promise<RubricSpecRecord> => {
        const response = await api.put(`/exams/${examId}/questions/${questionId}/rubric-spec`, spec);
        return response.data;
    },

    reparse: async (examId: string, questionId: string): Promise<void> => {
        await api.post(`/exams/${examId}/questions/${questionId}/rubric-spec/reparse`);
    },
};
