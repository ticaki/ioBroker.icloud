/**
 * Pure helpers for interpreting Apple's auth responses. Free of adapter dependencies so they can be
 * unit-tested in isolation.
 */

/** One entry of Apple's `serviceErrors` / `service_errors` array. */
export interface AppleServiceError {
    code?: unknown;
    message?: unknown;
}

/**
 * Parse Apple's `serviceErrors` / `service_errors` array out of a raw response body.
 * Returns an empty array when the body is not JSON or carries no errors.
 *
 * @param body - The raw response body of an auth request.
 */
export function parseServiceErrors(body: string): AppleServiceError[] {
    try {
        const parsed = JSON.parse(body) as {
            serviceErrors?: AppleServiceError[];
            service_errors?: AppleServiceError[];
        };
        const camel = Array.isArray(parsed?.serviceErrors) ? parsed.serviceErrors : [];
        const snake = Array.isArray(parsed?.service_errors) ? parsed.service_errors : [];
        return [...camel, ...snake];
    } catch {
        return [];
    }
}

/**
 * Outcome of `POST /appleauth/auth/verify/security/key`.
 *
 * - `ok`: 200/204 — assertion accepted.
 * - `conflict`: 409 without any service error. Apple answers this for a valid assertion as well
 *   (observed live: continuing with trust token + iCloud cookies completes the login). pyicloud
 *   does not check the status at all. Treat it like success and continue with the trust flow.
 * - `rejected`: anything else, including a 409 that carries service errors (e.g. -27962
 *   "Failed to verify security key").
 *
 * @param status - HTTP status of the verify response.
 * @param body - Raw response body of the verify response.
 */
export function classifySecurityKeyVerification(status: number, body: string): 'ok' | 'conflict' | 'rejected' {
    if (status === 200 || status === 204) {
        return 'ok';
    }
    if (status === 409 && parseServiceErrors(body).length === 0) {
        return 'conflict';
    }
    return 'rejected';
}
