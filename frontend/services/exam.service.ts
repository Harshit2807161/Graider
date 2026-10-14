import { api } from "@/lib/api";
import { Exam, ExamCreate, Question, ExamsSummary, QuestionSync, Submission } from "../types/exam.types";

export const examService = {
    getExams: async (orgId: string, batchId?: string): Promise<Exam[]> => {
        const response = await api.get("/exams/", {
            params: { org_id: orgId, batch_id: batchId },
        });
        return response.data;
    },

    getExam: async (examId: string): Promise<Exam> => {
        const response = await api.get(`/exams/${examId}`);
        return response.data;
    },

    createExam: async (examIn: ExamCreate): Promise<Exam> => {
        const response = await api.post("/exams/", examIn);
        return response.data;
    },

    updateExam: async (examId: string, examIn: Partial<ExamCreate>): Promise<Exam> => {
        const response = await api.patch(`/exams/${examId}`, examIn);
        return response.data;
    },

    deleteExam: async (examId: string): Promise<void> => {
        await api.delete(`/exams/${examId}`);
    },

    /** Replace the exam's question list. Existing questions must keep their `id`. */
    syncQuestions: async (examId: string, questions: QuestionSync[]): Promise<Question[]> => {
        const response = await api.post(`/exams/${examId}/questions`, questions);
        return response.data;
    },

    importQuestions: async (examId: string, file: File): Promise<Question[]> => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post(`/exams/${examId}/questions/upload`, formData);
        return response.data;
    },

    // One student's answers: one file, or several in page order (e.g. one photo per page)
    uploadSubmission: async (examId: string, files: File[], studentId?: string): Promise<Submission> => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        if (studentId) formData.append("student_id", studentId);

        const response = await api.post(`/exams/${examId}/submissions`, formData);
        return response.data;
    },

    getSummary: async (orgId: string): Promise<ExamsSummary> => {
        const response = await api.get("/exams/summary", { params: { org_id: orgId } });
        return response.data;
    },

    listSubmissions: async (examId: string): Promise<Submission[]> => {
        const response = await api.get(`/exams/${examId}/submissions`);
        return response.data;
    },

    getSubmission: async (submissionId: string): Promise<Submission> => {
        const response = await api.get(`/submissions/${submissionId}`);
        return response.data;
    },

    regradeSubmission: async (submissionId: string): Promise<Submission> => {
        const response = await api.post(`/submissions/${submissionId}/regrade`);
        return response.data;
    },
};
