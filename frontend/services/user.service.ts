import { api } from "@/lib/api";

/** The signed-in user, as `/users/me` returns it. */
export interface CurrentUser {
    id: string;
    email: string;
    full_name: string | null;
    is_superuser: boolean;
}

export const userService = {
    me: async (): Promise<CurrentUser> => {
        const { data } = await api.get<CurrentUser>("/users/me");
        return data;
    },
};
