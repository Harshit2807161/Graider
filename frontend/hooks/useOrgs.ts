import { useOrgContext } from "@/context/OrgContext";

export function useOrgs() {
    return useOrgContext();
}
