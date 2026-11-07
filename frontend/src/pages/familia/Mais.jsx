import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import useNaoLidas from '../../components/useNaoLidas.js';

// Menu "Mais": por enquanto só o que já existe
export default function Mais() {
  const { usuario, sair } = useAuth();
  const naoLidas = useNaoLidas();
  return (
    <>
      <h1>Mais</h1>
      <p className="subtitulo">{usuario.nome}</p>
      <Link className="cartao destaque" to="/familia/avisos">Avisos{naoLidas > 0 && ` (${naoLidas} novos)`}</Link>
      <Link className="cartao destaque" to="/familia/filhos">Meus filhos</Link>
      <Link className="cartao destaque" to="/familia/linha-do-tempo">Linha do tempo</Link>
      <Link className="cartao destaque" to="/familia/relatorio">Relatório de evolução</Link>
      <Link className="cartao destaque" to="/familia/solicitacoes">Pedidos de acesso</Link>
      <Link className="cartao destaque" to="/familia/responsaveis">Responsáveis</Link>
      <Link className="cartao destaque" to="/familia/convidar">Convidar outra clínica</Link>
      <Link className="cartao destaque" to="/familia/quem-acessou">Quem acessou</Link>
      <Link className="cartao destaque" to="/familia/privacidade">Privacidade e dados</Link>
      <button className="botao-sec bloco" onClick={sair}>Sair</button>
    </>
  );
}
