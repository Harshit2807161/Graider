"use client";

import React, { FormEvent, useState, ChangeEvent } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { plainError } from "@/components/features/review/failure";
import styles from "./LoginForm.module.css";

/** The server's reason when it's meant for people ("Incorrect email or password"), else a plain sentence */
function signInError(message: string): string {
    if (/network error/i.test(message)) return "Gr8r can't be reached right now. Check your internet connection, then try again.";
    return plainError(message) ?? "Something went wrong on our side. Try again in a moment.";
}

export default function LoginForm() {
    const { login, isLoading, error } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        await login(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
                <div className={styles.error} role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <span>{signInError(error)}</span>
                </div>
            )}

            <div className={styles.fields}>
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                />
                <div className={styles.passwordField}>
                    <Input
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        className={`${styles.input} ${styles.passwordInput}`}
                        required
                    />
                    <button
                        type="button"
                        className={styles.toggle}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-pressed={showPassword}
                    >
                        {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                        <span className="sr-only">Show password</span>
                    </button>
                </div>
            </div>

            <Button type="submit" isLoading={isLoading} size="lg" fullWidth>
                Sign in
            </Button>
        </form>
    );
}
