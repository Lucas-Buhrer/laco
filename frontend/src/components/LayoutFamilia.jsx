import { NavLink, Outlet } from 'react-router-dom';

// App dos pais: pensado para celular (360px), menu fixo embaixo
const MENU = [
  ['', 'Hoje'], ['agenda', 'Agenda'], ['atividades', 'Atividades'], ['acessos', 'Acessos'], ['mais', 'Mais'],
];

export default function LayoutFamilia() {
  return (
    <div className="layout-familia">
      <main className="conteudo-familia">
        <Outlet />
      </main>
      <nav className="menu-inferior">
        {MENU.map(([caminho, nome]) => (
          <NavLink key={nome} to={`/familia/${caminho}`} end={caminho === ''} className="item-inferior">
            {nome}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
