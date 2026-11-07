import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';

const PARENTESCO = { MAE: 'mãe', PAI: 'pai' };
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

// Desenho: docs/telas/M13. Até 2 responsáveis, com o mesmo poder. Ninguém remove o outro; cada um só pode sair.
export default function Responsaveis() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [dados, setDados] = useState(null);
  const [convite, setConvite] = useState(null); // { codigo, valido_ate } — o código só aparece quando é gerado
  const [saindo, setSaindo] = useState(false);
  const [editando, setEditando] = useState(null); // { parentesco, parentesco_outro }
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    api.get('/criancas').then((c) => { setFilhos(c); if (c[0]) setFilhoId(c[0].id); }).catch((e) => setErro(e.message));
  }, []);

  function carregar() {
    if (!filhoId) return;
    api.get(`/criancas/${filhoId}/responsaveis`).then(setDados).catch((e) => setErro(e.message));
  }
  useEffect(() => { setConvite(null); setSaindo(false); carregar(); }, [filhoId]);

  async function gerar() {
    setErro('');
    try {
      setConvite(await api.post(`/criancas/${filhoId}/convites-responsavel`, {}));
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function sair() {
    setErro('');
    try {
      await api.post(`/criancas/${filhoId}/sair`, {});
      window.location.href = '/familia/filhos'; // recarrega: a lista de filhos mudou
    } catch (e) {
      setErro(e.message);
      setSaindo(false);
    }
  }

  async function salvarParentesco(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.put(`/criancas/${filhoId}/meu-parentesco`, editando);
      setEditando(null);
      setAviso('Parentesco atualizado.');
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  const nomeFilho = filhos?.find((f) => f.id === filhoId)?.nome;
  const rotulo = (r) => (r.parentesco === 'OUTRO' ? r.parentesco_outro : PARENTESCO[r.parentesco]);

  return (
    <>
      <Link to="/familia/mais" className="voltar">Mais</Link>
      <h1>Responsáveis</h1>
      <p className="subtitulo">{nomeFilho} · até 2 responsáveis, com o mesmo poder.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      {filhos && filhos.length > 1 && (
        <label className="campo">Filho
          <select value={filhoId} onChange={(e) => setFilhoId(e.target.value)}>
            {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      )}

      {dados && dados.responsaveis.map((r) => (
        <div key={r.id} className="cartao linha-filho">
          <span className="inicial">{r.nome[0]}</span>
          <div>
            <strong>{r.nome}{r.voce && ' (você)'}</strong>
            <p className="detalhe">{rotulo(r)} · {r.email}</p>
            {r.voce && !editando && (
              <button className="botao-sec" onClick={() => setEditando({ parentesco: r.parentesco, parentesco_outro: r.parentesco_outro || '' })}>Editar parentesco</button>
            )}
          </div>
        </div>
      ))}

      {editando && (
        <form className="cartao" onSubmit={salvarParentesco}>
          <label className="campo">Você é
            <select value={editando.parentesco} onChange={(e) => setEditando({ ...editando, parentesco: e.target.value })}>
              <option value="MAE">Mãe</option><option value="PAI">Pai</option><option value="OUTRO">Outro</option>
            </select>
          </label>
          {editando.parentesco === 'OUTRO' && (
            <label className="campo">Qual é o parentesco?
              <input value={editando.parentesco_outro} onChange={(e) => setEditando({ ...editando, parentesco_outro: e.target.value })} required />
            </label>
          )}
          <button className="botao">Salvar</button>
          <button type="button" className="botao-sec" onClick={() => setEditando(null)}>Cancelar</button>
        </form>
      )}

      {dados && dados.vagas > 0 && (
        <div className="cartao">
          <strong>Convidar outro responsável</strong>
          {dados.convite_aberto && !convite && <p className="detalhe">Convite aguardando · vale até {dataBR(dados.convite_aberto.expira_em)}</p>}
          {convite ? (
            <>
              <p className="etiqueta">Código do convite</p>
              <p className="codigo-grande">{convite.codigo}</p>
              <p className="nota">Vale até {dataBR(convite.valido_ate)} e só pode ser usado uma vez. A pessoa também precisa saber a data de nascimento de {nomeFilho}.</p>
              <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(convite.codigo)}>Copiar</button>
            </>
          ) : (
            <button className="botao" onClick={gerar}>{dados.convite_aberto ? 'Gerar novo código' : 'Gerar código'}</button>
          )}
        </div>
      )}

      <p className="nota">Ninguém pode remover o outro responsável. Cada ação mostra quem a fez e avisa o outro.</p>

      {dados && dados.responsaveis.length > 1 && (saindo ? (
        <div className="cartao aviso-conflito" role="alertdialog">
          <strong>Sair desta criança?</strong>
          <p className="detalhe">Você deixa de ver os dados de {nomeFilho}. O outro responsável continua com o acesso.</p>
          <button className="botao perigo" onClick={sair}>Sim, sair</button>
          <button className="botao-sec" onClick={() => setSaindo(false)}>Voltar</button>
        </div>
      ) : (
        <button className="botao-sec bloco" onClick={() => setSaindo(true)}>Sair desta criança</button>
      ))}
    </>
  );
}
