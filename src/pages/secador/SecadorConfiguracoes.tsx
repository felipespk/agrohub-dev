import { useEffect, useState, useCallback } from 'react'
import { Settings, Save, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

interface ProfileSecador {
  farm_name: string | null
  fazenda_lat_secador: number | null
  fazenda_lng_secador: number | null
}

export function SecadorConfiguracoes() {
  const { session, refreshProfile } = useAuth()
  const { isImpersonating } = useImpersonation()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [farmName, setFarmName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [umidadePadrao, setUmidadePadrao] = useState('13')

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('farm_name, fazenda_lat_secador, fazenda_lng_secador')
      .eq('user_id', userId)
      .single()
    if (data) {
      setFarmName(data.farm_name ?? '')
      setLat(data.fazenda_lat_secador != null ? String(data.fazenda_lat_secador) : '')
      setLng(data.fazenda_lng_secador != null ? String(data.fazenda_lng_secador) : '')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { loadProfile() }, [loadProfile])

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está no modo impersonação.' })
      return
    }
    if (!userId) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      farm_name: farmName || null,
      fazenda_lat_secador: lat ? parseFloat(lat) : null,
      fazenda_lng_secador: lng ? parseFloat(lng) : null,
    }).eq('user_id', userId)
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar', { description: error.message })
    } else {
      await refreshProfile()
      toast.success('Configurações salvas!')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Configurações · Secador / Silo</h1>
        <p className="text-sm text-t3">Configurações gerais do módulo de secagem e armazenagem de grãos</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
                <Settings size={14} />
                Identificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Nome da Fazenda / Secador</Label>
                <Input
                  value={farmName}
                  onChange={e => setFarmName(e.target.value)}
                  placeholder="Ex: Fazenda Esperança — Secador"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                    placeholder="-15.123456"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={e => setLng(e.target.value)}
                    placeholder="-47.654321"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
                <Info size={14} />
                Parâmetros de Desconto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Umidade Padrão (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={umidadePadrao}
                  onChange={e => setUmidadePadrao(e.target.value)}
                  placeholder="13"
                  className="w-32"
                />
                <p className="text-xs text-t3">Padrão de mercado para soja: 13%. Base usada para cálculo de desconto de umidade.</p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 space-y-3">
                <p className="text-xs font-semibold text-t2">Tabela de Descontos (padrão brasileiro)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-t2">
                  <div className="space-y-1">
                    <p className="font-medium text-t1">Desconto de Umidade</p>
                    <p>Fórmula: <code className="bg-[var(--surface)] px-1 rounded text-[var(--primary)]">(umidade − {umidadePadrao}%) × 0,1125% × peso_líquido</code></p>
                    <p className="text-t3">Aplicado quando umidade &gt; {umidadePadrao}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-t1">Desconto de Impureza</p>
                    <p>Fórmula: <code className="bg-[var(--surface)] px-1 rounded text-[var(--primary)]">(impureza − 1%) × 0,1125% × peso_líquido</code></p>
                    <p className="text-t3">Aplicado quando impureza &gt; 1%</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="font-medium text-t1">Peso Descontado</p>
                    <p>Fórmula: <code className="bg-[var(--surface)] px-1 rounded text-[var(--primary)]">peso_líquido − desc_umidade − desc_impureza − outros</code></p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="font-medium text-t1">Valor por Saca (Expedição)</p>
                    <p>Fórmula: <code className="bg-[var(--surface)] px-1 rounded text-[var(--primary)]">(peso_líquido ÷ 60 kg) × preço_saca</code></p>
                    <p className="text-t3">Saca de 60 kg (padrão para soja e milho)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
