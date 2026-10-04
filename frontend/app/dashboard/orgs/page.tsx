"use client";

import React, { useState } from "react";
import OrgList from "@/components/features/orgs/OrgList";
import CreateOrgModal from "@/components/features/orgs/CreateOrgModal";

export default function OrgsPage(): React.JSX.Element {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <OrgList onCreateClick={() => setIsModalOpen(true)} />
            <CreateOrgModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
