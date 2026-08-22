import { supabase } from "@/integrations/supabase/client";

export type AgentPermission =
  | "view_only"
  | "manage_leads"
  | "manage_viewings"
  | "edit_listing"
  | "full_management";

export const AGENT_PERMISSIONS: AgentPermission[] = [
  "view_only",
  "manage_leads",
  "manage_viewings",
  "edit_listing",
  "full_management",
];

export type PropertyAgent = {
  id: string;
  property_id: string;
  agent_id: string;
  permission: AgentPermission;
  created_at: string;
  agent_name?: string | null;
  agency_name?: string | null;
  avatar_url?: string | null;
};

export type AgentDirectoryEntry = {
  id: string;
  full_name: string | null;
  agency_name: string | null;
  avatar_url: string | null;
};

/** Permission levels that allow editing the listing itself. */
export function canEditListing(p?: AgentPermission | null) {
  return p === "edit_listing" || p === "full_management";
}
export function canManageLeads(p?: AgentPermission | null) {
  return p === "manage_leads" || p === "full_management";
}
export function canManageViewings(p?: AgentPermission | null) {
  return p === "manage_viewings" || p === "full_management";
}

/** Map of property_id → permission for every listing assigned to the signed-in agent. */
export async function fetchMyAssignments(agentId: string): Promise<Record<string, AgentPermission>> {
  const { data } = await supabase
    .from("property_agents")
    .select("property_id,permission")
    .eq("agent_id", agentId);
  const out: Record<string, AgentPermission> = {};
  for (const r of (data ?? []) as { property_id: string; permission: AgentPermission }[]) {
    out[r.property_id] = r.permission;
  }
  return out;
}

export async function fetchPropertyAgents(propertyId: string): Promise<PropertyAgent[]> {
  const { data } = await supabase
    .from("property_agents")
    .select("id,property_id,agent_id,permission,created_at")
    .eq("property_id", propertyId)
    .order("created_at");
  return (data ?? []) as PropertyAgent[];
}

export async function searchAgents(query: string): Promise<AgentDirectoryEntry[]> {
  if (query.trim().length < 3) return [];
  const { data, error } = await supabase.rpc("search_agents", { _q: query.trim() } as never);
  if (error) return [];
  return (data ?? []) as AgentDirectoryEntry[];
}

export async function assignAgent(
  propertyId: string,
  ownerId: string,
  agentId: string,
  permission: AgentPermission,
): Promise<void> {
  const { error } = await supabase
    .from("property_agents")
    .upsert(
      { property_id: propertyId, owner_id: ownerId, agent_id: agentId, permission } as never,
      { onConflict: "property_id,agent_id" },
    );
  if (error) throw error;
}

export async function updateAgentPermission(id: string, permission: AgentPermission): Promise<void> {
  const { error } = await supabase
    .from("property_agents")
    .update({ permission } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function removeAgent(id: string): Promise<void> {
  const { error } = await supabase.from("property_agents").delete().eq("id", id);
  if (error) throw error;
}
