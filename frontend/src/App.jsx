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
import Equipe from './pages/clinica/Equipe.jsx';
import Conta from './pages/clinica/Conta.jsx';
import DadosClinica from './pages/clinica/DadosClinica.jsx';
import PerfilCrianca from './pages/clinica/PerfilCrianca.jsx';
import RegistrarSessao from './pages/clinica/RegistrarSessao.jsx';
import LinhaDoTempoFamilia from './pages/familia/LinhaDoTempoFamilia.jsx';
import AtividadesFamilia from './pages/familia/AtividadesFamilia.jsx';
import QuemAcessou from './pages/familia/QuemAcessou.jsx';
import Privacidade from './pages/familia/Privacidade.jsx';
import Politica from './pages/Politica.jsx';
import Relatorio from './pages/familia/Relatorio.jsx';
import Parecer from './pages/clinica/Parecer.jsx';
import Responsaveis from './pages/familia/Responsaveis.jsx';
import AceitarConvite from './pages/familia/AceitarConvite.jsx';
import Avisos from './pages/Avisos.jsx';
import Agenda from './pages/clinica/Agenda.jsx';
import NovaConsulta from './pages/clinica/NovaConsulta.jsx';
import Consulta from './pages/clinica/Consulta.jsx';
import AgendaFamilia from './pages/familia/AgendaFamilia.jsx';
import Hoje from './pages/familia/Hoje.jsx';
import { SemPermissao } from './pages/Paineis.jsx';
import NaoEncontrado from './components/NaoEncontrado.jsx';
import SemConexao from './components/SemConexao.jsx';

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
        <SemConexao />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/entrar" element={<LoginClinica />} />
          <Route path="/familia/entrar" element={<LoginResponsavel />} />
          <Route path="/familia/ativar" element={<AtivarConta />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />
          <Route path="/politica" element={<Politica />} />
          <Route path="/familia/convite" element={<AceitarConvite />} />

          {/* Área da clínica: profissional, admin e recepção */}
          <Route element={<RotaProtegida papeis={['PROFISSIONAL', 'ADMIN_CLINICA', 'RECEPCAO']} entrarEm="/entrar" />}>
            <Route path="/clinica" element={<LayoutClinica />}>
              <Route index element={<PainelClinica />} />
              <Route path="pre-cadastros" element={<PreCadastros />} />
              <Route path="codigo-da-familia" element={<CodigoDaFamilia />} />
              <Route path="criancas" element={<Criancas />} />
              <Route path="avisos" element={<Avisos />} />
              <Route path="criancas/:id" element={<PerfilCrianca />} />
              <Route path="criancas/:id/registro" element={<RegistrarSessao />} />
              <Route path="criancas/:id/parecer" element={<Parecer />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="agenda/nova" element={<RotaProtegida papeis={['PROFISSIONAL', 'RECEPCAO']} entrarEm="/entrar" />}>
                <Route index element={<NovaConsulta />} />
              </Route>
              <Route path="agenda/:id" element={<Consulta />} />
              <Route path="equipe" element={<RotaProtegida papeis={['ADMIN_CLINICA']} entrarEm="/entrar" />}>
                <Route index element={<Equipe />} />
              </Route>
              <Route path="clinica" element={<RotaProtegida papeis={['ADMIN_CLINICA']} entrarEm="/entrar" />}>
                <Route index element={<DadosClinica />} />
              </Route>
              {/* A recepção não tem tela de conta: a senha dela só o administrador redefine */}
              <Route path="conta" element={<RotaProtegida papeis={['ADMIN_CLINICA', 'PROFISSIONAL']} entrarEm="/entrar" />}>
                <Route index element={<Conta />} />
              </Route>
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Route>

          {/* Área da família */}
          <Route element={<RotaProtegida papeis={['RESPONSAVEL']} entrarEm="/familia/entrar" />}>
            <Route path="/familia" element={<LayoutFamilia />}>
              <Route index element={<Hoje />} />
              <Route path="agenda" element={<AgendaFamilia />} />
              <Route path="linha-do-tempo" element={<LinhaDoTempoFamilia />} />
              <Route path="atividades" element={<AtividadesFamilia />} />
              <Route path="quem-acessou" element={<QuemAcessou />} />
              <Route path="relatorio" element={<Relatorio />} />
              <Route path="responsaveis" element={<Responsaveis />} />
              <Route path="avisos" element={<Avisos />} />
              <Route path="privacidade" element={<Privacidade />} />
              <Route path="filhos" element={<Filhos />} />
              <Route path="filhos/adicionar" element={<AdicionarFilho />} />
              <Route path="solicitacoes" element={<Solicitacoes />} />
              <Route path="acessos" element={<Acessos />} />
              <Route path="convidar" element={<ConvidarClinica />} />
              <Route path="mais" element={<Mais />} />
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
