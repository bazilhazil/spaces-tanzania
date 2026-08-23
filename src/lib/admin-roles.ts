// Role capability documentation for the Admin Control Center.
// This is static product documentation, not sample data: all live metrics,
// listings, users and revenue come from the database via src/lib/admin-db.ts.
export type AdminRole =
  | "guest"
  | "user"
  | "owner"
  | "agent"
  | "moderator"
  | "admin"
  | "superadmin";

export const ROLE_LABELS: Record<AdminRole, string> = {
  guest: "Guest",
  user: "Registered User",
  owner: "Owner",
  agent: "Agent",
  moderator: "Moderator",
  admin: "Administrator",
  superadmin: "Super Administrator",
};

export const ROLE_MATRIX: {
  capability: string;
  roles: Record<AdminRole, boolean>;
}[] = [
  ["Browse listings", { guest: true, user: true, owner: true, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Book viewings", { guest: false, user: true, owner: true, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Upload property", { guest: false, user: false, owner: true, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Manage clients", { guest: false, user: false, owner: false, agent: true, moderator: true, admin: true, superadmin: true }],
  ["Moderate listings", { guest: false, user: false, owner: false, agent: false, moderator: true, admin: true, superadmin: true }],
  ["Manage users", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: true, superadmin: true }],
  ["Configure system", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: true, superadmin: true }],
  ["Rotate API keys", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: false, superadmin: true }],
  ["Maintenance mode", { guest: false, user: false, owner: false, agent: false, moderator: false, admin: false, superadmin: true }],
].map(([capability, roles]) => ({ capability: capability as string, roles: roles as Record<AdminRole, boolean> }));
