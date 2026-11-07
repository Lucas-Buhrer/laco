import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';
import { corDoFilho } from '../../utils/coresFilhos.js';

// Desenho: docs/telas/M4. Uma linha por profissional, agrupadas por filho; os ajustes ficam escondidos
// até tocar na linha. Revogar e mudar o escopo valem na hora (RN-03).
export default function Acessos() {
  const [filhos, setFilhos] = useState([]);
  const [vinculos, setVinculos] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const [aberto, setAberto] = useState(null); // id do vínculo com os ajustes abertos
  const [confirmando, setConfirmando] = useState(null); // id do vínculo a revogar
  const [erro, setErro] = useState('');

  function carregar() {
    Promise.all([api.get('/criancas'), api.get('/vinculos')])
      .then(([c, v]) => { setFilhos(c); setVinculos(v); })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function revogar(v) {
    setErro('');
    try {
      await api.post(`/vinculos/${v.id}/revogar`);
      setConfirmando(null);
      setAberto(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function mudarEscopo(v, campo, valor) {
    setErro('');
    try {
      await api.put(`/vinculos/${v.id}/escopo`, { [campo]: valor });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!vinculos && !erro) return <p className="carregando">Carregando…</p>;
  const ativos = (vinculos || []).filter((v) => v.status === 'APROVADO' || v.status === 'PENDENTE');
  const pendentes = ativos.filter((v) => v.status === 'PENDENTE');
  const filhosVisiveis = filhos.filter((f) => filtro === 'TODOS' || f.id === filtro);

  return (
    <div className="acessos">
      <h1>Quem tem acesso</h1>
      <p className="subtitulo">Só quem você aprovou vê os dados {filhos.length > 1 ? 'dos seus filhos' : `de ${filhos[0]?.nome || 'seu filho'}`}.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      {pendentes.length > 0 && (
        <Link className="faixa-pedidos" to="/familia/solicitacoes">
          <div><b>{pendentes.length === 1 ? '1 pedido espera' : `${pendentes.length} pedidos esperam`} a sua resposta</b><br />Toque para ver</div>
          <span aria-hidden="true">›</span>
        </Link>
      )}

      {filhos.length > 1 && (
        <div className="filhos-filtro">
          <button aria-pressed={filtro === 'TODOS'} className={`filtro-filho ${filtro === 'TODOS' ? 'on' : ''}`} onClick={() => setFiltro('TODOS')}>Todos</button>
          {filhos.map((f, i) => (
            <button key={f.id} aria-pressed={filtro === f.id} className={`filtro-filho com-avatar ${filtro === f.id ? 'on' : ''}`} onClick={() => setFiltro(f.id)}>
              <span className="mini-avatar" style={{ background: corDoFilho(i).fundo, color: corDoFilho(i).texto }}>{f.nome[0]}</span>{f.nome}
            </button>
          ))}
        </div>
      )}

      {filhosVisiveis.map((f) => {
        const doFilho = ativos.filter((v) => v.crianca_id === f.id);
        const cor = corDoFilho(filhos.findIndex((x) => x.id === f.id));
        const aprovados = doFilho.filter((v) => v.status === 'APROVADO').length;
        return (
          <section key={f.id}>
            <div className="cab-filho">
              <span className="mini-avatar" style={{ background: cor.fundo, color: cor.texto }}>{f.nome[0]}</span>
              <h2>{f.nome}</h2>
              <small>{aprovados === 0 ? 'ninguém com acesso' : aprovados === 1 ? '1 profissional' : `${aprovados} profissionais`}</small>
            </div>
            {doFilho.length === 0 ? (
              <div className="vazio-grande"><p>Nenhum profissional tem acesso a {f.nome} agora.</p></div>
            ) : (
              <div className="lista-cartao">
                {doFilho.map((v) => {
                  const pendente = v.status === 'PENDENTE';
                  const abertoAqui = aberto === v.id;
                  return (
                    <div key={v.id} className="bloco-acesso">
                      <div className="linha-acesso-prof">
                        <span className={`avatar-prof ${pendente ? 'pendente' : ''}`}>{v.profissional_nome.replace(/^Dra?\.\s+/i, '')[0]}</span>
                        <div className="texto-linha">
                          <strong>{v.profissional_nome}</strong>
                          {pendente
                            ? <small className="aguardando">Aguardando sua resposta</small>
                            : <small>{[nomeEspecialidade(v), v.clinica_nome.replace(/^Clínica\s+/i, '')].filter(Boolean).join(' · ')}</small>}
                        </div>
                        {pendente
                          ? <Link className="botao pequeno-celular" to="/familia/solicitacoes">Ver</Link>
                          : <button className="botao-sec pequeno-celular" aria-expanded={abertoAqui} onClick={() => { setAberto(abertoAqui ? null : v.id); setConfirmando(null); }}>{abertoAqui ? 'Fechar' : 'Ajustar'}</button>}
                      </div>

                      {abertoAqui && (
                        <div className="ajustes">
                          <label className="marcar">
                            <input type="checkbox" checked={Boolean(v.ver_historico_anterior)} onChange={(e) => mudarEscopo(v, 'ver_historico_anterior', e.target.checked)} />
                            Pode ver o histórico de outros profissionais
                          </label>
                          <label className="marcar">
                            <input type="checkbox" checked={Boolean(v.ver_horarios_outras_clinicas)} onChange={(e) => mudarEscopo(v, 'ver_horarios_outras_clinicas', e.target.checked)} />
                            Avisar conflito de horário com outra clínica
                          </label>
                          {confirmando === v.id ? (
                            <div className="confirma-revogar">
                              <p>Retirar o acesso de {v.profissional_nome} a {f.nome}? Vale na mesma hora.</p>
                              <div className="acoes-topo">
                                <button className="botao perigo" onClick={() => revogar(v)}>Sim, retirar</button>
                                <button className="botao-sec" onClick={() => setConfirmando(null)}>Voltar</button>
                              </div>
                            </div>
                          ) : (
                            <button className="botao perigo" onClick={() => setConfirmando(v.id)}>Revogar acesso</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <div className="dois-botoes">
        <Link className="botao-sec" to="/familia/convidar">Convidar outra clínica</Link>
        <Link className="botao-sec" to="/familia/quem-acessou">Quem acessou</Link>
      </div>
    </div>
  );
}
