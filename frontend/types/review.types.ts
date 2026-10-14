import { Submission } from "./exam.types";

export type AnswerStatus = "graded" | "escalated" | "not_attempted";

/** One criterion of a grade: the score, the student's words that earn it, and why. */
export interface CriterionResult {
    id: string;
    score: number;
    evidence?: string;
    justification?: string;
}

/** One evaluator round: both examiners' scores, the evaluator's points and the grader's replies. */
export interface EvaluatorRound {
    round: number;
    grader: CriterionResult[];
    grader_total: number;
    evaluator: { id: string; score: number; reason?: string }[];
    evaluator_total: number;
    agreement: number;
    effective_agreement: number;
    criteria_apart: string[];
    feedback: { criterion_id: string; point: string }[];
    summary: string;
    replies?: { feedback_index: number; decision: "accept" | "reject"; rationale: string }[];
}

export interface AnswerGrade {
    id: string;
    question_id: string;
    run_id: string | null;
    version: number;
    source: "ai" | "teacher";
    status: AnswerStatus;
    score: number | null;
    max_score: number;
    counted: boolean;
    criteria: CriterionResult[];
    rounds: EvaluatorRound[];
    flags: string[];
    escalation_reason: string | null;
    feedback: string | null;
    rubric_spec_id: string | null;
    transcription_id: string | null;
    grader_model: string | null;
    evaluator_model: string | null;
    fallback_used: boolean;
    override_reason: string | null;
    is_current: boolean;
    created_by_membership_id: string | null;
    created_at: string;
}

export interface Transcription {
    id: string;
    question_id: string;
    run_id: string | null;
    version: number;
    source: "ai" | "teacher";
    text: string;
    segments: { page?: number; crossed_out?: boolean; confidence?: number; text?: string }[];
    confidence: number | null;
    flags: string[];
    is_current: boolean;
    created_by_membership_id: string | null;
    created_at: string;
}

export interface Criterion {
    id: string;
    description: string;
    points: number;
    expected_answer?: string | null;
    notes?: string | null;
}

export type RubricKind = "pass_fail" | "criteria";
export type Subject = "math" | "english" | "science" | "history" | "general";

export interface RubricSpec {
    kind: RubricKind;
    subject: Subject;
    criteria_count: number;
    criteria: Criterion[];
    grading_notes?: string | null;
    parser_warnings: string[];
    derived: boolean;
}

export interface QuestionReview {
    question_id: string;
    label: string;
    printed_label: string | null;
    text: string;
    max_score: number;
    choice_group: string | null;
    rubric_spec: { id: string; version: number; status: string; validation_errors: string[]; spec: RubricSpec } | null;
    rubric_outdated: boolean; // the current grade used a spec that is no longer the question's current ready one
    transcription: Transcription | null;
    grade: AnswerGrade | null;
    previous_grades: AnswerGrade[];
}

export interface PageInfo {
    number: number;
    document_id: string;
    page_index: number;
    kind: string;
    width: number | null;
    height: number | null;
    has_image: boolean;
}

export interface SubmissionReview {
    submission: Submission;
    student_name: string | null;
    pages: PageInfo[];
    unassigned_segments: { page?: number; text?: string; label_as_written?: string | null }[];
    questions: QuestionReview[];
}

export interface ReviewQueueItem {
    submission_id: string;
    submission_status: string;
    student_membership_id: string | null;
    student_name: string | null;
    question_id: string;
    question_label: string;
    grade_id: string;
    status: AnswerStatus;
    escalation_reason: string | null;
    score: number | null;
    max_score: number;
    agreement: number | null;
    rubric_outdated: boolean;
}

export interface TimelineEntry {
    at: string;
    type: "run" | "llm_call" | "transcription" | "grade" | "event";
    question_label: string | null;
    actor_membership_id: string | null;
    data: Record<string, unknown>;
}

export interface GradeActionResult {
    grade: AnswerGrade;
    submission: Submission;
}

export interface GradingSettings {
    agreement_threshold: number;
    spot_check_rate: number;
    choice_policy: "best" | "first";
}

export interface RubricSpecRecord {
    id: string;
    question_id: string;
    version: number;
    source: "ai" | "teacher";
    status: "ready" | "invalid";
    validation_errors: string[];
    spec: RubricSpec;
    parser_prompt_version: string | null;
    model: string | null;
    created_at: string;
}

export interface QuestionRubricStatus {
    question_id: string;
    label: string;
    rubric_status: "missing" | "pending" | "ready" | "invalid" | "error";
    rubric_error: string | null;
    spec_version: number | null;
    source: string | null;
    kind: RubricKind | null;
    subject: Subject | null;
    derived: boolean | null;
    criteria_count: number | null;
    validation_errors: string[];
    parser_warnings: string[];
}

/** What a teacher can say about an escalation, in plain words. */
export const ESCALATION_TEXT: Record<string, string> = {
    no_answer_found: "No answer found on the pages",
    rubric_invalid: "The rubric isn't ready",
    low_ocr_confidence: "Handwriting hard to read",
    multiple_attempts: "Several attempts at this answer",
    check_failed: "The grade failed the checks",
    evaluator_disagreement: "The two examiners disagree",
    all_models_failed: "The AI couldn't grade it",
    spot_check: "Random spot check",
    "grader_flag:illegible": "Grader: illegible",
    "grader_flag:off_topic": "Grader: off topic",
    "grader_flag:answers_another_question": "Grader: answers another question",
    "grader_flag:incomplete_transcription": "Grader: transcript looks incomplete",
};

export function escalationText(reason: string | null | undefined): string {
    if (!reason) return "Needs review";
    return ESCALATION_TEXT[reason] ?? reason.replace(/_/g, " ");
}
