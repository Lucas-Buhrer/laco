const rateLimit = require('express-rate-limit');

// Limite de tentativas ERRADAS por IP (RNF-02). Pedido bem-sucedido não conta.
// Cada app cria o seu, para os testes começarem zerados.
function criarLimiteTentativas(maximoDeErros) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: maximoDeErros,
    skipSuccessfulRequests: true,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos e tente de novo.' }),
  });
}

module.exports = criarLimiteTentativas;
