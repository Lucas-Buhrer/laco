# 07 — Plano de Tarefas (2 dias)

Como Claude executa todas as áreas e o dono orquestra, as tarefas são organizadas por **área de produção** e por **bloco de trabalho**. Cada tarefa tem uma definição de pronto (DoD).

Áreas: **PROD** produto · **ARQ** arquitetura · **BD** banco · **BE** back-end · **FE** front-end · **QA** testes · **SEG** segurança/LGPD · **ENT** entrega.

## Dia 0 — Planejamento (este pacote)
| ID | Tarefa | Área | Status |
|---|---|---|---|
| T-00 | Decisões, visão, PRD, personas | PROD | ✅ |
| T-01 | LGPD, arquitetura, dados, telas | SEG/ARQ | ✅ |
| T-02 | Plano, testes, entrega | QA/ENT | ✅ |
| T-03 | Aprovação do dono e respostas aos pontos em aberto | PROD | ✅ (falta só "pode começar") |

## Dia 1 — Fundação e núcleo (vínculo com aprovação)

| Bloco | ID | Tarefa | Área | Prio | DoD |
|---|---|---|---|---|---|
| Manhã 1 | T-10 | Criar estrutura de pastas e instalar dependências | ARQ | P0 | `npm run dev` sobe back e front ✅ |
| | T-11 | Criar `schema.sql` e script de criação do banco | BD | P0 | Tabelas do doc 05 criadas ✅ |
| | T-12 | Seed com clínica, 2 logins, criança e vínculo pendente | BD | P0 | `npm run seed` recria tudo ✅ |
| Manhã 2 | T-13 | Auth: cadastro de clínica (ADM + código da clínica), logins do responsável e da equipe, JWT, middleware que confere usuário ativo | BE | P0 | RF-01 a RF-04, RN-13, RN-20 ✅ |
| | T-14 | Middlewares de papel, erro e auditoria | BE/SEG | P0 | Log gravado em teste ✅ |
| | T-15 | Casca do front: rotas, contexto de login, layout, CSS base | FE | P0 | Login funcional nos 2 perfis ✅ |
| Tarde 1 | T-16 | Pré-cadastro da criança, código de ativação e ativação da conta do responsável (já com a tabela de responsáveis por criança) | BE | P0 | RF-02, RF-07, RF-20 a RF-25, RN-14 a RN-17 |
| | T-17 | **Vínculos: solicitar, aprovar, recusar, revogar** + regra central de acesso | BE/SEG | P0 | RF-30 a RF-35, RF-39, RN-01 a RN-04, RN-18, RN-19 |
| | T-18 | Telas do responsável: ativar conta, filhos, convidar outra clínica, solicitações, quem tem acesso | FE | P0 | Fluxo J2 e J5 completos |
| Tarde 2 | T-19 | Telas do profissional e do ADM: painéis, pré-cadastros, convite de outra clínica, lista de crianças, login em duas entradas | FE | P0 | Fluxo J1 e J2 completos |
| | T-20 | Gestão da equipe pelo ADM (profissionais e **Recepção**): cadastro, desativação com encerramento de vínculos e cancelamento de consultas | BE+FE | P0 | RF-10, RF-11, RF-14, RF-15, RN-21 a RN-23 |
| | T-21 | **Testes de segurança do vínculo** | QA | P0 | Casos S-01 a S-08, S-19 a S-25, S-29 e S-30 passam |

**Marco do Dia 1:** clínica pré-cadastra, família ativa a conta pelo código, aprova/revoga cada profissional, e o profissional só vê o que foi autorizado.

## Dia 2 — Funcionalidades clínicas, LGPD, qualidade, entrega

| Bloco | ID | Tarefa | Área | Prio | DoD |
|---|---|---|---|---|---|
| Manhã 1 | T-30 | Consultas (inclusive pela Recepção) e **aviso de conflito entre clínicas** (escopo, verificação ao agendar, agenda do ADM/REC) | BE+FE | P0 | RF-40 a RF-45, RF-48, RF-49, RN-24 a RN-27, S-26 a S-28, S-31 |
| | T-31 | Registro de sessão, adendos, linha do tempo, privacidade do registro | BE+FE | P0 | RF-50 a RF-54 |
| Manhã 2 | T-32 | Atividades de casa e execuções (celular primeiro) | BE+FE | P0 | RF-60 a RF-63 |
| | T-33 | Painéis dos dois perfis | BE+FE | P0 | RF-80, RF-81 |
| Tarde 1 | T-34 | LGPD: painel de acessos, exportação, solicitações, política/termo | BE+FE | P0/P1 | RF-70 a RF-76 |
| | T-35 | Notificações internas | BE+FE | P1 | RF-90 |
| | T-36 | Conflito de horário, expiração de convite/vínculo, confirmação de presença (prazo de **1 dia antes**; depois, só contato com a clínica) | BE | P1 | RF-36, RF-44, RF-46 |
| | T-43 | **Agenda viva:** cores por dias que faltam (azul, amarelo, vermelho, verde), coluna por profissional, destaque do dia de hoje, estados de consultas passadas (Realizada, Remarcada, Cancelada, Faltou) | BE+FE | P0 | RF-47a, RF-42a, RN-35 |
| | T-44 | **Ações da consulta:** remarcar, cancelar, marcar realizada/faltou (só depois do horário), registrar confirmação por telefone; aviso à família | BE+FE | P0 | RF-42a, RF-44, F-49 a F-49d |
| | T-40 | **Segundo responsável:** convite, aceite, sair, avisos ao outro, vários aparelhos | BE+FE | P1 | RF-08, RF-09, RN-28 a RN-31 |
| | T-41 | **Pré-cadastros inativos:** inativação aos 30 dias, exclusão aos 90, log sem dados pessoais, script `npm run limpeza` | BE+FE | P1 | RF-28, RN-33 |
| | T-42 | **Relatório de evolução** e parecer do profissional, com folha de impressão | BE+FE | P1 | RF-55 a RF-57, RN-34 |
| Tarde 2 | T-37 | Revisão de UX: estados vazio/erro (telas R23, R24, E1 a E5), 360px, acessibilidade, relatório A4 | FE | P0 | Checklist do doc 06 |
| | T-38 | Testes completos e correção de bugs | QA | P0 | Critérios de saída do doc 08 |
| | T-39 | README, roteiro de demonstração, ensaio | ENT | P0 | Doc 09 pronto |

## Como tudo cabe em 2 dias
Decisão do dono: **entregar todo o escopo em 2 dias**, sem dia de reserva e sem cortes. Para isso:
- **Telas já desenhadas** (Design, 60+ telas): o front só traduz o desenho em React, sem decidir layout.
- **Ordem dentro de cada bloco:** primeiro P0, depois P1. Se um bloco atrasar, o que sobra vai para o fim do dia seguinte, nunca é descartado.
- **Código simples e repetitivo:** mesmos padrões de rota, tela e CSS em todos os módulos (o Claude reaproveita o primeiro módulo pronto).
- **Teste junto com a construção:** cada tarefa termina com o seu teste (DoD); o bloco final só repassa a lista completa.
- **Trabalho extra incluído abaixo:** cores e estados da agenda (T-43), ações da consulta (T-44), estados vazios e de erro (T-37, já com as telas R22 a R25 e E1 a E5 desenhadas).

## Dependências críticas
T-11 → T-13 → T-16 → T-17 → (T-30, T-31, T-32). Nada clínico começa antes de o vínculo estar testado.

## Riscos de cronograma
- Escopo completo em 2 dias é agressivo. Mitigações: telas prontas, padrões repetidos, testes junto com o código e ordem P0 → P1 em cada bloco.
- Agenda viva (cores, colunas, estados) e ações da consulta são os itens mais trabalhosos do Dia 2; entram logo no primeiro bloco da manhã.
- Se um item P1 atrasar, ele é o último a ser terminado, nunca o primeiro a ser abandonado: a apresentação é na semana seguinte, com folga para ajustes finais.
- Dúvidas jurídicas **não** bloqueiam a demo: textos legais ficam marcados como "rascunho".

## Cerimônias (enxutas)
- Início de cada dia: confirmar o bloco do dia.
- Fim de cada bloco: demonstrar ao dono o que ficou pronto.
- Fim do dia: atualizar status neste arquivo.
