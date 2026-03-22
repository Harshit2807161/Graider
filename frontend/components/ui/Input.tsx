"use client";

import React, { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, id, ...props }, ref) => {
        // Generate random ID if not provided, for accessibility
        const inputId = id || useId();

        return (
            <div className={styles.container}>
                {label && (
                    <label htmlFor={inputId} className={styles.label}>
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={cn(
                        styles.input,
                        error && styles.hasError,
                        className
                    )}
                    {...props}
                />
                {error && <span className={styles.errorText}>{error}</span>}
                {helperText && !error && <span className={styles.helperText}>{helperText}</span>}
            </div>
        );
    }
);

Input.displayName = "Input";
export default Input;
