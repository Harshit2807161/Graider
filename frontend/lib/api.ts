import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export const TOKEN_COOKIE = "token";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({ baseURL });

// Attach the bearer token saved at login
api.interceptors.request.use((config) => {
    const token = Cookies.get(TOKEN_COOKIE);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// An expired or invalid token sends the user back to login
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const onLoginPage = typeof window !== "undefined" && window.location.pathname.startsWith("/login");
        if (error.response?.status === 401 && typeof window !== "undefined" && !onLoginPage) {
            Cookies.remove(TOKEN_COOKIE);
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

/**
 * Human-readable message from an API error. FastAPI returns `detail` as a string,
 * a list of validation errors, or (for bulk imports) `{ message, errors }`.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
    const detail = (err as AxiosError<{ detail?: unknown }>)?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        return detail.map((d: { msg?: string }) => d.msg ?? String(d)).join("; ");
    }
    if (detail && typeof detail === "object") {
        const { message, errors } = detail as { message?: string; errors?: string[] };
        return [message, ...(errors ?? [])].filter(Boolean).join("\n") || fallback;
    }
    return (err as Error)?.message || fallback;
}
