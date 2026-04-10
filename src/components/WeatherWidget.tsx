import { useEffect, useState } from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Droplets, Wind } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface CurrentWeather {
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
}

interface DayForecast {
  day: string
  max: number
  min: number
  precipitation: number
}

interface WeatherData {
  current: CurrentWeather
  forecast: DayForecast[]
  fetchedAt: number
}

const CACHE_KEY = 'agrix_weather'
const CACHE_TTL = 30 * 60 * 1000 // 30 min

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function weatherIcon(code: number) {
  if (code === 0 || code === 1) return <Sun size={28} className="text-amber-400" />
  if (code === 2 || code === 3) return <Cloud size={28} className="text-gray-400" />
  if (code >= 51 && code <= 57) return <CloudDrizzle size={28} className="text-blue-400" />
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={28} className="text-blue-500" />
  if (code >= 71 && code <= 77) return <CloudSnow size={28} className="text-blue-200" />
  if (code >= 95) return <CloudLightning size={28} className="text-yellow-400" />
  return <Cloud size={28} className="text-gray-400" />
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Céu limpo'
  if (code === 1) return 'Poucas nuvens'
  if (code === 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code >= 51 && code <= 57) return 'Garoa'
  if (code >= 61 && code <= 67) return 'Chuva'
  if (code >= 71 && code <= 77) return 'Neve'
  if (code >= 80 && code <= 82) return 'Pancadas'
  if (code >= 95) return 'Tempestade'
  return 'Indefinido'
}

export function WeatherWidget() {
  const { profile } = useAuth()
  const [data, setData] = useState<WeatherData | null>(null)

  const lat = (profile as unknown as Record<string, unknown>)?.fazenda_lat as number | null
  const lng = (profile as unknown as Record<string, unknown>)?.fazenda_lng as number | null

  useEffect(() => {
    if (!lat || !lng) return

    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed: WeatherData = JSON.parse(cached)
        if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
          setData(parsed)
          return
        }
      } catch { /* ignore */ }
    }

    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America/Sao_Paulo&forecast_days=3`
        const res = await fetch(url)
        if (!res.ok) return
        const json = await res.json()

        const weather: WeatherData = {
          current: {
            temperature: Math.round(json.current.temperature_2m),
            humidity: json.current.relative_humidity_2m,
            windSpeed: Math.round(json.current.wind_speed_10m),
            weatherCode: json.current.weather_code,
          },
          forecast: json.daily.time.map((date: string, i: number) => ({
            day: WEEKDAYS[new Date(date + 'T12:00:00').getDay()],
            max: Math.round(json.daily.temperature_2m_max[i]),
            min: Math.round(json.daily.temperature_2m_min[i]),
            precipitation: json.daily.precipitation_sum[i],
          })),
          fetchedAt: Date.now(),
        }

        setData(weather)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(weather))
      } catch { /* silent fail */ }
    }

    fetchWeather()
  }, [lat, lng])

  if (!data) return null

  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-5 animate-fade-up">
      {/* Current */}
      <div className="flex items-center gap-3">
        {weatherIcon(data.current.weatherCode)}
        <div>
          <p className="text-2xl font-bold text-t1 tabular leading-none">{data.current.temperature}°C</p>
          <p className="text-xs text-t3 mt-0.5">{weatherLabel(data.current.weatherCode)}</p>
        </div>
      </div>

      {/* Humidity + Wind */}
      <div className="flex flex-col gap-1 text-xs text-t2">
        <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-400" />{data.current.humidity}%</span>
        <span className="flex items-center gap-1"><Wind size={12} className="text-gray-400" />{data.current.windSpeed} km/h</span>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-[var(--border)]" />

      {/* 3-day forecast */}
      <div className="flex gap-4">
        {data.forecast.map((d, i) => (
          <div key={i} className="text-center">
            <p className="text-xs font-medium text-t2">{i === 0 ? 'Hoje' : d.day}</p>
            <p className="text-sm font-semibold text-t1 tabular">{d.max}°</p>
            <p className="text-xs text-t3 tabular">{d.min}°</p>
          </div>
        ))}
      </div>
    </div>
  )
}
