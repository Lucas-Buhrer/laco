import { NavLink, Outlet } from 'react-router-dom';
import Icone from './Icone.jsx';
import useTitulo from './useTitulo.js';

// App dos pais: pensado para celular (360px), menu fixo embaixo, como nos desenhos M*
const MENU = [
  ['', 'Hoje', 'painel'], ['agenda', 'Agenda', 'agenda'], ['atividades', 'Atividades', 'atividades'],
  ['acessos', 'Acessos', 'acessos'], ['mais', 'Mais', 'mais'],
];

export default function LayoutFamilia() {
  useTitulo();
  return (
    <div className="layout-familia">
      <a className="pular" href="#conteudo">Ir para o conteúdo</a>
      <main className="conteudo-familia" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="menu-inferior" aria-label="Principal">
        {MENU.map(([caminho, nome, icone]) => (
          <NavLink key={nome} to={`/familia/${caminho}`} end={caminho === ''} className="item-inferior">
            <span className="icone-inferior"><Icone nome={icone} tamanho={22} /></span>
            {nome}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
