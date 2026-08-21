import { Copy, Facebook, Mail, MessageCircle, Share2 } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  url: string;
};

export function PropertyShareDialog({ open, onOpenChange, title, url }: Props) {
  const { t } = useI18n();
  const text = `${title} — SPACES`;

  const links = [
    {
      key: "whatsapp",
      label: t("share.whatsapp"),
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
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
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      key: "email",
      label: t("share.email"),
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${url}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription className="line-clamp-2">{title}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {links.map((l) => (
            <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start gap-2">
                <l.icon className="h-4 w-4" /> {l.label}
              </Button>
            </a>
          ))}
        </div>
        <Button
          className="w-full gap-2"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(url);
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
