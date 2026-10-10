/** Why grading failed, in a teacher's words. The backend stores the technical error (e.g. "Error: The
 *  answer pages couldn't be read: All models failed for role 'vision': …"); teachers see the cause and
 *  what to try, and the technical text stays available for an administrator. */
export interface Failure {
    /** One sentence: what went wrong */
    cause: string;
    /** What the teacher can do, in order */
    steps: string[];
    /** The error as recorded, for an administrator (null when there is none) */
    technical: string | null;
}

const TRY_AGAIN = "Regrade the answer sheet to try again.";

export function explainFailure(error: string | null | undefined): Failure {
    const technical = error?.replace(/^Error:\s*/, "").trim() || null;
    const text = (technical ?? "").toLowerCase();

    if (text.includes("couldn't be read") || text.includes("could not be read")) {
        return {
            cause: "The pages couldn't be read, so no answers were graded. This is usually a temporary problem with the AI service; "
                + "it can also mean the file is blank, too faint, or not an answer sheet.",
            steps: [
                TRY_AGAIN,
                "If it fails again, check that the file opens and shows the student's writing, then upload it again on the exam page.",
            ],
            technical,
        };
    }
    if (text.includes("budget exceeded")) {
        return {
            cause: "Grading stopped at the limit set for one answer sheet, before every answer was graded.",
            steps: [TRY_AGAIN, "If it stops again, ask your administrator to raise the per-sheet limit."],
            technical,
        };
    }
    if (text.includes("no questions")) {
        return {
            cause: "The exam had no questions when this answer sheet was graded.",
            steps: ["Add the questions on the exam page.", TRY_AGAIN],
            technical,
        };
    }
    return {
        cause: "Something went wrong while grading this answer sheet.",
        steps: [TRY_AGAIN, "If it keeps failing, send the technical details below to your administrator."],
        technical,
    };
}

/** An API error worth showing a teacher as it is ("Submission not found"), or null when it is
 *  technical noise ("Internal server error", "Request failed with status code 502"). */
export function plainError(message: string | null | undefined): string | null {
    if (!message || /internal server error|status code|network error|timeout|ECONN/i.test(message)) return null;
    return message;
}
