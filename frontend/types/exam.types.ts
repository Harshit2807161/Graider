export type ExamStatus = 'draft' | 'published' | 'archived';
export type SubmissionStatus = 'pending' | 'processing' | 'graded' | 'approved' | 'published' | 'failed';
export type QuestionType = 'descriptive' | 'mcq' | 'problem';

export interface Question {
    id: string;
    exam_id: string;
    question_text: string;
    order_index: number;
    max_score: number;
    rubric_criteria?: string;
    question_type: QuestionType;
    created_at: string;
}

export interface Exam {
    id: string;
    name: string;
    description?: string;
    org_id: string;
    batch_id?: string;
    status: ExamStatus;
    config: any;
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
