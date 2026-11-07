import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/api.js';

function idade(nascimento) {
  const n = new Date(nascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos -= 1;
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

// Desenho: docs/telas/D8. Só aparecem crianças com vínculo aprovado (a regra está no servidor).
// Última sessão e próxima consulta entram com as tarefas T-30 e T-31.
export default function Criancas() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/criancas').then(setLista).catch((e) => setErro(e.message));
  }, []);

  if (usuario.papel !== 'PROFISSIONAL') return <p className="aviso-erro">Esta tela é só para profissionais.</p>;

  return (
    <>
      <h1>Crianças</h1>
      <p className="subtitulo">Só aparecem crianças cujas famílias aprovaram o seu acesso.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {lista && lista.length === 0 && (
        <div className="vazio-grande">
          <h2>Nenhuma criança vinculada a você ainda</h2>
          <p>Para ver uma criança, a recepção a pré-cadastra e indica você, e a família aprova o seu acesso no app. Se a criança já é atendida em outra clínica, peça o Código da família aos pais.</p>
          <div className="acoes-topo">
            <Link className="botao" to="/clinica/codigo-da-familia">Digitar um Código da família</Link>
            <Link className="botao-sec" to="/clinica/pre-cadastros">Ver pré-cadastros</Link>
          </div>
        </div>
      )}
      {lista && lista.length > 0 && (
        <table className="tabela">
          <thead><tr><th>Nome</th><th>Idade</th><th>Acesso</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}><td><Link to={`/clinica/criancas/${c.id}`}>{c.nome}</Link></td><td>{idade(c.data_nascimento)}</td><td>Aprovado</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
