// SPACES — Tanzanian phone number helpers.
// One source of truth for turning whatever a person types into the
// international format Supabase Auth expects (+255XXXXXXXXX).

/**
 * Normalizes a Tanzanian mobile number to +255XXXXXXXXX.
 * Accepts: 0658610015, 658610015, 255658610015, +255 658 610 015.
 * Returns null when the input is not a valid TZ mobile number.
 */
export function normalizeTanzanianPhoneNumber(raw: string): string | null {
  // Keep digits only (a leading "+" carries no extra information once we
  // know the country prefix rules below).
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // 255658610015 / 2550658610015 → strip country code (and a stray 0).
  if (digits.startsWith("255")) {
    digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // National significant number must be 9 digits starting with 6 or 7.
  if (!/^[67]\d{8}$/.test(digits)) return null;
  return `+255${digits}`;
}

export function isValidTzPhone(raw: string): boolean {
  return normalizeTanzanianPhoneNumber(raw) !== null;
}

/** +255658610015 → +255 *** *** 015 */
export function maskTzPhone(e164: string): string {
  const tail = e164.slice(-3);
  return `+255 *** *** ${tail}`;
}
