import { decide } from "./callback-core.js";
import { ALLOWED_APP_ORIGINS } from "./allowed-origins.js";

const status = document.getElementById("status");
const say = (text) => { if (status) status.textContent = text; };
const input = { hash: location.hash, search: location.search, hasOpener: Boolean(window.opener), allowedOrigins: ALLOWED_APP_ORIGINS };
// Nothing stays in the address bar or the history.
history.replaceState(null, "", location.pathname);
const decision = decide(input);
if (decision.kind === "post") {
    try {
        window.opener.postMessage(decision.message, decision.targetOrigin);
        say("Signed in. You can close this window.");
        setTimeout(() => window.close(), 300);
    } catch {
        say("Could not return to the app. Close this window and try again.");
    }
} else {
    say(decision.reason === "no_opener" ? "This window lost its link to the app. Close it and try again." : "This page cannot complete the sign-in. Close this window and try again.");
}
