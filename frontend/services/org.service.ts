import { api } from "@/lib/api";
import { Org, CreateOrgPayload } from "@/types/org.types";

export const orgService = {
    getAll: async (): Promise<Org[]> => {
        const { data } = await api.get("/orgs/");
        return data;
    },

    getById: async (id: string): Promise<Org> => {
        const { data } = await api.get(`/orgs/${id}`);
        return data;
    },

    create: async (payload: CreateOrgPayload): Promise<Org> => {
        const { data } = await api.post("/orgs/", payload);
        return data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/orgs/${id}`);
    },
};
