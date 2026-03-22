"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { batchService } from "@/services/batch.service";
import { Batch, BatchCreatePayload } from "@/types/batch.types";

interface BatchContextType {
    batches: Batch[];
    isLoading: boolean;
    error: string | null;
    fetchBatches: (orgId: string) => Promise<void>;
    createBatch: (payload: BatchCreatePayload) => Promise<void>;
    deleteBatch: (id: string) => Promise<void>;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export function BatchProvider({ children }: { children: ReactNode }) {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBatches = useCallback(async (orgId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await batchService.getAllByOrg(orgId);
            setBatches(data);
        } catch (err: any) {
            console.error("Failed to fetch batches:", err);
            setError(err.response?.data?.detail || "Failed to load classes");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createBatch = async (payload: BatchCreatePayload) => {
        try {
            const newBatch = await batchService.create(payload);
            setBatches((prev) => [...prev, newBatch]);
        } catch (err: any) {
            console.error("Failed to create batch:", err);
            throw err;
        }
    };

    const deleteBatch = async (id: string) => {
        try {
            await batchService.delete(id);
            setBatches((prev) => prev.filter((b) => b.id !== id));
        } catch (err: any) {
            console.error("Failed to delete batch:", err);
            throw err;
        }
    };

    return (
        <BatchContext.Provider value={{ batches, isLoading, error, fetchBatches, createBatch, deleteBatch }}>
            {children}
        </BatchContext.Provider>
    );
}

export function useBatchContext() {
    const context = useContext(BatchContext);
    if (context === undefined) {
        throw new Error("useBatchContext must be used within a BatchProvider");
    }
    return context;
}
