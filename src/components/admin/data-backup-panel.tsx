import { useEffect, useState } from "react";
import {
  Database, ShieldCheck, AlertTriangle, Download, Save, Loader2, LifeBuoy, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import { friendlyError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin-ops";
import {
  EMPTY_BACKUP, EMPTY_CONTACTS, downloadCsv, exportBusinessData, fetchBackupConfig,
  fetchRecoveryContacts, saveBackupConfig, saveRecoveryContacts,
  type BackupConfig, type ExportKind, type RecoveryContacts,
} from "@/lib/backup-db";

const EXPORT_KINDS: ExportKind[] = ["users", "properties", "leads", "deals", "viewings", "revenue"];

function fmt(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(+d) ? null : d.toLocaleString();
}

export function DataBackupPanel() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<BackupConfig>(EMPTY_BACKUP);
  const [contacts, setContacts] = useState<RecoveryContacts>(EMPTY_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);
  const [busyExport, setBusyExport] = useState<ExportKind | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchBackupConfig(), fetchRecoveryContacts()])
      .then(([b, c]) => { if (!alive) return; setCfg(b); setContacts(c); })
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const configured = cfg.configured && !!cfg.provider;
  const lastSuccess = fmt(cfg.lastSuccessAt);
  const nextRun = fmt(cfg.nextScheduledAt);

  async function persistConfig() {
    setSavingCfg(true);
    try {
      await saveBackupConfig(cfg);
      toast.success(t("backup.saved"));
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSavingCfg(false);
    }
  }

  async function persistContacts() {
    setSavingContacts(true);
    try {
      await saveRecoveryContacts(contacts);
      toast.success(t("backup.saved"));
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSavingContacts(false);
    }
  }

  async function runExport(kind: ExportKind) {
    setBusyExport(kind);
    try {
      const csv = await exportBusinessData(kind);
      downloadCsv(`spaces-${kind}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      await logAdminAction({ action: "data_exported", targetType: "export", targetLabel: kind });
      toast.success(t("backup.exportDone"));
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusyExport(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{t("backup.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("backup.subtitle")}</p>
      </header>

      {/* Status */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`ds-card p-4 ${configured ? "" : "border-amber-500/40"}`}>
          <p className="ds-caption flex items-center gap-2">
            {configured ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            {t("backup.status")}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {configured ? t("backup.statusConfigured") : t("backup.statusMissing")}
          </p>
        </div>
        <div className="ds-card p-4">
          <p className="ds-caption">{t("backup.lastSuccess")}</p>
          <p className="mt-2 text-sm font-semibold">{lastSuccess ?? t("backup.unknown")}</p>
        </div>
        <div className="ds-card p-4">
          <p className="ds-caption">{t("backup.nextRun")}</p>
          <p className="mt-2 text-sm font-semibold">{nextRun ?? t("backup.unknown")}</p>
        </div>
        <div className="ds-card p-4">
          <p className="ds-caption">{t("backup.provider")}</p>
          <p className="mt-2 text-sm font-semibold">{cfg.provider || t("backup.unknown")}</p>
        </div>
      </section>

      {!configured && (
        <div className="ds-card border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-300">{t("backup.statusMissing")}</p>
          <p className="mt-1 text-muted-foreground">{t("backup.setupHelp")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>{t("backup.setupStep1")}</li>
            <li>{t("backup.setupStep2")}</li>
            <li>{t("backup.setupStep3")}</li>
          </ul>
        </div>
      )}

      {/* Configuration */}
      <section className="ds-card p-4">
        <h2 className="ds-h-sm flex items-center gap-2"><Database className="h-4 w-4" />{t("backup.configTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("backup.configNote")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("backup.provider")}</Label>
            <Input
              value={cfg.provider ?? ""}
              placeholder={t("backup.providerPlaceholder")}
              onChange={(e) => setCfg({ ...cfg, provider: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("backup.frequency")}</Label>
            <select
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={cfg.frequency ?? ""}
              onChange={(e) => setCfg({ ...cfg, frequency: (e.target.value || null) as BackupConfig["frequency"] })}
            >
              <option value="">{t("backup.unknown")}</option>
              <option value="daily">{t("backup.daily")}</option>
              <option value="weekly">{t("backup.weekly")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("backup.retention")}</Label>
            <Input
              type="number" min={1}
              value={cfg.retentionPoints ?? ""}
              onChange={(e) => setCfg({ ...cfg, retentionPoints: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("backup.lastSuccess")}</Label>
            <Input
              type="datetime-local"
              value={cfg.lastSuccessAt ? cfg.lastSuccessAt.slice(0, 16) : ""}
              onChange={(e) => setCfg({ ...cfg, lastSuccessAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("backup.nextRun")}</Label>
            <Input
              type="datetime-local"
              value={cfg.nextScheduledAt ? cfg.nextScheduledAt.slice(0, 16) : ""}
              onChange={(e) => setCfg({ ...cfg, nextScheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("backup.notes")}</Label>
            <Textarea
              rows={3}
              value={cfg.notes ?? ""}
              onChange={(e) => setCfg({ ...cfg, notes: e.target.value || null })}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={cfg.configured} onCheckedChange={(v) => setCfg({ ...cfg, configured: v })} />
            <span>{t("backup.confirmConfigured")}</span>
          </label>
          <Button onClick={persistConfig} disabled={savingCfg}>
            {savingCfg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("common.save")}
          </Button>
        </div>
      </section>

      {/* Restore safety */}
      <section className="ds-card p-4">
        <h2 className="ds-h-sm flex items-center gap-2"><RotateCcw className="h-4 w-4" />{t("backup.restoreTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("backup.restoreBody")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("backup.restoreReq1")}</li>
          <li>{t("backup.restoreReq2")}</li>
          <li>{t("backup.restoreReq3")}</li>
          <li>{t("backup.restoreReq4")}</li>
        </ul>
      </section>

      {/* Exports */}
      <section className="ds-card p-4">
        <h2 className="ds-h-sm flex items-center gap-2"><Download className="h-4 w-4" />{t("backup.exportTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("backup.exportNote")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORT_KINDS.map((kind) => (
            <Button
              key={kind}
              variant="outline"
              className="justify-between"
              disabled={busyExport !== null}
              onClick={() => runExport(kind)}
            >
              <span>{t(`backup.export.${kind}`)}</span>
              {busyExport === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      </section>

      {/* Recovery contacts */}
      <section className="ds-card p-4">
        <h2 className="ds-h-sm flex items-center gap-2"><LifeBuoy className="h-4 w-4" />{t("backup.contactsTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("backup.contactsNote")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t("backup.primaryEmail")}</Label>
            <Input
              type="email" value={contacts.primaryEmail ?? ""}
              onChange={(e) => setContacts({ ...contacts, primaryEmail: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("backup.backupEmail")}</Label>
            <Input
              type="email" value={contacts.backupEmail ?? ""}
              onChange={(e) => setContacts({ ...contacts, backupEmail: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("backup.backupPhone")}</Label>
            <Input
              value={contacts.backupPhone ?? ""}
              onChange={(e) => setContacts({ ...contacts, backupPhone: e.target.value || null })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={persistContacts} disabled={savingContacts}>
            {savingContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("common.save")}
          </Button>
        </div>
      </section>
    </div>
  );
}
