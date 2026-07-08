import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Button } from "@/components/ui/button";
import { Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";

type Props = {
  latitude?: number;
  longitude?: number;
  onChange: (v: { latitude: number; longitude: number; address?: string }) => void;
};

export function LocationMapPicker({ latitude, longitude, onChange }: Props) {
  const { ready, error } = useGoogleMaps();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const g = window.google;
    const center = {
      lat: latitude ?? -6.7924, // Dar es Salaam
      lng: longitude ?? 39.2083,
    };
    mapRef.current = new g.maps.Map(mapDivRef.current, {
      center,
      zoom: latitude ? 16 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    markerRef.current = new g.maps.Marker({
      position: center,
      map: mapRef.current,
      draggable: true,
    });
    const emit = (pos: any) => {
      const lat = pos.lat();
      const lng = pos.lng();
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (res: any) => {
        onChange({ latitude: lat, longitude: lng, address: res?.[0]?.formatted_address });
      });
    };
    markerRef.current.addListener("dragend", (e: any) => emit(e.latLng));
    mapRef.current.addListener("click", (e: any) => {
      markerRef.current.setPosition(e.latLng);
      emit(e.latLng);
    });
  }, [ready, latitude, longitude, onChange]);

  // Keep marker in sync if props change
  useEffect(() => {
    if (mapRef.current && markerRef.current && latitude && longitude) {
      const pos = { lat: latitude, lng: longitude };
      markerRef.current.setPosition(pos);
      mapRef.current.panTo(pos);
    }
  }, [latitude, longitude]);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (res: any) =>
            onChange({ latitude: lat, longitude: lng, address: res?.[0]?.formatted_address }),
          );
        } else onChange({ latitude: lat, longitude: lng });
      },
      () => toast.error("Could not get your location"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Map unavailable. You can still type the address below.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div ref={mapDivRef} className="h-72 w-full bg-muted" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <Button type="button" variant="outline" onClick={useMyLocation} className="gap-2 rounded-full">
        <LocateFixed className="h-4 w-4" /> Use my current location
      </Button>
    </div>
  );
}
