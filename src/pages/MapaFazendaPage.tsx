import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Layers, MapPin, ChevronLeft, ChevronRight,
  AlertTriangle, Syringe, ChevronDown, ChevronUp,
} from "lucide-react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const homeIcon = L.divIcon({
  html: `<div style="background:#16A34A;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const alertIcon = L.divIcon({
  html: `<div style="animation:pulse 1.5s infinite;background:#EF4444;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const vacinaIcon = L.divIcon({
  html: `<div style="animation:pulse 1.5s infinite;background:#EAB308;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const CULTURA_COLORS: Record<string, string> = {
  "Soja": "#16A34A", "Milho": "#EAB308", "Arroz": "#06B6D4", "Feijão": "#92400E",
  "Trigo": "#CA8A04", "Algodão": "#D1D5DB", "Café": "#78350F", "Cana": "#166534",
};
const DEFAULT_TALHAO_COLOR = "#9CA3AF";
const DEFAULT_CENTER: [number, number] = [-15.78, -47.93];

// ---- Helper: Calculate area from coords (Shoelace on projected coords) ----
function calcAreaHaSimple(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[j];
    area += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  area = Math.abs((area * R * R) / 2);
  return area / 10000;
}

// ---- FlyTo component ----
function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom]);
  return null;
}

// ---- Location picker for initial setup ----
function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ---- Draw handler (simple click-based polygon drawing) ----
function DrawPolygon({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: (coords: [number, number][]) => void;
}) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const map = useMap();

  useEffect(() => {
    if (!active) {
      setPoints([]);
      return;
    }
    map.getContainer().style.cursor = "crosshair";
    return () => { map.getContainer().style.cursor = ""; };
  }, [active, map]);

  useMapEvents({
    click(e) {
      if (!active) return;
      setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
    dblclick(e) {
      if (!active || points.length < 3) return;
      e.originalEvent.preventDefault();
      const final = [...points, [e.latlng.lat, e.latlng.lng]] as [number, number][];
      onComplete(final);
      setPoints([]);
    },
  });

  if (points.length < 2) return null;
  return (
    <Polygon
      positions={points.map((p) => [p[0], p[1]] as [number, number])}
      pathOptions={{ color: "#3B82F6", weight: 2, dashArray: "6", fillOpacity: 0.15 }}
    />
  );
}

// ====================== MAIN COMPONENT ======================
export default function MapaFazendaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [profile, setProfile] = useState<any>(null);
  const [settingLocation, setSettingLocation] = useState(false);
  const [tempPin, setTempPin] = useState<[number, number] | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [showTalhoes, setShowTalhoes] = useState(true);
  const [showPastos, setShowPastos] = useState(true);
  const [safraFilter, setSafraFilter] = useState("all");
  const [panelOpen, setPanelOpen] = useState(true);
  const [talhoesSectionOpen, setTalhoesSectionOpen] = useState(true);
  const [pastosSectionOpen, setPastosSectionOpen] = useState(true);

  // Data
  const [talhoes, setTalhoes] = useState<any[]>([]);
  const [pastos, setPastos] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [safraTalhoes, setSafraTalhoes] = useState<any[]>([]);
  const [culturas, setCulturas] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [colheitas, setColheitas] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [aplicacoes, setAplicacoes] = useState<any[]>([]);

  // Drawing
  const [drawing, setDrawing] = useState(false);
  const [drawnCoords, setDrawnCoords] = useState<[number, number][] | null>(null);
  const [bindType, setBindType] = useState<"talhao" | "pasto">("talhao");
  const [bindTarget, setBindTarget] = useState<string>("new");
  const [newName, setNewName] = useState("");
  const [newExtra, setNewExtra] = useState("");
  const [showBindModal, setShowBindModal] = useState(false);

  // Fly
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);

  const mapCenter: [number, number] = profile?.fazenda_lat
    ? [Number(profile.fazenda_lat), Number(profile.fazenda_lng)]
    : DEFAULT_CENTER;
  const mapZoom = profile?.fazenda_lat ? (Number(profile.fazenda_zoom) || 15) : 4;

  // ---- Load data ----
  const loadAll = useCallback(async () => {
    if (!user) return;
    const uid = user.id;
    const [pRes, tRes, paRes, sRes, stRes, cRes, aRes, colRes, atRes, ocRes, apRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).single(),
      supabase.from("talhoes").select("*").eq("user_id", uid),
      supabase.from("pastos").select("*").eq("user_id", uid),
      supabase.from("safras").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("safra_talhoes").select("*").eq("user_id", uid),
      supabase.from("culturas").select("*").eq("user_id", uid),
      supabase.from("animais").select("*").eq("user_id", uid).eq("status", "ativo"),
      supabase.from("colheitas").select("*").eq("user_id", uid),
      supabase.from("atividades_campo").select("*").eq("user_id", uid),
      supabase.from("ocorrencias_mip").select("*").eq("user_id", uid),
      supabase.from("aplicacoes_sanitarias").select("*").eq("user_id", uid),
    ]);
    if (pRes.data) {
      setProfile(pRes.data);
      if (!pRes.data.fazenda_lat) setSettingLocation(true);
    }
    setTalhoes(tRes.data || []);
    setPastos(paRes.data || []);
    setSafras(sRes.data || []);
    setSafraTalhoes(stRes.data || []);
    setCulturas(cRes.data || []);
    setAnimais(aRes.data || []);
    setColheitas(colRes.data || []);
    setAtividades(atRes.data || []);
    setOcorrencias(ocRes.data || []);
    setAplicacoes(apRes.data || []);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ---- Confirm farm location ----
  const confirmLocation = async () => {
    if (!tempPin || !user) return;
    await supabase.from("profiles").update({
      fazenda_lat: tempPin[0],
      fazenda_lng: tempPin[1],
      fazenda_zoom: 15,
    } as any).eq("user_id", user.id);
    setProfile((p: any) => ({ ...p, fazenda_lat: tempPin[0], fazenda_lng: tempPin[1], fazenda_zoom: 15 }));
    setSettingLocation(false);
    setTempPin(null);
    setFlyTarget({ center: tempPin, zoom: 15 });
    toast({ title: "Localização definida!", description: "O mapa agora centraliza na sua fazenda." });
  };

  // ---- Derived data ----
  const getCulturaNome = (culturaId: string) => culturas.find((c) => c.id === culturaId)?.nome || "";

  const getTalhaoSafraInfo = useCallback((talhaoId: string) => {
    if (safraFilter === "all") return null;
    const st = safraTalhoes.find((s) => s.safra_id === safraFilter && s.talhao_id === talhaoId);
    if (!st) return null;
    const cultura = getCulturaNome(st.cultura_id);
    const col = colheitas.filter((c) => c.safra_talhao_id === st.id);
    const prodTotal = col.reduce((s, c) => s + Number(c.quantidade || 0), 0);
    const talhao = talhoes.find((t) => t.id === talhaoId);
    const areaHa = Number(talhao?.area_hectares || 1);
    const produtividade = col.length > 0 ? prodTotal / areaHa : null;
    const ats = atividades.filter((a) => a.safra_talhao_id === st.id);
    const custoTotal = ats.reduce((s, a) => s + Number(a.custo_total || 0), 0);
    const custoHa = custoTotal / areaHa;
    const today = new Date();
    const fifteenAgo = new Date(today.getTime() - 15 * 86400000).toISOString().slice(0, 10);
    const alertas = ocorrencias.filter(
      (o) => o.safra_talhao_id === st.id && ["alto", "critico"].includes(o.nivel) && o.data >= fifteenAgo
    );
    return { cultura, produtividade, custoHa, custoTotal, meta: st.meta_produtividade, alertas, stId: st.id };
  }, [safraFilter, safraTalhoes, culturas, colheitas, talhoes, atividades, ocorrencias]);

  const getTalhaoColor = (talhaoId: string): string => {
    if (safraFilter === "all") return "#16A34A";
    const info = getTalhaoSafraInfo(talhaoId);
    if (!info) return DEFAULT_TALHAO_COLOR;
    return CULTURA_COLORS[info.cultura] || "#16A34A";
  };

  const getPastoLotacao = useCallback((pastoId: string) => {
    const count = animais.filter((a) => a.pasto_id === pastoId).length;
    const pasto = pastos.find((p) => p.id === pastoId);
    const cap = Number(pasto?.capacidade_cabecas || 0);
    const pct = cap > 0 ? (count / cap) * 100 : -1;
    const pesoMedio = animais.filter((a) => a.pasto_id === pastoId && a.peso_atual)
      .reduce((s, a, _, arr) => s + Number(a.peso_atual) / arr.length, 0);
    return { count, cap, pct, pesoMedio };
  }, [animais, pastos]);

  const getPastoColor = (pastoId: string): string => {
    const { pct } = getPastoLotacao(pastoId);
    if (pct < 0) return "#D97706";
    if (pct < 70) return "#16A34A";
    if (pct <= 90) return "#EAB308";
    return "#EF4444";
  };

  const getPastoVacinaAlerta = useCallback((pastoId: string) => {
    const pastoAnimais = animais.filter((a) => a.pasto_id === pastoId);
    const ids = pastoAnimais.map((a) => a.id);
    const today = new Date().toISOString().slice(0, 10);
    return aplicacoes.filter(
      (ap) => ids.includes(ap.animal_id) && ap.proxima_dose && ap.proxima_dose < today
    ).length;
  }, [animais, aplicacoes]);

  // ---- Drawing complete ----
  const handleDrawComplete = (coords: [number, number][]) => {
    setDrawing(false);
    setDrawnCoords(coords);
    setShowBindModal(true);
    setBindType("talhao");
    setBindTarget("new");
    setNewName("");
    setNewExtra("");
  };

  const handleBindSave = async () => {
    if (!drawnCoords || !user) return;
    const coordsJson = drawnCoords.map(([lat, lng]) => ({ lat, lng }));
    const centerLat = drawnCoords.reduce((s, c) => s + c[0], 0) / drawnCoords.length;
    const centerLng = drawnCoords.reduce((s, c) => s + c[1], 0) / drawnCoords.length;
    const areaHa = calcAreaHaSimple(drawnCoords);
    const table = bindType === "talhao" ? "talhoes" : "pastos";

    if (bindTarget === "new") {
      if (!newName.trim()) { toast({ title: "Informe o nome", variant: "destructive" }); return; }
      const insertData: any = {
        nome: newName.trim(),
        coordenadas: coordsJson,
        centro_lat: centerLat,
        centro_lng: centerLng,
        area_hectares: Math.round(areaHa * 100) / 100,
        user_id: user.id,
      };
      if (bindType === "talhao" && newExtra) insertData.tipo_solo = newExtra;
      if (bindType === "pasto" && newExtra) insertData.capacidade_cabecas = Number(newExtra) || null;
      await supabase.from(table).insert(insertData as any);
      toast({ title: `${newName} mapeado!`, description: `Área: ${areaHa.toFixed(2)} ha` });
    } else {
      await supabase.from(table).update({
        coordenadas: coordsJson,
        centro_lat: centerLat,
        centro_lng: centerLng,
        area_hectares: Math.round(areaHa * 100) / 100,
      } as any).eq("id", bindTarget);
      const item = bindType === "talhao"
        ? talhoes.find((t) => t.id === bindTarget)
        : pastos.find((p) => p.id === bindTarget);
      toast({ title: `${item?.nome || ""} mapeado!`, description: `Área: ${areaHa.toFixed(2)} ha` });
    }

    setShowBindModal(false);
    setDrawnCoords(null);
    loadAll();
  };

  // ---- Remove polygon ----
  const removePolygon = async (type: "talhao" | "pasto", id: string) => {
    const table = type === "talhao" ? "talhoes" : "pastos";
    await supabase.from(table).update({
      coordenadas: null,
      centro_lat: null,
      centro_lng: null,
    } as any).eq("id", id);
    toast({ title: "Polígono removido do mapa." });
    loadAll();
  };

  // ---- Legend cultures ----
  const activeCulturas = useMemo(() => {
    if (safraFilter === "all") return [];
    const stFiltered = safraTalhoes.filter((st) => st.safra_id === safraFilter);
    const cIds = [...new Set(stFiltered.map((st) => st.cultura_id))];
    return cIds.map((id) => {
      const nome = getCulturaNome(id);
      return { nome, color: CULTURA_COLORS[nome] || "#16A34A" };
    });
  }, [safraFilter, safraTalhoes, culturas]);

  // Unmapped items
  const unmappedTalhoes = talhoes.filter((t) => !t.coordenadas);
  const unmappedPastos = pastos.filter((p) => !p.coordenadas);
  const mappedTalhoes = talhoes.filter((t) => t.coordenadas);
  const mappedPastos = pastos.filter((p) => p.coordenadas);

  const totalAreaTalhoes = talhoes.reduce((s, t) => s + Number(t.area_hectares || 0), 0);
  const totalCabecas = animais.length;

  const fmtNum = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Pulse animation */}
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:0.8}}`}</style>

      {/* ---- TOP BAR ---- */}
      <div className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-4 gap-4 shrink-0" style={{ zIndex: 1000 }}>
        <button onClick={() => navigate("/hub")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar ao Hub</span>
        </button>
        <span className="text-lg font-bold text-foreground">Mapa da Fazenda</span>
        <div className="flex-1" />

        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showTalhoes} onChange={(e) => setShowTalhoes(e.target.checked)}
            className="rounded border-[#16A34A] text-[#16A34A] focus:ring-[#16A34A] h-3.5 w-3.5" />
          <span>Talhões</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showPastos} onChange={(e) => setShowPastos(e.target.checked)}
            className="rounded border-[#D97706] text-[#D97706] focus:ring-[#D97706] h-3.5 w-3.5" />
          <span>Pastos</span>
        </label>

        <select value={safraFilter} onChange={(e) => setSafraFilter(e.target.value)}
          className="text-xs border border-[#E5E7EB] rounded px-2 py-1 bg-white">
          <option value="all">Sem filtro</option>
          {safras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <button onClick={() => setSatellite(!satellite)}
          className="flex items-center gap-1 text-xs border border-[#E5E7EB] rounded px-2 py-1 hover:bg-gray-50 transition-colors">
          <Layers className="h-3.5 w-3.5" />
          {satellite ? "Mapa" : "Satélite"}
        </button>

        <button
          onClick={() => { setDrawing(!drawing); if (drawing) setDrawnCoords(null); }}
          className={`text-xs rounded px-3 py-1 font-medium transition-colors ${drawing ? "bg-red-500 text-white" : "bg-[#16A34A] text-white hover:bg-[#15803D]"}`}
        >
          {drawing ? "Cancelar Desenho" : "Desenhar Área"}
        </button>
      </div>

      <div className="flex-1 flex relative">
        {/* ---- MAP ---- */}
        <div className="flex-1 relative">
          {/* Setting location banner */}
          {settingLocation && (
            <div className="absolute top-0 left-0 right-0 z-[1001] bg-[#16A34A] text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Clique no mapa para definir a localização da sua fazenda.
            </div>
          )}

          {/* Drawing instructions */}
          {drawing && (
            <div className="absolute top-0 left-0 right-0 z-[1001] bg-blue-600 text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Clique para criar os pontos do polígono. Dê duplo clique para finalizar (mínimo 3 pontos).
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            style={{ zIndex: 1 }}
            doubleClickZoom={!drawing}
          >
            {satellite ? (
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            ) : (
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            )}

            {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

            {/* Location picker */}
            {settingLocation && (
              <LocationPicker onPick={(lat, lng) => setTempPin([lat, lng])} />
            )}

            {/* Temp pin */}
            {tempPin && settingLocation && (
              <Marker position={tempPin}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold text-sm mb-2">Localização da fazenda</p>
                    <div className="flex gap-2 justify-center">
                      <button onClick={confirmLocation}
                        className="bg-[#16A34A] text-white text-xs px-3 py-1 rounded hover:bg-[#15803D]">Confirmar</button>
                      <button onClick={() => setTempPin(null)}
                        className="border border-gray-300 text-xs px-3 py-1 rounded hover:bg-gray-50">Cancelar</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Farm location marker */}
            {profile?.fazenda_lat && !settingLocation && (
              <Marker position={[Number(profile.fazenda_lat), Number(profile.fazenda_lng)]} icon={homeIcon}>
                <Popup><span className="font-semibold text-sm">Sede da Fazenda</span></Popup>
              </Marker>
            )}

            {/* Drawing tool */}
            <DrawPolygon active={drawing} onComplete={handleDrawComplete} />

            {/* Talhão polygons */}
            {showTalhoes && mappedTalhoes.map((t) => {
              const coords: [number, number][] = (t.coordenadas as any[]).map((c: any) => [c.lat, c.lng]);
              const color = getTalhaoColor(t.id);
              const info = getTalhaoSafraInfo(t.id);
              return (
                <div key={`t-${t.id}`}>
                  <Polygon positions={coords} pathOptions={{ color, fillOpacity: 0.25, weight: 2 }}>
                    <Popup minWidth={300} maxWidth={320}>
                      <div className="p-1">
                        <h3 className="font-bold text-base mb-1">{t.nome}</h3>
                        <p className="text-gray-500 text-xs mb-1">{fmtNum(Number(t.area_hectares))} ha
                          {t.tipo_solo && <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800">{t.tipo_solo}</span>}
                        </p>
                        {info && (
                          <>
                            <p className="text-sm font-medium text-gray-700">Cultura: {info.cultura}</p>
                            {info.produtividade !== null ? (
                              <p className="text-sm font-bold text-green-700">Produtividade: {fmtNum(info.produtividade)} sacas/ha</p>
                            ) : (
                              <p className="text-sm italic text-gray-400">Sem colheita registrada</p>
                            )}
                            {info.custoTotal > 0 ? (
                              <p className="text-sm text-gray-600">Custo: {fmtBRL(info.custoHa)}/ha</p>
                            ) : (
                              <p className="text-sm italic text-gray-400">Sem custos registrados</p>
                            )}
                            {info.alertas.length > 0 && info.alertas.map((al: any, i: number) => (
                              <div key={i} className="bg-red-50 border border-red-200 rounded p-1.5 mt-1 flex items-center gap-1 text-xs text-red-700">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                ALERTA: {al.nome_ocorrencia} — Nível {al.nivel}
                              </div>
                            ))}
                          </>
                        )}
                        <button onClick={() => removePolygon("talhao", t.id)}
                          className="mt-2 text-[10px] text-red-500 hover:text-red-700 underline">Remover do mapa</button>
                      </div>
                    </Popup>
                  </Polygon>
                  {/* Alert markers */}
                  {info?.alertas && info.alertas.length > 0 && t.centro_lat && (
                    <Marker position={[Number(t.centro_lat), Number(t.centro_lng)]} icon={alertIcon}>
                      <Popup><span className="text-xs text-red-700 font-medium">{info.alertas[0].nome_ocorrencia}</span></Popup>
                    </Marker>
                  )}
                </div>
              );
            })}

            {/* Pasto polygons */}
            {showPastos && mappedPastos.map((p) => {
              const coords: [number, number][] = (p.coordenadas as any[]).map((c: any) => [c.lat, c.lng]);
              const color = getPastoColor(p.id);
              const lot = getPastoLotacao(p.id);
              const vacinaCount = getPastoVacinaAlerta(p.id);
              const pastoAnimais = animais.filter((a) => a.pasto_id === p.id);
              return (
                <div key={`p-${p.id}`}>
                  <Polygon positions={coords} pathOptions={{ color, fillOpacity: 0.25, weight: 2 }}>
                    <Popup minWidth={320} maxWidth={360}>
                      <div className="p-1" style={{ maxHeight: 380, overflowY: "auto" }}>
                        <h3 className="font-bold text-base mb-1">{p.nome}</h3>
                        <p className="text-gray-500 text-xs mb-1">{fmtNum(Number(p.area_hectares || 0))} ha</p>
                        <div className="mb-1">
                          <span className="text-sm">{lot.count} / {lot.cap || "∞"} cabeças</span>
                          {lot.cap > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div className="h-2 rounded-full transition-all" style={{
                                width: `${Math.min(lot.pct, 100)}%`,
                                backgroundColor: color,
                              }} />
                            </div>
                          )}
                        </div>
                        {lot.pesoMedio > 0 && <p className="text-sm text-gray-600">Peso médio: {fmtNum(lot.pesoMedio)} KG</p>}
                        {vacinaCount > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5 mt-1 flex items-center gap-1 text-xs text-yellow-700">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {vacinaCount} animais com vacina atrasada
                          </div>
                        )}
                        {pastoAnimais.length > 0 && (
                          <>
                            <p className="font-bold text-xs mt-2 mb-1">Animais neste pasto</p>
                            <table className="w-full text-[11px]">
                              <thead><tr className="border-b">
                                <th className="text-left py-0.5">Brinco</th>
                                <th className="text-left py-0.5">Nome</th>
                                <th className="text-left py-0.5">Cat.</th>
                                <th className="text-right py-0.5">Peso</th>
                              </tr></thead>
                              <tbody>
                                {pastoAnimais.slice(0, 10).map((a) => (
                                  <tr key={a.id} className="border-b border-gray-100">
                                    <td className="py-0.5 font-mono font-bold">{a.brinco}</td>
                                    <td className="py-0.5">{a.nome || "—"}</td>
                                    <td className="py-0.5">
                                      <span className={`px-1 rounded text-[9px] ${
                                        a.categoria === "Vaca" ? "bg-pink-100 text-pink-700" :
                                        a.categoria === "Touro" ? "bg-blue-100 text-blue-700" :
                                        a.categoria === "Bezerro" || a.categoria === "Bezerra" ? "bg-green-100 text-green-700" :
                                        a.categoria === "Novilha" ? "bg-yellow-100 text-yellow-700" :
                                        "bg-gray-100 text-gray-700"
                                      }`}>{a.categoria}</span>
                                    </td>
                                    <td className="py-0.5 text-right">{a.peso_atual ? `${fmtNum(Number(a.peso_atual))}` : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {pastoAnimais.length > 10 && (
                              <button onClick={() => navigate("/gado/animais")}
                                className="text-[10px] text-blue-600 hover:underline mt-1">
                                Ver todos ({pastoAnimais.length})
                              </button>
                            )}
                          </>
                        )}
                        {pastoAnimais.length === 0 && (
                          <p className="text-xs italic text-gray-400 mt-1">Nenhum animal neste pasto</p>
                        )}
                        <button onClick={() => removePolygon("pasto", p.id)}
                          className="mt-2 text-[10px] text-red-500 hover:text-red-700 underline">Remover do mapa</button>
                      </div>
                    </Popup>
                  </Polygon>
                  {vacinaCount > 0 && p.centro_lat && (
                    <Marker position={[Number(p.centro_lat), Number(p.centro_lng)]} icon={vacinaIcon}>
                      <Popup><span className="text-xs text-yellow-700 font-medium">{vacinaCount} vacinas atrasadas</span></Popup>
                    </Marker>
                  )}
                </div>
              );
            })}
          </MapContainer>

          {/* Redefine location button */}
          {profile?.fazenda_lat && !settingLocation && (
            <button onClick={() => { setSettingLocation(true); setTempPin(null); }}
              className="absolute bottom-4 right-4 z-[1001] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-gray-600 hover:text-gray-900 shadow-md flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Redefinir localização
            </button>
          )}

          {/* Legend */}
          {safraFilter !== "all" && activeCulturas.length > 0 && (
            <div className="absolute bottom-4 left-4 z-[1001] bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-md">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Culturas</p>
              {activeCulturas.map((c) => (
                <div key={c.nome} className="flex items-center gap-2 text-xs mb-0.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  {c.nome}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="w-3 h-3 rounded-full shrink-0 bg-[#9CA3AF]" />
                Sem vínculo
              </div>
            </div>
          )}
        </div>

        {/* ---- SIDE PANEL ---- */}
        <div className={`shrink-0 bg-white border-l border-[#E5E7EB] transition-all duration-200 overflow-hidden ${panelOpen ? "w-72" : "w-0"}`}
          style={{ zIndex: 999 }}>
          <div className="h-full overflow-y-auto p-4">
            <h2 className="font-bold text-base mb-3">Áreas Mapeadas</h2>

            {/* Talhões section */}
            <button onClick={() => setTalhoesSectionOpen(!talhoesSectionOpen)}
              className="flex items-center gap-2 w-full text-left text-sm font-semibold mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              Talhões ({talhoes.length})
              {talhoesSectionOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
            </button>
            {talhoesSectionOpen && (
              <div className="space-y-1 mb-4">
                {talhoes.map((t) => {
                  const hasMapa = !!t.coordenadas;
                  const info = safraFilter !== "all" ? getTalhaoSafraInfo(t.id) : null;
                  return (
                    <button key={t.id} onClick={() => {
                      if (hasMapa && t.centro_lat) {
                        setFlyTarget({ center: [Number(t.centro_lat), Number(t.centro_lng)], zoom: 16 });
                      } else {
                        setDrawing(true);
                      }
                    }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">
                          {t.nome}
                          {info && <span className="text-gray-400 ml-1">({info.cultura})</span>}
                        </span>
                        <span className="text-gray-400">{fmtNum(Number(t.area_hectares))} ha</span>
                      </div>
                      {info?.alertas && info.alertas.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${hasMapa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {hasMapa ? "Mapeado" : "Sem mapa"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pastos section */}
            <button onClick={() => setPastosSectionOpen(!pastosSectionOpen)}
              className="flex items-center gap-2 w-full text-left text-sm font-semibold mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              Pastos ({pastos.length})
              {pastosSectionOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
            </button>
            {pastosSectionOpen && (
              <div className="space-y-1 mb-4">
                {pastos.map((p) => {
                  const hasMapa = !!p.coordenadas;
                  const lot = getPastoLotacao(p.id);
                  const vacinaCount = getPastoVacinaAlerta(p.id);
                  return (
                    <button key={p.id} onClick={() => {
                      if (hasMapa && p.centro_lat) {
                        setFlyTarget({ center: [Number(p.centro_lat), Number(p.centro_lng)], zoom: 16 });
                      } else {
                        setDrawing(true);
                      }
                    }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPastoColor(p.id) }} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{p.nome}</span>
                        <span className="text-gray-400">{lot.count}/{lot.cap || "∞"} cab.</span>
                      </div>
                      {vacinaCount > 0 && <Syringe className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${hasMapa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {hasMapa ? "Mapeado" : "Sem mapa"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-[#E5E7EB] pt-3 text-[10px] text-gray-400 leading-relaxed">
              Total: {talhoes.length} talhões ({fmtNum(totalAreaTalhoes)} ha) | {pastos.length} pastos ({totalCabecas} cab.)
            </div>
          </div>
        </div>

        {/* Panel toggle */}
        <button onClick={() => setPanelOpen(!panelOpen)}
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-[#E5E7EB] rounded-l-lg p-1 shadow-md hover:bg-gray-50 transition-colors"
          style={{ right: panelOpen ? 288 : 0, zIndex: 1000 }}>
          {panelOpen ? <ChevronRight className="h-4 w-4 text-gray-500" /> : <ChevronLeft className="h-4 w-4 text-gray-500" />}
        </button>
      </div>

      {/* ---- BIND MODAL ---- */}
      {showBindModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Vincular Polígono</h2>

            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select value={bindType} onChange={(e) => { setBindType(e.target.value as any); setBindTarget("new"); }}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm mb-3">
              <option value="talhao">Talhão</option>
              <option value="pasto">Pasto</option>
            </select>

            <label className="block text-sm font-medium mb-1">
              {bindType === "talhao" ? "Talhão" : "Pasto"}
            </label>
            <select value={bindTarget} onChange={(e) => setBindTarget(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm mb-3">
              <option value="new">+ Criar Novo</option>
              {(bindType === "talhao" ? unmappedTalhoes : unmappedPastos).map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>

            {bindTarget === "new" && (
              <>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm mb-3"
                  placeholder={bindType === "talhao" ? "Ex: Talhão 01" : "Ex: Pasto Norte"} />

                <label className="block text-sm font-medium mb-1">
                  {bindType === "talhao" ? "Tipo de Solo (opcional)" : "Capacidade (cabeças, opcional)"}
                </label>
                <input value={newExtra} onChange={(e) => setNewExtra(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm mb-3"
                  placeholder={bindType === "talhao" ? "Argiloso, Arenoso..." : "Ex: 50"} />
              </>
            )}

            {drawnCoords && (
              <p className="text-sm text-gray-500 mb-4">
                Área calculada: <strong>{calcAreaHaSimple(drawnCoords).toFixed(2)} ha</strong> ({drawnCoords.length} pontos)
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowBindModal(false); setDrawnCoords(null); }}
                className="px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleBindSave}
                className="px-4 py-2 text-sm bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D] font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
