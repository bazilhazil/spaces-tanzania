import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, ShieldOff } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { blockUser, isBlockedWith, unblockUser } from "@/lib/safety-db";

export function useBlockState(userId?: string | null) {
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    let alive = true;
    if (!userId) { setBlocked(false); setLoading(false); return; }
    setLoading(true);
    void isBlockedWith(userId).then((v) => { if (alive) { setBlocked(v); setLoading(false); } });
    return () => { alive = false; };
  }, [userId]);

  return { blocked, setBlocked, loading };
}

export function BlockUserDialog({
  open, onOpenChange, userId, name, blocked, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  name: string;
  blocked: boolean;
  onChanged?: (blocked: boolean) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = blocked ? await unblockUser(userId) : await blockUser(userId);
    setBusy(false);
    if (!res.ok) { toast.error(t("safety.block.failed")); return; }
    onChanged?.(!blocked);
    onOpenChange(false);
    toast.success(blocked ? t("safety.block.unblocked", { name }) : t("safety.block.blocked", { name }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocked ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4 text-destructive" />}
            {blocked ? t("safety.block.unblockTitle", { name }) : t("safety.block.blockTitle", { name })}
          </DialogTitle>
          <DialogDescription>
            {blocked ? t("safety.block.unblockBody") : t("safety.block.blockBody")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 max-sm:flex-col">
          <Button variant="ghost" className="max-sm:w-full" onClick={() => onOpenChange(false)}>
            {t("safety.report.cancel")}
          </Button>
          <Button
            className="max-sm:w-full"
            variant={blocked ? "default" : "destructive"}
            disabled={busy}
            onClick={run}
          >
            {blocked ? t("safety.block.unblockAction") : t("safety.block.blockAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
