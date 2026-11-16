# 08 — Plano de Testes

## 1. Estratégia

| Nível | O que cobre | Ferramenta |
|---|---|---|
| Automatizado de API | Regras de negócio, permissões, vínculo, log | `node --test` + `fetch`, banco SQLite temporário |
| Manual de interface | Telas, fluxos, responsividade | Roteiro (seção 4) |
| Segurança / LGPD | Acesso indevido, revogação, privacidade | Casos S-xx (seção 3), automatizados |
| Aceite (UAT) | Fluxos J1–J6 com o dono | Checklist final |

Prioridade de testes: **segurança do vínculo > LGPD > regras clínicas > interface**.

## 2. Casos de teste funcionais (API)

| ID | Caso | Resultado esperado |
|---|---|---|
| F-01 | Cadastrar clínica | Cria clínica + admin; login funciona |
| F-02 | Ativar conta sem aceitar o Termo | Rejeitado (400) |
| F-03 | Login com senha errada | 401, mensagem genérica |
| F-04 | 6 logins errados seguidos | 429 |
| F-05 | Senha com menos de 8 caracteres | 400 |
| F-06 | Clínica pré-cadastra criança e gera código | Criança em PRE_CADASTRO; clínica vê só dados cadastrais |
| F-07 | Responsável ativa a conta com código + data de nascimento | Conta criada, criança ATIVA, solicitações PENDENTES para os profissionais indicados, código usado |
| F-08 | Código de ativação usado, vencido, cancelado ou com data de nascimento errada | 409 / 400, sem revelar qual dado falhou |
| F-09 | Aprovar vínculo | Status APROVADO; profissional passa a ver a criança |
| F-10 | Agendar consulta com conflito de horário | 409 |
| F-11 | Criar registro com observação "Mostrar para a família" | Responsável vê registro e observação |
| F-12 | Criar registro com observação "Só para mim" | Responsável vê o registro, mas **não** a observação |
| F-13 | Tentar editar/apagar registro | Não existe rota; adendo funciona |
| F-14 | Criar atividade e registrar execução | Profissional vê a adesão |
| F-15 | ADM cadastra e desativa profissional | Profissional desativado não loga |
| F-16 | Exportar dados da criança | Contém dados, registros compartilhados, atividades, vínculos |
| F-17 | Excluir o cadastro do filho (digitando o nome) | Tudo da criança é apagado na hora; fica só protocolo sem nome; profissionais, clínica e outro responsável avisados no app |
| F-18 | Responsável gera convite de compartilhamento e profissional de outra clínica o usa | Solicitação PENDENTE; nenhum dado visível |
| F-19 | Reemitir código de ativação | Código antigo deixa de funcionar |
| F-20 | ADM cadastra profissional; login com código da clínica + e-mail + senha | Funciona; código errado → 401 |
| F-21 | Mesmo e-mail cadastrado em duas clínicas | Duas contas independentes, sem vínculos em comum |
| F-22 | ADM desativa profissional com vínculos e consultas futuras | Vínculos ENCERRADO, consultas canceladas, famílias e ADM avisados |
| F-23 | Reativar profissional desativado | Conta volta, vínculos **não** voltam |
| F-24 | Agendar com sobreposição a consulta de outra clínica, vínculo aprovado e escopo ligado | 409 com `{conflito:true}` apenas |
| F-25 | Conteúdo da resposta de conflito e da agenda | Sem clínica, profissional, tipo, status ou horário; agenda só com consultas da própria clínica |
| F-26 | Responsável desliga o escopo de horários | Próxima consulta devolve lista vazia |
| F-27 | Agendar com conflito em outra clínica | Aviso; reenviar com confirmação permite agendar |
| F-28 | ADM vê a agenda da clínica | Criança, horário e profissional; nenhum dado clínico |
| F-29 | Responsável gera convite; segundo responsável ativa com código + data de nascimento + Termo | Acesso concedido; convite usado |
| F-30 | Terceiro responsável tenta entrar | 409 (limite de 2) |
| F-31 | Mesmo login em dois aparelhos ao mesmo tempo | Ambas as sessões funcionam |
| F-32 | Um responsável aprova/revoga profissional | O outro é avisado; log mostra o autor |
| F-33 | Responsável sai da criança | Perde o acesso; o outro mantém |
| F-34 | Recepção pré-cadastra, gera código e agenda consulta com profissional aprovado | Funciona; nenhum dado clínico exibido |
| F-35 | Recepção agenda para criança sem vínculo aprovado com o profissional | Recusado |
| F-36 | Pré-cadastro não ativado por 30 dias | INATIVO; clínica avisada; novo código reativa |
| F-37 | Pré-cadastro não ativado por 90 dias | Excluído; log sem dados pessoais |
| F-38 | Relatório de um período | Consultas, faltas, adesão, humor e objetivos corretos |
| F-39 | Profissional publica parecer | Responsável vê no relatório; não é editável |
| F-40 | Observação privada ou dado fora do escopo | Não entra no relatório |
| F-41 | Responsável logado adiciona segundo filho com código + data de nascimento válidos | Filho aparece no seletor; vínculos PENDENTES criados |
| F-42 | Tela Hoje com dois filhos | Itens dos dois filhos aparecem com o nome da criança; filtro mostra só um |
| F-43 | Recepção entra com código da clínica + código de usuário + senha | Login ok; e-mail não é exigido |
| F-44 | ADM redefine a senha da Recepção | Nova senha temporária funciona; a antiga deixa de valer |
| F-45 | Recepção insere código da família e escolhe o profissional | Vínculo PENDENTE criado; Recepção agenda; consulta marcada "Aguardando aprovação" |
| F-46 | Profissional com mesmo registro (conselho+número+UF) que já atendeu a criança em outra clínica pede acesso | Responsável vê "já atendeu ... na Clínica X"; sem registro, não aparece |
| F-47 | Consulta nova criada | Aparece em amarelo na agenda da clínica e gera aviso ao responsável |
| F-48 | Responsável confirma presença antes do prazo | Consulta fica verde para a clínica |
| F-49 | Consulta sem confirmação com 4+, 2 a 3 e 1 dia restantes | Aparece azul ("Restam X dias"), amarela e vermelha ("Falta 1 dia: ligar"), com o alerta na Recepção no vermelho |
| F-49c | Consulta passa da data | Aparece como Realizada, Remarcada (com a nova data), Cancelada ou Faltou em todas as agendas, inclusive na aba "Anteriores" dos pais |
| F-49b | Consulta chega a 1 dia sem confirmação | Continua vermelha, nunca é cancelada sozinha; o responsável pode confirmar até esse dia, e depois o botão some e a API recusa |
| F-49d | Prazo encerrado | App mostra "prazo encerrado, fale com a clínica"; Recepção e profissional registram "Confirmada por contato" e a consulta fica verde |
| F-50 | Lembrete diário de atividades | Responsável vê aviso das atividades pendentes |

## 3. Casos de segurança e LGPD (críticos)

| ID | Caso | Resultado esperado |
|---|---|---|
| S-01 | Profissional sem vínculo acessa `/criancas/:id` | 404 |
| S-02 | Profissional com vínculo PENDENTE acessa | 404 |
| S-03 | Profissional com vínculo RECUSADO acessa | 404 |
| S-04 | Aprovado → responsável revoga → profissional acessa de novo | 404 imediato |
| S-05 | Profissional A acessa recursos da criança de B (consultas, registros, atividades) | 404/403 |
| S-06 | Responsável acessa criança de outro responsável | 404 |
| S-07 | Chamada sem token / token adulterado / token expirado | 401 |
| S-08 | Responsável tenta usar rota de profissional (e vice-versa) | 403 |
| S-09 | Aprovar vínculo sendo profissional | 403 |
| S-10 | Sem "histórico anterior": profissional vê só registros posteriores à aprovação | Confere |
| S-11 | Profissional desativado usa token antigo | 401/403 |
| S-12 | ADM de uma clínica gerencia profissional de outra | 403 |
| S-13 | Injeção de SQL nos campos de texto e busca | Sem efeito; tratado como texto |
| S-14 | Todo acesso do profissional gera `log_acesso` | Linha criada |
| S-15 | Responsável vê o log somente da própria criança | Confere |
| S-16 | Senha nunca aparece em respostas nem logs | Confere |
| S-17 | Texto com HTML/script nos campos | Exibido como texto, sem executar |
| S-18 | Revogar consentimento encerra todos os vínculos | Confere |
| S-19 | Clínica tenta ver registros, atividades ou agenda clínica antes da aprovação | 404 |
| S-20 | Clínica A tenta ver pré-cadastro da clínica B | 404 |
| S-21 | Força bruta no código de ativação | 429 e código bloqueado após limite |
| S-22 | Profissional novo da clínica (sem aprovação) tenta ver criança já ativa | 404 |
| S-23 | Tentativa de autocadastro de responsável sem código | Rota inexistente / 404 |
| S-24 | ADM tenta ler registros, atividades, linha do tempo ou exportação de uma criança | 404 |
| S-25 | ADM tenta aprovar, recusar ou revogar vínculo | 403 |
| S-26 | Profissional sem vínculo tenta agendar a criança | 404 (sem revelar conflito) |
| S-27 | Profissional A abre detalhes de consulta do profissional B (mesma clínica) | 404 |
| S-28 | Profissional de outra clínica abre uma consulta por ID | 404 |
| S-29 | Token de profissional desativado | 401 imediato |
| S-30 | Código de clínica A com credenciais da clínica B | 401 |
| S-31 | Verificação de conflito gera log visível ao responsável | Linha criada e exibida |
| S-32 | Recepção tenta ler registros, atividades, linha do tempo, pareceres ou relatório | 404 |
| S-33 | Recepção tenta aprovar, recusar ou revogar vínculo | 403 |
| S-34 | Recepção da clínica A vê pré-cadastro ou agenda da clínica B | 404 |
| S-35 | Responsável tenta remover o outro responsável | Rota inexistente / 403 |
| S-36 | Responsável de outra criança acessa o relatório | 404 |
| S-37 | Convite de responsável usado de novo, vencido ou com força bruta | 409 / 400 / 429 |
| S-38 | Profissional sem vínculo lê pareceres ou relatório | 404 |
| S-39 | Pré-cadastro excluído: tentativa de recuperar dados | Impossível; log sem dados pessoais |
| S-40 | Adicionar filho com código errado, vencido ou já usado; excesso de tentativas | Rejeitado com mensagem genérica; bloqueio por limite de tentativas |
| S-41 | Responsável tenta ver dados do filho de outra família ou de um filho ao qual não tem vínculo | 404 |
| S-42 | Recepção tenta trocar a própria senha ou a de outro usuário | Rota inexistente / 404 |
| S-43 | Recepção com vínculo PENDENTE tenta ler registros ou atividades da criança | 404 (só dados cadastrais) |
| S-44 | Clínica nova ou profissional solicitante tenta ler o aviso de reconhecimento | Resposta só ao responsável; nenhuma rota entrega isso à clínica |

## 4. Roteiro manual de interface

1. Cadastrar clínica → criar profissional (J1).
2. Profissional pré-cadastra a criança e gera o código de ativação (J2).
3. Responsável ativa a conta com o código + data de nascimento (lendo o Termo) → confirmar que o profissional **não** vê nada clínico ainda.
4. Responsável vê a solicitação → aprova. Repetir com convite de outra clínica (J7).
5. Profissional: registrar sessão (observação visível e observação só para o profissional), criar atividade, agendar consulta (J3).
6. Responsável no celular (360px): ver Hoje, marcar atividade, confirmar consulta (J4).
7. Responsável: painel de acessos mostra os acessos do profissional.
8. Responsável: revogar → profissional atualiza a tela e perde acesso (J5).
9. Exportar dados e excluir o cadastro do filho (J6).
10. Navegar só com teclado nas telas de login e aprovação.
11. ADM desativa um profissional → conferir vínculos encerrados e o aviso à família (J8); repetir a entrada do mesmo e-mail em outra clínica e exigir nova aprovação.
12. Aviso de conflito: agendar o Theo na quinta 14h, ver o aviso genérico, desligar o escopo e conferir que o aviso some (J9).
13. Pai e mãe: gerar convite de responsável, entrar pelo segundo aparelho, aprovar/revogar e conferir aviso e log (J10).
14. Recepção: pré-cadastrar, agendar, ver pré-cadastro virar inativo (data simulada) (J11).
15. Relatório: publicar parecer, gerar relatório, imprimir/salvar PDF (J12).

## 5. Estados e usabilidade
Verificar em cada tela: carregando, vazio, erro, sucesso. Teste de 5 minutos com uma pessoa leiga para O3 e O4 do doc 01.

## 6. Dados de teste
Usar o `seed` (doc 09). Testes automatizados criam banco temporário próprio e o descartam no final.

## 7. Gravidade de defeitos

| Nível | Exemplo | Regra |
|---|---|---|
| Crítico | Acesso sem vínculo, vazamento | Bloqueia entrega |
| Alto | Fluxo principal quebrado | Corrigir antes da demo |
| Médio | Erro em fluxo secundário | Corrigir se houver tempo |
| Baixo | Texto, alinhamento | Backlog |

## 8. Critérios de saída (pronto para apresentar)
- 100% dos casos **S-xx** passando.
- 100% dos casos F-xx de prioridade P0 passando.
- Roteiro manual completo sem defeito crítico ou alto.
- Checklist LGPD do doc 04 completo.

## 9. Cobertura automatizada (T-38)

`npm test` roda 144 testes em `backend/tests/` (banco em memória + seed). Resumo de onde cada grupo está:

| Arquivo | Casos |
|---|---|
| `auth.test.js` | F-01, F-03 a F-05, F-20, F-21, F-43, S-07, S-11, S-16, S-29, S-30, S-42 |
| `precadastro.test.js` | F-02, F-06 a F-08, F-19, F-41, S-20, S-21, S-23, S-40 |
| `vinculos.test.js` + `seguranca-vinculo.test.js` | F-09, F-18, S-01 a S-06, S-08, S-09, S-10, S-22, S-24, S-25, S-32, S-33, S-41 |
| `equipe.test.js` + `completos.test.js` | F-15, F-22, F-23, F-44, S-12 (404 em vez de 403) |
| `consultas.test.js` + `consultas-acoes.test.js` | F-10, F-24 a F-28, F-34, F-35, F-45, F-47 a F-49d, S-26 a S-28, S-31 |
| `registros.test.js` + `atividades.test.js` | F-11 a F-14, S-19, S-43 |
| `lgpd.test.js` | F-16, F-17, S-15, S-18 |
| `responsaveis.test.js` | F-29 a F-33, S-35, S-37 |
| `limpeza.test.js` | F-36, F-37, S-39 |
| `relatorio.test.js` | F-38 a F-40, S-36, S-38 |
| `painel.test.js` + `notificacoes.test.js` + `expiracao.test.js` | RF-36, RF-46, RF-80, RF-81, RF-90 |
| `completos.test.js` | F-46, F-50, S-13, S-17, S-44 |

**Só no roteiro manual** (dependem da tela): F-42 (filtro por filho na tela Hoje), cores visuais da agenda, folha de impressão A4 e a leitura em 360px.

**Diferenças para o texto dos casos:** S-12 devolve 404 (não 403) para não revelar que o profissional de outra clínica existe; papéis trocados em rotas de outra área devolvem 403.
