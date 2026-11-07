import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { hora, classeCor, diaMini, somarDias, hojeISO } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

const DIAS_PARA_EXCLUIR = 90; // mesmo prazo do servidor (RN-33)

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
// "Dra. Ana Souza" → "Ana"; "Carlos Pereira" → "Carlos"
const primeiroNome = (nome) => nome.replace(/^(Dra?\.|Dr\.)\s+/i, '').split(' ')[0];
const dataDeHoje = () => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const diasDesde = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

// Selo curto da situação da consulta (desenho D2: "Realizada", "Confirmada"…)
function seloDaConsulta(c) {
  if (c.status === 'REALIZADA') return ['Realizada', 'pill ok'];
  if (c.status === 'FALTA') return ['Faltou', 'pill falta'];
  if (c.status === 'CANCELADA') return ['Cancelada', 'pill mu'];
  if (c.status === 'REMARCADA') return ['Remarcada', 'pill mu'];
  if (c.aguardando_aprovacao) return ['Aguardando a família', 'pill wa'];
  if (c.cor === 'VERDE') return ['Confirmada', 'pill neutro'];
  if (c.cor === 'VERMELHA') return ['Falta 1 dia: ligar', 'pill perigo'];
  return ['Sem confirmação', 'pill wa'];
}

function Kpi({ numero, texto, aviso }) {
  return (
    <div className={`kpi ${aviso ? 'aviso' : ''}`}>
      <span className="grande">{numero}</span>
      <p>{texto}</p>
    </div>
  );
}

// Desenhos: D2 (profissional), D7 (administração) e D14 (recepção). Cada papel pede só o que pode ver.
export default function PainelClinica() {
  const { usuario } = useAuth();
  const papel = usuario.papel;
  const [p, setP] = useState(null);
  const [pre, setPre] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const pedidos = [
      api.get(papel === 'PROFISSIONAL' ? '/painel/profissional' : '/painel/clinica').then(setP),
      api.get('/clinica/pre-cadastros').then(setPre),
    ];
    if (papel !== 'PROFISSIONAL') pedidos.push(api.get('/clinica/profissionais').then(setEquipe));
    // O profissional também vê as consultas dos próximos 7 dias (só as dele)
    else pedidos.push(api.get(`/consultas?de=${somarDias(hojeISO(), 1)}&ate=${somarDias(hojeISO(), 7)}`).then(setProximas));
    Promise.all(pedidos).catch((e) => setErro(e.message));
  }, [papel]);

  const botao = {
    PROFISSIONAL: ['Registrar sessão', '/clinica/criancas'],
    ADMIN_CLINICA: ['Cadastrar profissional', '/clinica/equipe'],
    RECEPCAO: ['Pré-cadastrar criança', '/clinica/pre-cadastros'],
  }[papel];
  const titulo = papel === 'ADMIN_CLINICA' ? `Olá, ${primeiroNome(usuario.nome)}` : `${saudacao()}, ${primeiroNome(usuario.nome)}`;
  const linhaTopo = papel === 'ADMIN_CLINICA' ? `${usuario.clinica?.nome} · código ${usuario.clinica?.codigo_acesso}` : dataDeHoje();

  return (
    <div className="painel">
      <div className="painel-cab">
        <div>
          {papel === 'RECEPCAO' ? <h1>{titulo}</h1> : <p className="etiqueta-topo">{linhaTopo}</p>}
          {papel !== 'RECEPCAO' && <h1 className="grande">{titulo}</h1>}
          {papel === 'RECEPCAO' && <p className="subtitulo">{dataDeHoje()}</p>}
        </div>
        <Link className="botao" to={botao[1]}>{botao[0]}</Link>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {!p && !erro && <p className="carregando">Carregando…</p>}

      {p && papel === 'PROFISSIONAL' && <PainelProfissional p={p} pre={pre} meuId={usuario.id} proximas={proximas} />}
      {p && papel === 'ADMIN_CLINICA' && <PainelAdmin p={p} pre={pre} equipe={equipe} />}
      {p && papel === 'RECEPCAO' && <PainelRecepcao p={p} pre={pre} equipe={equipe} recarregar={() => api.get('/clinica/pre-cadastros').then(setPre)} />}
    </div>
  );
}

// ---------- D2 ----------
function PainelProfissional({ p, pre, meuId, proximas }) {
  // Só as crianças que a clínica indicou para ESTE profissional e cuja família ainda não ativou a conta
  const aguardandoAtivacao = pre.filter((c) => c.status === 'AGUARDANDO_ATIVACAO' && c.indicados.includes(meuId));
  return (
    <>
      <div className="kpis tres">
        <Kpi numero={p.consultas_hoje.length} texto={p.consultas_hoje.length === 1 ? 'consulta hoje' : 'consultas hoje'} />
        <Kpi numero={p.criancas_aprovadas} texto="crianças com acesso aprovado" />
        <Kpi numero={p.pedidos_pendentes.length + aguardandoAtivacao.length} texto="aguardando aprovação dos pais" aviso />
      </div>
      <div className="painel-duas" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <section className="secao">
          <h2>Agenda de hoje</h2>
          {p.consultas_hoje.length === 0 && <p className="vazio">Nenhuma consulta hoje.</p>}
          {p.consultas_hoje.map((c) => {
            const [texto, classe] = seloDaConsulta(c);
            return (
              <Link key={c.id} to={`/clinica/agenda/${c.id}`} className="linha-painel">
                <span className="hora">{hora(c.inicio)}</span>
                <span className="nome"><strong>{c.crianca_nome}</strong><small>{c.tipo || 'Consulta'} · {c.duracao_min} min</small></span>
                <span className={classe}>{texto}</span>
              </Link>
            );
          })}
        </section>
        <section className="secao">
          <h2>Pedidos aos pais</h2>
          {p.pedidos_pendentes.length + aguardandoAtivacao.length === 0 && <p className="vazio">Nenhum pedido esperando resposta.</p>}
          {p.pedidos_pendentes.map((x) => (
            <div key={`v${x.id}`} className="linha-painel">
              <span className="nome"><strong>{x.crianca_nome || 'Criança (nome só após a aprovação)'}</strong><small>Enviado há {diasDesde(x.solicitado_em)} dias</small></span>
              <span className="pill wa">Pendente</span>
            </div>
          ))}
          {aguardandoAtivacao.map((c) => (
            <div key={c.id} className="linha-painel">
              <span className="nome"><strong>{c.nome}</strong><small>Conta ainda não ativada</small></span>
              <span className="pill wa">Pendente</span>
            </div>
          ))}
          <p className="nota-fina">Enquanto não houver aprovação, só aparecem os dados cadastrais.</p>
        </section>
      </div>

      <section className="secao">
        <div className="secao-topo"><h2>Próximas consultas</h2><Link to="/clinica/agenda">Ver a agenda</Link></div>
        {proximas.filter((c) => c.status === 'AGENDADA').length === 0 && <p className="vazio">Nenhuma consulta marcada para os próximos 7 dias.</p>}
        {proximas.filter((c) => c.status === 'AGENDADA').slice(0, 6).map((c) => {
          const [texto, classe] = seloDaConsulta(c);
          return (
            <Link key={c.id} to={`/clinica/agenda/${c.id}`} className="linha-painel">
              <span className="hora" style={{ width: 90 }}>{diaMini(c.inicio)}</span>
              <span className="hora">{hora(c.inicio)}</span>
              <span className="nome"><strong>{c.crianca_nome}</strong><small>{c.tipo || 'Consulta'} · {c.duracao_min} min</small></span>
              <span className={classe}>{texto}</span>
            </Link>
          );
        })}
      </section>
    </>
  );
}

// ---------- D7 ----------
function PainelAdmin({ p, pre, equipe }) {
  const criancas = pre.filter((c) => c.status === 'ATIVA' || c.status === 'AGUARDANDO_APROVACAO').length;
  const situacao = (x) => (!x.ativo ? ['Desativado', 'pill mu'] : x.senha_temporaria ? ['Senha temporária', 'pill wa'] : ['Ativo', 'pill ok']);
  return (
    <>
      <div className="kpis quatro">
        <Kpi numero={p.profissionais_ativos} texto="profissionais ativos" />
        <Kpi numero={criancas} texto="crianças da clínica" />
        <Kpi numero={p.consultas_semana} texto="consultas nos próximos 7 dias" />
        <Kpi numero={p.pre_cadastros_sem_ativacao} texto="pré-cadastros sem ativação" aviso />
      </div>
      <div className="painel-duas" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        <section className="secao">
          <div className="secao-topo"><h2>Equipe</h2><Link to="/clinica/equipe">Ver tudo</Link></div>
          <div className="linha-equipe cab"><span>Nome</span><span>Especialidade</span><span>Crianças</span><span>Situação</span></div>
          {equipe.slice(0, 6).map((x) => {
            const [texto, classe] = situacao(x);
            return (
              <div key={x.id} className={`linha-equipe ${x.ativo ? '' : 'apagada'}`}>
                <strong>{x.nome}</strong><span>{nomeEspecialidade(x)}</span><span>{x.criancas}</span><span><i className={classe}>{texto}</i></span>
              </div>
            );
          })}
        </section>
        <div className="coluna-notas">
          <div className="nota-verde">
            <strong>Ao desativar um profissional</strong>
            <p>Os acessos dele às crianças terminam na hora, as consultas futuras são canceladas e as famílias são avisadas.</p>
          </div>
          <div className="nota-verde">
            <strong>O que a administração não vê</strong>
            <p>Registros, atividades e relatórios das crianças. Aqui aparecem só equipe, agenda e cadastros.</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- D14 ----------
function PainelRecepcao({ p, pre, equipe, recarregar }) {
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [profId, setProfId] = useState('');
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [novoCodigo, setNovoCodigo] = useState(null);

  useEffect(() => { if (equipe[0] && !profId) setProfId(String(equipe[0].id)); }, [equipe, profId]);

  const urgentes = p.sem_resposta.filter((c) => c.dias_restantes <= 1);
  const semAtivar = pre.filter((c) => c.status === 'AGUARDANDO_ATIVACAO');
  const inativos = pre.filter((c) => c.status === 'INATIVO');
  const menorPrazo = inativos.length ? Math.min(...inativos.map((c) => DIAS_PARA_EXCLUIR - c.dias_sem_ativacao)) : 0;

  async function darEntrada(e) {
    e.preventDefault();
    setMsg({ tipo: '', texto: '' });
    try {
      await api.post('/vinculos/solicitar', { codigo, profissional_id: Number(profId) });
      setMsg({ tipo: 'info', texto: 'Pedido enviado à família. Você já pode agendar: a consulta fica “Aguardando aprovação da família”.' });
      setCodigo('');
      navegar('/clinica/agenda/nova');
    } catch (e2) {
      setMsg({ tipo: 'erro', texto: e2.message });
    }
  }
  async function reemitir(c) {
    try {
      const r = await api.post(`/clinica/pre-cadastros/${c.id}/reemitir-codigo`, {});
      setNovoCodigo({ nome: c.nome, codigo: r.codigo });
      recarregar();
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e.message });
    }
  }

  return (
    <>
      {urgentes.length > 0 && (
        <div className="alerta-vermelho" role="alert">
          <span>
            {urgentes.length === 1 ? '1 consulta é' : `${urgentes.length} consultas são`} amanhã ou hoje e ainda não {urgentes.length === 1 ? 'foi confirmada' : 'foram confirmadas'}: ligue para os responsáveis
            ({urgentes.map((c) => `${c.crianca_nome}, ${diaMini(c.inicio)}`).join('; ')})
          </span>
        </div>
      )}

      <form className="secao entrada-codigo" onSubmit={darEntrada}>
        <div className="texto">
          <h2>Código da família</h2>
          <p>A família traz o código gerado no app. Você dá entrada e já agenda.</p>
        </div>
        <label className="campo">Código<input value={codigo} onChange={(e) => setCodigo(e.target.value)} required autoComplete="off" /></label>
        <label className="campo">Profissional
          <select value={profId} onChange={(e) => setProfId(e.target.value)} required>
            {equipe.map((x) => <option key={x.id} value={x.id}>{x.nome} · {nomeEspecialidade(x)}</option>)}
          </select>
        </label>
        <button className="botao">Dar entrada e agendar</button>
      </form>
      {msg.texto && <p className={msg.tipo === 'erro' ? 'aviso-erro' : 'aviso-info'} role={msg.tipo === 'erro' ? 'alert' : 'status'}>{msg.texto}</p>}
      {novoCodigo && (
        <div className="aviso-info" role="status">
          Novo código para {novoCodigo.nome}: <strong>{novoCodigo.codigo}</strong> (vale 7 dias).
          <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(novoCodigo.codigo)}>Copiar</button>
        </div>
      )}

      <div className="kpis tres">
        <Kpi numero={semAtivar.length} texto="aguardando ativação" />
        <Kpi numero={inativos.length} texto={inativos.length ? `inativo${inativos.length > 1 ? 's' : ''}, será excluído em ${menorPrazo} dias` : 'inativos'} aviso />
        <Kpi numero={p.consultas_hoje.length} texto={p.consultas_hoje.length === 1 ? 'consulta hoje' : 'consultas hoje'} />
      </div>

      <div className="painel-duas" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
        <section className="secao">
          <h2>Cadastros sem ativação</h2>
          {semAtivar.length + inativos.length === 0 && <p className="vazio">Todos os cadastros foram ativados.</p>}
          {[...semAtivar, ...inativos].map((c) => (
            <div key={c.id} className="linha-painel">
              <span className="nome">
                <strong>{c.nome}</strong>
                <small className={c.status === 'INATIVO' ? 'perigo-texto' : ''}>
                  {c.status === 'INATIVO'
                    ? `Sem ativação há ${c.dias_sem_ativacao} dias · exclusão em ${Math.max(0, DIAS_PARA_EXCLUIR - c.dias_sem_ativacao)} dias`
                    : c.codigo_valido_ate ? `Código vence em ${Math.max(0, Math.ceil((new Date(c.codigo_valido_ate) - Date.now()) / 86400000))} dias` : 'Código vencido'}
                </small>
              </span>
              <span className={c.status === 'INATIVO' ? 'pill mu' : 'pill wa'}>{c.status === 'INATIVO' ? 'Inativo' : 'Pendente'}</span>
              <button className="botao-sec pequeno" onClick={() => reemitir(c)}>{c.status === 'INATIVO' ? 'Reativar' : 'Reemitir código'}</button>
            </div>
          ))}
        </section>
        <section className="secao">
          <h2>Consultas de hoje</h2>
          {p.consultas_hoje.length === 0 && <p className="vazio">Nenhuma consulta hoje.</p>}
          {p.consultas_hoje.map((c) => {
            const [texto, classe] = seloDaConsulta(c);
            return (
              <Link key={c.id} to={`/clinica/agenda/${c.id}`} className="linha-painel">
                <span className="hora">{hora(c.inicio)}</span>
                <span className="nome"><strong>{c.crianca_nome}</strong><small>{c.profissional_nome}</small></span>
                <span className={classe}>{texto}</span>
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}
