// Avisos dentro do app (RF-90). Cada pessoa só lê e marca os próprios avisos.

function criarControladorNotificacoes(banco) {
  // GET /notificacoes — os mais novos primeiro, com o total de não lidos
  function listar(req, res) {
    const avisos = banco
      .prepare('SELECT id, texto, link, lida, criada_em FROM notificacoes WHERE usuario_id = ? ORDER BY criada_em DESC, id DESC LIMIT 100')
      .all(req.usuario.id);
    const naoLidas = banco.prepare('SELECT COUNT(*) AS n FROM notificacoes WHERE usuario_id = ? AND lida = 0').get(req.usuario.id).n;
    res.json({ dados: { avisos, nao_lidas: naoLidas } });
  }

  // POST /notificacoes/:id/ler — aviso de outra pessoa dá 404
  function ler(req, res) {
    const feito = banco.prepare('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id);
    if (!feito.changes) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json({ dados: { id: Number(req.params.id), lida: 1 } });
  }

  // POST /notificacoes/ler-todas
  function lerTodas(req, res) {
    const feito = banco.prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0').run(req.usuario.id);
    res.json({ dados: { marcadas: feito.changes } });
  }

  return { listar, ler, lerTodas };
}

module.exports = criarControladorNotificacoes;
