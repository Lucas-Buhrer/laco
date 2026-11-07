import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const CHAVE_CODIGO = 'laco_codigo_clinica';

// Atalhos só da versão de demonstração (aparecem com "npm run dev"): preenchem os campos para trocar de perfil
// rápido na apresentação. São os logins fictícios do doc 09.
const MOSTRAR_ATALHOS = import.meta.env.DEV;
const ATALHOS = [
  ['Administração', 'AURORA', 'admin@laco.test'],
  ['Profissional', 'AURORA', 'profissional@laco.test'],
  ['Recepção', 'AURORA', 'recepcao'],
];

function lerCodigoGuardado() {
  try { return localStorage.getItem(CHAVE_CODIGO) || ''; } catch { return ''; }
}

// Desenho: docs/telas/D1-Login e D1b-LoginErro
export default function LoginClinica() {
  const { usuario, entrarClinica, sessaoExpirou } = useAuth();
  const navegar = useNavigate();
  const guardado = lerCodigoGuardado();
  const [codigo, setCodigo] = useState(guardado);
  const [lembrar, setLembrar] = useState(true);
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={usuario.papel === 'RESPONSAVEL' ? '/familia' : '/clinica'} replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrarClinica(codigo, identificador, senha);
      // O código da clínica é o mesmo todo dia: guardamos só ele (nunca a senha)
      try {
        if (lembrar) localStorage.setItem(CHAVE_CODIGO, codigo.trim().toUpperCase());
        else localStorage.removeItem(CHAVE_CODIGO);
      } catch { /* sem armazenamento, tudo bem */ }
      navegar('/clinica');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function usarAtalho([, cod, ident]) {
    setCodigo(cod);
    setIdentificador(ident);
    setSenha('123456');
    setErro('');
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
        <div className="login-conteudo">
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
            <label className="marcar lembrar">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              Lembrar o código da clínica neste computador
            </label>
            <label className="campo">E-mail ou código de usuário
              <input value={identificador} onChange={(e) => setIdentificador(e.target.value)} autoComplete="username" required />
            </label>
            <label className="campo">Senha
              <span className="campo-senha">
                <input type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="ver-senha" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Esconder a senha' : 'Mostrar a senha'} aria-pressed={verSenha}>
                  {verSenha ? 'Esconder' : 'Mostrar'}
                </button>
              </span>
            </label>
            <button className="botao botao-grande" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          </form>

          {MOSTRAR_ATALHOS && (
            <div className="atalhos-demo">
              <p>Demonstração · entrar como</p>
              <div>
                {ATALHOS.map((a) => <button key={a[0]} type="button" className="botao-sec" onClick={() => usarAtalho(a)}>{a[0]}</button>)}
              </div>
            </div>
          )}

          <div className="login-rodape-clinica">
            <p>É pai, mãe ou responsável?</p>
            <Link className="botao-sec botao-grande" to="/familia/entrar">Abrir o app da família</Link>
            <p className="links-pequenos"><Link to="/politica">Política de privacidade</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
