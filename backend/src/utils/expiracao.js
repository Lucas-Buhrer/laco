// Expiração e lembretes feitos "na hora da leitura" (doc 05): não há agendador rodando em segundo plano.
const { agoraIso, formatar } = require('./datas');

const DIAS_VALIDADE_PEDIDO = 7; // RF-36

// Pedidos de acesso pendentes há mais de 7 dias viram EXPIRADO; o profissional é avisado
function expirarVinculos(banco) {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_VALIDADE_PEDIDO);
  const vencidos = banco
    .prepare(
      `SELECT v.id, v.profissional_id, v.origem, c.nome AS crianca_nome FROM vinculos v JOIN criancas c ON c.id = v.crianca_id
       WHERE v.status = 'PENDENTE' AND v.solicitado_em < ?`
    )
    .all(formatar(limite));
  if (vencidos.length === 0) return 0;
  const agora = agoraIso();
  const expirar = banco.prepare("UPDATE vinculos SET status = 'EXPIRADO', respondido_em = ? WHERE id = ?");
  const avisar = banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, criada_em) VALUES (?, ?, ?, ?)');
  banco.transaction(() => {
    for (const v of vencidos) {
      expirar.run(agora, v.id);
      // Pedido feito pelo código da família não revela o nome da criança (F-18)
      const quem = v.origem === 'CONVITE_RESPONSAVEL' ? 'um pedido de acesso' : `o pedido de acesso a ${v.crianca_nome}`;
      avisar.run(v.profissional_id, `A família não respondeu e ${quem} expirou. Se ainda precisar, peça de novo.`, '/clinica/criancas', agora);
    }
  })();
  return vencidos.length;
}

const dataLonga = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

// Lembrete para o responsável: consulta sem confirmação que acontece em até 3 dias. Um aviso por consulta.
function criarLembretesDeConfirmacao(banco, responsavelId) {
  const agora = agoraIso();
  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const consultas = banco
    .prepare(
      `SELECT c.id, c.inicio, cr.nome AS crianca_nome FROM consultas c JOIN criancas cr ON cr.id = c.crianca_id
       WHERE c.status = 'AGENDADA' AND c.presenca_confirmada = 0 AND c.inicio > ? AND c.inicio < ?
       AND c.crianca_id IN (SELECT crianca_id FROM responsaveis_crianca WHERE responsavel_id = ? AND saiu_em IS NULL)`
    )
    .all(agora, formatar(limite), responsavelId);
  const jaTem = banco.prepare('SELECT 1 FROM notificacoes WHERE usuario_id = ? AND texto = ?');
  const inserir = banco.prepare('INSERT INTO notificacoes (usuario_id, texto, link, criada_em) VALUES (?, ?, ?, ?)');
  for (const c of consultas) {
    const dia = new Date(c.inicio);
    const prazo = new Date(c.inicio);
    prazo.setDate(prazo.getDate() - 1);
    const texto = `Confirme a presença de ${c.crianca_nome} na consulta de ${dataLonga(dia)} até ${dataLonga(prazo)}.`;
    if (!jaTem.get(responsavelId, texto)) inserir.run(responsavelId, texto, '/familia/agenda', agora);
  }
}

module.exports = { expirarVinculos, criarLembretesDeConfirmacao };
