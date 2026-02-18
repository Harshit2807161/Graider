"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { orgService } from "@/services/org.service";
import { Org, CreateOrgPayload } from "@/types/org.types";

interface OrgContextType {
    orgs: Org[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createOrg: (payload: CreateOrgPayload) => Promise<void>;
    deleteOrg: (id: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrgs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await orgService.getAll();
            setOrgs(data);
        } catch (err: any) {
            console.error("Failed to fetch organizations:", err);
            setError(err.response?.data?.detail || "Failed to load organizations");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createOrg = async (payload: CreateOrgPayload) => {
        try {
            const newOrg = await orgService.create(payload);
            setOrgs((prev) => [...prev, newOrg]);
        } catch (err: any) {
            console.error("Failed to create organization:", err);
            throw err;
        }
    };

    const deleteOrg = async (id: string) => {
        try {
            await orgService.delete(id);
            setOrgs((prev) => prev.filter((org) => org.id !== id));
        } catch (err: any) {
            console.error("Failed to delete organization:", err);
            throw err;
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    return (
        <OrgContext.Provider value={{ orgs, isLoading, error, refetch: fetchOrgs, createOrg, deleteOrg }}>
            {children}
        </OrgContext.Provider>
    );
}

export function useOrgContext() {
    const context = useContext(OrgContext);
    if (context === undefined) {
        throw new Error("useOrgContext must be used within an OrgProvider");
    }
    return context;
}
