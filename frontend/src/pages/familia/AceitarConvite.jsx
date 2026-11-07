import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Convite de outro responsável. Quem já tem conta (logado) só informa código e data;
// quem não tem cria a conta aqui, com e-mail, senha e o aceite do Termo.
export default function AceitarConvite() {
  const { usuario, entrarComToken } = useAuth();
  const navegar = useNavigate();
  const logado = usuario?.papel === 'RESPONSAVEL';
  const [f, setF] = useState({ codigo: '', data_nascimento: '', parentesco: 'PAI', parentesco_outro: '', nome: '', email: '', senha: '', aceitou_termo: false });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (logado) {
        await api.post('/responsaveis/aceitar-convite', f);
      } else {
        const r = await api.post('/auth/aceitar-convite-responsavel', f);
        await entrarComToken(r.token);
      }
      navegar('/familia/filhos');
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={logado ? 'conteudo-familia' : 'tela-login-familia'}>
      {!logado && <span className="logo">laço</span>}
      {logado && <Link to="/familia/filhos" className="voltar">‹ Voltar</Link>}
      <h1 className="titulo-passo">Convite de outro responsável</h1>
      <p className="subtitulo">Digite o código que o outro responsável gerou e a data de nascimento da criança.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <form onSubmit={enviar}>
        <label className="campo">Código do convite
          <input value={f.codigo} onChange={mudar('codigo')} required autoComplete="off" />
        </label>
        <label className="campo">Data de nascimento da criança
          <input type="date" value={f.data_nascimento} onChange={mudar('data_nascimento')} required />
        </label>
        <label className="campo">Você é
          <select value={f.parentesco} onChange={mudar('parentesco')}>
            <option value="MAE">Mãe</option><option value="PAI">Pai</option><option value="OUTRO">Outro</option>
          </select>
        </label>
        {f.parentesco === 'OUTRO' && (
          <label className="campo">Qual é o seu parentesco?
            <input value={f.parentesco_outro} onChange={mudar('parentesco_outro')} required />
          </label>
        )}
        {!logado && (
          <>
            <label className="campo">Seu nome<input value={f.nome} onChange={mudar('nome')} required autoComplete="name" /></label>
            <label className="campo">E-mail<input type="email" value={f.email} onChange={mudar('email')} required autoComplete="username" /></label>
            <label className="campo">Senha (mínimo 8 caracteres)
              <input type="password" value={f.senha} onChange={mudar('senha')} minLength={8} required autoComplete="new-password" />
            </label>
            <label className="marcar">
              <input type="checkbox" checked={f.aceitou_termo} onChange={mudar('aceitou_termo')} required />
              Li e aceito o Termo de uso e a <Link to="/politica">Política de privacidade</Link>.
            </label>
          </>
        )}
        <p className="nota">Você terá o mesmo poder do outro responsável: aprovar, retirar acessos e baixar os dados. Cada ação mostra quem a fez.</p>
        <button className="botao botao-grande" disabled={enviando}>{enviando ? 'Entrando…' : logado ? 'Entrar como responsável' : 'Criar conta'}</button>
      </form>
      {!logado && <p className="login-links">Já tem conta? <Link to="/familia/entrar">Entrar</Link> e depois usar o convite em “Meus filhos”.</p>}
    </div>
  );
}
