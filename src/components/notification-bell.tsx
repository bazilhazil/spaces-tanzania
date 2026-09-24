import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

/** Bell with a live unread count. Shows no number when everything is read. */
export function NotificationBell({ className }: { className?: string }) {
  const { unread } = useNotifications();
  const { t } = useI18n();
  const label = unread > 0 ? t("notifLive.bellUnread", { n: unread }) : t("notifLive.bell");
  return (
    <Link
      to="/notifications"
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-foreground transition hover:bg-accent",
        className,
      )}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span
          data-testid="notif-count"
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
