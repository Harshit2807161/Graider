"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { examService } from "@/services/exam.service";
import { Exam, ExamCreate, QuestionSync } from "@/types/exam.types";

interface ExamContextType {
    exams: Exam[];
    selectedExam: Exam | null;
    isLoading: boolean;
    error: string | null;
    fetchExams: (orgId: string, batchId?: string) => Promise<void>;
    fetchExamDetails: (examId: string) => Promise<void>;
    createExam: (payload: ExamCreate) => Promise<void>;
    updateExam: (id: string, payload: Partial<ExamCreate>) => Promise<void>;
    deleteExam: (id: string) => Promise<void>;
    syncQuestions: (examId: string, questions: QuestionSync[]) => Promise<void>;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function ExamProvider({ children }: { children: ReactNode }) {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchExams = useCallback(async (orgId: string, batchId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await examService.getExams(orgId, batchId);
            setExams(data);
        } catch (err: any) {
            console.error("Failed to fetch exams:", err);
            setError(err.response?.data?.detail || "Failed to load exams");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchExamDetails = useCallback(async (examId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await examService.getExam(examId);
            setSelectedExam(data);
        } catch (err: any) {
            console.error("Failed to fetch exam details:", err);
            setError(err.response?.data?.detail || "Failed to load exam details");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createExam = async (payload: ExamCreate) => {
        try {
            const newExam = await examService.createExam(payload);
            setExams((prev) => [newExam, ...prev]);
        } catch (err: any) {
            console.error("Failed to create exam:", err);
            throw err;
        }
    };

    const updateExam = async (id: string, payload: Partial<ExamCreate>) => {
        try {
            const updatedExam = await examService.updateExam(id, payload);
            setExams((prev) => prev.map((e) => (e.id === id ? updatedExam : e)));
            if (selectedExam?.id === id) {
                setSelectedExam(updatedExam);
            }
        } catch (err: any) {
            console.error("Failed to update exam:", err);
            throw err;
        }
    };

    const deleteExam = async (id: string) => {
        try {
            await examService.deleteExam(id);
            setExams((prev) => prev.filter((e) => e.id !== id));
            if (selectedExam?.id === id) {
                setSelectedExam(null);
            }
        } catch (err: any) {
            console.error("Failed to delete exam:", err);
            throw err;
        }
    };

    const syncQuestions = async (examId: string, questions: QuestionSync[]) => {
        try {
            await examService.syncQuestions(examId, questions);
            // Re-fetch exam details to get the full updated state including metadata
            const updatedExam = await examService.getExam(examId);
            setSelectedExam(updatedExam);
            setExams((prev) => prev.map((e) => (e.id === examId ? updatedExam : e)));
        } catch (err: any) {
            console.error("Failed to sync questions:", err);
            throw err;
        }
    };

    return (
        <ExamContext.Provider value={{
            exams,
            selectedExam,
            isLoading,
            error,
            fetchExams,
            fetchExamDetails,
            createExam,
            updateExam,
            deleteExam,
            syncQuestions
        }}>
            {children}
        </ExamContext.Provider>
    );
}

export function useExamContext() {
    const context = useContext(ExamContext);
    if (context === undefined) {
        throw new Error("useExamContext must be used within an ExamProvider");
    }
    return context;
}
