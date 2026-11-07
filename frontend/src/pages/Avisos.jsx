import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Icone from '../components/Icone.jsx';

// O ícone vem do assunto do aviso, que se reconhece pelo destino do link
function iconeDoAviso(link) {
  if (!link) return 'avisos';
  if (link.includes('agenda')) return 'agenda';
  if (link.includes('atividades')) return 'atividades';
  if (link.includes('linha-do-tempo') || link.includes('relatorio')) return 'relatorio';
  if (link.includes('solicitacoes') || link.includes('acessos') || link.includes('criancas')) return 'acessos';
  if (link.includes('pre-cadastros')) return 'precadastro';
  return 'avisos';
}

const meiaNoite = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
function grupoDoDia(iso) {
  const dias = Math.round((meiaNoite(new Date()) - meiaNoite(new Date(iso))) / 86400000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias <= 7) return 'Nesta semana';
  return 'Antes';
}
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

// Desenho: docs/telas/M17. Serve a família (celular) e a clínica (computador).
export default function Avisos() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [dados, setDados] = useState(null);
  const [aba, setAba] = useState('TODOS');
  const [erro, setErro] = useState('');
  const ehFamilia = usuario.papel === 'RESPONSAVEL';

  function carregar() {
    api.get('/notificacoes').then(setDados).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function abrir(a) {
    try {
      if (!a.lida) await api.post(`/notificacoes/${a.id}/ler`, {});
    } catch { /* se não marcar, só segue para a tela */ }
    window.dispatchEvent(new Event('avisos-mudaram'));
    if (a.link) navegar(a.link);
    else carregar();
  }

  async function lerTodas() {
    await api.post('/notificacoes/ler-todas', {});
    window.dispatchEvent(new Event('avisos-mudaram'));
    carregar();
  }

  const lista = (dados?.avisos || []).filter((a) => aba === 'TODOS' || !a.lida);
  const grupos = [];
  for (const a of lista) {
    const g = grupoDoDia(a.criada_em);
    if (!grupos.length || grupos[grupos.length - 1].nome !== g) grupos.push({ nome: g, itens: [] });
    grupos[grupos.length - 1].itens.push(a);
  }

  return (
    <div className="avisos">
      {ehFamilia && <Link to="/familia/mais" className="voltar">Mais</Link>}
      <div className="avisos-cab">
        <h1>Avisos</h1>
        {dados && dados.nao_lidas > 0 && <button className="botao-sec" onClick={lerTodas}>Marcar todos como lidos</button>}
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'TODOS'} className={aba === 'TODOS' ? 'aba ativa' : 'aba'} onClick={() => setAba('TODOS')}>Todos</button>
        <button role="tab" aria-selected={aba === 'NAO_LIDOS'} className={aba === 'NAO_LIDOS' ? 'aba ativa' : 'aba'} onClick={() => setAba('NAO_LIDOS')}>
          Não lidos{dados ? ` (${dados.nao_lidas})` : ''}
        </button>
      </div>

      {dados && lista.length === 0 && (
        <div className="vazio-grande">
          <h2>{aba === 'NAO_LIDOS' ? 'Tudo lido por aqui' : 'Nenhum aviso por enquanto'}</h2>
          <p>{aba === 'NAO_LIDOS' ? 'Quando chegar algo novo, ele aparece aqui.' : 'Pedidos, consultas e novidades dos seus acompanhamentos aparecem aqui.'}</p>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.nome}>
          <h2 className="titulo-grupo">{g.nome}</h2>
          <div className="lista-cartao">
            {g.itens.map((a) => (
              <button key={a.id} className={`aviso-linha ${a.lida ? '' : 'nao-lido'}`} onClick={() => abrir(a)}>
                <span className="aviso-icone"><Icone nome={iconeDoAviso(a.link)} tamanho={20} /></span>
                <span className="aviso-texto">{a.texto}</span>
                <time>{g.nome === 'Hoje' || g.nome === 'Ontem' ? hora(a.criada_em) : dia(a.criada_em)}</time>
                {!a.lida && <i className="aviso-ponto" aria-label="Não lido" />}
                <span aria-hidden="true" className="seta-linha">›</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
