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

      {/* Duas colunas do mesmo tamanho: dados à esquerda, administradores à direita */}
      <div className="pagina-duas colunas-iguais">
        <form className="caixa grade-form" onSubmit={salvar}>
          <h2 className="span2">Dados da clínica</h2>
          <label className="campo">Nome da clínica<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></label>
          <label className="campo">CNPJ (opcional)<input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} /></label>
          <label className="campo span2">E-mail de contato<input type="email" value={f.email_contato} onChange={(e) => setF({ ...f, email_contato: e.target.value })} /></label>
          <p className="nota span2">Código da clínica (para o login da equipe): <strong>{c.codigo_acesso}</strong>. Ele não muda por aqui.</p>
          <div className="acoes-direita span2"><button className="botao">Salvar</button></div>
        </form>

        <section className="caixa">
          <div className="secao-topo">
            <h2>Administradores</h2>
            {!novo && <button className="botao-sec pequeno" onClick={() => setNovo({ nome: '', email: '' })}>Adicionar administrador</button>}
          </div>
          {senha && (
            <div className="codigo-caixa" role="status">
              <p className="etiqueta">Senha temporária de {senha.para}</p>
              <p className="codigo-grande">{senha.texto}</p>
              <p className="nota">Anote agora: esta senha não aparece de novo.</p>
              <div className="acoes-topo">
                <button className="botao-sec" onClick={() => navigator.clipboard?.writeText(senha.texto)}>Copiar</button>
                <button className="botao-sec" onClick={() => setSenha(null)}>Já anotei</button>
              </div>
            </div>
          )}
          <div className="lista-pre">
            {c.administradores.map((a) => (
              <div key={a.id} className="linha-pre">
                <span className="avatar-mini">{a.nome[0]}</span>
                <div className="texto-linha">
                  <strong>{a.nome}{a.voce && ' (você)'}</strong>
                  <small>{a.email}</small>
                </div>
                <span className={a.ativo ? 'pill ok' : 'pill mu'}>{a.ativo ? 'Ativo' : 'Desativado'}</span>
              </div>
            ))}
          </div>
          {novo && (
            <form className="grade-form form-novo-admin" onSubmit={adicionar}>
              <h3 className="span2">Novo administrador</h3>
              <label className="campo">Nome<input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} required /></label>
              <label className="campo">E-mail<input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} required /></label>
              <p className="nota span2">A conta vale só para esta clínica e não acessa dados clínicos das crianças. Geramos uma senha temporária.</p>
              <div className="acoes-direita span2">
                <button type="button" className="botao-sec" onClick={() => setNovo(null)}>Cancelar</button>
                <button className="botao">Adicionar</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
