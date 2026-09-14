/**
 * Display-name helpers.
 *
 * Phone sign-in mints an internal auth identifier such as
 * `p255658610015@phone.spacestz.com`. That value is an authentication detail,
 * never a person's name — it must never reach the UI.
 */

const INTERNAL_EMAIL_DOMAINS = ["phone.spacestz.com", "users.spacestz.com"];

export function isInternalAuthEmail(email?: string | null): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && INTERNAL_EMAIL_DOMAINS.includes(domain);
}

/** An email that is safe to display, or null for internal auth identifiers. */
export function publicEmail(email?: string | null): string | null {
  if (!email || isInternalAuthEmail(email)) return null;
  return email;
}

interface NameSource {
  full_name?: string | null;
}

/** The person's real name, or null when they haven't given one yet. */
export function displayName(profile?: NameSource | null): string | null {
  const name = profile?.full_name?.trim();
  return name ? name : null;
}

/** Name or a neutral fallback — never an email address or phone number. */
export function displayNameOr(profile: NameSource | null | undefined, fallback: string): string {
  return displayName(profile) ?? fallback;
}

export function firstName(profile?: NameSource | null): string | null {
  return displayName(profile)?.split(" ")[0] ?? null;
}

/** Avatar initials from the real name only; neutral mark when unknown. */
export function avatarInitials(profile?: NameSource | null, fallback = "S"): string {
  const name = displayName(profile);
  if (!name) return fallback;
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Admin-facing contact line: real email, else phone, else a dash. */
export function contactLabel(source?: { email?: string | null; phone?: string | null } | null): string {
  return publicEmail(source?.email) ?? source?.phone ?? "—";
}
