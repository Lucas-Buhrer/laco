import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';

function idade(nascimento) {
  const n = new Date(nascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos -= 1;
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

// Desenho: docs/telas/M14
export function Filhos() {
  const [filhos, setFilhos] = useState(null);
  const [vinculos, setVinculos] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api.get('/criancas'), api.get('/vinculos')])
      .then(([c, v]) => { setFilhos(c); setVinculos(v); })
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="aviso-erro" role="alert">{erro}</p>;
  if (!filhos) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Meus filhos</h1>
      {filhos.map((f) => {
        const doFilho = vinculos.filter((v) => v.crianca_id === f.id);
        const com = doFilho.filter((v) => v.status === 'APROVADO').length;
        const pend = doFilho.filter((v) => v.status === 'PENDENTE').length;
        return (
          <div key={f.id} className="cartao linha-filho">
            <span className="inicial">{f.nome[0]}</span>
            <div>
              <strong>{f.nome}</strong>
              <p className="detalhe">
                {idade(f.data_nascimento)} · {com} com acesso{pend > 0 && ` · ${pend} ${pend === 1 ? 'pedido pendente' : 'pedidos pendentes'}`}
              </p>
            </div>
          </div>
        );
      })}
      <Link className="botao-sec bloco" to="/familia/filhos/adicionar">Adicionar outro filho</Link>
      <Link className="botao-sec bloco" to="/familia/convite">Tenho um convite de outro responsável</Link>
    </>
  );
}

// Desenho: docs/telas/M5
export function AdicionarFilho() {
  const navegar = useNavigate();
  const [f, setF] = useState({ codigo: '', data_nascimento: '', parentesco: 'MAE', parentesco_outro: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post('/criancas/adicionar', f);
      navegar('/familia/solicitacoes');
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Link to="/familia/filhos" className="voltar">Voltar</Link>
      <h1>Adicionar outro filho</h1>
      <p className="subtitulo">A clínica pré-cadastra a criança e entrega um código a você. Digite abaixo. Você continua com a mesma conta.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      <form onSubmit={enviar}>
        <label className="campo">Código de ativação
          <input value={f.codigo} onChange={mudar('codigo')} required autoComplete="off" />
        </label>
        <label className="campo">Data de nascimento da criança
          <input type="date" value={f.data_nascimento} onChange={mudar('data_nascimento')} required />
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
        <p className="nota">Os profissionais indicados só verão os dados da nova criança depois que você aprovar cada um.</p>
        <button className="botao botao-grande" disabled={enviando}>{enviando ? 'Adicionando…' : 'Adicionar'}</button>
        <p className="nota">Sem código? Peça à recepção da clínica.</p>
      </form>
    </>
  );
}
