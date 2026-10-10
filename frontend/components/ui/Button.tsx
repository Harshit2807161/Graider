import React, { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

/** While `isLoading`, the button keeps its label and stays focusable (aria-disabled, aria-busy) but
 *  ignores clicks, so keyboard and screen-reader users don't lose their place. */
export default function Button({
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    icon,
    fullWidth = false,
    children,
    onClick,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            className={cn(
                styles.button,
                styles[variant],
                styles[size],
                isLoading && styles.loading,
                fullWidth && styles.fullWidth,
                className
            )}
            disabled={disabled}
            aria-disabled={isLoading || undefined}
            aria-busy={isLoading || undefined}
            onClick={isLoading ? (e) => e.preventDefault() : onClick}
        >
            {isLoading
                ? <span className={styles.spinner} aria-hidden="true" />
                : icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </button>
    );
}
