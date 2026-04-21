import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PastoMiniMapaProps {
  coordenadas: [number, number][] | null;
  centroLat?: number | null;
  centroLng?: number | null;
}

/**
 * Mini-mapa em vista satélite mostrando o polígono cadastrado do pasto.
 * Renderiza apenas se houver coordenadas válidas.
 */
export function PastoMiniMapa({ coordenadas, centroLat, centroLng }: PastoMiniMapaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!coordenadas || coordenadas.length < 3) return;

    // Evita reinicializar
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center: [number, number] =
      centroLat != null && centroLng != null
        ? [Number(centroLat), Number(centroLng)]
        : coordenadas[0];

    const map = L.map(containerRef.current, {
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
      color: "#16A34A",
      weight: 2,
      fillColor: "#16A34A",
      fillOpacity: 0.35,
    }).addTo(map);

    map.fitBounds(polygon.getBounds(), { padding: [8, 8] });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordenadas, centroLat, centroLng]);

  if (!coordenadas || coordenadas.length < 3) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-32 rounded-md overflow-hidden border border-border"
      aria-label="Mini-mapa do pasto"
    />
  );
}
