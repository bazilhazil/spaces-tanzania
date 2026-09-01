import { supabase } from "@/integrations/supabase/client";

/**
 * Data & Backup settings.
 *
 * SPACES never simulates a backup. Status is reported from the configuration an
 * administrator records here plus the last run the backup provider reports back.
 * When nothing is configured the UI must say "Backup configuration required."
 */

export const BACKUP_KEY = "backup.config";
export const RECOVERY_KEY = "recovery.contacts";

export interface BackupConfig {
  provider: string | null;          // e.g. "Managed daily backups (Cloud)"
  configured: boolean;              // set only by an admin who verified it
  frequency: "daily" | "weekly" | null;
  retentionPoints: number | null;
  lastSuccessAt: string | null;     // reported by the provider, never invented
  nextScheduledAt: string | null;
  notes: string | null;
}

export interface RecoveryContacts {
  primaryEmail: string | null;
  backupEmail: string | null;
  backupPhone: string | null;
}

export const EMPTY_BACKUP: BackupConfig = {
  provider: null, configured: false, frequency: null, retentionPoints: null,
  lastSuccessAt: null, nextScheduledAt: null, notes: null,
};

export const EMPTY_CONTACTS: RecoveryContacts = {
  primaryEmail: null, backupEmail: null, backupPhone: null,
};

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return fallback;
  return { ...fallback, ...((data as { value: T }).value ?? {}) };
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key, value: value as never, updated_by: auth.user?.id ?? null } as never, { onConflict: "key" });
  if (error) throw error;
}

export const fetchBackupConfig = () => readSetting<BackupConfig>(BACKUP_KEY, EMPTY_BACKUP);
export const saveBackupConfig = (cfg: BackupConfig) => writeSetting(BACKUP_KEY, cfg);
export const fetchRecoveryContacts = () => readSetting<RecoveryContacts>(RECOVERY_KEY, EMPTY_CONTACTS);
export const saveRecoveryContacts = (c: RecoveryContacts) => writeSetting(RECOVERY_KEY, c);

// ----------------------------------------------------------------- exports

export type ExportKind = "users" | "properties" | "leads" | "deals" | "viewings" | "revenue";

const EXPORTS: Record<ExportKind, { table: string; columns: string; order: string }> = {
  users:      { table: "profiles",   columns: "id,full_name,email,phone,location,account_status,verified_identity,created_at", order: "created_at" },
  properties: { table: "properties", columns: "id,title,property_type,listing_type,price,currency,region,district,status,view_count,created_at", order: "created_at" },
  leads:      { table: "leads",      columns: "id,property_id,status,contact_method,created_at,last_activity_at", order: "created_at" },
  deals:      { table: "deals",      columns: "id,reference,property_id,stage,priority,value,currency,created_at,completed_at", order: "created_at" },
  viewings:   { table: "bookings",   columns: "id,property_id,status,scheduled_at,duration_minutes,created_at", order: "created_at" },
  revenue:    { table: "payments",   columns: "id,purpose,plan_id,amount,currency,status,billing_cycle,created_at", order: "created_at" },
};

/** Aggregated business export. Personal contact details are limited to the Users export. */
export async function exportBusinessData(kind: ExportKind): Promise<string> {
  const spec = EXPORTS[kind];
  const { data, error } = await supabase
    .from(spec.table as never)
    .select(spec.columns)
    .order(spec.order, { ascending: false })
    .limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const headers = spec.columns.split(",");
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
