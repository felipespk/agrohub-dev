import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ImpersonationProvider } from '@/contexts/ImpersonationContext'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/AppLayout'
import { GadoLayout } from '@/components/gado/GadoLayout'
import { FinanceiroLayout } from '@/components/financeiro/FinanceiroLayout'
import { LavouraLayout } from '@/components/lavoura/LavouraLayout'
import { SecadorLayout } from '@/components/secador/SecadorLayout'

// Auth pages
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'

// Hub
import { Hub } from '@/pages/Hub'

// Gado
import { GadoDashboard } from '@/pages/gado/GadoDashboard'
import { GadoAnimais } from '@/pages/gado/GadoAnimais'
import { GadoAnimalFicha } from '@/pages/gado/GadoAnimalFicha'
import { GadoPastos } from '@/pages/gado/GadoPastos'
import { GadoPesagens } from '@/pages/gado/GadoPesagens'
import { GadoSanidade } from '@/pages/gado/GadoSanidade'
import { GadoMovimentacoes } from '@/pages/gado/GadoMovimentacoes'
import { GadoReproducao } from '@/pages/gado/GadoReproducao'
import { GadoRacas } from '@/pages/gado/GadoRacas'
import { GadoConfiguracoes } from '@/pages/gado/GadoConfiguracoes'

// Financeiro
import { FinanceiroDashboard } from '@/pages/financeiro/FinanceiroDashboard'
import { ContasPagar } from '@/pages/financeiro/ContasPagar'
import { ContasReceber } from '@/pages/financeiro/ContasReceber'
import { Lancamentos } from '@/pages/financeiro/Lancamentos'
import { FluxoCaixa } from '@/pages/financeiro/FluxoCaixa'
import { ContasBancarias } from '@/pages/financeiro/ContasBancarias'
import { Categorias } from '@/pages/financeiro/Categorias'
import { CentrosCusto } from '@/pages/financeiro/CentrosCusto'
import { Contatos } from '@/pages/financeiro/Contatos'
import { FinanceiroConfiguracoes } from '@/pages/financeiro/FinanceiroConfiguracoes'

// Lavoura
import { LavouraDashboard } from '@/pages/lavoura/LavouraDashboard'
import { Talhoes } from '@/pages/lavoura/Talhoes'
import { Safras } from '@/pages/lavoura/Safras'
import { CadernoCampo } from '@/pages/lavoura/CadernoCampo'
import { Insumos } from '@/pages/lavoura/Insumos'
import { Maquinas } from '@/pages/lavoura/Maquinas'
import { Colheitas } from '@/pages/lavoura/Colheitas'
import { Pragas } from '@/pages/lavoura/Pragas'
import { Comercializacao } from '@/pages/lavoura/Comercializacao'
import { Relatorios } from '@/pages/lavoura/Relatorios'
import { Culturas } from '@/pages/lavoura/Culturas'
import { LavouraConfiguracoes } from '@/pages/lavoura/LavouraConfiguracoes'

// Secador
import { SecadorDashboard } from '@/pages/secador/SecadorDashboard'
import { Recebimento } from '@/pages/secador/Recebimento'
import { SaidaVenda } from '@/pages/secador/SaidaVenda'
import { SaidaGeral } from '@/pages/secador/SaidaGeral'
import { Armazenamento } from '@/pages/secador/Armazenamento'
import { Expedicao } from '@/pages/secador/Expedicao'
import { Relatorio } from '@/pages/secador/Relatorio'
import { Quebra } from '@/pages/secador/Quebra'
import { Cadastro } from '@/pages/secador/Cadastro'
import { SecadorConfiguracoes } from '@/pages/secador/SecadorConfiguracoes'

// Other
import { Mapa } from '@/pages/Mapa'
import { Admin } from '@/pages/Admin'
import { Loader2 } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'

function ImpersonationBannerWrapper() {
  return (
    <>
      <ImpersonationBanner />
      <Outlet />
    </>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-t3" />
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-t3" />
    </div>
  )
  if (!profile?.is_admin) return <Navigate to="/hub" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected standalone (no sidebar) */}
      <Route element={<ProtectedRoute><ImpersonationBannerWrapper /></ProtectedRoute>}>
        <Route path="/hub" element={<Hub />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
      </Route>

      {/* Protected with sidebar */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

        {/* Gado */}
        <Route path="/gado" element={<GadoLayout />}>
          <Route index element={<Navigate to="/gado/dashboard" replace />} />
          <Route path="dashboard" element={<GadoDashboard />} />
          <Route path="animais" element={<GadoAnimais />} />
          <Route path="animais/:id" element={<GadoAnimalFicha />} />
          <Route path="pastos" element={<GadoPastos />} />
          <Route path="pesagens" element={<GadoPesagens />} />
          <Route path="sanidade" element={<GadoSanidade />} />
          <Route path="movimentacoes" element={<GadoMovimentacoes />} />
          <Route path="reproducao" element={<GadoReproducao />} />
          <Route path="racas" element={<GadoRacas />} />
          <Route path="configuracoes" element={<GadoConfiguracoes />} />
        </Route>

        {/* Financeiro */}
        <Route path="/financeiro" element={<FinanceiroLayout />}>
          <Route index element={<Navigate to="/financeiro/dashboard" replace />} />
          <Route path="dashboard" element={<FinanceiroDashboard />} />
          <Route path="contas-pagar" element={<ContasPagar />} />
          <Route path="contas-receber" element={<ContasReceber />} />
          <Route path="lancamentos" element={<Lancamentos />} />
          <Route path="fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="contas-bancarias" element={<ContasBancarias />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="centros-custo" element={<CentrosCusto />} />
          <Route path="contatos" element={<Contatos />} />
          <Route path="configuracoes" element={<FinanceiroConfiguracoes />} />
        </Route>

        {/* Lavoura */}
        <Route path="/lavoura" element={<LavouraLayout />}>
          <Route index element={<Navigate to="/lavoura/dashboard" replace />} />
          <Route path="dashboard" element={<LavouraDashboard />} />
          <Route path="talhoes" element={<Talhoes />} />
          <Route path="safras" element={<Safras />} />
          <Route path="caderno-campo" element={<CadernoCampo />} />
          <Route path="insumos" element={<Insumos />} />
          <Route path="maquinas" element={<Maquinas />} />
          <Route path="colheitas" element={<Colheitas />} />
          <Route path="pragas" element={<Pragas />} />
          <Route path="comercializacao" element={<Comercializacao />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="culturas" element={<Culturas />} />
          <Route path="configuracoes" element={<LavouraConfiguracoes />} />
        </Route>

        {/* Secador */}
        <Route path="/secador" element={<SecadorLayout />}>
          <Route index element={<Navigate to="/secador/dashboard" replace />} />
          <Route path="dashboard" element={<SecadorDashboard />} />
          <Route path="recebimento" element={<Recebimento />} />
          <Route path="saida-venda" element={<SaidaVenda />} />
          <Route path="saida-geral" element={<SaidaGeral />} />
          <Route path="armazenamento" element={<Armazenamento />} />
          <Route path="expedicao" element={<Expedicao />} />
          <Route path="relatorio" element={<Relatorio />} />
          <Route path="quebra-tecnica" element={<Quebra />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="configuracoes" element={<SecadorConfiguracoes />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/hub" replace />} />
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationProvider>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </ImpersonationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
