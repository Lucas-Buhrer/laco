import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';

// Desenho: docs/telas/D19. Só a administração. Aqui é cadastro da clínica: nada de dado clínico.
export default function DadosClinica() {
  const [c, setC] = useState(null);
  const [f, setF] = useState({ nome: '', cnpj: '', email_contato: '' });
  const [novo, setNovo] = useState(null); // formulário de novo administrador
  const [senha, setSenha] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  function carregar() {
    api.get('/clinica').then((d) => {
      setC(d);
      setF({ nome: d.nome, cnpj: d.cnpj || '', email_contato: d.email_contato || '' });
    }).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setAviso('');
    try {
      await api.put('/clinica', f);
      setAviso('Dados da clínica salvos.');
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  async function adicionar(e) {
    e.preventDefault();
    setErro('');
    try {
      const r = await api.post('/clinica/administradores', novo);
      setSenha({ para: novo.nome, texto: r.senha_temporaria });
      setNovo(null);
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  if (!c) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Clínica</h1>
      <p className="subtitulo">Dados da clínica e de quem administra.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      <form className="caixa estreita" onSubmit={salvar}>
        <h2>Dados da clínica</h2>
        <label className="campo">Nome da clínica<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></label>
        <label className="campo">CNPJ (opcional)<input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} /></label>
        <label className="campo">E-mail de contato<input type="email" value={f.email_contato} onChange={(e) => setF({ ...f, email_contato: e.target.value })} /></label>
        <p className="nota">Código da clínica (para o login da equipe): <strong>{c.codigo_acesso}</strong>. Ele não muda por aqui.</p>
        <button className="botao">Salvar</button>
      </form>

      <h2 className="titulo-lista">Administradores</h2>
      {senha && (
        <div className="caixa codigo-caixa" role="status">
          <p className="etiqueta">Senha temporária de {senha.para}</p>
          <p className="codigo-grande">{senha.texto}</p>
          <p className="nota">Anote agora: esta senha não aparece de novo.</p>
          <div className="acoes-topo">
            <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(senha.texto)}>Copiar</button>
            <button className="botao-sec" onClick={() => setSenha(null)}>Já anotei</button>
          </div>
        </div>
      )}
      {c.administradores.map((a) => (
        <div key={a.id} className="linha-lista">
          <div>
            <strong>{a.nome}{a.voce && ' (você)'}</strong>
            <p className="detalhe">{a.email}</p>
          </div>
          <span className={`chip ${a.ativo ? 'cor-verde' : 'cor-realizada'}`}>{a.ativo ? 'Ativo' : 'Desativado'}</span>
        </div>
      ))}

      {novo ? (
        <form className="caixa estreita" onSubmit={adicionar}>
          <h2>Novo administrador</h2>
          <label className="campo">Nome<input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} required /></label>
          <label className="campo">E-mail<input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} required /></label>
          <p className="nota">A conta vale só para esta clínica e não acessa dados clínicos das crianças. Geramos uma senha temporária.</p>
          <div className="acoes-topo">
            <button className="botao">Adicionar</button>
            <button type="button" className="botao-sec" onClick={() => setNovo(null)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="acoes-topo"><button className="botao-sec" onClick={() => setNovo({ nome: '', email: '' })}>Adicionar administrador</button></div>
      )}
    </>
  );
}
