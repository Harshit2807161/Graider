export interface Batch {
    id: string;
    org_id: string;
    name: string;
    created_at: string;
    student_count: number;
}

export interface BatchCreatePayload {
    org_id: string;
    name: string;
}

export interface EnrollmentPayload {
    email: string;
}

export interface Student {
    id: string; // user id
    membership_id: string; // pass as student_id when uploading a submission
    full_name: string;
    email: string;
    enrolled_at: string;
}

export interface RosterImportResult {
    total: number;
    enrolled: number;
    existing: number;
    errors: { email: string; error: string }[];
}
