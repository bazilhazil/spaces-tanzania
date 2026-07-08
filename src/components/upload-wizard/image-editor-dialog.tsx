import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { cropRotateToFile } from "@/lib/property-media";

type Props = {
  src: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: (file: File) => void;
};

export function ImageEditorDialog({ src, open, onOpenChange, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!area) return onOpenChange(false);
    setSaving(true);
    try {
      const file = await cropRotateToFile(src, area, rotation);
      onDone(file);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Edit photo</DialogTitle>
        </DialogHeader>
        <div className="relative h-[420px] bg-black">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, a) => setArea(a)}
            objectFit="contain"
          />
        </div>
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <Button type="button" variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)} className="gap-2 rounded-full">
            <RotateCw className="h-4 w-4" /> Rotate
          </Button>
        </div>
        <DialogFooter className="p-4 pt-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Apply"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
