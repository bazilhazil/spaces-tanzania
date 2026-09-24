import { supabase } from "@/integrations/supabase/client";

// Loose client for new RPCs/tables until generated types are consumed everywhere.
const db = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: typeof supabase.from;
};

export type ManagerPermission = "view" | "manage";
export const MANAGER_SCOPES = ["tenants", "leases", "rent", "maintenance", "documents", "reports"] as const;

export type ManagementAssignment = {
  id: string;
  property_id: string;
  property_title: string | null;
  owner_id: string;
  owner_name: string | null;
  manager_id: string;
  manager_name: string | null;
  permission: ManagerPermission;
  scopes: string[];
  status: "invited" | "active" | "declined" | "ended";
  invited_at: string;
  accepted_at: string | null;
  ended_at: string | null;
};

export type ManagerCandidate = {
  id: string;
  full_name: string | null;
  agency_name: string | null;
  avatar_url: string | null;
  is_manager: boolean;
};

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function fetchMyAssignments(): Promise<ManagementAssignment[]> {
  const { data, error } = await db.rpc("my_management_assignments");
  check(error);
  return (data ?? []) as ManagementAssignment[];
}

export async function searchManagers(q: string): Promise<ManagerCandidate[]> {
  if (q.trim().length < 3) return [];
  const { data, error } = await db.rpc("search_property_managers", { _q: q.trim() });
  check(error);
  return (data ?? []) as ManagerCandidate[];
}

export async function inviteManager(propertyId: string, managerId: string, permission: ManagerPermission) {
  const { error } = await db.rpc("invite_property_manager", {
    _property_id: propertyId, _manager_id: managerId, _permission: permission,
  });
  check(error);
}

export async function respondInvite(assignmentId: string, accept: boolean) {
  const { error } = await db.rpc("respond_management_invite", { _assignment_id: assignmentId, _accept: accept });
  check(error);
}

export async function endManager(assignmentId: string, reason?: string) {
  const { error } = await db.rpc("end_property_manager", { _assignment_id: assignmentId, _reason: reason ?? null });
  check(error);
}

export async function updateManagerPermission(assignmentId: string, permission: ManagerPermission) {
  const { error } = await db.rpc("update_manager_permission", { _assignment_id: assignmentId, _permission: permission });
  check(error);
}

/** True when the signed-in user currently manages at least one property for someone. */
export async function hasActiveManagement(userId: string): Promise<boolean> {
  const { count } = await supabase.from("property_managers")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", userId)
    .eq("status", "active");
  return (count ?? 0) > 0;
}

/** Controlled onboarding: reuses the existing verification request workflow (admin approves). */
export async function requestManagerOnboarding(userId: string, notes: string) {
  const { error } = await supabase.from("verification_requests").insert({
    requester_id: userId, subject_type: "property_manager", notes: notes || null,
    documents: [] as never, details: {} as never,
  } as never);
  check(error);
}

export async function fetchOnboardingStatus(userId: string): Promise<string | null> {
  const { data } = await supabase.from("verification_requests").select("status")
    .eq("requester_id", userId).eq("subject_type", "property_manager")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}
