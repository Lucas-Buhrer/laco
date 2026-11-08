import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

const VAZIO = { nome: '', data_nascimento: '', responsavel_nome: '', parentesco: 'MAE', parentesco_outro: '', email: '', telefone: '', profissionais: [] };
const DIAS_PARA_EXCLUIR = 90; // mesmo prazo do servidor (RN-33)

const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
const diasAte = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));

// Desenho: docs/telas/D5 (recepção), D5A (admin), D5P (profissional). Só dados cadastrais.
// À esquerda o formulário; à direita só o que ainda precisa de ação (as já ativas ficam em outra aba).
export default function PreCadastros() {
  const [f, setF] = useState(VAZIO);
  const [lista, setLista] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [novo, setNovo] = useState(null); // { nome, codigo, valido_ate }
  const [aba, setAba] = useState('PENDENTES');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(8); // a lista mostra poucas linhas e abre mais sob pedido
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    api.get('/clinica/pre-cadastros').then(setLista).catch((e) => setErro(e.message));
  }
  useEffect(() => {
    carregar();
    api.get('/clinica/profissionais').then((p) => setProfissionais(p.filter((x) => x.ativo !== 0))).catch((e) => setErro(e.message));
  }, []);

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });
  const marcar = (id) => setF({ ...f, profissionais: f.profissionais.includes(id) ? f.profissionais.filter((x) => x !== id) : [...f.profissionais, id] });

  async function gerar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api.post('/clinica/pre-cadastros', f);
      setNovo({ nome: r.nome, codigo: r.codigo, valido_ate: r.codigo_valido_ate });
      setF(VAZIO);
      setAba('PENDENTES');
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

  const grupos = {
    PENDENTES: (lista || []).filter((c) => c.status === 'AGUARDANDO_ATIVACAO' || c.status === 'AGUARDANDO_APROVACAO'),
    INATIVOS: (lista || []).filter((c) => c.status === 'INATIVO'),
    ATIVAS: (lista || []).filter((c) => c.status === 'ATIVA'),
  };
  const termo = busca.trim().toLowerCase();
  const visiveis = grupos[aba].filter((c) => !termo || c.nome.toLowerCase().includes(termo));

  function detalhe(c) {
    if (c.status === 'INATIVO') return `Sem ativação há ${c.dias_sem_ativacao} dias · será excluído em ${Math.max(0, DIAS_PARA_EXCLUIR - c.dias_sem_ativacao)} dias`;
    if (c.status === 'AGUARDANDO_APROVACAO') return 'A família já ativou a conta e ainda vai aprovar os profissionais';
    if (c.status === 'ATIVA') return 'Conta ativada';
    return c.codigo_valido_ate ? `Código vence em ${diasAte(c.codigo_valido_ate)} dias (${dataBR(c.codigo_valido_ate)})` : 'Código vencido: gere um novo';
  }

  return (
    <>
      <h1>Pré-cadastros</h1>
      <p className="subtitulo">Só dados cadastrais. A família ativa a conta com o código e decide quem pode ver o resto.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="pre-grade">
        <form className="pre-form" onSubmit={gerar}>
          <div className="caixa grade-form">
            <h2>Nova criança</h2>
            <label className="campo">Nome da criança<input value={f.nome} onChange={mudar('nome')} required /></label>
            <label className="campo">Data de nascimento<input type="date" value={f.data_nascimento} onChange={mudar('data_nascimento')} required /></label>
            <label className="campo">Nome do responsável<input value={f.responsavel_nome} onChange={mudar('responsavel_nome')} required /></label>
            <label className="campo">Parentesco
              <select value={f.parentesco} onChange={mudar('parentesco')}>
                <option value="MAE">Mãe</option><option value="PAI">Pai</option><option value="OUTRO">Outro</option>
              </select>
            </label>
            {f.parentesco === 'OUTRO' && (
              <label className="campo span2">Qual é o parentesco?<input value={f.parentesco_outro} onChange={mudar('parentesco_outro')} required /></label>
            )}
            <label className="campo">E-mail do responsável<input type="email" value={f.email} onChange={mudar('email')} /></label>
            <label className="campo">Telefone do responsável<input value={f.telefone} onChange={mudar('telefone')} /></label>
            <p className="nota">Informe pelo menos um: e-mail ou telefone.</p>

            <div className="grupo-campo span2">
              <span className="titulo-grupo-campo">Profissionais indicados</span>
              <div className="etiquetas-opcao">
                {profissionais.map((p) => {
                  const on = f.profissionais.includes(p.id);
                  return (
                    <button key={p.id} type="button" className={`chip-opcao ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => marcar(p.id)}>
                      {on && <span aria-hidden="true">✓ </span>}{p.nome} <small>· {nomeEspecialidade(p)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="barra-salvar">
            <button className="botao" disabled={enviando}>{enviando ? 'Gerando…' : 'Gerar código de ativação'}</button>
          </div>
        </form>

        <div className="pre-lista">
          {novo && (
            <div className="caixa codigo-caixa" role="status">
              <p className="etiqueta">Código gerado para {novo.nome}</p>
              <p className="codigo-grande">{novo.codigo}</p>
              <p className="nota">Uso único. Vale por 7 dias, até {dataBR(novo.valido_ate)}. A família também precisa informar a data de nascimento.</p>
              <div className="acoes-topo">
                <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(novo.codigo)}>Copiar código</button>
                <button className="botao-sec" onClick={() => window.print()}>Imprimir</button>
              </div>
            </div>
          )}

          <div className="caixa">
            <h2>Cadastros da clínica</h2>
            <div className="abas" role="tablist">
              {[['PENDENTES', 'Em andamento'], ['INATIVOS', 'Inativos'], ['ATIVAS', 'Já ativas']].map(([chave, nome]) => (
                <button key={chave} role="tab" aria-selected={aba === chave} className={aba === chave ? 'aba ativa' : 'aba'} onClick={() => { setAba(chave); setLimite(8); }}>
                  {nome} <small>({grupos[chave].length})</small>
                </button>
              ))}
            </div>
            <input className="busca" type="search" placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(8); }} />

            {lista && visiveis.length === 0 && (
              <p className="vazio">
                {termo ? 'Ninguém com esse nome nesta aba.' : aba === 'PENDENTES' ? 'Nenhum cadastro esperando ativação. Pré-cadastre uma criança ao lado.' : aba === 'INATIVOS' ? 'Nenhum cadastro inativo.' : 'Nenhuma criança ativada ainda.'}
              </p>
            )}
            <div className="lista-pre">
              {visiveis.slice(0, limite).map((c) => (
                <div key={c.id} className="linha-pre">
                  <span className="avatar-mini">{c.nome[0]}</span>
                  <div className="texto-linha">
                    <strong>{c.nome}</strong>
                    <small className={c.status === 'INATIVO' ? 'perigo-texto' : ''}>{detalhe(c)}</small>
                  </div>
                  <span className={c.status === 'INATIVO' ? 'pill mu' : c.status === 'ATIVA' ? 'pill ok' : 'pill wa'}>
                    {c.status === 'INATIVO' ? 'Inativo' : c.status === 'ATIVA' ? 'Ativa' : c.status === 'AGUARDANDO_APROVACAO' ? 'Aprovação' : 'Pendente'}
                  </span>
                  {(c.status === 'AGUARDANDO_ATIVACAO' || c.status === 'INATIVO') && (
                    <span className="acoes-pre">
                      <button className="botao-sec pequeno" onClick={() => reemitir(c)}>{c.status === 'INATIVO' ? 'Reativar' : 'Novo código'}</button>
                      {c.status === 'AGUARDANDO_ATIVACAO' && c.codigo_valido_ate && <button className="botao-sec pequeno" onClick={() => cancelar(c)}>Cancelar</button>}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {visiveis.length > limite && (
              <button type="button" className="botao-sec mostrar-mais" onClick={() => setLimite(limite + 8)}>
                Mostrar mais ({visiveis.length - limite} restantes)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
