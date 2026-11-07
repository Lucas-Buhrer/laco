import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { diaCurto, hora } from '../../utils/consultas.js';

// Desenho: docs/telas/M1 (Hoje). Próxima consulta, atividades de hoje e pedidos esperando resposta.
export default function Hoje() {
  const { usuario } = useAuth();
  const [p, setP] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/painel/responsavel').then(setP).catch((e) => setErro(e.message));
  }, []);

  const nomeFiltro = filtro === 'TODOS' ? null : p?.filhos.find((f) => f.id === filtro)?.nome;
  const doFilho = (x) => !nomeFiltro || x.crianca_nome === nomeFiltro;

  return (
    <>
      <h1>Olá, {usuario.nome.split(' ')[0]}</h1>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {!p && !erro && <p className="carregando">Carregando…</p>}

      {p && p.filhos.length > 1 && (
        <div className="abas">
          <button className={filtro === 'TODOS' ? 'aba ativa' : 'aba'} onClick={() => setFiltro('TODOS')}>Todos</button>
          {p.filhos.map((f) => (
            <button key={f.id} className={filtro === f.id ? 'aba ativa' : 'aba'} onClick={() => setFiltro(f.id)}>{f.nome}</button>
          ))}
        </div>
      )}

      {p && p.pedidos_pendentes.length > 0 && (
        <Link to="/familia/solicitacoes" className="cartao destaque">
          {p.pedidos_pendentes.length === 1 ? '1 pedido de acesso' : `${p.pedidos_pendentes.length} pedidos de acesso`}
          <span className="detalhe"> · {p.pedidos_pendentes.map((x) => `${x.profissional_nome} (${x.crianca_nome})`).join(' · ')}</span>
        </Link>
      )}

      {p && (
        <>
          <h2 className="titulo-lista">Próximas consultas</h2>
          {p.proximas_consultas.filter(doFilho).length === 0 && <p className="vazio">Nenhuma consulta marcada.</p>}
          {p.proximas_consultas.filter(doFilho).map((c) => (
            <Link key={c.id} to="/familia/agenda" className="cartao">
              <p className="etiqueta">{diaCurto(c.inicio)} · {hora(c.inicio)}</p>
              <strong>{c.crianca_nome}</strong>
              <p className="detalhe">{c.tipo || 'Consulta'} · {c.profissional_nome}{!c.presenca_confirmada && ' · falta confirmar'}</p>
            </Link>
          ))}

          <h2 className="titulo-lista">Atividades de hoje</h2>
          {p.atividades.filter(doFilho).length === 0 && <p className="vazio">Nenhuma atividade por enquanto.</p>}
          {p.atividades.filter(doFilho).map((a) => (
            <Link key={a.id} to="/familia/atividades" className="cartao">
              <strong>{a.titulo}</strong>
              <p className="detalhe">{a.crianca_nome} · {a.feitas_hoje} {a.feitas_hoje === 1 ? 'feita' : 'feitas'} hoje</p>
            </Link>
          ))}
        </>
      )}
    </>
  );
}
