// npm run limpeza — inativa (30 dias) e exclui (90 dias) pré-cadastros que a família não ativou.
// Em produção seria agendado (cron); na demonstração roda à mão e também ao abrir a lista de pré-cadastros.
const { abrirBanco } = require('../config/banco');
const { executarLimpeza, DIAS_PARA_INATIVAR, DIAS_PARA_EXCLUIR } = require('../utils/limpeza');

const banco = abrirBanco();
const r = executarLimpeza(banco);
banco.close();
console.log(`Limpeza feita: ${r.inativados} pré-cadastro(s) inativado(s) (${DIAS_PARA_INATIVAR} dias) e ${r.excluidos} excluído(s) (${DIAS_PARA_EXCLUIR} dias).`);
