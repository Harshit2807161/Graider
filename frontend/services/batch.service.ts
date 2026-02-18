import { api } from "@/lib/api";
import { Batch, BatchCreatePayload, Student } from "@/types/batch.types";

export const batchService = {
    getAllByOrg: async (orgId: string): Promise<Batch[]> => {
        const response = await api.get<Batch[]>(`/batches/?org_id=${orgId}`);
        return response.data;
    },

    create: async (payload: BatchCreatePayload): Promise<Batch> => {
        const response = await api.post<Batch>("/batches/", payload);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/batches/${id}`);
    },

    enroll: async (batchId: string, email: string): Promise<void> => {
        await api.post(`/batches/${batchId}/enroll`, { email });
    },

    uploadStudents: async (batchId: string, file: File): Promise<any> => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post(`/batches/${batchId}/upload-students`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    getStudents: async (batchId: string): Promise<Student[]> => {
        const response = await api.get<Student[]>(`/batches/${batchId}/students`);
        return response.data;
    },
};
