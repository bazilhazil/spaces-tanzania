import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/admin/panels";
import { supabase } from "@/integrations/supabase/client";
import { sendAdminTestSms } from "@/lib/phone-otp.functions";
import { normalizeTanzanianPhoneNumber } from "@/lib/phone";

type LogRow = {
  id: string;
  masked_recipient: string;
  purpose: string;
  success: boolean;
  provider_message_id: string | null;
  created_at: string;
};

export function SmsPanel() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);

  async function loadLogs() {
    const { data } = await supabase
      .from("sms_delivery_log")
      .select("id, masked_recipient, purpose, success, provider_message_id, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setLogs((data ?? []) as LogRow[]);
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  async function sendTest() {
    const target = normalizeTanzanianPhoneNumber(phone);
    if (!target) return toast.error("Enter a valid Tanzanian mobile number.");
    setSending(true);
    try {
      const res = await sendAdminTestSms({ data: { phone: target } });
      if (res.ok) toast.success("Test message accepted by the SMS provider.");
      else if (res.reason === "unconfigured")
        toast.error("SMS credentials are not configured on the server yet.");
      else toast.error("We couldn't send the test message. Please try again.");
    } catch {
      toast.error("We couldn't send the test message. Please try again.");
    }
    setSending(false);
    void loadLogs();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="SMS" subtitle="Send a test message and review recent delivery activity." />

      <div className="rounded-2xl border bg-card p-5">
        <Label htmlFor="sms-test">Test recipient</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="sms-test"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className="h-11 rounded-xl"
          />
          <Button onClick={sendTest} disabled={sending} className="h-11 gap-2 rounded-xl">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send test
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4 text-sm font-semibold">
          <MessageSquare className="h-4 w-4" /> Recent messages
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No messages sent yet.</p>
        ) : (
          <ul className="divide-y">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="font-medium">{l.masked_recipient}</span>
                <span className="text-muted-foreground">{l.purpose}</span>
                <span className={l.success ? "text-emerald-600" : "text-destructive"}>
                  {l.success ? "Sent" : "Failed"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
