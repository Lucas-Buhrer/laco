import { createContext, useContext, useEffect, useState } from 'react';
import { api, apagarToken, definirAoExpirar, guardarToken, pegarToken } from '../api/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Enquanto confere o token guardado, as rotas protegidas esperam
  const [carregando, setCarregando] = useState(Boolean(pegarToken()));
  const [sessaoExpirou, setSessaoExpirou] = useState(false);

  useEffect(() => {
    definirAoExpirar(() => {
      apagarToken();
      setUsuario(null);
      setSessaoExpirou(true);
    });
    if (!pegarToken()) return;
    api
      .get('/auth/me')
      .then(setUsuario)
      .catch(() => apagarToken())
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(rota, corpo) {
    const dados = await api.post(rota, corpo);
    guardarToken(dados.token);
    setSessaoExpirou(false);
    setUsuario(dados.usuario);
    return dados.usuario;
  }

  const entrarClinica = (codigo_clinica, identificador, senha) =>
    entrar('/auth/login-clinica', { codigo_clinica, identificador, senha });
  const entrarResponsavel = (email, senha) => entrar('/auth/login-responsavel', { email, senha });

  // Conta recém-criada (ativação): já devolve um token, então entra direto
  async function entrarComToken(token) {
    guardarToken(token);
    setSessaoExpirou(false);
    setUsuario(await api.get('/auth/me'));
  }

  function sair() {
    apagarToken();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, sessaoExpirou, entrarClinica, entrarResponsavel, entrarComToken, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
