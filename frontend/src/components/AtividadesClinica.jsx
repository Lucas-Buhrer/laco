import { useEffect, useState } from 'react';
import { api } from '../api/api.js';

const FREQUENCIAS = ['1 vez ao dia', '2 vezes ao dia', '3 vezes ao dia', '3 vezes por semana', '1 vez por semana'];
const COMO_FOI = { 1: 'Foi bem', 2: 'Mais ou menos', 3: 'Foi difícil' };
const VAZIO = { titulo: '', instrucoes: '', frequencia: FREQUENCIAS[0], prazo: '' };

// Desenho: docs/telas/D10. O profissional acompanha só as atividades que criou.
export default function AtividadesClinica({ criancaId }) {
  const [lista, setLista] = useState(null);
  const [f, setF] = useState(VAZIO);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [detalhe, setDetalhe] = useState(null); // { id, execucoes }

  function carregar() {
    api.get(`/criancas/${criancaId}/atividades`).then(setLista).catch((e) => setErro(e.message));
  }
  useEffect(carregar, [criancaId]);

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setAviso('');
    try {
      await api.post(`/criancas/${criancaId}/atividades`, f);
      setF(VAZIO);
      setAviso('Atividade criada. A família foi avisada.');
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  async function encerrar(a) {
    setErro('');
    try {
      await api.put(`/atividades/${a.id}`, { status: 'ENCERRADA' });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function verExecucoes(a) {
    if (detalhe?.id === a.id) return setDetalhe(null);
    try {
      setDetalhe({ id: a.id, execucoes: await api.get(`/atividades/${a.id}/execucoes`) });
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <h2 className="titulo-lista">Atividades de casa</h2>
      <p className="nota">Você acompanha só as atividades que criou.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}
      {lista && lista.length === 0 && <p className="vazio">Nenhuma atividade criada ainda.</p>}
      {lista && lista.map((a) => (
        <div key={a.id} className="linha-lista coluna">
          <div>
            <strong>{a.titulo}</strong> {a.status === 'ENCERRADA' && <span className="chip cor-realizada">Encerrada</span>}
            <p className="detalhe">{a.frequencia}{a.prazo && ` · até ${a.prazo.split('-').reverse().join('/')}`}</p>
            <p className="detalhe">Adesão nas últimas 4 semanas: <strong>{a.adesao_4_semanas}%</strong></p>
          </div>
          <div className="acoes-linha">
            <button className="botao-sec" onClick={() => verExecucoes(a)}>Ver como foi</button>
            {a.status === 'ATIVA' && <button className="botao-sec" onClick={() => encerrar(a)}>Encerrar</button>}
          </div>
          {detalhe?.id === a.id && (
            <ul className="lista-execucoes">
              {detalhe.execucoes.length === 0 && <li>Ainda sem execuções.</li>}
              {detalhe.execucoes.slice(0, 15).map((x) => (
                <li key={x.id}>{x.data.split('-').reverse().join('/')} · {COMO_FOI[x.como_foi]}{x.observacao && ` · “${x.observacao}”`}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <form className="caixa estreita" onSubmit={criar}>
        <h2>Nova atividade</h2>
        <label className="campo">Título<input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required /></label>
        <label className="campo">Instruções para a família
          <textarea rows={3} value={f.instrucoes} onChange={(e) => setF({ ...f, instrucoes: e.target.value })} />
        </label>
        <label className="campo">Frequência
          <select value={f.frequencia} onChange={(e) => setF({ ...f, frequencia: e.target.value })}>
            {FREQUENCIAS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="campo">Prazo (opcional)<input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} /></label>
        <button className="botao">Criar atividade</button>
      </form>
    </>
  );
}
