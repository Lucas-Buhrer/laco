import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useNaoLidas from './useNaoLidas.js';
import Icone from './Icone.jsx';

// Menu de cada papel, como nos desenhos D2 (profissional), D7 (administração) e D5 (recepção)
const MENUS = {
  PROFISSIONAL: [
    ['', 'Painel', 'painel'], ['criancas', 'Crianças', 'criancas'], ['pre-cadastros', 'Pré-cadastros', 'precadastro'],
    ['agenda', 'Agenda', 'agenda'], ['codigo-da-familia', 'Código da família', 'codigo'], ['conta', 'Conta', 'conta'],
  ],
  ADMIN_CLINICA: [
    ['', 'Painel', 'painel'], ['equipe', 'Equipe', 'criancas'], ['pre-cadastros', 'Pré-cadastros', 'precadastro'],
    ['agenda', 'Agenda da clínica', 'agenda'], ['clinica', 'Clínica', 'clinica'], ['conta', 'Conta', 'conta'],
  ],
  // Recepção não tem tela de conta: a senha é redefinida pelo admin. O "Sair" fica no menu.
  RECEPCAO: [['', 'Painel', 'painel'], ['pre-cadastros', 'Pré-cadastros', 'precadastro'], ['agenda', 'Agenda', 'agenda']],
};

const NOME_PAPEL = { ADMIN_CLINICA: 'Administração', RECEPCAO: 'Recepção' };

export default function LayoutClinica() {
  const { usuario, sair } = useAuth();
  const naoLidas = useNaoLidas();
  const nomeClinica = usuario.clinica?.nome || '';
  // No desenho: profissional mostra "Clínica Aurora"; administração e recepção, "Administração · Aurora"
  const subtitulo = usuario.papel === 'PROFISSIONAL' ? nomeClinica : `${NOME_PAPEL[usuario.papel]} · ${nomeClinica.replace(/^Clínica\s+/i, '')}`;

  return (
    <div className="layout-clinica">
      <a className="pular" href="#conteudo">Ir para o conteúdo</a>
      <aside className="menu-lateral">
        <span className="logo">laço</span>
        <nav>
          {MENUS[usuario.papel].map(([caminho, nome, icone]) => (
            <NavLink key={nome} to={`/clinica/${caminho}`} end={caminho === ''} className="item-menu">
              <Icone nome={icone} />{nome}
            </NavLink>
          ))}
          <NavLink to="/clinica/avisos" className="item-menu">
            <Icone nome="avisos" />Avisos{naoLidas > 0 && <span className="contador">{naoLidas}</span>}
          </NavLink>
          {usuario.papel === 'RECEPCAO' && (
            <button className="item-menu" onClick={sair}><Icone nome="sair" />Sair</button>
          )}
        </nav>
        <div className="menu-rodape">
          <span className="avatar">{usuario.nome[0]}</span>
          <div>
            <strong>{usuario.nome}</strong>
            <span>{subtitulo}</span>
          </div>
        </div>
      </aside>
      <main className="conteudo" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
