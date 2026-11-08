import { useState } from 'react';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Desenho: docs/telas/D13A (administração) e D13P (profissional). A recepção não tem esta tela:
// a senha dela só o administrador redefine. O "Sair" fica no menu lateral.
export default function Conta() {
  const { usuario } = useAuth();
  const [f, setF] = useState({ atual: '', nova: '', repetir: '' });
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });
  const tipo = ver ? 'text' : 'password';

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setOk(false);
    if (f.nova !== f.repetir) return setErro('As duas senhas novas não são iguais.');
    setEnviando(true);
    try {
      await api.post('/auth/alterar-senha', { senha_atual: f.atual, senha_nova: f.nova });
      setF({ atual: '', nova: '', repetir: '' });
      setOk(true);
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Conta</h1>
      <p className="subtitulo">{usuario.nome} · alterar a sua senha de acesso.</p>
      {Boolean(usuario.senha_temporaria) && !ok && (
        <p className="aviso-info" role="note">Você entrou com uma senha temporária. Troque por uma só sua.</p>
      )}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {ok && <p className="aviso-info" role="status">Senha alterada. Use a nova na próxima vez que entrar.</p>}

      <div className="pagina-duas colunas-iguais">
        <form className="caixa" onSubmit={salvar}>
          <h2>Trocar a senha</h2>
          <label className="campo">Senha atual
            <input type={tipo} value={f.atual} onChange={mudar('atual')} required autoComplete="current-password" />
          </label>
          <label className="campo">Nova senha (mínimo 8 caracteres)
            <input type={tipo} value={f.nova} onChange={mudar('nova')} minLength={8} required autoComplete="new-password" />
          </label>
          <label className="campo">Repetir nova senha
            <input type={tipo} value={f.repetir} onChange={mudar('repetir')} minLength={8} required autoComplete="new-password" />
          </label>
          <label className="marcar"><input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />Mostrar as senhas enquanto digito</label>
          <div className="acoes-direita"><button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar nova senha'}</button></div>
        </form>

        <div className="caixa">
          <h2>Dicas para uma senha segura</h2>
          <ul className="lista-dicas">
            <li>Use pelo menos 8 caracteres, misturando letras e números.</li>
            <li>Não use o nome da criança, o seu nome ou datas de nascimento.</li>
            <li>Não compartilhe a senha com ninguém da equipe: cada acesso fica registrado no seu nome.</li>
            <li>Saiu do computador? Use o botão “Sair” no menu.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
