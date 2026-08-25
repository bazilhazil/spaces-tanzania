// SPACES — user-facing error messages.
// Never surface raw database / auth errors to people; map them to plain
// language in the language the user selected.

type Key =
  | "offline"
  | "generic"
  | "notFound"
  | "permission"
  | "session"
  | "credentials"
  | "duplicate"
  | "tooMany"
  | "invalid"
  | "invalidPhone"
  | "otpSendFailed"
  | "otpUnavailable"
  | "otpWrong"
  | "otpExpired";

const MESSAGES: Record<"en" | "sw", Record<Key, string>> = {
  en: {
    offline: "No internet connection.",
    generic: "Something went wrong. Please try again.",
    notFound: "This space is no longer available.",
    permission: "You don't have permission to do this.",
    session: "Your session has expired. Please sign in again.",
    credentials: "Wrong email or password. Please try again.",
    duplicate: "This already exists.",
    tooMany: "Too many attempts. Please wait a moment and try again.",
    invalid: "Please check the details you entered.",
    invalidPhone: "Please enter a valid Tanzanian phone number.",
    otpSendFailed: "We couldn't send the code right now. Please try again.",
    otpUnavailable: "Phone sign-in isn't available yet. Please use email or Google.",
    otpWrong: "That code is incorrect. Please try again.",
    otpExpired: "This code has expired. Request a new code.",
  },
  sw: {
    offline: "Hakuna muunganisho wa intaneti.",
    generic: "Hitilafu imetokea. Tafadhali jaribu tena.",
    notFound: "Nafasi hii haipatikani tena.",
    permission: "Huna ruhusa ya kufanya hili.",
    session: "Kipindi chako kimeisha. Tafadhali ingia tena.",
    credentials: "Barua pepe au nenosiri si sahihi. Jaribu tena.",
    duplicate: "Hii tayari ipo.",
    tooMany: "Majaribio mengi mno. Subiri kidogo kisha jaribu tena.",
    invalid: "Tafadhali angalia taarifa ulizojaza.",
    invalidPhone: "Tafadhali weka namba sahihi ya simu ya Tanzania.",
    otpSendFailed: "Hatujaweza kutuma msimbo kwa sasa. Tafadhali jaribu tena.",
    otpUnavailable: "Kuingia kwa simu bado hakupatikani. Tumia barua pepe au Google.",
    otpWrong: "Msimbo huo si sahihi. Tafadhali jaribu tena.",
    otpExpired: "Msimbo umeisha muda. Omba msimbo mpya.",
  },
};

function lang(): "en" | "sw" {
  try {
    return localStorage.getItem("spaces.lang") === "sw" ? "sw" : "en";
  } catch {
    return "en";
  }
}

function classify(raw: string): Key {
  const m = raw.toLowerCase();
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request")) return "offline";
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) return "credentials";
  if (m.includes("jwt") || m.includes("session") || m.includes("token") || m.includes("401")) return "session";
  if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized") || m.includes("403")) return "permission";
  if (m.includes("duplicate key") || m.includes("already registered") || m.includes("already exists")) return "duplicate";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "tooMany";
  if (m.includes("phone provider") || m.includes("unsupported phone")) return "otpUnavailable";
  if (m.includes("expired")) return "otpExpired";
  if (m.includes("otp") || m.includes("invalid token")) return "otpWrong";
  if (m.includes("invalid phone")) return "invalidPhone";
  if (m.includes("no rows") || m.includes("not found") || m.includes("404")) return "notFound";
  if (m.includes("violates") || m.includes("invalid input") || m.includes("check constraint")) return "invalid";
  return "generic";
}

/** Turn any thrown value / Supabase error into a friendly message. */
export function friendlyError(err: unknown, fallback?: Key): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";
  const key = raw ? classify(raw) : fallback ?? "generic";
  return MESSAGES[lang()][key];
}

export function errorMessage(key: Key): string {
  return MESSAGES[lang()][key];
}
