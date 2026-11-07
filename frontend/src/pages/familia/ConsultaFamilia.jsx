import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { hora } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';
import { corDoFilho } from '../../utils/coresFilhos.js';
import { diaDoMes, diaLimite, diaPorExtenso } from './AgendaFamilia.jsx';

const SITUACAO = { REALIZADA: ['Realizada', 'pill ok'], CANCELADA: ['Cancelada', 'pill mu'], FALTA: ['Faltou', 'pill falta'], REMARCADA: ['Remarcada', 'pill mu'] };

// Desenho: docs/telas/M19. Confirmar a presença ou avisar que não vai (a clínica é avisada e entra em contato).
export default function ConsultaFamilia() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [filhos, setFilhos] = useState([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  function carregar() {
    Promise.all([api.get(`/consultas/${id}`), api.get('/criancas')])
      .then(([consulta, f]) => { setC(consulta); setFilhos(f); })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, [id]);

  async function agir(rota, mensagem) {
    setErro('');
    setAviso('');
    try {
      await api.post(`/consultas/${id}/${rota}`, {});
      setAviso(mensagem);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!c) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  const k = corDoFilho(filhos.findIndex((f) => f.nome === c.crianca_nome));
  const prazoAcabou = new Date() > new Date(c.prazo_confirmacao);
  const agendada = c.status === 'AGENDADA';
  let situacao;
  if (!agendada) situacao = SITUACAO[c.status];
  else if (c.aguardando_aprovacao) situacao = ['Aguardando aprovação do acesso', 'pill wa'];
  else if (c.presenca_confirmada) situacao = ['Presença confirmada', 'pill ok'];
  else if (prazoAcabou) situacao = ['Prazo encerrado', 'pill perigo'];
  else situacao = ['Aguardando sua confirmação', 'pill wa'];
  const podeConfirmar = agendada && !c.presenca_confirmada && !c.aguardando_aprovacao && !prazoAcabou;

  return (
    <div>
      <Link to="/familia/agenda" className="voltar">Voltar</Link>
      <h1>Consulta {c.crianca_nome.endsWith('a') ? 'da' : 'do'} {c.crianca_nome}</h1>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      <div className="lista-cartao">
        <div className="linha-cartao" style={{ alignItems: 'flex-start' }}>
          <div className="bloco-dia" style={{ background: k.bloco, width: 56, height: 56 }}>
            <span style={{ color: k.dia }}>{new Date(c.inicio).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}</span>
            <b style={{ color: k.numero }}>{diaDoMes(c.inicio)}</b>
          </div>
          <div className="texto-linha">
            <strong>{hora(c.inicio)} · {c.crianca_nome}</strong>
            <small>{diaPorExtenso(new Date(c.inicio))}</small>
            <small>{c.tipo || nomeEspecialidade(c)}</small>
            <small>{c.profissional_nome} · {c.clinica_nome}</small>
          </div>
        </div>
        <div className="linha-cartao"><span className="nome-menu">Situação</span><span className={situacao[1]}>{situacao[0]}</span></div>
      </div>

      {podeConfirmar && (
        <>
          <p className="nota nota-prazo">Você pode confirmar até {diaLimite(c.inicio)} (1 dia antes).</p>
          <button className="botao botao-grande" onClick={() => agir('confirmar', 'Presença confirmada. Obrigado!')}>Confirmar presença</button>
          <button className="botao-sec botao-grande bloco" onClick={() => agir('nao-poderei', 'A clínica foi avisada e vai entrar em contato para remarcar.')}>Não poderei ir</button>
          <p className="nota nota-prazo">Se você tocar em “Não poderei ir”, a clínica é avisada e entra em contato para remarcar.</p>
        </>
      )}
      {agendada && !c.presenca_confirmada && prazoAcabou && (
        <p className="nota nota-prazo">O prazo para confirmar no app acabou. Fale com a clínica.</p>
      )}
      {agendada && c.presenca_confirmada === 1 && (
        <button className="botao-sec botao-grande bloco" onClick={() => agir('nao-poderei', 'A clínica foi avisada e vai entrar em contato para remarcar.')}>Não poderei ir</button>
      )}
    </div>
  );
}
