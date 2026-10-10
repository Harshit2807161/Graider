import { api } from "@/lib/api";
import { MyResults, StudentResult } from "@/types/results.types";

/** A student's own results (published answer sheets only). */
export const resultsService = {
    mine: async (orgId?: string): Promise<MyResults> => {
        const response = await api.get("/submissions/mine", { params: orgId ? { org_id: orgId } : undefined });
        return response.data;
    },

    get: async (submissionId: string): Promise<StudentResult> => {
        const response = await api.get(`/submissions/${submissionId}`);
        return response.data;
    },
};
