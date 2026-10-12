import { describe, expect, it } from "vitest";
import { isHoneypotFilled, isValidEmail, LIMITS, validatePilotRequest } from "../src/validate";

const good = {
    name: "Asha Verma",
    role: "Head of Science",
    institution: "Sunrise Public School",
    institutionType: "school",
    city: "Pune",
    email: "asha@sunrise.example",
    exam: "Class X Science pre-board",
    sheets: "300",
    turnstileToken: "tok",
};

function errorsFor(input: unknown): Record<string, string> {
    const r = validatePilotRequest(input);
    if (r.ok) throw new Error("expected validation to fail");
    return r.errors;
}

describe("validatePilotRequest", () => {
    it("accepts a complete request and trims values", () => {
        const r = validatePilotRequest({ ...good, name: "  Asha Verma  ", phone: "+91 98765 43210", message: "Hello\nthere" });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.name).toBe("Asha Verma");
            expect(r.value.phone).toBe("+91 98765 43210");
            expect(r.value.message).toBe("Hello\nthere");
        }
    });

    it("treats phone and message as optional", () => {
        const r = validatePilotRequest(good);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.phone).toBeNull();
            expect(r.value.message).toBeNull();
        }
    });

    it("accepts sheets as a number", () => {
        const r = validatePilotRequest({ ...good, sheets: 250 });
        expect(r.ok && r.value.sheets).toBe("250");
    });

    it("rejects non-objects", () => {
        expect(errorsFor(null).body).toBeDefined();
        expect(errorsFor("x").body).toBeDefined();
        expect(errorsFor([good]).body).toBeDefined();
    });

    it("reports every missing required field", () => {
        const errors = errorsFor({});
        for (const key of ["name", "role", "institution", "institutionType", "city", "email", "exam", "sheets", "turnstileToken"]) {
            expect(errors[key], key).toBeDefined();
        }
        expect(errors.phone).toBeUndefined();
        expect(errors.message).toBeUndefined();
    });

    it("rejects whitespace-only required fields", () => {
        expect(errorsFor({ ...good, name: "   " }).name).toBeDefined();
    });

    it("enforces maximum lengths", () => {
        expect(errorsFor({ ...good, name: "a".repeat(LIMITS.name + 1) }).name).toMatch(/at most/);
        expect(errorsFor({ ...good, message: "a".repeat(LIMITS.message + 1) }).message).toMatch(/at most/);
        expect(errorsFor({ ...good, turnstileToken: "a".repeat(LIMITS.turnstileToken + 1) }).turnstileToken).toBeDefined();
        expect(validatePilotRequest({ ...good, name: "a".repeat(LIMITS.name) }).ok).toBe(true);
    });

    it("rejects an unknown institution type and non-string values", () => {
        expect(errorsFor({ ...good, institutionType: "university" }).institutionType).toBeDefined();
        expect(errorsFor({ ...good, name: { a: 1 } }).name).toBeDefined();
        expect(errorsFor({ ...good, city: 5 }).city).toBeDefined();
    });

    it.each(["school", "coaching", "college", "other"])("accepts institution type %s", (t) => {
        expect(validatePilotRequest({ ...good, institutionType: t }).ok).toBe(true);
    });

    it("rejects line breaks in single-line fields but allows them in the message", () => {
        expect(errorsFor({ ...good, name: "Asha\r\nBcc: x@y.z" }).name).toBeDefined();
        expect(errorsFor({ ...good, institution: "A\nB" }).institution).toBeDefined();
        expect(validatePilotRequest({ ...good, message: "line1\r\nline2\tend" }).ok).toBe(true);
        expect(errorsFor({ ...good, message: "bad\u0000char" }).message).toBeDefined();
    });

    it("validates the phone number when given", () => {
        expect(errorsFor({ ...good, phone: "abc" }).phone).toBeDefined();
        expect(errorsFor({ ...good, phone: "123" }).phone).toBeDefined();
        expect(validatePilotRequest({ ...good, phone: "" }).ok).toBe(true);
    });

    it("rejects a bad email", () => {
        expect(errorsFor({ ...good, email: "not-an-email" }).email).toBeDefined();
    });
});

describe("isValidEmail", () => {
    it.each(["a@b.co", "first.last+tag@sub.example.org", "o'neil@example.com", "x_y@a-b.example"])("accepts %s", (e) => {
        expect(isValidEmail(e)).toBe(true);
    });

    it.each([
        "",
        "plain",
        "@example.com",
        "a@",
        "a@b",
        "a@b..com",
        "a b@example.com",
        "a@exa mple.com",
        "a@@example.com",
        ".a@example.com",
        "a.@example.com",
        "a..b@example.com",
        "a@-example.com",
        "a@example-.com",
        "<a>@example.com",
        "a@example.com\nBcc: x@y.z",
        `${"a".repeat(65)}@example.com`,
        `a@${"b".repeat(250)}.com`,
    ])("rejects %j", (e) => {
        expect(isValidEmail(e)).toBe(false);
    });
});

describe("isHoneypotFilled", () => {
    it("is false when the field is absent, empty or blank", () => {
        expect(isHoneypotFilled({})).toBe(false);
        expect(isHoneypotFilled({ website: "" })).toBe(false);
        expect(isHoneypotFilled({ website: "   " })).toBe(false);
        expect(isHoneypotFilled({ website: null })).toBe(false);
        expect(isHoneypotFilled(null)).toBe(false);
    });

    it("is true when anything is in it", () => {
        expect(isHoneypotFilled({ website: "http://spam.example" })).toBe(true);
        expect(isHoneypotFilled({ website: 1 })).toBe(true);
    });
});
