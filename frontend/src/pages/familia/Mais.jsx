import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Icone from '../../components/Icone.jsx';

// Desenho: docs/telas/M18. Itens agrupados por assunto, em cartões com ícone e seta.
const GRUPOS = [
  { titulo: 'Família', itens: [
    ['/familia/filhos', 'Meus filhos', 'criancas'],
    ['/familia/responsaveis', 'Responsáveis', 'conta'],
    ['/familia/convidar', 'Convidar outra clínica', 'clinica'],
  ] },
  { titulo: 'Acompanhamento', itens: [
    ['/familia/linha-do-tempo', 'Linha do tempo', 'tempo'],
    ['/familia/relatorio', 'Relatório de evolução', 'relatorio'],
    ['/familia/solicitacoes', 'Pedidos de acesso', 'acessos', 'pedidos'],
  ] },
  { titulo: 'Privacidade', itens: [
    ['/familia/quem-acessou', 'Quem acessou', 'olho'],
    ['/familia/privacidade', 'Privacidade e dados', 'cadeado'],
  ] },
];

export default function Mais() {
  const { usuario, sair } = useAuth();
  const [painel, setPainel] = useState(null);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    api.get('/painel/responsavel').then(setPainel).catch(() => {});
  }, []);

  const naoLidos = painel?.avisos_nao_lidos || 0;
  const pedidos = painel?.pedidos_pendentes.length || 0;

  return (
    <div className="mais">
      <h1>Mais</h1>

      <div className="perfil-mais">
        <span className="avatar-grande">{usuario.nome[0]}</span>
        <div><strong>{usuario.nome}</strong><small>{usuario.email}</small></div>
      </div>

      <Link to="/familia/avisos" className={`faixa-avisos ${naoLidos > 0 ? 'novos' : ''}`}>
        <Icone nome="avisos" tamanho={22} />
        <span>{naoLidos > 0 ? <><b>Avisos</b> · {naoLidos === 1 ? '1 novo' : `${naoLidos} novos`}</> : <b>Avisos</b>}</span>
        {naoLidos > 0 && <i className="selo-numero">{naoLidos}</i>}
        <span aria-hidden="true" className="seta-linha">›</span>
      </Link>

      {GRUPOS.map((g) => (
        <section key={g.titulo}>
          <h2 className="titulo-grupo">{g.titulo}</h2>
          <div className="lista-cartao">
            {g.itens.map(([para, nome, icone, selo]) => (
              <Link key={para} to={para} className="linha-menu">
                <span className="icone-menu"><Icone nome={icone} tamanho={20} /></span>
                <span className="nome-menu">{nome}</span>
                {selo === 'pedidos' && pedidos > 0 && <i className="pill wa">{pedidos === 1 ? '1 espera você' : `${pedidos} esperam você`}</i>}
                <span aria-hidden="true" className="seta-linha">›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {saindo ? (
        <div className="confirma-sair" role="alertdialog" aria-label="Sair do app">
          <strong>Sair do app?</strong>
          <p>Você precisará entrar de novo com o e-mail e a senha.</p>
          <div className="acoes-topo">
            <button className="botao perigo" onClick={sair}>Sim, sair</button>
            <button className="botao-sec" onClick={() => setSaindo(false)}>Voltar</button>
          </div>
        </div>
      ) : (
        <button className="botao perigo botao-sair" onClick={() => setSaindo(true)}>
          <Icone nome="sair" tamanho={18} />Sair
        </button>
      )}
    </div>
  );
}
