import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { classeCor, frase, hora } from '../../utils/consultas.js';

// Desenho: docs/telas/D2 (profissional), D7 (administrador) e D14 (recepção).
// Cada papel pede o painel dele; o servidor só devolve o que aquele papel pode ver.
export default function PainelClinica() {
  const { usuario } = useAuth();
  const ehProf = usuario.papel === 'PROFISSIONAL';
  const ehAdmin = usuario.papel === 'ADMIN_CLINICA';
  const [p, setP] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get(ehProf ? '/painel/profissional' : '/painel/clinica').then(setP).catch((e) => setErro(e.message));
  }, [ehProf]);

  const primeiroNome = usuario.nome.split(' ')[0];
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <p className="etiqueta">{hoje}</p>
      <h1>Olá, {primeiroNome}</h1>
      <p className="subtitulo">{usuario.clinica?.nome}</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="acoes-topo">
        {ehProf && <Link className="botao" to="/clinica/criancas">Registrar sessão</Link>}
        {!ehProf && <Link className="botao" to="/clinica/pre-cadastros">Novo pré-cadastro</Link>}
        {ehAdmin && <Link className="botao-sec" to="/clinica/equipe">Cadastrar profissional</Link>}
        {!ehAdmin && <Link className="botao-sec" to="/clinica/agenda/nova">Nova consulta</Link>}
      </div>

      {p && (
        <div className="numeros">
          <div className="numero"><strong>{p.consultas_hoje.length}</strong>{p.consultas_hoje.length === 1 ? 'consulta hoje' : 'consultas hoje'}</div>
          {ehProf && (
            <>
              <div className="numero"><strong>{p.criancas_aprovadas}</strong>crianças com acesso aprovado</div>
              <div className="numero"><strong>{p.pedidos_pendentes.length}</strong>aguardando aprovação dos pais</div>
            </>
          )}
          {!ehProf && (
            <>
              <div className="numero"><strong>{p.consultas_semana}</strong>consultas nos próximos 7 dias</div>
              <div className="numero"><strong>{p.pre_cadastros_sem_ativacao}</strong>pré-cadastros sem ativação</div>
              {ehAdmin && <div className="numero"><strong>{p.profissionais_ativos}</strong>profissionais ativos</div>}
            </>
          )}
        </div>
      )}

      {p && (
        <>
          <h2 className="titulo-lista">Agenda de hoje</h2>
          {p.consultas_hoje.length === 0 && <p className="vazio">Nenhuma consulta hoje.</p>}
          {p.consultas_hoje.map((c) => (
            <Link key={c.id} to={`/clinica/agenda/${c.id}`} className={`linha-consulta ${classeCor(c)}`}>
              <strong>{hora(c.inicio)}</strong>
              <span>{c.crianca_nome}{!ehProf && <small> · {c.profissional_nome}</small>}</span>
              <em>{frase(c)}</em>
            </Link>
          ))}
        </>
      )}

      {p && ehProf && p.pedidos_pendentes.length > 0 && (
        <>
          <h2 className="titulo-lista">Pedidos aos pais</h2>
          {p.pedidos_pendentes.map((x) => (
            <div key={x.id} className="linha-lista">
              <strong>{x.crianca_nome || 'Criança (nome só após a aprovação)'}</strong>
              <span className="chip cor-amarela">Pendente</span>
            </div>
          ))}
          <p className="nota">Enquanto não houver aprovação, só aparecem os dados cadastrais.</p>
        </>
      )}

      {p && !ehProf && (
        <>
          <h2 className="titulo-lista">Sem resposta: ligar para a família</h2>
          {p.sem_resposta.length === 0 && <p className="vazio">Todas as famílias próximas já responderam.</p>}
          {p.sem_resposta.map((c) => (
            <Link key={c.id} to={`/clinica/agenda/${c.id}`} className={`linha-consulta ${c.dias_restantes <= 1 ? 'cor-vermelha' : 'cor-amarela'}`}>
              <strong>{hora(c.inicio)}</strong>
              <span>{c.crianca_nome}<small> · {c.profissional_nome}</small></span>
              <em>{c.dias_restantes <= 0 ? 'Hoje' : `Em ${c.dias_restantes} ${c.dias_restantes === 1 ? 'dia' : 'dias'}`}</em>
            </Link>
          ))}
        </>
      )}

      {ehAdmin && (
        <div className="caixa">
          <h2>O que a administração não vê</h2>
          <p>Registros, atividades e relatórios das crianças. Aqui aparecem só equipe, agenda e cadastros.</p>
        </div>
      )}
    </>
  );
}
