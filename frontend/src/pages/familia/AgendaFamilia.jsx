import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { diaLongo, hora } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

const SITUACAO = { REALIZADA: 'Realizada', CANCELADA: 'Cancelada', FALTA: 'Faltou', REMARCADA: 'Remarcada' };

function agoraISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

// Desenho: docs/telas/M9, M9b e M19. A família confirma até 1 dia antes; depois, só falando com a clínica.
export default function AgendaFamilia() {
  const [lista, setLista] = useState(null);
  const [aba, setAba] = useState('PROXIMAS');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  function carregar() {
    api.get('/consultas').then(setLista).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function agir(c, rota, mensagem) {
    setErro('');
    setAviso('');
    try {
      await api.post(`/consultas/${c.id}/${rota}`, {});
      setAviso(mensagem);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const agora = agoraISO();
  const proximas = (lista || []).filter((c) => c.status === 'AGENDADA' && c.inicio >= agora.slice(0, 10));
  const anteriores = (lista || []).filter((c) => !(c.status === 'AGENDADA' && c.inicio >= agora.slice(0, 10))).reverse();
  const mostrar = aba === 'PROXIMAS' ? proximas : anteriores;

  return (
    <>
      <h1>Agenda</h1>
      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'PROXIMAS'} className={aba === 'PROXIMAS' ? 'aba ativa' : 'aba'} onClick={() => setAba('PROXIMAS')}>Próximas</button>
        <button role="tab" aria-selected={aba === 'ANTERIORES'} className={aba === 'ANTERIORES' ? 'aba ativa' : 'aba'} onClick={() => setAba('ANTERIORES')}>Anteriores</button>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}
      {lista && mostrar.length === 0 && (
        <div className="vazio-grande">
          <h2>{aba === 'PROXIMAS' ? 'Nenhuma consulta marcada' : 'Nada por aqui ainda'}</h2>
          <p>{aba === 'PROXIMAS' ? 'Quando a clínica marcar uma consulta, ela aparece aqui e você recebe um aviso no app.' : 'As consultas que já passaram aparecem aqui, com a situação de cada uma.'}</p>
        </div>
      )}

      {mostrar.map((c) => {
        const prazoAcabou = agora > c.prazo_confirmacao;
        return (
          <div key={c.id} className="cartao">
            <p className="etiqueta">{diaLongo(c.inicio)} · {hora(c.inicio)}</p>
            <strong>{c.crianca_nome}</strong>
            <p className="detalhe">{c.tipo || nomeEspecialidade(c)} · {c.profissional_nome} · {c.clinica_nome}</p>
            {c.status !== 'AGENDADA' && <p className="detalhe">{SITUACAO[c.status]}</p>}
            {c.aguardando_aprovacao && <p className="detalhe">Aguardando a sua aprovação do profissional.</p>}
            {c.status === 'AGENDADA' && c.presenca_confirmada === 1 && <p className="detalhe">Presença confirmada.</p>}
            {c.status === 'AGENDADA' && !c.presenca_confirmada && !prazoAcabou && (
              <>
                <button className="botao" onClick={() => agir(c, 'confirmar', 'Presença confirmada. Obrigado!')}>Confirmar presença</button>
                <button className="botao-sec" onClick={() => agir(c, 'nao-poderei', 'A clínica foi avisada e vai entrar em contato.')}>Não poderei ir</button>
              </>
            )}
            {c.status === 'AGENDADA' && !c.presenca_confirmada && prazoAcabou && (
              <p className="nota">O prazo para confirmar no app acabou. Fale com a clínica.</p>
            )}
          </div>
        );
      })}
    </>
  );
}
