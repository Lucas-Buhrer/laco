import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Só deixa passar quem está logado e tem um dos papéis. O servidor confere de novo em cada chamada;
// isto aqui só evita mostrar telas que a pessoa não usa.
export default function RotaProtegida({ papeis, entrarEm }) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <p className="carregando">Carregando…</p>;
  if (!usuario) return <Navigate to={entrarEm} replace />;
  if (!papeis.includes(usuario.papel)) return <Navigate to="/sem-permissao" replace />;
  return <Outlet />;
}
