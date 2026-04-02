import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Layers, MapPin, ChevronLeft, ChevronRight,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
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

const fmtNum = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MapaFazendaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup>(L.layerGroup());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const drawPointsRef = useRef<L.CircleMarker[]>([]);
  const drawLineRef = useRef<L.Polyline | null>(null);

  // State
  const [profile, setProfile] = useState<any>(null);
  const [settingLocation, setSettingLocation] = useState(false);
  const [tempPin, setTempPin] = useState<[number, number] | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [showTalhoes, setShowTalhoes] = useState(true);
  const [showPastos, setShowPastos] = useState(true);
  const [safraFilter, setSafraFilter] = useState("all");
  const [panelOpen, setPanelOpen] = useState(true);
  const [talhoesSectionOpen, setTalhoesSectionOpen] = useState(true);
  const [pastosSectionOpen, setPastosSectionOpen] = useState(true);

  // Drawing
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [drawnCoords, setDrawnCoords] = useState<[number, number][] | null>(null);
  const [bindType, setBindType] = useState<"talhao" | "pasto">("talhao");
  const [bindTarget, setBindTarget] = useState<string>("new");
  const [newName, setNewName] = useState("");
  const [newExtra, setNewExtra] = useState("");
  const [showBindModal, setShowBindModal] = useState(false);

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
  const [mapReady, setMapReady] = useState(false);


  // ---- Initialize map ----
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 4,
      zoomControl: true,
      doubleClickZoom: true,
    });
    // Start with satellite
    const tile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri',
    }).addTo(map);
    const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      attribution: '',
      pane: 'overlayPane',
    }).addTo(map);
    tileLayerRef.current = tile;
    labelsLayerRef.current = labels;
    layersRef.current.addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- Toggle satellite ----
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();
    if (labelsLayerRef.current) labelsLayerRef.current.remove();
    if (satellite) {
      const tile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; Esri',
      }).addTo(mapRef.current);
      const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        attribution: '',
        pane: 'overlayPane',
      }).addTo(mapRef.current);
      tileLayerRef.current = tile;
      labelsLayerRef.current = labels;
    } else {
      const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current);
      tileLayerRef.current = tile;
      labelsLayerRef.current = null;
    }
  }, [satellite]);

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

  // ---- Fly to farm when profile loads ----
  useEffect(() => {
    if (!mapRef.current || !profile) return;
    if (profile.fazenda_lat) {
      mapRef.current.flyTo([Number(profile.fazenda_lat), Number(profile.fazenda_lng)], Number(profile.fazenda_zoom) || 15, { duration: 1.2 });
    }
  }, [profile?.fazenda_lat, mapReady]);

  // ---- Location picker click handler ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!settingLocation) {
      map.getContainer().style.cursor = "";
      return;
    }
    map.getContainer().style.cursor = "crosshair";
    const handler = (e: L.LeafletMouseEvent) => {
      setTempPin([e.latlng.lat, e.latlng.lng]);
    };
    map.on("click", handler);
    return () => { map.off("click", handler); map.getContainer().style.cursor = ""; };
  }, [settingLocation, mapReady]);

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
    mapRef.current?.flyTo(tempPin, 15, { duration: 1.2 });
    toast({ title: "Localização definida!", description: "O mapa agora centraliza na sua fazenda." });
  };

  // ---- Drawing mode ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || settingLocation) return;

    // Cleanup draw artifacts
    drawPointsRef.current.forEach(m => m.remove());
    drawPointsRef.current = [];
    drawLineRef.current?.remove();
    drawLineRef.current = null;

    if (!drawing) {
      map.getContainer().style.cursor = "";
      map.doubleClickZoom.enable();
      setDrawPoints([]);
      return;
    }

    map.getContainer().style.cursor = "crosshair";
    map.doubleClickZoom.disable();

    const points: [number, number][] = [];

    const onClick = (e: L.LeafletMouseEvent) => {
      const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
      points.push(pt);
      const cm = L.circleMarker(pt, { radius: 5, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 1 }).addTo(map);
      drawPointsRef.current.push(cm);
      if (points.length >= 2) {
        drawLineRef.current?.remove();
        drawLineRef.current = L.polyline(points, { color: "#3B82F6", weight: 2, dashArray: "6" }).addTo(map);
      }
      setDrawPoints([...points]);
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e as any);
      L.DomEvent.preventDefault(e as any);
      if (points.length < 3) return;
      // Cleanup temp
      drawPointsRef.current.forEach(m => m.remove());
      drawPointsRef.current = [];
      drawLineRef.current?.remove();
      drawLineRef.current = null;
      map.getContainer().style.cursor = "";
      map.doubleClickZoom.enable();

      setDrawing(false);
      setDrawPoints([]);
      setDrawnCoords([...points]);
      setShowBindModal(true);
      setBindType("talhao");
      setBindTarget("new");
      setNewName("");
      setNewExtra("");
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);

    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
    };
  }, [drawing, settingLocation, mapReady]);

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

  // ---- Render map layers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    layersRef.current.clearLayers();

    // Farm home marker
    if (profile?.fazenda_lat && !settingLocation) {
      L.marker([Number(profile.fazenda_lat), Number(profile.fazenda_lng)], { icon: homeIcon })
        .bindPopup(`<span class="font-semibold text-sm">Sede da Fazenda</span>`)
        .addTo(layersRef.current);
    }

    // Temp pin for location setting
    if (tempPin && settingLocation) {
      const marker = L.marker(tempPin).addTo(layersRef.current);
      marker.bindPopup(`
        <div style="text-align:center">
          <p style="font-weight:600;font-size:14px;margin-bottom:8px">Localização da fazenda</p>
          <div style="display:flex;gap:8px;justify-content:center">
            <button onclick="window.__confirmFarmLocation()" style="background:#16A34A;color:white;font-size:12px;padding:4px 12px;border-radius:4px;border:none;cursor:pointer">Confirmar</button>
            <button onclick="window.__cancelFarmPin()" style="border:1px solid #d1d5db;font-size:12px;padding:4px 12px;border-radius:4px;background:white;cursor:pointer">Cancelar</button>
          </div>
        </div>
      `).openPopup();
    }

    // Talhão polygons
    if (showTalhoes) {
      const mappedTalhoes = talhoes.filter((t) => t.coordenadas);
      mappedTalhoes.forEach((t) => {
        const coords: [number, number][] = (t.coordenadas as any[]).map((c: any) => [c.lat, c.lng]);
        const color = getTalhaoColor(t.id);
        const info = getTalhaoSafraInfo(t.id);

        let popupHtml = `<div style="padding:4px;min-width:280px">
          <h3 style="font-weight:700;font-size:16px;margin-bottom:4px">${t.nome}</h3>
          <p style="color:#6B7280;font-size:12px;margin-bottom:4px">${fmtNum(Number(t.area_hectares))} ha
            ${t.tipo_solo ? `<span style="margin-left:8px;display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;background:#FEF3C7;color:#92400E">${t.tipo_solo}</span>` : ''}
          </p>`;
        if (info) {
          popupHtml += `<p style="font-size:14px;font-weight:500;color:#374151">Cultura: ${info.cultura}</p>`;
          if (info.produtividade !== null) {
            popupHtml += `<p style="font-size:14px;font-weight:700;color:#15803D">Produtividade: ${fmtNum(info.produtividade)} sacas/ha</p>`;
          } else {
            popupHtml += `<p style="font-size:14px;font-style:italic;color:#9CA3AF">Sem colheita registrada</p>`;
          }
          if (info.custoTotal > 0) {
            popupHtml += `<p style="font-size:14px;color:#4B5563">Custo: ${fmtBRL(info.custoHa)}/ha</p>`;
          } else {
            popupHtml += `<p style="font-size:14px;font-style:italic;color:#9CA3AF">Sem custos registrados</p>`;
          }
          info.alertas.forEach((al: any) => {
            popupHtml += `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:4px;padding:6px;margin-top:4px;font-size:12px;color:#B91C1C;display:flex;align-items:center;gap:4px">⚠ ALERTA: ${al.nome_ocorrencia} — Nível ${al.nivel}</div>`;
          });
        }
        popupHtml += `<button onclick="window.__removePolygon('talhao','${t.id}')" style="margin-top:8px;font-size:10px;color:#EF4444;text-decoration:underline;background:none;border:none;cursor:pointer">Remover do mapa</button></div>`;

        L.polygon(coords, { color, fillOpacity: 0.25, weight: 2 })
          .bindPopup(popupHtml, { minWidth: 300, maxWidth: 320 })
          .addTo(layersRef.current);

        // Alert marker
        if (info?.alertas && info.alertas.length > 0 && t.centro_lat) {
          L.marker([Number(t.centro_lat), Number(t.centro_lng)], { icon: alertIcon })
            .bindPopup(`<span style="font-size:12px;color:#B91C1C;font-weight:500">${info.alertas[0].nome_ocorrencia}</span>`)
            .addTo(layersRef.current);
        }
      });
    }

    // Pasto polygons
    if (showPastos) {
      const mappedPastos = pastos.filter((p) => p.coordenadas);
      mappedPastos.forEach((p) => {
        const coords: [number, number][] = (p.coordenadas as any[]).map((c: any) => [c.lat, c.lng]);
        const color = getPastoColor(p.id);
        const lot = getPastoLotacao(p.id);
        const vacinaCount = getPastoVacinaAlerta(p.id);
        const pastoAnimais = animais.filter((a) => a.pasto_id === p.id);

        const pctWidth = lot.cap > 0 ? Math.min(lot.pct, 100) : 0;
        let popupHtml = `<div style="padding:4px;min-width:300px;max-height:380px;overflow-y:auto">
          <h3 style="font-weight:700;font-size:16px;margin-bottom:4px">${p.nome}</h3>
          <p style="color:#6B7280;font-size:12px;margin-bottom:4px">${fmtNum(Number(p.area_hectares || 0))} ha</p>
          <div style="margin-bottom:4px">
            <span style="font-size:14px">${lot.count} / ${lot.cap || "∞"} cabeças</span>
            ${lot.cap > 0 ? `<div style="width:100%;background:#E5E7EB;border-radius:9999px;height:8px;margin-top:4px"><div style="height:8px;border-radius:9999px;background:${color};width:${pctWidth}%"></div></div>` : ''}
          </div>`;
        if (lot.pesoMedio > 0) popupHtml += `<p style="font-size:14px;color:#4B5563">Peso médio: ${fmtNum(lot.pesoMedio)} KG</p>`;
        if (vacinaCount > 0) {
          popupHtml += `<div style="background:#FEFCE8;border:1px solid #FDE68A;border-radius:4px;padding:6px;margin-top:4px;font-size:12px;color:#A16207;display:flex;align-items:center;gap:4px">⚠ ${vacinaCount} animais com vacina atrasada</div>`;
        }
        if (pastoAnimais.length > 0) {
          popupHtml += `<p style="font-weight:700;font-size:12px;margin-top:8px;margin-bottom:4px">Animais neste pasto</p>
            <table style="width:100%;font-size:11px;border-collapse:collapse">
              <thead><tr style="border-bottom:1px solid #E5E7EB">
                <th style="text-align:left;padding:2px 0">Brinco</th>
                <th style="text-align:left;padding:2px 0">Nome</th>
                <th style="text-align:left;padding:2px 0">Cat.</th>
                <th style="text-align:right;padding:2px 0">Peso</th>
              </tr></thead><tbody>`;
          pastoAnimais.slice(0, 10).forEach((a) => {
            const catColors: Record<string, string> = {
              "Vaca": "background:#FCE7F3;color:#BE185D", "Touro": "background:#DBEAFE;color:#1D4ED8",
              "Bezerro": "background:#DCFCE7;color:#15803D", "Bezerra": "background:#DCFCE7;color:#15803D",
              "Novilha": "background:#FEF9C3;color:#A16207",
            };
            const catStyle = catColors[a.categoria] || "background:#F3F4F6;color:#374151";
            popupHtml += `<tr style="border-bottom:1px solid #F3F4F6">
              <td style="padding:2px 0;font-family:monospace;font-weight:700">${a.brinco}</td>
              <td style="padding:2px 0">${a.nome || "—"}</td>
              <td style="padding:2px 0"><span style="padding:1px 4px;border-radius:4px;font-size:9px;${catStyle}">${a.categoria}</span></td>
              <td style="padding:2px 0;text-align:right">${a.peso_atual ? fmtNum(Number(a.peso_atual)) : "—"}</td>
            </tr>`;
          });
          popupHtml += `</tbody></table>`;
          if (pastoAnimais.length > 10) {
            popupHtml += `<a href="/gado/animais" style="font-size:10px;color:#2563EB;margin-top:4px;display:block">Ver todos (${pastoAnimais.length})</a>`;
          }
        } else {
          popupHtml += `<p style="font-size:12px;font-style:italic;color:#9CA3AF;margin-top:4px">Nenhum animal neste pasto</p>`;
        }
        popupHtml += `<button onclick="window.__removePolygon('pasto','${p.id}')" style="margin-top:8px;font-size:10px;color:#EF4444;text-decoration:underline;background:none;border:none;cursor:pointer">Remover do mapa</button></div>`;

        L.polygon(coords, { color, fillOpacity: 0.25, weight: 2 })
          .bindPopup(popupHtml, { minWidth: 320, maxWidth: 360 })
          .addTo(layersRef.current);

        if (vacinaCount > 0 && p.centro_lat) {
          L.marker([Number(p.centro_lat), Number(p.centro_lng)], { icon: vacinaIcon })
            .bindPopup(`<span style="font-size:12px;color:#A16207;font-weight:500">${vacinaCount} vacinas atrasadas</span>`)
            .addTo(layersRef.current);
        }
      });
    }
  }, [mapReady, profile, tempPin, settingLocation, showTalhoes, showPastos, talhoes, pastos,
    safraFilter, safraTalhoes, culturas, animais, colheitas, atividades, ocorrencias, aplicacoes]);

  // ---- Global handlers for popup buttons ----
  useEffect(() => {
    (window as any).__confirmFarmLocation = confirmLocation;
    (window as any).__cancelFarmPin = () => setTempPin(null);
    (window as any).__removePolygon = (type: string, id: string) => {
      removePolygon(type as "talhao" | "pasto", id);
    };
    return () => {
      delete (window as any).__confirmFarmLocation;
      delete (window as any).__cancelFarmPin;
      delete (window as any).__removePolygon;
    };
  });

  // ---- Bind save ----
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

  // ---- FlyTo helper ----
  const flyTo = (center: [number, number], zoom: number) => {
    mapRef.current?.flyTo(center, zoom, { duration: 1.2 });
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

  const unmappedTalhoes = talhoes.filter((t) => !t.coordenadas);
  const unmappedPastos = pastos.filter((p) => !p.coordenadas);
  const totalAreaTalhoes = talhoes.reduce((s, t) => s + Number(t.area_hectares || 0), 0);
  const totalCabecas = animais.length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
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
          {settingLocation && (
            <div className="absolute top-0 left-0 right-0 z-[1001] bg-[#16A34A] text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Clique no mapa para definir a localização da sua fazenda.
            </div>
          )}
          {drawing && (
            <div className="absolute top-0 left-0 right-0 z-[1001] bg-blue-600 text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Clique para criar os pontos do polígono. Dê duplo clique para finalizar (mínimo 3 pontos). [{drawPoints.length} pontos]
            </div>
          )}

          <div ref={mapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />

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

        {/* Panel toggle */}
        <button onClick={() => setPanelOpen(!panelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-[1001] bg-white border border-[#E5E7EB] rounded-l-md p-1.5 shadow"
          style={{ right: panelOpen ? "288px" : 0 }}>
          {panelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* ---- SIDE PANEL ---- */}
        <div className={`shrink-0 bg-white border-l border-[#E5E7EB] transition-all duration-200 overflow-hidden ${panelOpen ? "w-72" : "w-0"}`}
          style={{ zIndex: 999 }}>
          <div className="h-full overflow-y-auto p-4">
            <h2 className="font-bold text-base mb-3">Áreas Mapeadas</h2>

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
                        flyTo([Number(t.centro_lat), Number(t.centro_lng)], 16);
                      } else {
                        setDrawing(true);
                      }
                    }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs flex items-center gap-2 transition-colors">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getTalhaoColor(t.id) }} />
                      <span className="font-medium truncate flex-1">{t.nome}</span>
                      {info && <span className="text-[10px] text-gray-400 shrink-0">{info.cultura}</span>}
                      {info?.alertas && info.alertas.length > 0 && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasMapa ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {hasMapa ? "Mapeado" : "Sem mapa"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

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
                        flyTo([Number(p.centro_lat), Number(p.centro_lng)], 16);
                      } else {
                        setDrawing(true);
                      }
                    }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs flex items-center gap-2 transition-colors">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPastoColor(p.id) }} />
                      <span className="font-medium truncate flex-1">{p.nome}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{lot.count}/{lot.cap || "∞"}</span>
                      {vacinaCount > 0 && <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasMapa ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {hasMapa ? "Mapeado" : "Sem mapa"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-[#E5E7EB] pt-3 mt-3 text-[10px] text-gray-500">
              Total: {talhoes.length} talhões ({fmtNum(totalAreaTalhoes)} ha) | {pastos.length} pastos ({totalCabecas} cabeças)
            </div>
          </div>
        </div>
      </div>

      {/* ---- BIND MODAL ---- */}
      {showBindModal && drawnCoords && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Vincular Polígono</h3>
            <p className="text-sm text-gray-500 mb-3">
              Área desenhada: <strong>{calcAreaHaSimple(drawnCoords).toFixed(2)} ha</strong> ({drawnCoords.length} pontos)
            </p>

            <div className="mb-3">
              <label className="text-sm font-medium">Tipo</label>
              <select value={bindType} onChange={(e) => { setBindType(e.target.value as any); setBindTarget("new"); }}
                className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm mt-1">
                <option value="talhao">Talhão</option>
                <option value="pasto">Pasto</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Vincular a</label>
              <select value={bindTarget} onChange={(e) => setBindTarget(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm mt-1">
                <option value="new">+ Criar Novo</option>
                {(bindType === "talhao" ? unmappedTalhoes : unmappedPastos).map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </div>

            {bindTarget === "new" && (
              <>
                <div className="mb-3">
                  <label className="text-sm font-medium">Nome</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm mt-1"
                    placeholder={bindType === "talhao" ? "Ex: Talhão 1" : "Ex: Pasto Norte"} />
                </div>
                <div className="mb-3">
                  <label className="text-sm font-medium">{bindType === "talhao" ? "Tipo de Solo" : "Capacidade (cabeças)"}</label>
                  <input value={newExtra} onChange={(e) => setNewExtra(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded px-3 py-2 text-sm mt-1"
                    placeholder={bindType === "talhao" ? "Ex: Argiloso" : "Ex: 50"} />
                </div>
              </>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={handleBindSave}
                className="flex-1 bg-[#16A34A] text-white rounded px-4 py-2 text-sm font-medium hover:bg-[#15803D]">
                Salvar
              </button>
              <button onClick={() => { setShowBindModal(false); setDrawnCoords(null); }}
                className="flex-1 border border-[#E5E7EB] rounded px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
