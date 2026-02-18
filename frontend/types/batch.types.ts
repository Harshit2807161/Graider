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
    id: string;
    full_name: string;
    email: string;
    enrolled_at: string;
}
