import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'

// Fix Leaflet default icon URLs broken by Vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const DEFAULT_LAT = -10.404850
const DEFAULT_LNG = -49.620947

type LayerMode = 'satellite' | 'osm'

interface Talhao { id: string; nome: string; coordenadas: unknown }
interface Pasto { id: string; nome: string; coordenadas: unknown; capacidade_ua: number | null; animais_count?: number }

export function Mapa() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()

  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const [layerMode, setLayerMode] = useState<LayerMode>('satellite')
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [pastos, setPastos] = useState<Pasto[]>([])
  const [loading, setLoading] = useState(true)

  // Load polygons
  useEffect(() => {
    if (!userId) return
    async function load() {
      setLoading(true)
      const [tRes, pRes, animaisRes] = await Promise.all([
        supabase.from('talhoes').select('id, nome, coordenadas').eq('user_id', userId).eq('ativo', true),
        supabase.from('pastos').select('id, nome, coordenadas, capacidade_ua').eq('user_id', userId),
        supabase.from('animais').select('pasto_id').eq('user_id', userId!).eq('status', 'ativo'),
      ])
      const pastosData = (pRes.data ?? []) as Pasto[]
      const animais = (animaisRes.data ?? []) as { pasto_id: string | null }[]
      const countsMap: Record<string, number> = {}
      for (const a of animais) {
        if (a.pasto_id) countsMap[a.pasto_id] = (countsMap[a.pasto_id] ?? 0) + 1
      }
      const pastosWithCount = pastosData.map(p => ({ ...p, animais_count: countsMap[p.id] ?? 0 }))
      setTalhoes((tRes.data ?? []) as Talhao[])
      setPastos(pastosWithCount)
      setLoading(false)
    }
    load()
  }, [userId])

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const lat = (profile as unknown as Record<string, unknown>)?.fazenda_lat as number | null ?? DEFAULT_LAT
    const lng = (profile as unknown as Record<string, unknown>)?.fazenda_lng as number | null ?? DEFAULT_LNG

    const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 14)
    mapRef.current = map

    tileLayerRef.current = L.tileLayer(SATELLITE_URL, { attribution: SATELLITE_ATTR, maxZoom: 19 }).addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [profile])

  // Draw polygons
  useEffect(() => {
    const map = mapRef.current
    if (!map || loading) return

    // Clear existing layers (except tile)
    map.eachLayer(layer => {
      if (layer instanceof L.Polygon || layer instanceof L.GeoJSON) map.removeLayer(layer)
    })

    // Talhoes — green
    for (const t of talhoes) {
      if (!t.coordenadas) continue
      try {
        const coords = typeof t.coordenadas === 'string' ? JSON.parse(t.coordenadas) : t.coordenadas
        const latlngs = (coords as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number])
        L.polygon(latlngs, {
          color: '#78FC90', weight: 2, fillColor: '#78FC90', fillOpacity: 0.25,
        }).bindTooltip(t.nome, { permanent: false, direction: 'center' }).addTo(map)
      } catch { /* skip invalid */ }
    }

    // Pastos — color by occupancy
    for (const p of pastos) {
      if (!p.coordenadas) continue
      try {
        const coords = typeof p.coordenadas === 'string' ? JSON.parse(p.coordenadas) : p.coordenadas
        const latlngs = (coords as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number])
        const cap = p.capacidade_ua ?? 0
        const count = p.animais_count ?? 0
        const ratio = cap > 0 ? count / cap : 0
        const color = ratio >= 1 ? '#ef4444' : ratio >= 0.75 ? '#f97316' : '#3b82f6'
        L.polygon(latlngs, {
          color, weight: 2, fillColor: color, fillOpacity: 0.3,
        }).bindTooltip(`${p.nome} — ${count} animais`, { permanent: false, direction: 'center' }).addTo(map)
      } catch { /* skip invalid */ }
    }
  }, [talhoes, pastos, loading])

  // Toggle tile layer
  function toggleLayer() {
    const map = mapRef.current
    if (!map || !tileLayerRef.current) return
    map.removeLayer(tileLayerRef.current)
    const next: LayerMode = layerMode === 'satellite' ? 'osm' : 'satellite'
    tileLayerRef.current = L.tileLayer(
      next === 'satellite' ? SATELLITE_URL : OSM_URL,
      { attribution: next === 'satellite' ? SATELLITE_ATTR : OSM_ATTR, maxZoom: 19 }
    ).addTo(map)
    setLayerMode(next)
  }

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 64px)' }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-16 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md text-sm font-medium text-gray-700 hover:bg-white hover:text-gray-900 transition-all"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      {/* Toggle button */}
      <button
        onClick={toggleLayer}
        className="absolute top-3 right-3 z-[1000] bg-white rounded-lg px-3 py-2 text-xs font-semibold text-[#111110] shadow-elev-2 hover:bg-gray-50 transition-colors"
      >
        {layerMode === 'satellite' ? 'Mapa' : 'Satélite'}
      </button>

      {/* Legend */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-elev-2 text-xs text-[#111110] space-y-1">
        <p className="font-semibold mb-1">Legenda</p>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#78FC90] border border-[#78FC90]/60" />Talhão</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-400" />Pasto — Normal</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-orange-500 border border-orange-400" />Pasto — Alto</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-500 border border-red-400" />Pasto — Lotado</div>
      </div>
    </div>
  )
}
