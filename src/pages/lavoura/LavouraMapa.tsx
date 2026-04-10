import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTR = 'Tiles &copy; Esri'
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; OpenStreetMap contributors'
const DEFAULT_LAT = -10.404850
const DEFAULT_LNG = -49.620947

type LayerMode = 'satellite' | 'osm'

interface Talhao { id: string; nome: string; coordenadas: unknown }

export function LavouraMapa() {
  const { profile } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()

  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const [layerMode, setLayerMode] = useState<LayerMode>('satellite')
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('talhoes').select('id, nome, coordenadas').eq('user_id', userId).eq('ativo', true)
      setTalhoes((data ?? []) as Talhao[])
      setLoading(false)
    }
    load()
  }, [userId])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const lat = (profile as unknown as Record<string, unknown>)?.fazenda_lat as number | null ?? DEFAULT_LAT
    const lng = (profile as unknown as Record<string, unknown>)?.fazenda_lng as number | null ?? DEFAULT_LNG
    const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 14)
    mapRef.current = map
    tileLayerRef.current = L.tileLayer(SATELLITE_URL, { attribution: SATELLITE_ATTR, maxZoom: 19 }).addTo(map)
    return () => { map.remove(); mapRef.current = null }
  }, [profile])

  useEffect(() => {
    const map = mapRef.current
    if (!map || loading) return
    map.eachLayer(layer => { if (layer instanceof L.Polygon) map.removeLayer(layer) })

    for (const t of talhoes) {
      if (!t.coordenadas) continue
      try {
        const coords = typeof t.coordenadas === 'string' ? JSON.parse(t.coordenadas) : t.coordenadas
        const latlngs = (coords as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number])
        L.polygon(latlngs, { color: '#78FC90', weight: 2, fillColor: '#78FC90', fillOpacity: 0.25 })
          .bindTooltip(t.nome, { permanent: false, direction: 'center' })
          .addTo(map)
      } catch { /* skip */ }
    }
  }, [talhoes, loading])

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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-t1">Mapa de Talhões</h1>
        <p className="text-sm text-t3">Visualização dos talhões ativos da lavoura</p>
      </div>
      <div className="relative rounded-xl overflow-hidden glass-card" style={{ height: '70vh' }}>
        <div ref={containerRef} className="w-full h-full" />
        <button
          onClick={toggleLayer}
          className="absolute top-3 right-3 z-[1000] bg-white rounded-lg px-3 py-2 text-xs font-semibold text-[#111110] shadow-elev-2 hover:bg-gray-50 transition-colors"
        >
          {layerMode === 'satellite' ? 'Mapa' : 'Satélite'}
        </button>
        <div className="absolute bottom-4 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-elev-2 text-xs text-[#111110] space-y-1">
          <p className="font-semibold mb-1">Legenda</p>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#78FC90] border border-[#78FC90]/60" />Talhão</div>
        </div>
      </div>
    </div>
  )
}
