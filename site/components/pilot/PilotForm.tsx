"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import site from "@/content/site";
import type { PilotField, PilotFieldName, PilotFormContent } from "@/content/types-pilot";
import { EXPECTED_ACTION } from "@/worker/src/turnstile";
import { LIMITS, isValidEmail } from "@/worker/src/validate";
import styles from "./PilotForm.module.css";

/* Both are inlined at build time. Without either, the form renders with its button disabled and
   the Turnstile script is never loaded (see site/README.md, "The pilot form"). */
const ENDPOINT = process.env.NEXT_PUBLIC_PILOT_ENDPOINT ?? "";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const CONFIGURED = ENDPOINT.trim() !== "" && SITE_KEY.trim() !== "";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
    render(el: HTMLElement, opts: Record<string, unknown>): string;
    reset(id?: string): void;
    remove(id?: string): void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

/** What the Worker answers (site/worker/src/index.ts). */
interface WorkerResponse {
    ok?: boolean;
    error?: string;
    fields?: Record<string, string>;
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Errors = Partial<Record<PilotFieldName, string>>;

/** The contact address, once it is a real one (a value starting with "TODO" is a placeholder). */
const CONTACT_EMAIL = site.contactEmail.startsWith("TODO") ? null : site.contactEmail;

function withEmail(template: string): string {
    return template.replace("{email}", CONTACT_EMAIL ?? "");
}

/** The Worker's phone rule: digits and + ( ) - . spaces, at least seven digits. */
function isValidPhone(value: string): boolean {
    return /^[0-9+()\-.\s]+$/.test(value) && value.replace(/\D/g, "").length >= 7;
}

function maxLength(name: PilotFieldName): number | undefined {
    return name === "institutionType" ? undefined : LIMITS[name];
}

function fieldId(name: string): string {
    return `pilot-${name}`;
}

/** One field's message, from the browser's own constraint checks plus the Worker's rules. */
function check(field: PilotField, el: Control, words: PilotFormContent["errors"]): string {
    const value = el.value.trim();
    if (el.validity.valueMissing || value === "") return field.required ? words.required : "";
    if (field.kind === "email" && (el.validity.typeMismatch || !isValidEmail(value))) return words.email;
    if (field.kind === "tel" && !isValidPhone(value)) return words.phone;
    return "";
}

/** The "Request a pilot" form. Posts JSON to the Cloudflare Worker in site/worker/ with a
 *  Turnstile token; never calls the endpoint without one. */
export default function PilotForm({ content }: { content: PilotFormContent }) {
    const { fields, errors: words } = content;
    const formRef = useRef<HTMLFormElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const successRef = useRef<HTMLHeadingElement>(null);
    const widgetId = useRef<string | null>(null);
    const token = useRef("");

    const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
    const [errors, setErrors] = useState<Errors>({});
    const [formError, setFormError] = useState("");
    const [attempted, setAttempted] = useState(false);

    // Explicit render: the widget div mounts after the script would have scanned the page.
    const renderWidget = useCallback(() => {
        const ts = window.turnstile;
        if (!ts || !boxRef.current || widgetId.current !== null) return;
        widgetId.current = ts.render(boxRef.current, {
            sitekey: SITE_KEY,
            action: EXPECTED_ACTION,
            theme: "light",
            size: "flexible",
            callback: (t: string) => {
                token.current = t;
                setFormError((prev) => (prev === words.turnstile ? "" : prev));
            },
            "expired-callback": () => { token.current = ""; },
            "error-callback": () => { token.current = ""; },
        });
    }, [words.turnstile]);

    const removeWidget = useCallback(() => {
        if (widgetId.current !== null) window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
        token.current = "";
    }, []);

    useEffect(() => removeWidget, [removeWidget]);

    useEffect(() => {
        if (status === "sent") successRef.current?.focus();
    }, [status]);

    const control = (name: PilotFieldName): Control | null =>
        (formRef.current?.elements.namedItem(name) as Control | null) ?? null;

    function recheck(field: PilotField, el: Control) {
        setErrors((prev) => ({ ...prev, [field.name]: check(field, el, words) }));
    }

    function focusFirst(found: Errors) {
        const first = fields.find((f) => found[f.name]);
        if (first) control(first.name)?.focus();
    }

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!CONFIGURED || status === "sending") return;
        const form = e.currentTarget;

        const found: Errors = {};
        for (const field of fields) {
            const el = form.elements.namedItem(field.name) as Control | null;
            const message = el ? check(field, el, words) : "";
            if (message) found[field.name] = message;
        }
        setErrors(found);
        setAttempted(true);
        if (Object.keys(found).length > 0) {
            setFormError(words.check);
            focusFirst(found);
            return;
        }

        const turnstileToken = token.current;
        if (!turnstileToken) {
            setFormError(words.turnstile);
            return;
        }

        const data = new FormData(form);
        const value = (name: string) => String(data.get(name) ?? "").trim();
        const body = {
            name: value("name"),
            role: value("role"),
            institution: value("institution"),
            institutionType: value("institutionType"),
            city: value("city"),
            email: value("email"),
            phone: value("phone") || undefined,
            exam: value("exam"),
            sheets: value("sheets"),
            message: value("message") || undefined,
            turnstileToken,
            website: String(data.get("website") ?? ""),
        };

        setFormError("");
        setStatus("sending");
        token.current = ""; // a token is good for one request only
        const failed = CONTACT_EMAIL ? withEmail(words.sendFailedEmail) : words.sendFailed;

        try {
            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            let reply: WorkerResponse | null = null;
            try {
                reply = (await res.json()) as WorkerResponse;
            } catch {
                reply = null;
            }
            if (res.ok && reply?.ok) {
                removeWidget();
                setStatus("sent");
                return;
            }
            if (reply?.fields) {
                const fromWorker: Errors = {};
                for (const field of fields) {
                    const message = reply.fields[field.name];
                    if (!message) continue;
                    fromWorker[field.name] = message === "Required." ? words.required
                        : field.kind === "email" ? words.email
                        : field.kind === "tel" ? words.phone
                        : message;
                }
                setErrors(fromWorker);
                focusFirst(fromWorker);
                setFormError(reply.fields.turnstileToken ? words.turnstile : reply.error ?? failed);
            } else {
                setFormError(reply?.error ?? failed);
            }
        } catch {
            setFormError(failed);
        }
        setStatus("idle");
        if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
    }

    const privacy = (
        <p className={styles.privacy}>
            {content.privacy.text} {content.privacy.see}{" "}
            <Link href={content.privacy.link.href} className={styles.inlineLink}>{content.privacy.link.label}</Link>.
        </p>
    );

    if (status === "sent") {
        return (
            <div className={styles.wrap}>
                <div className={styles.success} role="status">
                    <h3 ref={successRef} tabIndex={-1} className={styles.successHeading}>{content.success.heading}</h3>
                    <p>{CONTACT_EMAIL ? withEmail(content.success.bodyWithEmail) : content.success.body}</p>
                </div>
                {privacy}
            </div>
        );
    }

    const sending = status === "sending";
    const unavailable = CONTACT_EMAIL ? withEmail(content.unavailable.withEmail) : content.unavailable.withoutEmail;

    return (
        <div className={styles.wrap}>
            <p className={styles.intro}>{content.intro}</p>
            {!CONFIGURED && <p id="pilot-unavailable" className={styles.unavailable}>{unavailable}</p>}

            <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate aria-busy={sending}>
                {fields.map((field) => {
                    const id = fieldId(field.name);
                    const helpId = field.help ? `${id}-help` : undefined;
                    const error = errors[field.name];
                    const errorId = error ? `${id}-error` : undefined;
                    const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
                    const common = {
                        id,
                        name: field.name,
                        required: field.required,
                        "aria-invalid": error ? true : undefined,
                        "aria-describedby": describedBy,
                        autoComplete: field.autoComplete,
                        className: `${styles.control} ${error ? styles.invalid : ""}`,
                        onChange: (ev: { currentTarget: Control }) => {
                            if (errors[field.name]) recheck(field, ev.currentTarget);
                        },
                        onBlur: (ev: { currentTarget: Control }) => {
                            if (attempted) recheck(field, ev.currentTarget);
                        },
                    };
                    return (
                        <div key={field.name} className={styles.field}>
                            <label htmlFor={id} className={styles.label}>
                                {field.label}
                                {!field.required && <span className={styles.optional}> {content.optional}</span>}
                            </label>
                            {field.help && <p id={helpId} className={styles.help}>{field.help}</p>}
                            {field.kind === "select" ? (
                                <select {...common} defaultValue="" className={`${common.className} ${styles.select}`}>
                                    <option value="" disabled>{content.choose}</option>
                                    {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            ) : field.kind === "textarea" ? (
                                <textarea {...common} rows={5} maxLength={maxLength(field.name)}
                                          className={`${common.className} ${styles.textarea}`} />
                            ) : (
                                <input {...common} type={field.kind} inputMode={field.inputMode}
                                       maxLength={maxLength(field.name)}
                                       spellCheck={field.kind === "text" ? undefined : false} />
                            )}
                            {error && (
                                <p id={errorId} className={styles.error}>
                                    <AlertCircle size={16} aria-hidden="true" className={styles.errorIcon} />
                                    {error}
                                </p>
                            )}
                        </div>
                    );
                })}

                {/* Honeypot: people never see or reach it; the Worker drops any request that fills it. */}
                <div className={styles.trap} aria-hidden="true">
                    <label htmlFor="pilot-website">{content.trap}</label>
                    <input id="pilot-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>

                {CONFIGURED && <div ref={boxRef} className={styles.turnstile} />}

                <div className={styles.submitRow}>
                    <p className={styles.formError} role="alert">
                        {formError && <AlertCircle size={18} aria-hidden="true" className={styles.errorIcon} />}
                        {formError}
                    </p>
                    <button type="submit" className={styles.submit} disabled={!CONFIGURED}
                            aria-disabled={sending || undefined}
                            aria-describedby={CONFIGURED ? undefined : "pilot-unavailable"}>
                        {sending && <span className={styles.spinner} aria-hidden="true" />}
                        {content.submit}
                    </button>
                    <p className={styles.srOnly} role="status">{sending ? content.sending : ""}</p>
                </div>
            </form>

            {privacy}

            {CONFIGURED && <Script src={TURNSTILE_SRC} strategy="afterInteractive" onReady={renderWidget} />}
        </div>
    );
}
