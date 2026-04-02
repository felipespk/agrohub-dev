import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapaFazendaPage() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer center={[-15.78, -47.93]} zoom={4} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  );
}
