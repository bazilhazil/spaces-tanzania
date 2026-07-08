import { useEffect, useState } from "react";

declare global {
  interface Window {
    __spacesInitMap?: () => void;
    google?: any;
  }
}

let loadingPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Google Maps browser key missing"));

  loadingPromise = new Promise<void>((resolve, reject) => {
    window.__spacesInitMap = () => resolve();
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places&callback=__spacesInitMap${channel ? `&channel=${channel}` : ""}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState<boolean>(!!(typeof window !== "undefined" && window.google?.maps));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    loadScript()
      .then(() => mounted && setReady(true))
      .catch((e) => mounted && setError(String(e)));
    return () => {
      mounted = false;
    };
  }, []);
  return { ready, error };
}
