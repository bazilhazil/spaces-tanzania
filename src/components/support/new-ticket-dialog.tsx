import { useState, type ReactNode } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/hooks/use-i18n";
import { createTicket, SUPPORT_CATEGORIES } from "@/lib/support-db";
import { toast } from "sonner";

export interface TicketContext {
  propertyId?: string | null;
  propertyTitle?: string | null;
  leadId?: string | null;
  dealId?: string | null;
}

export function NewTicketDialog({
  trigger,
  defaultCategory = "technical",
  defaultSubject = "",
  context,
  onCreated,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  defaultCategory?: string;
  defaultSubject?: string;
  context?: TicketContext;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;

  const [subject, setSubject] = useState(defaultSubject);
  const [category, setCategory] = useState(defaultCategory);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (subject.trim().length < 3 || message.trim().length < 5) {
      toast.error(t("support.form.invalid"));
      return;
    }
    setBusy(true);
    const res = await createTicket({
      subject,
      category,
      message,
      propertyId: context?.propertyId ?? null,
      leadId: context?.leadId ?? null,
      dealId: context?.dealId ?? null,
      file,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(t("support.form.failed"));
      return;
    }
    toast.success(t("support.form.sent", { ref: res.ticket.reference }));
    setSubject(""); setMessage(""); setFile(null);
    setOpen(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("support.form.title")}</DialogTitle>
          <DialogDescription>{t("support.form.sub")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sup-cat">{t("support.field.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="sup-cat" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{t(`support.cat.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-sub">{t("support.field.subject")}</Label>
            <Input
              id="sup-sub" className="h-11" value={subject} maxLength={160}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("support.field.subjectPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-msg">{t("support.field.message")}</Label>
            <Textarea
              id="sup-msg" rows={5} value={message} maxLength={4000}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("support.field.messagePlaceholder")}
            />
          </div>

          {context?.propertyTitle && (
            <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              {t("support.field.related")}: {context.propertyTitle}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sup-file" className="inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> {t("support.field.attachment")}
            </Label>
            <Input
              id="sup-file" type="file" accept="image/*" capture="environment"
              className="h-11 file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="h-11 rounded-full" onClick={() => setOpen(false)}>
            {t("support.action.cancel")}
          </Button>
          <Button className="h-11 rounded-full" disabled={busy} onClick={() => void submit()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("support.action.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
