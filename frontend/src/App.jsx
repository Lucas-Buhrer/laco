import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import LayoutClinica from './components/LayoutClinica.jsx';
import LayoutFamilia from './components/LayoutFamilia.jsx';
import LoginClinica from './pages/LoginClinica.jsx';
import LoginResponsavel from './pages/LoginResponsavel.jsx';
import AtivarConta from './pages/familia/AtivarConta.jsx';
import { Filhos, AdicionarFilho } from './pages/familia/Filhos.jsx';
import Acessos from './pages/familia/Acessos.jsx';
import Solicitacoes from './pages/familia/Solicitacoes.jsx';
import ConvidarClinica from './pages/familia/ConvidarClinica.jsx';
import Mais from './pages/familia/Mais.jsx';
import PainelClinica from './pages/clinica/PainelClinica.jsx';
import PreCadastros from './pages/clinica/PreCadastros.jsx';
import CodigoDaFamilia from './pages/clinica/CodigoDaFamilia.jsx';
import Criancas from './pages/clinica/Criancas.jsx';
import { HojeFamilia, EmConstrucao, SemPermissao } from './pages/Paineis.jsx';

// Quem abre "/" vai para a sua área; quem não está logado, para o login da clínica
function Inicio() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="carregando">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" replace />;
  return <Navigate to={usuario.papel === 'RESPONSAVEL' ? '/familia' : '/clinica'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/entrar" element={<LoginClinica />} />
          <Route path="/familia/entrar" element={<LoginResponsavel />} />
          <Route path="/familia/ativar" element={<AtivarConta />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />

          {/* Área da clínica: profissional, admin e recepção */}
          <Route element={<RotaProtegida papeis={['PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO']} entrarEm="/entrar" />}>
            <Route path="/clinica" element={<LayoutClinica />}>
              <Route index element={<PainelClinica />} />
              <Route path="pre-cadastros" element={<PreCadastros />} />
              <Route path="codigo-da-familia" element={<CodigoDaFamilia />} />
              <Route path="criancas" element={<Criancas />} />
              <Route path="*" element={<EmConstrucao />} />
            </Route>
          </Route>

          {/* Área da família */}
          <Route element={<RotaProtegida papeis={['RESPONSAVEL']} entrarEm="/familia/entrar" />}>
            <Route path="/familia" element={<LayoutFamilia />}>
              <Route index element={<HojeFamilia />} />
              <Route path="filhos" element={<Filhos />} />
              <Route path="filhos/adicionar" element={<AdicionarFilho />} />
              <Route path="solicitacoes" element={<Solicitacoes />} />
              <Route path="acessos" element={<Acessos />} />
              <Route path="convidar" element={<ConvidarClinica />} />
              <Route path="mais" element={<Mais />} />
              <Route path="*" element={<EmConstrucao />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
