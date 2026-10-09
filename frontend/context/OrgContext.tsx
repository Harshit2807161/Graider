"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { orgService } from "@/services/org.service";
import { Org, CreateOrgPayload } from "@/types/org.types";
import { getErrorMessage } from "@/lib/api";

interface OrgContextType {
    orgs: Org[];
    activeOrg: Org | null;
    isLoading: boolean;
    error: string | null;
    fetchOrgs: () => Promise<void>;
    setActiveOrg: (org: Org | null) => void;
    createOrg: (payload: CreateOrgPayload) => Promise<void>;
    deleteOrg: (id: string) => Promise<void>;
    refetch: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [activeOrg, setActiveOrgState] = useState<Org | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setActiveOrg = useCallback((org: Org | null) => {
        setActiveOrgState(org);
        if (org) {
            localStorage.setItem("activeOrgId", org.id);
        } else {
            localStorage.removeItem("activeOrgId");
        }
    }, []);

    const fetchOrgs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await orgService.getAll();
            setOrgs(data);

            // Try to restore active org
            const savedOrgId = localStorage.getItem("activeOrgId");
            if (savedOrgId) {
                const savedOrg = data.find(o => o.id === savedOrgId);
                if (savedOrg) {
                    setActiveOrgState(savedOrg);
                } else if (data.length > 0) {
                    setActiveOrg(data[0]);
                }
            } else if (data.length > 0) {
                setActiveOrg(data[0]);
            }
        } catch (err) {
            console.error("Failed to fetch organizations:", err);
            setError(getErrorMessage(err, "Failed to load organizations"));
        } finally {
            setIsLoading(false);
        }
    }, [setActiveOrg]);

    const createOrg = async (payload: CreateOrgPayload) => {
        try {
            const newOrg = await orgService.create(payload);
            setOrgs((prev) => [...prev, newOrg]);
            if (!activeOrg) setActiveOrg(newOrg);
        } catch (err) {
            console.error("Failed to create organization:", err);
            throw err;
        }
    };

    const deleteOrg = async (id: string) => {
        try {
            await orgService.delete(id);
            setOrgs((prev) => prev.filter((org) => org.id !== id));
            if (activeOrg?.id === id) {
                setActiveOrg(null);
            }
        } catch (err) {
            console.error("Failed to delete organization:", err);
            throw err;
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    return (
        <OrgContext.Provider value={{
            orgs,
            activeOrg,
            isLoading,
            error,
            fetchOrgs,
            setActiveOrg,
            createOrg,
            deleteOrg,
            refetch: fetchOrgs
        }}>
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
