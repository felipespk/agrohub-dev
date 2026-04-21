import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PastoMiniMapaProps {
  coordenadas: [number, number][] | null;
  centroLat?: number | null;
  centroLng?: number | null;
  cor?: string | null;
}

/**
 * Mini-mapa em vista satélite mostrando o polígono cadastrado do pasto.
 * Renderiza apenas se houver coordenadas válidas.
 */
export function PastoMiniMapa({ coordenadas, centroLat, centroLng, cor }: PastoMiniMapaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (!coordenadas || coordenadas.length < 3) return;

    // Cleanup anterior
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center: [number, number] =
      centroLat != null && centroLng != null
        ? [Number(centroLat), Number(centroLng)]
        : coordenadas[0];

    const color = cor && /^#[0-9A-Fa-f]{6}$/.test(cor) ? cor : "#16A34A";

    const map = L.map(node, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView(center, 16);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(map);

    const polygon = L.polygon(coordenadas, {
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.4,
    }).addTo(map);

    // Garante que o tamanho seja calculado após o layout para evitar erros do Leaflet
    requestAnimationFrame(() => {
      try {
        map.invalidateSize();
        map.fitBounds(polygon.getBounds(), { padding: [8, 8] });
      } catch {
        /* ignore */
      }
    });

    mapRef.current = map;

    return () => {
      try {
        map.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, [coordenadas, centroLat, centroLng, cor]);

  if (!coordenadas || coordenadas.length < 3) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-32 rounded-md overflow-hidden border border-border"
      aria-label="Mini-mapa do pasto"
    />
  );
}
