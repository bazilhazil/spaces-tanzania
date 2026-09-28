import { useEffect, useState } from "react";
import { Gift, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/use-i18n";

/** Personal referral code + invite link and a count of people referred. */
export function ReferralCard() {
  const { t } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("my_ref_code" as never);
      setCode((data as unknown as string) ?? null);
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (uid) {
        const { count: c } = await supabase.from("referrals" as never).select("id", { count: "exact", head: true }).eq("referrer_id", uid);
        setCount(c ?? 0);
      }
    })();
  }, []);
  if (!code) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : "https://spacestz.com"}/become-dalali?ref=${code}`;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <Gift className="h-6 w-6 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{t("s3.ref.title")}</p>
        <p className="text-sm text-muted-foreground">
          {t("s3.ref.body")} <span className="font-mono font-semibold text-foreground">{code}</span> · {t("s3.ref.count", { n: count })}
        </p>
      </div>
      <Button variant="outline" className="gap-2" onClick={async () => {
        try { await navigator.clipboard.writeText(link); toast.success(t("s3.linkCopied")); } catch { /* ignore */ }
      }}>
        <Copy className="h-4 w-4" /> {t("s3.ref.copy")}
      </Button>
    </div>
  );
}
