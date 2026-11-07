import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ESPECIALIDADES, nomeEspecialidade } from '../../utils/especialidades.js';

const PROF_VAZIO = { nome: '', email: '', especialidade: 'PSICOLOGO', especialidade_outro: '', registro_conselho: '', registro_numero: '', registro_uf: '' };
const REC_VAZIO = { nome: '', codigo_usuario: '' };

// Desenho: docs/telas/D16, D16R e D17. Só o administrador chega aqui.
export default function Equipe() {
  const { usuario } = useAuth();
  const [profs, setProfs] = useState(null);
  const [recs, setRecs] = useState([]);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(null); // 'PROF' | 'REC' | null
  const [prof, setProf] = useState(PROF_VAZIO);
  const [rec, setRec] = useState(REC_VAZIO);
  const [editando, setEditando] = useState(null); // id do profissional em edição
  const [desativando, setDesativando] = useState(null); // profissional a desativar
  const [senha, setSenha] = useState(null); // { para, texto } — aparece uma vez só
  const [aviso, setAviso] = useState('');

  function carregar() {
    Promise.all([api.get('/clinica/profissionais'), api.get('/clinica/recepcao')])
      .then(([p, r]) => { setProfs(p); setRecs(r); })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function agir(funcao) {
    setErro('');
    setAviso('');
    try {
      await funcao();
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const salvarProf = (e) => {
    e.preventDefault();
    agir(async () => {
      if (editando) {
        await api.put(`/clinica/profissionais/${editando}`, prof);
      } else {
        const r = await api.post('/clinica/profissionais', prof);
        setSenha({ para: prof.nome, texto: r.senha_temporaria });
      }
      setForm(null); setEditando(null); setProf(PROF_VAZIO);
    });
  };
  const salvarRec = (e) => {
    e.preventDefault();
    agir(async () => {
      const r = await api.post('/clinica/recepcao', rec);
      setSenha({ para: rec.nome, texto: r.senha_temporaria, usuario: rec.codigo_usuario });
      setForm(null); setRec(REC_VAZIO);
    });
  };
  const desativar = () =>
    agir(async () => {
      const r = await api.post(`/clinica/profissionais/${desativando.id}/desativar`, {});
      setAviso(`${desativando.nome} foi desativado: ${r.vinculos_encerrados} acessos encerrados, ${r.consultas_canceladas} consultas canceladas, ${r.familias_avisadas} famílias avisadas.`);
      setDesativando(null);
    });
  // A conta volta com senha nova, mas os acessos às crianças não: a família precisa aprovar de novo
  const reativar = (p) =>
    agir(async () => {
      const r = await api.post(`/clinica/profissionais/${p.id}/reativar`, {});
      setSenha({ para: p.nome, texto: r.senha_temporaria });
      setAviso(`${p.nome} voltou. Os acessos às crianças não voltam sozinhos: a família precisa aprovar de novo.`);
    });
  const redefinir = (r) =>
    agir(async () => {
      const res = await api.post(`/clinica/recepcao/${r.id}/redefinir-senha`, {});
      setSenha({ para: r.nome, texto: res.senha_temporaria, usuario: r.codigo_usuario });
    });
  const desativarRec = (r) => agir(() => api.post(`/clinica/recepcao/${r.id}/desativar`, {}));

  function editar(p) {
    setProf({
      nome: p.nome, email: p.email, especialidade: p.especialidade || 'OUTRO', especialidade_outro: p.especialidade_outro || '',
      registro_conselho: p.registro_conselho || '', registro_numero: p.registro_numero || '', registro_uf: p.registro_uf || '',
    });
    setEditando(p.id);
    setForm('PROF');
  }
  const mudarProf = (campo) => (e) => setProf({ ...prof, [campo]: e.target.value });

  return (
    <>
      <h1>Equipe</h1>
      <p className="subtitulo">Código da clínica para o login: <strong>{usuario.clinica?.codigo_acesso}</strong></p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      {senha && (
        <div className="caixa codigo-caixa" role="status">
          <p className="etiqueta">Senha temporária de {senha.para}</p>
          <p className="codigo-grande">{senha.texto}</p>
          <p className="nota">
            {senha.usuario && `Usuário: ${senha.usuario} · `}Anote agora: esta senha não aparece de novo.
          </p>
          <div className="acoes-topo">
            <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(senha.texto)}>Copiar</button>
            <button className="botao-sec" onClick={() => setSenha(null)}>Já anotei</button>
          </div>
        </div>
      )}

      <div className="acoes-topo">
        <button className="botao-sec" onClick={() => { setForm('REC'); setEditando(null); }}>Cadastrar recepção</button>
        <button className="botao" onClick={() => { setForm('PROF'); setEditando(null); setProf(PROF_VAZIO); }}>Cadastrar profissional</button>
      </div>

      {form === 'PROF' && (
        <form className="caixa estreita grade-form" onSubmit={salvarProf}>
          <h2>{editando ? 'Editar profissional' : 'Novo profissional'}</h2>
          <label className="campo">Nome<input value={prof.nome} onChange={mudarProf('nome')} required /></label>
          <label className="campo">E-mail<input type="email" value={prof.email} onChange={mudarProf('email')} required /></label>
          <label className="campo">Especialidade
            <select value={prof.especialidade} onChange={mudarProf('especialidade')}>
              {Object.entries(ESPECIALIDADES).map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
            </select>
          </label>
          {prof.especialidade === 'OUTRO' && (
            <label className="campo">Qual?<input value={prof.especialidade_outro} onChange={mudarProf('especialidade_outro')} required /></label>
          )}
          <label className="campo">Conselho (ex.: CRP)<input value={prof.registro_conselho} onChange={mudarProf('registro_conselho')} /></label>
          <label className="campo">Número do registro<input value={prof.registro_numero} onChange={mudarProf('registro_numero')} /></label>
          <label className="campo">UF<input value={prof.registro_uf} onChange={mudarProf('registro_uf')} maxLength={2} /></label>
          {!editando && <p className="nota">A conta vale só para esta clínica. Geramos uma senha temporária para a primeira entrada.</p>}
          <div className="acoes-topo">
            <button className="botao">{editando ? 'Salvar' : 'Cadastrar'}</button>
            <button type="button" className="botao-sec" onClick={() => { setForm(null); setEditando(null); }}>Cancelar</button>
          </div>
        </form>
      )}

      {form === 'REC' && (
        <form className="caixa estreita grade-form" onSubmit={salvarRec}>
          <h2>Nova recepção</h2>
          <label className="campo">Nome<input value={rec.nome} onChange={(e) => setRec({ ...rec, nome: e.target.value })} required /></label>
          <label className="campo">Código de usuário (para entrar, sem e-mail)
            <input value={rec.codigo_usuario} onChange={(e) => setRec({ ...rec, codigo_usuario: e.target.value })} required autoComplete="off" />
          </label>
          <p className="nota">A recepção entra com o código da clínica, o código de usuário e a senha. Só você pode redefinir a senha dela.</p>
          <div className="acoes-topo">
            <button className="botao">Cadastrar</button>
            <button type="button" className="botao-sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {desativando && (
        <div className="caixa" role="alertdialog">
          <h2>Desativar {desativando.nome}?</h2>
          <p>Isto acontece na hora e não pode ser desfeito por aqui:</p>
          <ul className="lista-termo">
            <li>O acesso dele(a) a {desativando.criancas} {desativando.criancas === 1 ? 'criança' : 'crianças'} é encerrado.</li>
            <li>As consultas futuras são canceladas.</li>
            <li>As famílias são avisadas.</li>
          </ul>
          <p className="nota">Se voltar, a família precisa aprovar de novo.</p>
          <div className="acoes-topo">
            <button className="botao-sec" onClick={() => setDesativando(null)}>Cancelar</button>
            <button className="botao perigo" onClick={desativar}>Desativar agora</button>
          </div>
        </div>
      )}

      <table className="tabela">
        <thead><tr><th>Nome</th><th>Especialidade / função</th><th>Crianças</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          {profs && profs.map((p) => (
            <tr key={`p${p.id}`}>
              <td>{p.nome}</td>
              <td>{nomeEspecialidade(p)}</td>
              <td>{p.criancas}</td>
              <td>{!p.ativo ? <span className="pill mu">Desativado</span> : p.senha_temporaria ? <span className="pill wa">Senha temporária</span> : <span className="pill ok">Ativo</span>}</td>
              <td className="acoes-linha">
                {p.ativo ? (
                  <>
                    <button className="botao-sec" onClick={() => editar(p)}>Editar</button>
                    <button className="botao-sec" onClick={() => setDesativando(p)}>Desativar</button>
                  </>
                ) : (
                  <button className="botao-sec" onClick={() => reativar(p)}>Reativar</button>
                )}
              </td>
            </tr>
          ))}
          {recs.map((r) => (
            <tr key={`r${r.id}`}>
              <td>{r.nome}</td>
              <td>Recepção · usuário: {r.codigo_usuario}</td>
              <td>—</td>
              <td>{!r.ativo ? <span className="pill mu">Desativada</span> : r.senha_temporaria ? <span className="pill wa">Senha temporária</span> : <span className="pill ok">Ativa</span>}</td>
              <td className="acoes-linha">
                {r.ativo ? (
                  <>
                    <button className="botao-sec" onClick={() => redefinir(r)}>Redefinir senha</button>
                    <button className="botao-sec" onClick={() => desativarRec(r)}>Desativar</button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
