/** A published result in a student's list */
export interface StudentResultSummary {
    submission_id: string;
    exam_id: string;
    exam_name: string;
    total_score: number | null;
    max_score: number | null;
    percentage: number | null;
    published_at: string | null;
}

export interface MyResults {
    results: StudentResultSummary[];
    /** The student's answer sheets that aren't published yet */
    awaiting: number;
}

export interface StudentAnswer {
    question_id: string;
    label: string;
    question_text: string;
    score: number | null;
    max_score: number;
    /** False for an extra alternative of a choice question */
    counted: boolean;
    feedback: string | null;
    /** Per-criterion marks from the rubric (names and scores only) */
    criteria?: StudentCriterionMark[];
}

export interface StudentCriterionMark {
    name: string;
    score: number;
    max_points: number | null;
}

/** What a student sees of their own published answer sheet */
export interface StudentResult {
    id: string;
    exam_id: string;
    exam_name: string | null;
    status: string;
    total_score: number | null;
    max_score: number | null;
    percentage: number | null;
    published_at: string | null;
    pages: number;
    answers: StudentAnswer[];
}
