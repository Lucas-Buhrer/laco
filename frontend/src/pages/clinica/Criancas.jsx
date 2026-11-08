import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/api.js';

// "Hoje, 09:00", "Ontem, 10:30" ou "qua 11, 15:00"
function diaRelativo(iso) {
  const d = new Date(iso);
  const hoje = new Date();
  const dias = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dias === 0) return `Hoje, ${hora}`;
  if (dias === -1) return `Ontem, ${hora}`;
  if (dias === 1) return `Amanhã, ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} ${d.getDate()}, ${hora}`;
}

function idade(nascimento) {
  const n = new Date(nascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos -= 1;
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

// Desenho: docs/telas/D8 (e D23 quando está vazio). Só aparecem crianças com vínculo aprovado (regra no servidor).
// A última sessão e a próxima consulta são só as deste profissional.
export default function Criancas() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/criancas').then(setLista).catch((e) => setErro(e.message));
  }, []);

  if (usuario.papel !== 'PROFISSIONAL') return <p className="aviso-erro">Esta tela é só para profissionais.</p>;

  const termo = busca.trim().toLowerCase();
  const visiveis = (lista || []).filter((c) => !termo || c.nome.toLowerCase().includes(termo));

  return (
    <>
      <div className="avisos-cab">
        <div>
          <h1>Crianças</h1>
          <p className="subtitulo">Só aparecem crianças cujas famílias aprovaram o seu acesso.</p>
        </div>
        {lista && lista.length > 3 && (
          <input className="busca" type="search" placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
        )}
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {lista && lista.length === 0 && (
        <div className="vazio-grande">
          <h2>Nenhuma criança vinculada a você ainda</h2>
          <p>Para ver uma criança, a recepção a pré-cadastra e indica você, e a família aprova o seu acesso no app. Se a criança já é atendida em outra clínica, peça o Código da família aos pais.</p>
          <div className="acoes-topo">
            <Link className="botao" to="/clinica/codigo-da-familia">Digitar um Código da família</Link>
            <Link className="botao-sec" to="/clinica/pre-cadastros">Ver pré-cadastros</Link>
          </div>
        </div>
      )}
      {lista && lista.length > 0 && (
        <div className="tabela-cartao">
          <div className="linha-criancas cab"><span>Nome</span><span>Idade</span><span>Última sessão</span><span>Próxima consulta</span><span>Histórico liberado</span><span /></div>
          {visiveis.length === 0 && <p className="vazio">Ninguém com esse nome.</p>}
          {visiveis.map((c) => (
            <div key={c.id} className="linha-criancas">
              <Link to={`/clinica/criancas/${c.id}`} className="nome-crianca">
                <span className="avatar-mini">{c.nome[0]}</span><strong>{c.nome}</strong>
              </Link>
              <span>{idade(c.data_nascimento)}</span>
              <span>{c.ultima_sessao ? diaRelativo(c.ultima_sessao) : '—'}</span>
              <span>{c.proxima_consulta ? diaRelativo(c.proxima_consulta) : 'Sem consulta marcada'}</span>
              <span><i className={c.ver_historico_anterior ? 'pill ok' : 'pill mu'}>{c.ver_historico_anterior ? 'Sim' : 'Não'}</i></span>
              <Link className="link-pequeno link-registrar" to={`/clinica/criancas/${c.id}/registro`}>+ Registrar sessão</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
