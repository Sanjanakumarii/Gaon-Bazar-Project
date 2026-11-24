"use client";
import { t, useLanguage } from "../lib/language";
import { useEffect, useRef, useState } from "react";
export type Point = { lat: number; lng: number };
export default function LocationPicker({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (p: Point) => void;
}) {
  useLanguage();
  const div = useRef<HTMLDivElement>(null),
    map = useRef<any>(null),
    marker = useRef<any>(null),
    callback = useRef(onChange);
  callback.current = onChange;
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    async function init() {
      try {
        if (!(window as any).L) {
          await new Promise<void>((resolve, reject) => {
            let script = document.querySelector<HTMLScriptElement>(
              "script[data-leaflet]",
            );
            if (script) {
              script.addEventListener("load", () => resolve(), { once: true });
              script.addEventListener("error", reject, { once: true });
              return;
            }
            script = document.createElement("script");
            script.dataset.leaflet = "1";
            script.src = "/vendor/leaflet.js";
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
            const style = document.createElement("link");
            style.rel = "stylesheet";
            style.href = "/vendor/leaflet.css";
            document.head.appendChild(style);
          });
        }
        if (disposed || !div.current) return;
        const L = (window as any).L;
        const m = L.map(div.current).setView(
          value ? [value.lat, value.lng] : [25.5941, 85.1376],
          value ? 14 : 5,
        );
        map.current = m;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(m);
        const set = (p: Point) => {
          if (marker.current) marker.current.setLatLng([p.lat, p.lng]);
          else
            marker.current = L.circleMarker([p.lat, p.lng], {
              radius: 10,
              color: "#fff",
              weight: 3,
              fillColor: "#237047",
              fillOpacity: 1,
            }).addTo(m);
        };
        if (value) set(value);
        m.on("click", (e: any) => {
          const p = { lat: e.latlng.lat, lng: e.latlng.lng };
          set(p);
          callback.current(p);
        });
        setTimeout(() => m.invalidateSize(), 100);
      } catch {
        setError(t("Map load nahi hua. GPS ya latitude/longitude use karein."));
      }
    }
    init();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    if (map.current && value) {
      const L = (window as any).L;
      map.current.setView([value.lat, value.lng], 14);
      if (marker.current) marker.current.setLatLng([value.lat, value.lng]);
      else
        marker.current = L.circleMarker([value.lat, value.lng], {
          radius: 10,
          color: "#fff",
          weight: 3,
          fillColor: "#237047",
          fillOpacity: 1,
        }).addTo(map.current);
    }
  }, [value]);
  return (
    <div className="location-picker">
      <button
        type="button"
        className="secondary full"
        onClick={() => {
          setError("");
          if (!navigator.geolocation) {
            setError(t("GPS available nahi hai."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (p) =>
              onChange({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () =>
              setError(
                t(
                  "GPS permission nahi mili. Map par ghar chunein ya coordinates dein.",
                ),
              ),
            { enableHighAccuracy: true, timeout: 15000 },
          );
        }}
      >
        {" "}
        {t("◎ Meri current location use karein")}{" "}
      </button>
      <p className="muted small">
        {" "}
        {t("Kisi aur ke liye? Map zoom karke unke ghar par tap karein.")}{" "}
      </p>
      <div ref={div} className="map" aria-label={t("Delivery location map")} />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <details>
        <summary> {t("Latitude / longitude se location set karein")} </summary>
        <div className="two">
          <label>
            {" "}
            {t("Latitude")}{" "}
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={value?.lat ?? ""}
              onChange={(e) =>
                onChange({ lat: Number(e.target.value), lng: value?.lng ?? 0 })
              }
            />
          </label>
          <label>
            {" "}
            {t("Longitude")}{" "}
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={value?.lng ?? ""}
              onChange={(e) =>
                onChange({ lat: value?.lat ?? 0, lng: Number(e.target.value) })
              }
            />
          </label>
        </div>
      </details>
      <p className="small muted">
        {value
          ? `Location selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : t("Ghar ka exact location select karna zaroori hai.")}
      </p>
    </div>
  );
}
