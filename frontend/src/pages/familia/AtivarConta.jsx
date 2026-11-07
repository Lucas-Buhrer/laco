import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Desenho: docs/telas/M0, M7, M8. Três passos; o servidor só confere tudo no final.
export default function AtivarConta() {
  const { entrarComToken } = useAuth();
  const navegar = useNavigate();
  const [passo, setPasso] = useState(1);
  const [f, setF] = useState({
    codigo: '', data_nascimento: '', aceitou_termo: false,
    nome: '', parentesco: 'MAE', parentesco_outro: '', email: '', senha: '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function avancar(e) {
    e.preventDefault();
    setErro('');
    setPasso(passo + 1);
  }

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const dados = await api.post('/auth/ativar-conta', f);
      await entrarComToken(dados.token);
      // Os pedidos dos profissionais indicados já esperam a aprovação
      navegar('/familia/solicitacoes');
    } catch (e2) {
      setErro(e2.message);
      // Erro de código volta ao 1º passo; o resto o responsável corrige aqui mesmo
      if (/ódigo|nascimento/.test(e2.message)) setPasso(1);
      else if (/Termo/.test(e2.message)) setPasso(2);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-login-familia">
      <span className="logo">laço</span>
      <p className="passo">Passo {passo} de 3</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      {passo === 1 && (
        <form onSubmit={avancar}>
          <h1 className="titulo-passo">Vamos ativar a sua conta</h1>
          <p className="subtitulo">A clínica entregou a você um código. Digite abaixo, junto com a data de nascimento da criança.</p>
          <label className="campo">Código de ativação
            <input value={f.codigo} onChange={mudar('codigo')} required autoComplete="off" />
          </label>
          <label className="campo">Data de nascimento da criança
            <input type="date" value={f.data_nascimento} onChange={mudar('data_nascimento')} required />
          </label>
          <p className="nota">Ninguém da clínica verá os dados do seu filho até você aprovar cada profissional.</p>
          <button className="botao botao-grande">Continuar</button>
          <p className="login-links">Sem código? Peça à recepção da clínica. Já tem conta? <Link to="/familia/entrar">Entrar</Link></p>
        </form>
      )}

      {passo === 2 && (
        <form onSubmit={avancar}>
          <h1 className="titulo-passo">Seus dados, sob o seu controle</h1>
          <ul className="lista-termo">
            <li>Só quem você aprovar vê os dados do seu filho.</li>
            <li>Você vê quem acessou, quando e o quê.</li>
            <li>Pode retirar um acesso quando quiser.</li>
            <li>Pode baixar os dados ou pedir a exclusão.</li>
          </ul>
          <label className="marcar">
            <input type="checkbox" checked={f.aceitou_termo} onChange={mudar('aceitou_termo')} required />
            Li e aceito o Termo de uso e a Política de privacidade.
          </label>
          <button className="botao botao-grande">Continuar</button>
          <button type="button" className="botao-sec" onClick={() => setPasso(1)}>Voltar</button>
        </form>
      )}

      {passo === 3 && (
        <form onSubmit={criar}>
          <h1 className="titulo-passo">Crie o seu acesso</h1>
          <label className="campo">Seu nome
            <input value={f.nome} onChange={mudar('nome')} required autoComplete="name" />
          </label>
          <label className="campo">Você é
            <select value={f.parentesco} onChange={mudar('parentesco')}>
              <option value="MAE">Mãe</option>
              <option value="PAI">Pai</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          {f.parentesco === 'OUTRO' && (
            <label className="campo">Qual é o seu parentesco?
              <input value={f.parentesco_outro} onChange={mudar('parentesco_outro')} required />
            </label>
          )}
          <label className="campo">E-mail
            <input type="email" value={f.email} onChange={mudar('email')} required autoComplete="username" />
          </label>
          <label className="campo">Senha (mínimo 8 caracteres)
            <input type="password" value={f.senha} onChange={mudar('senha')} minLength={8} required autoComplete="new-password" />
          </label>
          <button className="botao botao-grande" disabled={enviando}>{enviando ? 'Criando…' : 'Criar conta'}</button>
          <button type="button" className="botao-sec" onClick={() => setPasso(2)}>Voltar</button>
        </form>
      )}
    </div>
  );
}
