# 05 — Arquitetura, Modelo de Dados e API

## 1. Visão geral

```
[ Navegador: React (Vite) ]  --HTTP/JSON + JWT-->  [ Node + Express ]  -->  [ SQLite (arquivo .db) ]
   telas PROF / ADM / RESP                          middlewares:
                                                    autenticação → permissão → auditoria
```

- Front e back são projetos separados.
- O front guarda o token JWT em `localStorage` e envia no cabeçalho `Authorization: Bearer ...`.
- O back **nunca confia** no front: toda regra de acesso é reavaliada em cada requisição.

## 2. Papéis no sistema

| Papel (campo `papel`) | Descrição |
|---|---|
| `RESPONSAVEL` | Pai/mãe/tutor |
| `PROFISSIONAL` | Terapeuta; conta vinculada a **uma única clínica** |
| `ADMIN_CLINICA` | Gestão da clínica (equipe, pré-cadastros, agenda); **sem acesso a dados clínicos** |
| `RECEPCAO` | Pré-cadastros e agenda da clínica; **sem acesso a dados clínicos** |

## 3. Modelo de dados (tabelas)

**clinicas**: id, nome, codigo_acesso (único, curto, usado no login da equipe), cnpj (opcional), email_contato, criada_em

**usuarios**: id, clinica_id (nulo para responsável), papel (`RESPONSAVEL`, `PROFISSIONAL`, `ADMIN_CLINICA`, `RECEPCAO`), nome, email (obrigatório, exceto para `RECEPCAO`), codigo_usuario (login da Recepção; único por clínica), senha_hash, especialidade (um dos valores da lista fixa; se `OUTRO`, vale `especialidade_outro`), especialidade_outro, registro_conselho, registro_numero, registro_uf, registro_profissional (opcional), ativo, desativado_em, motivo_desativacao, senha_temporaria, criado_em
*Regras de unicidade:* e-mail único por clínica (`clinica_id` + `email`) para equipe; e-mail único no sistema para responsáveis.

**consentimentos**: id, usuario_id, versao_termo, aceito_em, revogado_em

**criancas**: id (UUID), clinica_origem_id, status_cadastro (`PRE_CADASTRO`, `PRE_CADASTRO_INATIVO`, `ATIVA`), inativado_em, nome, data_nascimento, contato_responsavel_nome, contato_responsavel_parentesco (`MAE`, `PAI`, `OUTRO`), contato_responsavel_parentesco_outro (texto livre curto; só se `OUTRO`), contato_responsavel_email, contato_responsavel_telefone, nivel_suporte, comunicacao, sensibilidades, observacoes, criada_por, criada_em, anonimizada_em

**codigos_ativacao**: id, crianca_id, codigo_hash, criado_por (usuário da clínica), criado_em, expira_em, usado_em, cancelado_em, tentativas_falhas

**convites_compartilhamento**: id, crianca_id, codigo_hash, criado_por (responsável), criado_em, expira_em, usado_em

**responsaveis_crianca**: id, crianca_id, responsavel_id, parentesco (`MAE`, `PAI`, `OUTRO`), parentesco_outro (texto livre curto; só se `OUTRO`), entrou_em, saiu_em (máximo de 2 ativos por criança)

**convites_responsavel**: id, crianca_id, codigo_hash, criado_por (responsável), criado_em, expira_em, usado_em, tentativas_falhas

**pareceres**: id, crianca_id, profissional_id, periodo_inicio, periodo_fim, texto, publicado_em (não editável após publicar)

**log_exclusoes**: id, tipo (`PRE_CADASTRO_NAO_ATIVADO`), protocolo, motivo, excluido_em (**sem dados pessoais**)

**vinculos**: id, crianca_id, profissional_id, origem (`CLINICA_ORIGEM`, `MESMA_CLINICA`, `CONVITE_RESPONSAVEL`), solicitado_por, status (`PENDENTE`, `APROVADO`, `RECUSADO`, `REVOGADO`, `EXPIRADO`, `ENCERRADO`), ver_historico_anterior (0/1), ver_horarios_outras_clinicas (0/1, padrão 1), solicitado_em, respondido_em, aprovado_em, revogado_em, encerrado_em, motivo_encerramento

**consultas**: id, crianca_id, profissional_id, clinica_id, criada_por, inicio, duracao_min, tipo, status (`AGENDADA`, `REALIZADA`, `CANCELADA`, `REMARCADA`, `FALTA`), remarcada_para_id (nova consulta, quando remarcada), presenca_confirmada (0/1), confirmada_em, prazo_confirmacao (= início − 2 dias; calculado), aguardando_aprovacao (0/1, vínculo pendente), criada_em

**registros_sessao**: id, crianca_id, profissional_id, consulta_id (opcional), resumo, objetivos, humor (1–5), observacao, observacao_visivel_familia (0/1, padrão 0), criado_em

**adendos_registro**: id, registro_id, profissional_id, texto, criado_em

**atividades**: id, crianca_id, profissional_id, titulo, instrucoes, frequencia, prazo, status (`ATIVA`, `ENCERRADA`), criada_em

**execucoes_atividade**: id, atividade_id, data, como_foi (1–3), observacao, registrada_em

**log_acesso** (somente inserção): id, usuario_id, crianca_id, acao, recurso, recurso_id, ip, criado_em

**solicitacoes_lgpd**: id, responsavel_id, crianca_id, tipo (`EXPORTACAO`, `EXCLUSAO`, `REVOGACAO`), protocolo, status, criada_em, concluida_em

**notificacoes**: id, usuario_id, texto, link, lida, criada_em

### Relações principais
- clínica 1—N usuários (profissionais)
- clínica 1—N crianças (origem do pré-cadastro)
- responsável N—N crianças via `responsaveis_crianca` (até 2 por criança)
- criança N—N profissionais via **vinculos**
- criança 1—N consultas, registros, atividades, logs
- registro 1—N adendos; atividade 1—N execuções

## 4. Regra central de acesso (em português)

Para qualquer rota `/criancas/:id/...`:
1. Usuário autenticado e ativo? Se não → 401.
2. É `RESPONSAVEL` ativo em `responsaveis_crianca` dessa criança? → permitido.
3. É `PROFISSIONAL` com vínculo `APROVADO` para essa criança? Se não → **404** (não revelar existência).
4. Aplicar escopo: sem `ver_historico_anterior`, filtrar registros com `criado_em` anterior a `aprovado_em`.
5. O registro da sessão (resumo, objetivos, humor) é visível a todos os responsáveis da criança. A `observacao` com `observacao_visivel_familia = 0` só aparece para o autor; com 1, aparece para os responsáveis. Outros profissionais com vínculo e escopo veem o registro, mas nunca a observação privada.
6. Gravar em `log_acesso`.

**Exceção controlada:** as rotas `/clinica/pre-cadastros` devolvem somente dados cadastrais (nome, nascimento, contato do responsável, status) das crianças pré-cadastradas **pela própria clínica**, nunca dados clínicos e nunca de outras clínicas.

### 4.1 Perfis ADMIN_CLINICA e RECEPCAO
- Acessam somente rotas da própria clínica. O ADMIN: equipe, recepção, dados da clínica, pré-cadastros e agenda. A RECEPCAO: pré-cadastros e agenda, podendo criar, remarcar e cancelar consultas de crianças com vínculo aprovado com o profissional escolhido.
- Qualquer rota de registros, atividades, linha do tempo ou exportação da criança (inclusive pareceres e relatório) responde **404** para ADMIN e RECEPCAO. Aprovar/recusar/revogar vínculo responde **403**.

### 4.2 Desligamento de profissional
Ao desativar um profissional, em uma única operação: (1) `ativo = 0`; (2) todos os vínculos dele → `ENCERRADO`; (3) consultas futuras → `CANCELADA`; (4) notificações para famílias e ADM; (5) log. Todo middleware de autenticação confere `ativo` no banco a cada requisição, então o token antigo deixa de valer na hora. Reativar a conta **não** restaura vínculos.

### 4.3 Aviso de conflito entre clínicas
A agenda de uma clínica só lista consultas com `clinica_id` igual ao da própria clínica; nenhuma rota devolve consultas de outra clínica. Ao **criar ou remarcar** uma consulta da criança X com o profissional P da clínica C, o servidor verifica internamente se P tem vínculo `APROVADO` com X e `ver_horarios_outras_clinicas = 1`; se sim, procura consultas `AGENDADA` de X com `clinica_id <> C` que se sobreponham ao intervalo e devolve **apenas** `{ conflito: true }` (HTTP 409 até o cliente reenviar com `confirmar_conflito: true`). Nunca devolve clínica, profissional, tipo, status ou horário. Sem vínculo: 404. Escopo desligado: sem verificação. Cada verificação grava `log_acesso` com a ação `VERIFICAR_CONFLITO_AGENDA`. Detalhes de uma consulta só valem para o profissional da consulta, o ADMIN e a RECEPCAO da mesma clínica (sem dados clínicos) e os responsáveis.

### 4.3b Reconhecimento do profissional (tela de aprovação)
Ao montar a solicitação para o responsável, o servidor procura, para a mesma criança, vínculos (`APROVADO` ou `ENCERRADO`) de outros usuários `PROFISSIONAL` com o mesmo `registro_conselho + registro_numero + registro_uf` do solicitante em **outra** clínica. Se houver, devolve só `{ ja_atendeu: true, clinica_nome, periodo }` ao **responsável**. Nada disso vai para a clínica nova. O registro não é verificado em conselho nesta versão; por isso o texto na tela diz "mesmo registro profissional informado". Sem registro informado, não há reconhecimento.

### 4.3c Confirmação de presença e agenda amarela
A consulta nasce com `presenca_confirmada = 0`. O responsável confirma por `POST /consultas/:id/confirmar` até 1 dia antes da consulta (depois disso a API recusa e o app mostra "fale com a clínica"); a clínica registra a confirmação por telefone em `POST /consultas/:id/confirmar-contato`. A agenda da clínica calcula a cor na leitura: `presenca_confirmada = 1` → verde; senão, pela diferença de dias até `data_hora`: 4 ou mais → azul, 2 ou 3 → amarela, 1 → vermelha. A Recepção tem uma lista "Sem resposta" para contatar as famílias. Os avisos (nova consulta, remarcação, cancelamento, lembrete de confirmação, lembrete de atividades) são registros em uma tabela `avisos` mostrada no app; e-mail, push e WhatsApp ficam como próximo passo.

### 4.4 Dois responsáveis
Até 2 linhas ativas em `responsaveis_crianca` por criança. O segundo entra por `convites_responsavel` (código + data de nascimento + parentesco + aceite do Termo). Ações sensíveis (aprovar, recusar, revogar, mudar escopo, exportar, pedir exclusão, revogar consentimento, sair) gravam o autor em `log_acesso` e notificam o outro responsável. Não existe rota para um responsável remover o outro. O mesmo login pode ter várias sessões simultâneas (token sem estado).

### 4.5 Limpeza de pré-cadastros inativos
Constantes configuráveis (`DIAS_PARA_INATIVAR = 30`, `DIAS_PARA_EXCLUIR = 90`). Um script `npm run limpeza` marca como `PRE_CADASTRO_INATIVO` e exclui definitivamente quem passou do prazo, gravando só protocolo/data/motivo em `log_exclusoes`. A mesma verificação roda quando a clínica abre a lista de pré-cadastros. Em produção, o script é agendado (cron).

### 4.6 Relatório de evolução
Calculado na hora, sem armazenar cópia: para o período, conta consultas realizadas/faltas, adesão às atividades (execuções ÷ esperado), humor médio por semana e objetivos dos **registros compartilhados** a que o responsável já tem direito. Anexa os **pareceres publicados** do período. A "folha de impressão" é CSS de impressão do navegador.

## 5. API (rotas)

Prefixo `/api`. Todas exigem login, exceto as marcadas como públicas.

| Módulo | Método e rota | Perfil |
|---|---|---|
| Auth | POST `/auth/cadastro-clinica` (público) | — |
| Auth | POST `/criancas/adicionar` (responsável já logado: código de ativação + data de nascimento da criança; cria o vínculo em `responsaveis_crianca` e os vínculos PENDENTES com os profissionais indicados; mesmo limite de tentativas) | RESP |
| Auth | POST `/auth/ativar-conta` (público: código + data de nascimento da criança + dados do responsável + aceite do Termo; com limite de tentativas) | — |
| Auth | POST `/auth/login-responsavel` (e-mail + senha) · POST `/auth/login-clinica` (código da clínica + e-mail ou código de usuário + senha); ambos públicos e com limite de tentativas | — |
| Auth | GET `/auth/me` · POST `/auth/alterar-senha` | Todos |
| Auth | POST `/auth/aceitar-convite-responsavel` (público: código + data de nascimento + dados + Termo; limite de tentativas) | — |
| Público | GET `/politica-privacidade` · GET `/termo-consentimento` | — |
| Clínica | GET/PUT `/clinica` | ADM |
| Clínica | GET/POST `/clinica/profissionais` · PUT `/clinica/profissionais/:id` | ADM |
| Clínica | POST `/clinica/profissionais/:id/desativar` (aplica a regra 4.2) | ADM |
| Responsáveis | PUT `/responsaveis-crianca/:id/parentesco` (o próprio responsável corrige o parentesco, inclusive o texto de "Outro") | RESP |
| Clínica | GET/POST `/clinica/recepcao` · POST `/clinica/recepcao/:id/desativar` · POST `/clinica/recepcao/:id/redefinir-senha` (gera nova senha temporária; não existe rota de troca de senha para a Recepção) | ADM |
| Clínica | GET `/clinica/agenda` (sem dados clínicos) | ADM/REC |
| Pré-cadastro | GET/POST `/clinica/pre-cadastros` (só dados cadastrais) | PROF/ADM/REC |
| Pré-cadastro | POST `/clinica/pre-cadastros/:id/reemitir-codigo` · POST `/clinica/pre-cadastros/:id/cancelar-codigo` | PROF/ADM/REC |
| Pré-cadastro | POST `/clinica/pre-cadastros/:id/solicitar-vinculo` (profissional da mesma clínica) | PROF/ADM/REC |
| Crianças | GET `/criancas` (RESP: seus filhos; PROF: só vinculadas) | RESP / PROF |
| Crianças | GET/PUT `/criancas/:id` | RESP (GET/PUT) / PROF vinculado (GET) |
| Convites | POST `/criancas/:id/convites` (convite para outra clínica) | RESP |
| Responsáveis | POST `/criancas/:id/convites-responsavel` · POST `/responsaveis/aceitar-convite` (quem já tem conta) · POST `/criancas/:id/sair` | RESP |
| Vínculos | POST `/vinculos/solicitar` (body: código da família; a Recepção informa também o `profissional_id`; cria vínculo PENDENTE) | PROF, REC |
| Vínculos | GET `/vinculos` (pendentes e histórico) | RESP / PROF |
| Vínculos | POST `/vinculos/:id/aprovar` · `/recusar` · `/revogar` | RESP |
| Vínculos | PUT `/vinculos/:id/escopo` (histórico anterior, aviso de conflito) | RESP |
| Consultas | GET `/consultas` (filtros: dia, criança) · POST `/consultas` | PROF/REC (escrita) / RESP (GET) |
| Crianças | GET `/criancas/:id/responsaveis` (nome, parentesco e contato; exige vínculo aprovado do profissional ou, para a recepção, de um profissional da clínica; 404 se não) | PROF, REC |
| Agenda | POST `/consultas` e PUT `/consultas/:id/remarcar` (aplicam a regra 4.3; 409 `{conflito:true}` até confirmar) | PROF, REC |
| Consultas | PUT `/consultas/:id` · POST `/consultas/:id/confirmar-presenca` | PROF/REC / RESP |
| Sessões | GET/POST `/criancas/:id/registros` · POST `/registros/:id/adendos` | PROF / RESP (GET: registro completo; observação só se visível) |
| Linha do tempo | GET `/criancas/:id/linha-do-tempo` | PROF vinculado / RESP |
| Relatório | GET `/criancas/:id/relatorio?inicio=&fim=` | RESP |
| Pareceres | POST `/criancas/:id/pareceres` (publica) · GET `/criancas/:id/pareceres` | PROF vinculado (próprios) / RESP (publicados) |
| Atividades | GET/POST `/criancas/:id/atividades` · PUT `/atividades/:id` | PROF / RESP (GET) |
| Execuções | POST `/atividades/:id/execucoes` · GET `/atividades/:id/execucoes` | RESP / PROF |
| LGPD | GET `/criancas/:id/acessos` | RESP |
| LGPD | GET `/criancas/:id/exportar` | RESP |
| LGPD | POST `/lgpd/solicitacoes` · GET `/lgpd/solicitacoes` | RESP |
| Painéis | GET `/painel/profissional` · GET `/painel/responsavel` · GET `/painel/clinica` | PROF / RESP / ADM/REC |
| Avisos | GET `/notificacoes` · POST `/notificacoes/:id/ler` | Todos |

### Padrão de resposta
- Sucesso: `{ "dados": ... }`
- Erro: `{ "erro": "mensagem em português" }` com status 400/401/403/404/409/429/500.

## 6. Tarefas automáticas
- Ao consultar vínculos, convites e códigos de ativação, marcar como `EXPIRADO` os vencidos (verificação na hora da leitura; sem agendador).
- Pré-cadastros inativos: ver 4.5 (`npm run limpeza`).
