import React, { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import buttonStyles from "@/components/ui/Button.module.css";

interface ButtonLinkProps {
    href: string;
    children: ReactNode;
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    icon?: ReactNode;
    className?: string;
    "aria-label"?: string;
}

/** Navigation that looks like a Button (a link, so it opens in a new tab and shows its URL). */
export default function ButtonLink({ href, children, variant = "secondary", size = "md", icon, className, ...rest }: ButtonLinkProps) {
    return (
        <Link href={href} className={cn(buttonStyles.button, buttonStyles[variant], buttonStyles[size], className)} {...rest}>
            {icon && <span className={buttonStyles.icon} aria-hidden="true">{icon}</span>}
            {children}
        </Link>
    );
}
