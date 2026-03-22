import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { api } from "@/lib/api";

interface LoginResponse {
    access_token: string;
    token_type: string;
}

export function useAuth() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            // Intentionally using x-www-form-urlencoded as per OAuth2 spec which FastAPI expects
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const response = await api.post<LoginResponse>("/auth/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            const { access_token } = response.data;

            // Store token (securely handled by browser via JS, but ideally httpOnly from server)
            // For MVP Client-side auth, this is standard.
            Cookies.set("token", access_token, { expires: 7 }); // 7 days

            router.push("/dashboard");
            return true;
        } catch (err: any) {
            console.error("Login Error:", err);
            const msg = err.response?.data?.detail || "Invalid credentials. Please try again.";
            setError(msg);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        Cookies.remove("token");
        router.push("/login");
    };

    return { login, logout, isLoading, error };
}
