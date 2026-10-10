import { getErrorMessage } from "@/lib/api";
import { plainError } from "@/components/features/review/failure";

/** A failed action in a teacher's words: "<what failed>: <what the server said>" when the server said
 *  something useful (e.g. "Exam name already exists"), otherwise "<what failed>. Check your connection,
 *  then try again." instead of noise like "Network Error" or "Request failed with status code 500". */
export function actionError(err: unknown, what: string): string {
    const detail = plainError(getErrorMessage(err, ""));
    return detail ? `${what}: ${detail}` : `${what}. Check your connection, then try again.`;
}
