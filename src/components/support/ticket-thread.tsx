import { useCallback, useEffect, useState } from "react";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import {
  attachmentUrl, listTicketMessages, replyToTicket,
  type SupportMessage, type SupportTicket, type SupportStatus, type SupportPriority,
} from "@/lib/support-db";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const STATUS_VARIANT: Record<SupportStatus, "warning" | "secondary" | "success" | "muted" | "gold"> = {
  open: "warning",
  in_progress: "gold",
  waiting_user: "secondary",
  resolved: "success",
  closed: "muted",
};

export const PRIORITY_VARIANT: Record<SupportPriority, "muted" | "warning" | "destructive"> = {
  normal: "muted",
  high: "warning",
  urgent: "destructive",
};

export function TicketStatusBadge({ status }: { status: SupportStatus }) {
  const { t } = useI18n();
  return <Badge variant={STATUS_VARIANT[status]}>{t(`support.status.${status}`)}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: SupportPriority }) {
  const { t } = useI18n();
  if (priority === "normal") return null;
  return <Badge variant={PRIORITY_VARIANT[priority]}>{t(`support.priority.${priority}`)}</Badge>;
}

function Attachment({ path }: { path: string }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { void attachmentUrl(path).then(setUrl); }, [path]);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium underline">
      <Paperclip className="h-3.5 w-3.5" /> {t("support.field.attachment")}
    </a>
  );
}

export function TicketThread({
  ticket,
  staff = false,
  onChanged,
}: {
  ticket: SupportTicket;
  staff?: boolean;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [internal, setInternal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessages(await listTicketMessages(ticket.id));
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => { void load(); }, [load]);

  const locked = ticket.status === "closed";

  async function send() {
    if (body.trim().length < 2) return;
    setBusy(true);
    const res = await replyToTicket(ticket.id, body, { file, staff, internal });
    setBusy(false);
    if (!res.ok) { toast.error(t("support.form.failed")); return; }
    setBody(""); setFile(null); setInternal(false);
    void load();
    onChanged?.();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("support.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("support.thread.empty")}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-2xl border p-3 text-sm",
                m.internal
                  ? "border-dashed border-warning bg-warning/10"
                  : m.isStaff
                    ? "border-border bg-secondary/60"
                    : "border-border bg-card",
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>{m.isStaff ? t("support.thread.support") : t("support.thread.you")}</span>
                <span>·</span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
                {m.internal && <Badge variant="warning">{t("support.thread.internal")}</Badge>}
              </div>
              <p className="whitespace-pre-wrap break-words text-foreground">{m.body}</p>
              {m.attachmentPath && <Attachment path={m.attachmentPath} />}
            </div>
          ))
        )}
      </div>

      {locked ? (
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{t("support.thread.closed")}</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={body}
            maxLength={4000}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("support.thread.replyPlaceholder")}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              type="file" accept="image/*" capture="environment"
              className="h-11 max-w-full file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs sm:max-w-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              {staff && (
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  {t("support.thread.internal")}
                </label>
              )}
              <Button className="h-11 w-full gap-2 rounded-full sm:w-auto" disabled={busy} onClick={() => void send()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("support.action.reply")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
