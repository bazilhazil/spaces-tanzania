import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { NewTicketDialog, type TicketContext } from "@/components/support/new-ticket-dialog";
import { cn } from "@/lib/utils";

/**
 * "Need Help?" shortcut for error / problem screens.
 * Signed-in users get the support form pre-filled with the right category;
 * signed-out visitors are sent to the matching Help Center topic.
 */
export function NeedHelp({
  topic,
  subject,
  context,
  className,
}: {
  topic: string;
  subject?: string;
  context?: TicketContext;
  className?: string;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Link to="/help" search={{ topic } as never} className={cn("inline-flex", className)}>
        <Button variant="ghost" size="sm" className="gap-2 rounded-full text-primary">
          <LifeBuoy className="h-4 w-4" /> {t("support.needHelp")}
        </Button>
      </Link>
    );
  }

  return (
    <div className={cn("inline-flex", className)}>
      <Button variant="ghost" size="sm" className="gap-2 rounded-full text-primary" onClick={() => setOpen(true)}>
        <LifeBuoy className="h-4 w-4" /> {t("support.needHelp")}
      </Button>
      <NewTicketDialog
        open={open}
        onOpenChange={setOpen}
        defaultCategory={topic}
        defaultSubject={subject ?? ""}
        context={context}
      />
    </div>
  );
}
