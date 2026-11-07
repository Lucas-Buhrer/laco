import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { nomeEspecialidade } from '../familia/Solicitacoes.jsx';

const VAZIO = { nome: '', data_nascimento: '', responsavel_nome: '', parentesco: 'MAE', parentesco_outro: '', email: '', telefone: '', profissionais: [] };
const STATUS = {
  AGUARDANDO_ATIVACAO: 'Aguardando ativação',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação dos pais',
  ATIVA: 'Ativa',
  INATIVO: 'Inativo',
};

function dataBR(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

// Desenho: docs/telas/D5 (recepção), D5A (admin), D5P (profissional). Só dados cadastrais.
export default function PreCadastros() {
  const [f, setF] = useState(VAZIO);
  const [lista, setLista] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [novo, setNovo] = useState(null); // { nome, codigo, valido_ate }
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    api.get('/clinica/pre-cadastros').then(setLista).catch((e) => setErro(e.message));
  }
  useEffect(() => {
    carregar();
    api.get('/clinica/profissionais').then(setProfissionais).catch((e) => setErro(e.message));
  }, []);

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });
  function marcar(id) {
    const tem = f.profissionais.includes(id);
    setF({ ...f, profissionais: tem ? f.profissionais.filter((x) => x !== id) : [...f.profissionais, id] });
  }

  async function gerar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api.post('/clinica/pre-cadastros', f);
      setNovo({ nome: r.nome, codigo: r.codigo, valido_ate: r.codigo_valido_ate });
      setF(VAZIO);
      carregar();
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  // Gera outro código (e reativa o pré-cadastro inativo)
  async function reemitir(c) {
    setErro('');
    try {
      const r = await api.post(`/clinica/pre-cadastros/${c.id}/reemitir-codigo`);
      setNovo({ nome: c.nome, codigo: r.codigo, valido_ate: r.codigo_valido_ate });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function cancelar(c) {
    setErro('');
    try {
      await api.post(`/clinica/pre-cadastros/${c.id}/cancelar-codigo`);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <h1>Pré-cadastro de criança</h1>
      <p className="subtitulo">Só dados cadastrais. A família ativa a conta com o código e decide quem pode ver o resto.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="duas-colunas">
        <form className="caixa" onSubmit={gerar}>
          <label className="campo">Nome da criança
            <input value={f.nome} onChange={mudar('nome')} required />
          </label>
          <label className="campo">Data de nascimento
            <input type="date" value={f.data_nascimento} onChange={mudar('data_nascimento')} required />
          </label>
          <label className="campo">Nome do responsável
            <input value={f.responsavel_nome} onChange={mudar('responsavel_nome')} required />
          </label>
          <label className="campo">Parentesco
            <select value={f.parentesco} onChange={mudar('parentesco')}>
              <option value="MAE">Mãe</option>
              <option value="PAI">Pai</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          {f.parentesco === 'OUTRO' && (
            <label className="campo">Qual é o parentesco?
              <input value={f.parentesco_outro} onChange={mudar('parentesco_outro')} required />
            </label>
          )}
          <label className="campo">E-mail do responsável
            <input type="email" value={f.email} onChange={mudar('email')} />
          </label>
          <label className="campo">Telefone do responsável
            <input value={f.telefone} onChange={mudar('telefone')} />
          </label>
          <p className="nota">Informe pelo menos um: e-mail ou telefone.</p>

          <fieldset className="profissionais">
            <legend>Profissionais indicados</legend>
            {profissionais.map((p) => (
              <label key={p.id} className="marcar">
                <input type="checkbox" checked={f.profissionais.includes(p.id)} onChange={() => marcar(p.id)} />
                {p.nome} · {nomeEspecialidade(p)}
              </label>
            ))}
          </fieldset>
          <button className="botao" disabled={enviando}>{enviando ? 'Gerando…' : 'Gerar código de ativação'}</button>
        </form>

        <div>
          {novo && (
            <div className="caixa codigo-caixa" role="status">
              <p className="etiqueta">Código gerado para {novo.nome}</p>
              <p className="codigo-grande">{novo.codigo}</p>
              <p className="nota">
                Uso único. Vale por 7 dias, até {dataBR(novo.valido_ate)}. A família também precisa informar a data de nascimento.
              </p>
              <div className="acoes-topo">
                <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(novo.codigo)}>Copiar código</button>
                <button className="botao-sec" onClick={() => window.print()}>Imprimir</button>
              </div>
            </div>
          )}

          <h2 className="titulo-lista">Pré-cadastros da clínica</h2>
          {lista && lista.length === 0 && <p className="vazio">Nenhum pré-cadastro ainda.</p>}
          {lista && lista.map((c) => (
            <div key={c.id} className="linha-lista">
              <div>
                <strong>{c.nome}</strong>
                <p className="detalhe">
                  {STATUS[c.status]}
                  {c.codigo_valido_ate && ` · código vale até ${dataBR(c.codigo_valido_ate)}`}
                </p>
              </div>
              {(c.status === 'AGUARDANDO_ATIVACAO' || c.status === 'INATIVO') && (
                <div className="acoes-linha">
                  <button className="botao-sec" onClick={() => reemitir(c)}>Novo código</button>
                  {c.codigo_valido_ate && <button className="botao-sec" onClick={() => cancelar(c)}>Cancelar código</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
