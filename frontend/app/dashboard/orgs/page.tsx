"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import OrgList from "@/components/features/orgs/OrgList";
import CreateOrgModal from "@/components/features/orgs/CreateOrgModal";

export default function OrgsPage(): React.JSX.Element {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <PageHeader
                title="Organizations"
                subtitle="Schools or departments you belong to. Classes, exams and staff live inside an organization."
                actions={
                    <Button onClick={() => setIsModalOpen(true)} variant="primary" icon={<Plus size={18} aria-hidden="true" />}>
                        New organization
                    </Button>
                }
            />
            <OrgList onCreateClick={() => setIsModalOpen(true)} />
            <CreateOrgModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
