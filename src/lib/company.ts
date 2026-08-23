/**
 * SPACES company contact configuration.
 *
 * Single source of truth for public contact details and social profiles.
 * Only entries with a value are rendered anywhere in the UI — leave a field
 * empty (or a social link out of the array) and it simply will not show.
 */

export const COMPANY = {
  legalName: "SPACES GROUP LTD",
  brand: "SPACES",
  phone: "+255 700 000 000",
  email: "info@spacestz.com",
  whatsapp: "+255 700 000 000",
  /** Business location — leave empty to hide the address block. */
  address: "Dar es Salaam, Tanzania",
  hours: "Mon – Sat, 08:00 – 18:00 (EAT)",
} as const;

/** Only configured social profiles are shown in the footer. */
export const SOCIAL_LINKS: { key: "facebook" | "instagram" | "twitter" | "linkedin"; url: string }[] = [];

export function telHref(v: string) {
  return `tel:${v.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(v: string) {
  return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
}

export function mailHref(v: string) {
  return `mailto:${v}`;
}
