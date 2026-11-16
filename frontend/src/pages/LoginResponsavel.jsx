import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Atalho só da versão de demonstração (aparece com npm run dev): preenche o login fictício do doc 09
const MOSTRAR_ATALHO = import.meta.env.DEV;

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
      <img className="logo" src="/laco-logo.svg" alt="laço" />
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

      {MOSTRAR_ATALHO && (
        <div className="atalhos-demo">
          <p>Demonstração · entrar como</p>
          <div>
            <button type="button" className="botao-sec" onClick={() => { setEmail('responsavel@laco.test'); setSenha('123456'); setErro(''); }}>Responsável (Mariana)</button>
          </div>
        </div>
      )}

      <div className="login-rodape-familia">
        <p className="primeira-vez">Primeira vez aqui?</p>
        <Link className="botao-sec botao-grande" to="/familia/ativar">Tenho um código da clínica</Link>
        <Link className="botao-sec botao-grande" to="/familia/convite">Tenho um convite de outro responsável</Link>
        <p className="links-pequenos">
          <Link to="/entrar">Sou da clínica</Link>
          <span aria-hidden="true">·</span>
          <Link to="/politica">Privacidade</Link>
        </p>
      </div>
    </div>
  );
}
