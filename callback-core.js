// @ts-check
// Pure decision logic of the delegated sign-in callback page. No DOM access, so it is unit-tested (src/lib/delegated-callback-page.spec.ts).
// The page forwards the OAuth authorization response to the app window that opened it, and ONLY to an app origin on the allow list. It never keeps anything.

export const MESSAGE_SOURCE = "analytichub-delegated-callback";

/**
 * @param {string} hash  location.hash (response_mode=fragment)
 * @param {string} search  location.search (fallback)
 * @returns {{ code: string, state: string, error: string, errorDescription: string }}
 */
export function parseCallbackParams(hash, search) {
    const fromFragment = new URLSearchParams(hash.replace(/^#/, ""));
    const params = fromFragment.has("state") ? fromFragment : new URLSearchParams(search.replace(/^\?/, ""));
    return { code: params.get("code") ?? "", state: params.get("state") ?? "", error: params.get("error") ?? "", errorDescription: params.get("error_description") ?? "" };
}

/**
 * The state is base64url(JSON({ n: nonce, o: appOrigin })), made by the app (src/lib/delegated-callback-flow.ts encodeState).
 * @param {string} state
 * @returns {{ n: string, o: string } | null}
 */
export function decodeState(state) {
    if (!state || state.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(state)) return null;
    try {
        const padded = state.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(state.length / 4) * 4, "=");
        const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))));
        return typeof parsed?.n === "string" && typeof parsed?.o === "string" ? { n: parsed.n, o: parsed.o } : null;
    } catch { return null; }
}

/**
 * @typedef {{ kind: "post", targetOrigin: string, message: { source: string, v: 1, state: string, code?: string, error?: string, errorDescription?: string } }
 *   | { kind: "reject", reason: "no_state" | "bad_state" | "origin_not_allowed" | "no_opener" | "no_response" }} Decision
 */

/**
 * @param {{ hash: string, search: string, hasOpener: boolean, allowedOrigins: readonly string[] }} input
 * @returns {Decision}
 */
export function decide({ hash, search, hasOpener, allowedOrigins }) {
    const params = parseCallbackParams(hash, search);
    if (!params.state) return { kind: "reject", reason: "no_state" };
    const state = decodeState(params.state);
    if (!state) return { kind: "reject", reason: "bad_state" };
    // The origin comes from a value the sender controls, so it is trusted only if it is on OUR list, compared exactly.
    if (!allowedOrigins.includes(state.o)) return { kind: "reject", reason: "origin_not_allowed" };
    if (!hasOpener) return { kind: "reject", reason: "no_opener" };
    if (!params.code && !params.error) return { kind: "reject", reason: "no_response" };
    /** @type {{ source: string, v: 1, state: string, code?: string, error?: string, errorDescription?: string }} */
    const message = { source: MESSAGE_SOURCE, v: 1, state: params.state };
    if (params.code) message.code = params.code;
    else { message.error = params.error.slice(0, 64); message.errorDescription = params.errorDescription.slice(0, 160); }
    return { kind: "post", targetOrigin: state.o, message };
}
