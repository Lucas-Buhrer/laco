import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useNaoLidas from './useNaoLidas.js';

// Menu de cada papel, como no doc 06
const MENUS = {
  PROFISSIONAL: [
    ['', 'Painel'], ['criancas', 'Crianças'], ['pre-cadastros', 'Pré-cadastros'],
    ['agenda', 'Agenda'], ['codigo-da-familia', 'Código da família'], ['conta', 'Conta'],
  ],
  ADMIN_CLINICA: [
    ['', 'Painel'], ['equipe', 'Equipe'], ['pre-cadastros', 'Pré-cadastros'],
    ['agenda', 'Agenda da clínica'], ['clinica', 'Clínica'], ['conta', 'Conta'],
  ],
  // Recepção não tem tela de conta: a senha é redefinida pelo admin
  RECEPCAO: [['', 'Painel'], ['pre-cadastros', 'Pré-cadastros'], ['agenda', 'Agenda']],
};

const NOME_PAPEL = { PROFISSIONAL: 'Profissional', ADMIN_CLINICA: 'Administração', RECEPCAO: 'Recepção' };

export default function LayoutClinica() {
  const { usuario, sair } = useAuth();
  const naoLidas = useNaoLidas();

  return (
    <div className="layout-clinica">
      <a className="pular" href="#conteudo">Ir para o conteúdo</a>
      <aside className="menu-lateral">
        <span className="logo">laço</span>
        <p className="menu-clinica">{usuario.clinica?.nome}</p>
        <nav>
          {MENUS[usuario.papel].map(([caminho, nome]) => (
            <NavLink key={nome} to={`/clinica/${caminho}`} end={caminho === ''} className="item-menu">
              {nome}
            </NavLink>
          ))}
          <NavLink to="/clinica/avisos" className="item-menu">Avisos{naoLidas > 0 && <span className="contador">{naoLidas}</span>}</NavLink>
        </nav>
        <div className="menu-rodape">
          <strong>{usuario.nome}</strong>
          <span>{NOME_PAPEL[usuario.papel]}</span>
          <button className="botao-sec" onClick={sair}>Sair</button>
        </div>
      </aside>
      <main className="conteudo" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
