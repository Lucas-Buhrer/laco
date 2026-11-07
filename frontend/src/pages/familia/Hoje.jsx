import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { hora } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';
import Icone from '../../components/Icone.jsx';
import { CORES } from '../../utils/coresFilhos.js';

const semana = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();

// Desenho: docs/telas/M1 (Hoje). Próximas consultas, atividades de hoje e pedidos esperando resposta.
export default function Hoje() {
  const [p, setP] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/painel/responsavel').then(setP).catch((e) => setErro(e.message));
  }, []);

  const cor = (nome) => CORES[Math.max(0, p.filhos.findIndex((f) => f.nome === nome)) % CORES.length];
  const nomeFiltro = filtro === 'TODOS' ? null : p?.filhos.find((f) => f.id === filtro)?.nome;
  const doFilho = (x) => !nomeFiltro || x.crianca_nome === nomeFiltro;
  const consultas = p ? p.proximas_consultas.filter(doFilho) : [];
  const atividades = p ? p.atividades.filter(doFilho) : [];
  const feitas = atividades.filter((a) => a.feitas_hoje > 0).length;

  return (
    <div className="hoje">
      <div className="hoje-topo">
        <h1>Hoje</h1>
        <Link to="/familia/avisos" className="sino" aria-label={p?.avisos_nao_lidos ? `Avisos, ${p.avisos_nao_lidos} novos` : 'Avisos'}>
          <Icone nome="avisos" tamanho={22} />
          {p?.avisos_nao_lidos > 0 && <span className="sino-ponto" />}
        </Link>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {!p && !erro && <p className="carregando">Carregando…</p>}

      {p && (
        <>
          <div className="filhos-filtro">
            <button aria-pressed={filtro === 'TODOS'} className={`filtro-filho ${filtro === 'TODOS' ? 'on' : ''}`} onClick={() => setFiltro('TODOS')}>Todos</button>
            {p.filhos.map((f, i) => (
              <button key={f.id} aria-pressed={filtro === f.id} className={`filtro-filho com-avatar ${filtro === f.id ? 'on' : ''}`} onClick={() => setFiltro(f.id)}>
                <span className="mini-avatar" style={{ background: CORES[i % CORES.length].fundo, color: CORES[i % CORES.length].texto }}>{f.nome[0]}</span>{f.nome}
              </button>
            ))}
            <Link to="/familia/filhos/adicionar" className="filtro-filho adicionar" aria-label="Adicionar outro filho">+</Link>
          </div>

          {p.pedidos_pendentes.length > 0 && (
            <Link to="/familia/solicitacoes" className="faixa-pedidos">
              <div>
                <b>{p.pedidos_pendentes.length === 1 ? '1 pedido de acesso' : `${p.pedidos_pendentes.length} pedidos de acesso`}</b><br />
                {p.pedidos_pendentes.map((x) => `${x.profissional_nome} (${x.crianca_nome})`).join(' · ')}
              </div>
              <span aria-hidden="true">›</span>
            </Link>
          )}

          <h2 className="secao-celular">Próximas consultas</h2>
          {consultas.length === 0 ? (
            <div className="vazio-grande"><p>Nenhuma consulta marcada. Quando a clínica marcar, ela aparece aqui.</p></div>
          ) : (
            <div className="lista-cartao">
              {consultas.map((c) => {
                const k = cor(c.crianca_nome);
                return (
                  <Link key={c.id} to="/familia/agenda" className="linha-cartao">
                    <div className="bloco-dia" style={{ background: k.bloco }}>
                      <span style={{ color: k.dia }}>{semana(c.inicio)}</span>
                      <b style={{ color: k.numero }}>{new Date(c.inicio).getDate()}</b>
                    </div>
                    <div className="texto-linha">
                      <strong>{hora(c.inicio)} · {c.crianca_nome}</strong>
                      <small>{c.tipo || nomeEspecialidade(c) || 'Consulta'} · {c.profissional_nome}{!c.presenca_confirmada && ' · falta confirmar'}</small>
                    </div>
                    {p.filhos.length > 1 && <span className="mini-avatar" style={{ background: k.fundo, color: k.texto }}>{c.crianca_nome[0]}</span>}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="secao-celular-topo">
            <h2>Atividades de hoje</h2>
            {atividades.length > 0 && <span>{feitas} de {atividades.length}</span>}
          </div>
          {atividades.length === 0 ? (
            <div className="vazio-grande"><p>Nenhuma atividade por enquanto.</p></div>
          ) : (
            <div className="lista-cartao">
              {atividades.map((a) => (
                <Link key={a.id} to="/familia/atividades" className="linha-cartao compacta">
                  <span className={`marca-feita ${a.feitas_hoje > 0 ? 'feita' : ''}`} aria-hidden="true">{a.feitas_hoje > 0 ? '✓' : ''}</span>
                  <div className="texto-linha"><strong>{a.titulo}</strong><small>{a.crianca_nome}</small></div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
