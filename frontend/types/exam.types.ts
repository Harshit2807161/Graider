export type ExamStatus = 'draft' | 'published' | 'archived';
// Matches the backend enum values (uppercase)
export type SubmissionStatus = 'PENDING' | 'PROCESSING' | 'GRADED' | 'NEEDS_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'FAILED';
/** Why a grading run failed (backend app.core.constants.FailureCode) */
export type FailureCode = 'pages_unreadable' | 'budget_exhausted' | 'no_questions' | 'model_unavailable' | 'internal_error';
export type QuestionType = 'descriptive' | 'mcq' | 'problem';

export interface Question {
    id: string;
    exam_id: string;
    question_text: string;
    order_index: number;
    max_score: number;
    rubric_criteria?: string;
    question_type: QuestionType;
    label?: string | null;
    printed_label?: string | null;
    choice_group?: string | null;
    created_at: string;
}

export interface Exam {
    id: string;
    name: string;
    description?: string;
    org_id: string;
    batch_id?: string;
    status: ExamStatus;
    config: Record<string, unknown>;
    created_by_membership_id: string;
    created_at: string;
    updated_at: string;
    question_count?: number;
    questions?: Question[];
}

export interface SubmissionAnswer {
    id: string;
    submission_id: string;
    question_id: string;
    student_answer_text?: string;
    score?: number;
    feedback?: string;
    reasoning?: string;
    status?: "graded" | "escalated" | "not_attempted" | null;
    escalation_reason?: string | null;
    created_at: string;
}

export interface Submission {
    id: string;
    exam_id: string;
    student_membership_id?: string;
    original_file_url: string;
    graded_file_url?: string;
    total_score?: number;
    max_score?: number;
    percentage?: number;
    status: SubmissionStatus;
    current_step?: string | null;
    /** Why grading failed (set when status is FAILED) */
    failure_code?: FailureCode | null;
    student_name?: string | null;
    created_at: string;
    updated_at: string;
    answers?: SubmissionAnswer[];
}

export interface ExamCreate {
    name: string;
    description?: string;
    org_id: string;
    batch_id?: string;
    status: ExamStatus;
}

export interface QuestionCreate {
    question_text: string;
    order_index: number;
    max_score: number;
    rubric_criteria?: string;
    question_type: QuestionType;
}

/** A question in a full-list sync: existing questions carry their id, new ones omit it. */
export interface QuestionSync extends QuestionCreate {
    id?: string;
}
