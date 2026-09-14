import { useEffect, useState } from "react";
import { Copy, Facebook, Mail, MessageCircle, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  url: string;
  /** Public location line, e.g. "Masaki, Dar es Salaam". */
  location?: string;
  /** Already formatted, public price text, e.g. "TZS 2,500,000/month". */
  price?: string;
  propertyId?: string;
};

export function PropertyShareDialog({
  open,
  onOpenChange,
  title,
  url,
  location,
  price,
  propertyId,
}: Props) {
  const { t } = useI18n();
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Only public listing information is ever included — never owner contacts.
  const summary = [title, location, price].filter(Boolean).join("\n");
  const whatsappText = `Check out this space on SPACES:\n${summary}\n\nView it here:\n${url}`;
  const shortText = `${title} — SPACES`;

  function logShare(channel: string) {
    track("property_shared", { property_id: propertyId ?? "", channel });
    if (channel === "whatsapp") track("whatsapp_clicked", { property_id: propertyId ?? "" });
  }

  const links = [
    {
      key: "whatsapp",
      label: t("share.whatsapp"),
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
    },
    {
      key: "facebook",
      label: t("share.facebook"),
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: "x",
      label: t("share.x"),
      icon: Share2,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(url)}`,
    },
    {
      key: "email",
      label: t("share.email"),
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(shortText)}&body=${encodeURIComponent(`${summary}\n\n${url}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {[title, location, price].filter(Boolean).join(" · ")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => logShare(l.key)}
            >
              <Button variant="outline" className="w-full justify-start gap-2">
                <l.icon className="h-4 w-4" /> {l.label}
              </Button>
            </a>
          ))}
        </div>
        {canNativeShare && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              logShare("native");
              void navigator
                .share({ title, text: summary, url })
                .catch(() => undefined);
            }}
          >
            <Smartphone className="h-4 w-4" /> {t("share.native")}
          </Button>
        )}
        <Button
          className="w-full gap-2"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(url);
              logShare("copy_link");
              toast.success(t("share.copied"));
            }
          }}
        >
          <Copy className="h-4 w-4" /> {t("share.copyLink")}
        </Button>
        <p className="truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{url}</p>
      </DialogContent>
    </Dialog>
  );
}
