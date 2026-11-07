import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Desenho: docs/telas/D24. Por segurança, não diz se a página não existe ou se a pessoa não tem acesso.
export default function NaoEncontrado() {
  const { usuario } = useAuth();
  const inicio = usuario?.papel === 'RESPONSAVEL' ? '/familia' : '/clinica';
  return (
    <div className="pagina-vazia">
      <p className="numero-grande">404</p>
      <h1>Não encontramos esta página</h1>
      <p className="subtitulo">O endereço pode estar errado, ou você não tem acesso a ele. Por segurança, o sistema não diz qual dos dois.</p>
      <Link className="botao" to={inicio}>{usuario?.papel === 'RESPONSAVEL' ? 'Voltar ao início' : 'Voltar ao painel'}</Link>
    </div>
  );
}
