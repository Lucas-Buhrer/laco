import { useState } from 'react';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Desenho: docs/telas/D13A (administração) e D13P (profissional). A recepção não tem esta tela:
// a senha dela só o administrador redefine.
export default function Conta() {
  const { usuario, sair } = useAuth();
  const [f, setF] = useState({ atual: '', nova: '', repetir: '' });
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });

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
      {usuario.senha_temporaria && !ok && (
        <p className="aviso-info" role="note">Você entrou com uma senha temporária. Troque por uma só sua.</p>
      )}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {ok && <p className="aviso-info" role="status">Senha alterada. Use a nova na próxima vez que entrar.</p>}

      <form className="caixa estreita" onSubmit={salvar}>
        <label className="campo">Senha atual
          <input type="password" value={f.atual} onChange={mudar('atual')} required autoComplete="current-password" />
        </label>
        <label className="campo">Nova senha (mínimo 8 caracteres)
          <input type="password" value={f.nova} onChange={mudar('nova')} minLength={8} required autoComplete="new-password" />
        </label>
        <label className="campo">Repetir nova senha
          <input type="password" value={f.repetir} onChange={mudar('repetir')} minLength={8} required autoComplete="new-password" />
        </label>
        <div className="acoes-topo">
          <button className="botao" disabled={enviando}>Salvar nova senha</button>
          <button type="button" className="botao-sec" onClick={sair}>Sair</button>
        </div>
      </form>
    </>
  );
}
