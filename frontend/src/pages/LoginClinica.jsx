import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Desenho: docs/telas/D1-Login e D1b-LoginErro
export default function LoginClinica() {
  const { usuario, entrarClinica, sessaoExpirou } = useAuth();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={usuario.papel === 'RESPONSAVEL' ? '/familia' : '/clinica'} replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrarClinica(codigo, identificador, senha);
      navegar('/clinica');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-login">
      <section className="login-lado">
        <span className="logo">laço</span>
        <div>
          <h1>O cuidado da criança, com a família no centro.</h1>
          <p>Cada profissional só vê o que os pais aprovaram. Toda consulta e todo acesso ficam registrados.</p>
        </div>
        <small>Versão de demonstração · dados fictícios</small>
      </section>

      <section className="login-form">
        <h2>Entrar na clínica</h2>
        <p className="subtitulo">
          Equipe da clínica: profissionais e administração entram com e-mail; a recepção, com o código de usuário.
        </p>

        {sessaoExpirou && !erro && <p className="aviso-info" role="status">Sua sessão acabou. Entre de novo.</p>}
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}

        <form onSubmit={enviar}>
          <label className="campo">Código da clínica
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="organization" required />
          </label>
          <label className="campo">E-mail ou código de usuário
            <input value={identificador} onChange={(e) => setIdentificador(e.target.value)} autoComplete="username" required />
          </label>
          <label className="campo">Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
          </label>
          <button className="botao" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>

        <div className="login-rodape">
          <Link to="/politica">Política de privacidade</Link>
          <span>É pai, mãe ou responsável?</span>
          <Link className="botao-sec" to="/familia/entrar">Abrir o app da família</Link>
        </div>
      </section>
    </div>
  );
}
