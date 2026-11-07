// Único arquivo que fala com o servidor. Guarda o token e manda em toda chamada.
const CHAVE_TOKEN = 'laco_token';

export function pegarToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}
export function guardarToken(token) {
  localStorage.setItem(CHAVE_TOKEN, token);
}
export function apagarToken() {
  localStorage.removeItem(CHAVE_TOKEN);
}

// O contexto de login registra aqui o que fazer quando a sessão acaba (401 com token)
let aoExpirar = () => {};
export function definirAoExpirar(funcao) {
  aoExpirar = funcao;
}

async function chamar(metodo, rota, corpo) {
  const token = pegarToken();
  let resposta;
  try {
    resposta = await fetch('/api' + rota, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Sem conexão. Confira a internet e tente de novo.');
  }

  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    // 401 com token guardado = sessão acabou. No login errado não há token, então não cai aqui.
    if (resposta.status === 401 && token) aoExpirar();
    const erro = new Error(json.erro || 'Algo deu errado. Tente de novo.');
    erro.status = resposta.status;
    throw erro;
  }
  return json.dados;
}

export const api = {
  get: (rota) => chamar('GET', rota),
  post: (rota, corpo) => chamar('POST', rota, corpo),
  put: (rota, corpo) => chamar('PUT', rota, corpo),
};
