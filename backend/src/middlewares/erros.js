// Rota inexistente: mesmo formato de erro do resto da API.
function naoEncontrado(req, res) {
  res.status(404).json({ erro: 'Não encontrado.' });
}

// Erro inesperado: nunca devolve detalhes técnicos a quem chamou (RNF-04).
// O Express só reconhece como tratador de erro a função com 4 parâmetros.
// eslint-disable-next-line no-unused-vars
function tratarErro(erro, req, res, next) {
  // JSON quebrado no corpo do pedido é erro de quem chamou, não do servidor
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Pedido inválido.' });
  }
  // Só a mensagem vai para o console: nada de corpo do pedido nem senha
  console.error('Erro inesperado:', erro.message);
  res.status(500).json({ erro: 'Algo deu errado. Tente de novo.' });
}

module.exports = { naoEncontrado, tratarErro };
