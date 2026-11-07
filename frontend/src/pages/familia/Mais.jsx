import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Menu "Mais": por enquanto só o que já existe
export default function Mais() {
  const { usuario, sair } = useAuth();
  return (
    <>
      <h1>Mais</h1>
      <p className="subtitulo">{usuario.nome}</p>
      <Link className="cartao destaque" to="/familia/filhos">Meus filhos</Link>
      <Link className="cartao destaque" to="/familia/solicitacoes">Pedidos de acesso</Link>
      <Link className="cartao destaque" to="/familia/convidar">Convidar outra clínica</Link>
      <button className="botao-sec bloco" onClick={sair}>Sair</button>
    </>
  );
}
