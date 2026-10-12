import type { QuestionReview, SubmissionReview } from "@product/types/review.types";
import raw from "@/content/sample-data/review.json";

/** The sample submission as the review screen receives it, minus the database fields a marketing
 *  page has no use for (ids, file paths, timestamps). */
export type SampleReview = Omit<SubmissionReview, "submission" | "student_name"> & {
    submission: { total_score: null; max_score: number; status: "NEEDS_REVIEW" };
    student_name: null;
};

// The JSON is a trimmed copy of a real review response (see README, "Sample data").
export const sampleReview = raw as unknown as SampleReview;

export const sampleQuestions: QuestionReview[] = sampleReview.questions;

export function sampleQuestion(label: string): QuestionReview | undefined {
    return sampleQuestions.find((q) => q.label === label);
}
