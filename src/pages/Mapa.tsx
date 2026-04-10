import { Navigate } from 'react-router-dom'

// Standalone map removed — maps are now embedded in /gado/mapa and /lavoura/mapa
export function Mapa() {
  return <Navigate to="/hub" replace />
}
