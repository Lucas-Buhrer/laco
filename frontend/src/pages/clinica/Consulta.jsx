import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { classeCor, diaLongo, frase, hora } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

const MOTIVOS = ['Profissional indisponível', 'A pedido da família', 'Criança doente', 'Outro'];

// Desenho: docs/telas/D20, D20r (recepção), D20c (remarcar) e D20d (cancelar).
// Sem nenhum dado clínico: só quem, quando e a situação.
export default function Consulta() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [c, setC] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [modo, setModo] = useState(null); // 'REMARCAR' | 'CANCELAR'
  const [nova, setNova] = useState({ data: '', horario: '', duracao: 50 });
  const [conflito, setConflito] = useState(false);
  const [cancel, setCancel] = useState({ motivo: MOTIVOS[0], recado: '' });
  const ehProf = usuario.papel === 'PROFISSIONAL';
  const podeMexer = usuario.papel !== 'ADMIN_CLINICA' && c?.status === 'AGENDADA';

  function carregar() {
    api.get(`/consultas/${id}`).then(setC).catch((e) => setErro(e.message));
  }
  useEffect(carregar, [id]);

  async function acao(funcao, mensagem) {
    setErro('');
    setAviso('');
    try {
      await funcao();
      setAviso(mensagem);
      setModo(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const remarcar = (confirmar) =>
    acao(
      async () => {
        try {
          await api.put(`/consultas/${id}/remarcar`, { inicio: `${nova.data}T${nova.horario}`, duracao_min: Number(nova.duracao), confirmar_conflito: confirmar });
        } catch (e) {
          if (e.conflito) { setConflito(true); throw new Error('Confirme para remarcar mesmo assim.'); }
          throw e;
        }
        setConflito(false);
      },
      'Consulta remarcada. A família foi avisada.'
    );

  if (!c) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  return (
    <>
      <Link to="/clinica/agenda" className="voltar">‹ Voltar para a agenda</Link>
      <h1>Consulta de {c.crianca_nome}</h1>
      <p className="subtitulo">{diaLongo(c.inicio)} · {hora(c.inicio)} · {c.duracao_min} min</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      <div className="pagina-duas">
        <div className="caixa">
          <h2>Detalhes</h2>
          <dl className="pares">
            <div><dt>Criança</dt><dd>{c.crianca_nome}</dd></div>
            <div><dt>Profissional</dt><dd>{c.profissional_nome}<br /><small className="suave">{nomeEspecialidade(c)}</small></dd></div>
            <div><dt>Quando</dt><dd>{diaLongo(c.inicio)}, {hora(c.inicio)}</dd></div>
            <div><dt>Tipo</dt><dd>{c.tipo || '—'}</dd></div>
            <div className="inteira"><dt>Situação</dt><dd><span className={`chip ${classeCor(c)}`}>{frase(c)}</span></dd></div>
            {c.contatos.length > 0 && (
              <div className="inteira">
                <dt>Responsáveis</dt>
                {c.contatos.map((r, i) => <dd key={i}>{r.nome}{r.telefone && <span className="suave"> · {r.telefone}</span>}</dd>)}
              </div>
            )}
          </dl>
          {c.status === 'AGENDADA' && !c.presenca_confirmada && (
            <p className="nota">Os responsáveis podem confirmar no app até o fim do dia anterior. Depois disso, só falando com a clínica.</p>
          )}
        </div>

        {podeMexer && (
          <div className="caixa">
            <h2>O que você quer fazer</h2>
            <div className="botoes-coluna">
              {!c.presenca_confirmada && (
                <button className="botao-sec" onClick={() => acao(() => api.post(`/consultas/${id}/confirmar-contato`, {}), 'Confirmação por contato registrada.')}>
                  Registrar confirmação por telefone
                </button>
              )}
              <button className="botao-sec" onClick={() => { setModo('REMARCAR'); setConflito(false); }}>Remarcar</button>
              <button className="botao-sec" onClick={() => setModo('CANCELAR')}>Cancelar consulta</button>
              {ehProf && (
                <>
                  <button className="botao-sec" onClick={() => acao(() => api.post(`/consultas/${id}/realizada`, {}), 'Marcada como realizada.')}>Marcar como realizada</button>
                  <button className="botao-sec" onClick={() => acao(() => api.post(`/consultas/${id}/falta`, {}), 'Marcada como falta.')}>Marcar que faltou</button>
                </>
              )}
            </div>
            {ehProf && <p className="nota">Realizada e falta ficam disponíveis depois do horário da consulta.</p>}
            {!ehProf && <p className="nota">Marcar como realizada ou como falta é feito pelo profissional que atendeu.</p>}
          </div>
        )}
      </div>

      {modo === 'REMARCAR' && (
        <form className="caixa estreita grade-form" onSubmit={(e) => { e.preventDefault(); remarcar(false); }}>
          <h2>Remarcar consulta</h2>
          <p className="nota">Escolha a nova data e o horário. A família é avisada no app. A consulta atual fica no histórico como Remarcada.</p>
          <label className="campo">Nova data<input type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} required /></label>
          <label className="campo">Horário<input type="time" value={nova.horario} onChange={(e) => setNova({ ...nova, horario: e.target.value })} required /></label>
          <label className="campo">Duração (minutos)<input type="number" min={10} max={240} value={nova.duracao} onChange={(e) => setNova({ ...nova, duracao: e.target.value })} required /></label>
          {conflito && (
            <div className="aviso-conflito caixa">
              <p>Essa criança já tem um horário nesse intervalo em outra clínica. Você pode remarcar mesmo assim.</p>
              <button type="button" className="botao" onClick={() => remarcar(true)}>Remarcar mesmo assim</button>
            </div>
          )}
          <div className="acoes-topo">
            <button className="botao">Remarcar</button>
            <button type="button" className="botao-sec" onClick={() => setModo(null)}>Voltar</button>
          </div>
        </form>
      )}

      {modo === 'CANCELAR' && (
        <form className="caixa estreita" onSubmit={(e) => { e.preventDefault(); acao(() => api.post(`/consultas/${id}/cancelar`, cancel), 'Consulta cancelada. A família foi avisada.'); }}>
          <h2>Cancelar a consulta?</h2>
          <label className="campo">Motivo (opcional)
            <select value={cancel.motivo} onChange={(e) => setCancel({ ...cancel, motivo: e.target.value })}>
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="campo">Recado para a família (opcional)
            <input value={cancel.recado} onChange={(e) => setCancel({ ...cancel, recado: e.target.value })} maxLength={300} />
          </label>
          <p className="nota">A família é avisada no app. A consulta fica no histórico como Cancelada e não pode ser desfeita.</p>
          <div className="acoes-topo">
            <button className="botao perigo">Cancelar consulta</button>
            <button type="button" className="botao-sec" onClick={() => setModo(null)}>Voltar</button>
          </div>
        </form>
      )}
    </>
  );
}
