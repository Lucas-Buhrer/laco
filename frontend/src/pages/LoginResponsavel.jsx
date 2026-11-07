import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Desenho: docs/telas/M6-Login (celular).
export default function LoginResponsavel() {
  const { usuario, entrarResponsavel, sessaoExpirou } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={usuario.papel === 'RESPONSAVEL' ? '/familia' : '/clinica'} replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrarResponsavel(email, senha);
      navegar('/familia');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-login-familia">
      <span className="logo">laço</span>
      <h1>Que bom ver você de novo</h1>
      <p className="subtitulo">Entre para acompanhar as consultas e as atividades de casa.</p>

      {sessaoExpirou && !erro && <p className="aviso-info" role="status">Sua sessão acabou. Entre de novo.</p>}
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <form onSubmit={enviar}>
        <label className="campo">E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="campo">Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="botao botao-grande" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>

      <p className="login-links">
        Recebi um código da clínica: <Link to="/familia/ativar">ativar minha conta</Link>
        <br />
        Sou da clínica: <Link to="/entrar">entrar pelo computador</Link>
        <br />
        <Link to="/politica">Política de privacidade</Link>
      </p>
    </div>
  );
}
