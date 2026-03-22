import React, { ReactNode } from "react";
import styles from "./Card.module.css";
import { cn } from "@/lib/utils";

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
    return (
        <div className={cn(styles.card, className)} onClick={onClick}>
            {children}
        </div>
    );
}
