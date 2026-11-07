import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { hora } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';
import { corDoFilho } from '../../utils/coresFilhos.js';

const SITUACAO = { REALIZADA: ['Realizada', 'pill ok'], CANCELADA: ['Cancelada', 'pill mu'], FALTA: ['Faltou', 'pill falta'], REMARCADA: ['Remarcada', 'pill mu'] };

const semanaCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
export const diaDoMes = (iso) => new Date(iso).getDate();
export const diaPorExtenso = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase());

function agoraISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
// Dias de calendário até a consulta (0 = hoje)
const diasAte = (iso) => {
  const a = new Date(iso);
  const h = new Date();
  return Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(h.getFullYear(), h.getMonth(), h.getDate())) / 86400000);
};
// "terça, 10 de novembro" — o último dia para confirmar (1 dia antes)
export const diaLimite = (iso) => {
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Desenho: docs/telas/M9 (e M9b). A família confirma até 1 dia antes; depois, só falando com a clínica.
export default function AgendaFamilia() {
  const [lista, setLista] = useState(null);
  const [filhos, setFilhos] = useState([]);
  const [aba, setAba] = useState('PROXIMAS');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  function carregar() {
    Promise.all([api.get('/consultas'), api.get('/criancas')])
      .then(([c, f]) => { setLista(c); setFilhos(f); })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function confirmar(c) {
    setErro('');
    setAviso('');
    try {
      await api.post(`/consultas/${c.id}/confirmar`, {});
      setAviso(`Presença confirmada: ${c.crianca_nome}, ${diaPorExtenso(new Date(c.inicio))}. Obrigado!`);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const agora = agoraISO();
  const hoje = agora.slice(0, 10);
  const proximas = (lista || []).filter((c) => c.status === 'AGENDADA' && c.inicio >= hoje);
  const anteriores = (lista || []).filter((c) => !(c.status === 'AGENDADA' && c.inicio >= hoje)).reverse();
  const mostrar = aba === 'PROXIMAS' ? proximas : anteriores;
  const deHoje = proximas.filter((c) => c.inicio.slice(0, 10) === hoje).length;
  const indiceFilho = (nome) => filhos.findIndex((f) => f.nome === nome);
  // A próxima consulta que ainda dá para confirmar no app
  const paraConfirmar = proximas.find((c) => !c.presenca_confirmada && !c.aguardando_aprovacao && agora <= c.prazo_confirmacao);

  function selo(c) {
    if (c.status !== 'AGENDADA') return SITUACAO[c.status];
    if (c.aguardando_aprovacao) return ['Aguardando a clínica', 'pill wa'];
    if (c.presenca_confirmada) return ['Confirmada', 'pill ok'];
    if (agora > c.prazo_confirmacao) return ['Falar com a clínica', 'pill perigo'];
    const dias = diasAte(c.inicio);
    return dias <= 3 ? ['Confirmar', 'pill wa'] : [`Em ${dias} dias`, 'pill neutro'];
  }

  return (
    <div className="agenda-familia">
      <h1>Agenda</h1>
      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'PROXIMAS'} className={aba === 'PROXIMAS' ? 'aba ativa' : 'aba'} onClick={() => setAba('PROXIMAS')}>Próximas</button>
        <button role="tab" aria-selected={aba === 'ANTERIORES'} className={aba === 'ANTERIORES' ? 'aba ativa' : 'aba'} onClick={() => setAba('ANTERIORES')}>Anteriores</button>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      {aba === 'PROXIMAS' && lista && (
        <div className="faixa-hoje"><b>HOJE</b>{diaPorExtenso(new Date())} · {deHoje === 0 ? 'sem consultas' : deHoje === 1 ? '1 consulta' : `${deHoje} consultas`}</div>
      )}

      {lista && mostrar.length === 0 && (
        <div className="vazio-grande">
          <h2>{aba === 'PROXIMAS' ? 'Nenhuma consulta marcada' : 'Nada por aqui ainda'}</h2>
          <p>{aba === 'PROXIMAS' ? 'Quando a clínica marcar uma consulta, ela aparece aqui e você recebe um aviso no app.' : 'As consultas que já passaram aparecem aqui, com a situação de cada uma.'}</p>
        </div>
      )}

      {mostrar.length > 0 && (
        <div className="lista-cartao">
          {mostrar.map((c) => {
            const k = corDoFilho(indiceFilho(c.crianca_nome));
            const [texto, classe] = selo(c);
            return (
              <Link key={c.id} to={`/familia/agenda/${c.id}`} className="linha-cartao">
                <div className="bloco-dia" style={{ background: k.bloco }}>
                  <span style={{ color: k.dia }}>{semanaCurta(c.inicio)}</span>
                  <b style={{ color: k.numero }}>{diaDoMes(c.inicio)}</b>
                </div>
                <div className="texto-linha">
                  <strong>{hora(c.inicio)} · {c.crianca_nome}</strong>
                  <small>{[c.tipo || nomeEspecialidade(c), c.profissional_nome].filter(Boolean).join(' · ')}</small>
                </div>
                <span className={classe}>{texto}</span>
              </Link>
            );
          })}
        </div>
      )}

      {aba === 'PROXIMAS' && paraConfirmar && (
        <>
          <p className="nota nota-prazo">Confirme até {diaLimite(paraConfirmar.inicio)} (1 dia antes).</p>
          <button className="botao botao-grande" onClick={() => confirmar(paraConfirmar)}>
            Confirmar presença do dia {diaDoMes(paraConfirmar.inicio)}{filhos.length > 1 && ` (${paraConfirmar.crianca_nome})`}
          </button>
        </>
      )}
    </div>
  );
}
