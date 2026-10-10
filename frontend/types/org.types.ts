export type OrgRole = "owner" | "admin" | "teacher" | "student";

export interface Org {
    id: string;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
    /** The signed-in user's role in this organization */
    role?: OrgRole | null;
}

export interface CreateOrgPayload {
    name: string;
    slug: string;
    description?: string;
}
