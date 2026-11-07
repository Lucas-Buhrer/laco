import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { nomeEspecialidade } from '../../utils/especialidades.js';
import { hojeISO } from '../../utils/consultas.js';

// Desenho: docs/telas/D6 (profissional) e D6R (recepção).
// O aviso de conflito só aparece aqui, depois de escolher o horário, e nunca diz mais que "sim".
export default function NovaConsulta() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const ehRecepcao = usuario.papel === 'RECEPCAO';
  const [opcoes, setOpcoes] = useState(null);
  const [escolha, setEscolha] = useState(''); // índice da opção (criança + profissional)
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [duracao, setDuracao] = useState(50);
  const [tipo, setTipo] = useState('');
  const [erro, setErro] = useState('');
  const [conflito, setConflito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get('/consultas/opcoes').then((o) => { setOpcoes(o); if (o.length) setEscolha('0'); }).catch((e) => setErro(e.message));
  }, []);

  async function agendar(confirmarConflito) {
    setErro('');
    setEnviando(true);
    const op = opcoes[Number(escolha)];
    try {
      const r = await api.post('/consultas', {
        crianca_id: op.crianca_id,
        profissional_id: op.profissional_id,
        inicio: `${data}T${horario}`,
        duracao_min: Number(duracao),
        tipo,
        confirmar_conflito: confirmarConflito,
      });
      navegar(`/clinica/agenda/${r.id}`);
    } catch (e) {
      // 409 sem mensagem própria = aviso de conflito (a resposta é só { conflito: true })
      if (e.status === 409 && e.conflito) setConflito(true);
      else setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function enviar(e) {
    e.preventDefault();
    setConflito(false);
    agendar(false);
  }

  if (!opcoes && !erro) return <p className="carregando">Carregando…</p>;
  const op = opcoes && opcoes[Number(escolha)];

  return (
    <>
      <Link to="/clinica/agenda" className="voltar">‹ Voltar para a agenda</Link>
      <h1>Nova consulta</h1>
      {ehRecepcao && <p className="subtitulo">Agendando pela recepção: só crianças com acesso aprovado ou pedido em andamento com o profissional escolhido.</p>}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {opcoes && opcoes.length === 0 && <p className="vazio">Nenhuma criança disponível para agendar ainda.</p>}

      {opcoes && opcoes.length > 0 && (
        <form className="caixa estreita" onSubmit={enviar}>
          <label className="campo">Criança e profissional
            <select value={escolha} onChange={(e) => { setEscolha(e.target.value); setConflito(false); }}>
              {opcoes.map((o, i) => (
                <option key={o.vinculo_id} value={i}>
                  {o.crianca_nome} · {o.profissional_nome} ({nomeEspecialidade(o)}){o.status === 'PENDENTE' ? ' · aguardando a família' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">Data
            <input type="date" min={hojeISO()} value={data} onChange={(e) => { setData(e.target.value); setConflito(false); }} required />
          </label>
          <label className="campo">Horário
            <input type="time" value={horario} onChange={(e) => { setHorario(e.target.value); setConflito(false); }} required />
          </label>
          <label className="campo">Duração (minutos)
            <input type="number" min={10} max={240} step={5} value={duracao} onChange={(e) => setDuracao(e.target.value)} required />
          </label>
          <label className="campo">Tipo de atendimento
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder={op ? nomeEspecialidade(op) : ''} />
          </label>
          {op && op.status === 'PENDENTE' && (
            <p className="nota">A consulta fica “Aguardando aprovação da família”. O aviso de conflito só aparece depois da aprovação.</p>
          )}
          <div className="acoes-topo">
            <button className="botao" disabled={enviando}>Agendar</button>
            <Link className="botao-sec" to="/clinica/agenda">Cancelar</Link>
          </div>
        </form>
      )}

      {conflito && (
        <div className="caixa aviso-conflito" role="alertdialog">
          <h2>Este horário pode não servir</h2>
          <p>Essa criança já tem outro compromisso nesse intervalo, em outra clínica. Não mostramos mais do que isso.</p>
          <div className="acoes-topo">
            <button className="botao" disabled={enviando} onClick={() => agendar(true)}>Agendar mesmo assim</button>
            <button className="botao-sec" onClick={() => setConflito(false)}>Escolher outro horário</button>
          </div>
          <p className="nota">O aviso só aparece porque a família permitiu e só quando a data é escolhida aqui. A agenda da clínica mostra apenas as consultas desta clínica.</p>
        </div>
      )}
    </>
  );
}
