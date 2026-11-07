import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';

const OPCOES = [[1, 'Foi bem'], [2, 'Mais ou menos'], [3, 'Foi difícil']];

// Desenho: docs/telas/M10. Celular primeiro: botões grandes.
export default function AtividadesFamilia() {
  const [lista, setLista] = useState(null); // atividades de todos os filhos, com o nome do filho
  const [aba, setAba] = useState('HOJE');
  const [abrindo, setAbrindo] = useState(null); // { id, como_foi, observacao }
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const filhos = await api.get('/criancas');
      const grupos = await Promise.all(filhos.map(async (f) => (await api.get(`/criancas/${f.id}/atividades`)).map((a) => ({ ...a, crianca_nome: f.nome }))));
      setLista(grupos.flat());
    } catch (e) {
      setErro(e.message);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function marcar(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.post(`/atividades/${abrindo.id}/execucoes`, { como_foi: abrindo.como_foi, observacao: abrindo.observacao });
      setAbrindo(null);
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  const mostrar = (lista || []).filter((a) => aba === 'TODAS' || a.feitas_hoje < a.esperadas_hoje);

  return (
    <>
      <h1>Atividades</h1>
      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'HOJE'} className={aba === 'HOJE' ? 'aba ativa' : 'aba'} onClick={() => setAba('HOJE')}>Hoje</button>
        <button role="tab" aria-selected={aba === 'TODAS'} className={aba === 'TODAS' ? 'aba ativa' : 'aba'} onClick={() => setAba('TODAS')}>Todas</button>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {lista && mostrar.length === 0 && <p className="vazio">{aba === 'HOJE' ? 'Tudo feito por hoje. Parabéns!' : 'Nenhuma atividade por enquanto.'}</p>}

      {mostrar.map((a) => (
        <div key={a.id} className="cartao">
          <strong>{a.titulo}</strong>
          <p className="detalhe">{a.crianca_nome} · {a.feitas_hoje} de {a.esperadas_hoje} {a.esperadas_hoje === 1 ? 'feita' : 'feitas'} hoje</p>
          {a.instrucoes && <p className="detalhe">{a.instrucoes}</p>}
          {abrindo?.id === a.id ? (
            <form onSubmit={marcar}>
              <p className="etiqueta">Como foi?</p>
              <div className="abas">
                {OPCOES.map(([valor, nome]) => (
                  <button type="button" key={valor} className={abrindo.como_foi === valor ? 'aba ativa' : 'aba'} onClick={() => setAbrindo({ ...abrindo, como_foi: valor })}>{nome}</button>
                ))}
              </div>
              <label className="campo">Quer contar mais? (opcional)
                <textarea rows={2} value={abrindo.observacao} onChange={(e) => setAbrindo({ ...abrindo, observacao: e.target.value })} />
              </label>
              <button className="botao botao-grande" disabled={!abrindo.como_foi}>Marcar como feita</button>
              <button type="button" className="botao-sec" onClick={() => setAbrindo(null)}>Cancelar</button>
            </form>
          ) : (
            <button className="botao" onClick={() => setAbrindo({ id: a.id, como_foi: 0, observacao: '' })}>Marcar como feita</button>
          )}
        </div>
      ))}
    </>
  );
}
