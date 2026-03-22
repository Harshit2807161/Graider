export interface Org {
    id: string;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
}

export interface CreateOrgPayload {
    name: string;
    slug: string;
    description?: string;
}

export interface UpdateOrgPayload {
    name?: string;
    description?: string;
}
