import { api } from "@/lib/api";
import { Org, CreateOrgPayload, UpdateOrgPayload } from "@/types/org.types";

export const orgService = {
    getAll: async (): Promise<Org[]> => {
        const { data } = await api.get("/orgs");
        return data;
    },

    getById: async (id: string): Promise<Org> => {
        const { data } = await api.get(`/orgs/${id}`);
        return data;
    },

    create: async (payload: CreateOrgPayload): Promise<Org> => {
        const { data } = await api.post("/orgs", payload);
        return data;
    },

    update: async (id: string, payload: UpdateOrgPayload): Promise<Org> => {
        const { data } = await api.put(`/orgs/${id}`, payload);
        return data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/orgs/${id}`);
    },
};
