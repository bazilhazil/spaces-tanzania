import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { archiveProperty } from "@/lib/property-actions";
import { friendlyError } from "@/lib/errors";
import { useI18n } from "@/hooks/use-i18n";

/**
 * Safe removal confirmation for a Space.
 * The listing leaves active listings; transaction history is retained.
 */
export function RemoveSpaceDialog({
  open, onOpenChange, propertyId, title, onRemoved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  title?: string;
  onRemoved?: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await archiveProperty(propertyId);
      toast.success(t("removeSpace.done"));
      onOpenChange(false);
      onRemoved?.();
    } catch (e) {
      // Nothing was changed — the archive runs as a single database action.
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("removeSpace.title")}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{t("removeSpace.body")}</span>
            {title && <span className="block font-medium text-foreground">{title}</span>}
            <span className="block text-xs">{t("removeSpace.restoreHint")}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); void confirm(); }}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("removeSpace.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
