# 09 — Entrega, Demonstração e Pós-entrega

## 1. Como o projeto será rodado
- **Pré-requisito:** Node.js 20 ou superior.
- Back-end e front-end sobem com comandos simples (`npm install`, `npm run seed`, `npm run dev`), descritos no README final.
- Variáveis de ambiente (arquivo `.env` do back-end): porta, segredo do JWT, origem permitida do front.
- Banco: arquivo SQLite local; recriável a qualquer momento com o seed.
- **Onde roda:** no próprio computador de quem apresenta (sem hospedagem online). O celular dos pais é simulado por uma janela estreita do navegador (390 px) ou pelo celular na mesma rede Wi-Fi, se disponível.

## 2. Logins de demonstração (dados fictícios)

| Perfil | E-mail | Senha |
|---|---|---|
| Admin da clínica (código da clínica `AURORA`) | `admin@laco.test` | `123456` |
| Profissional (código da clínica `AURORA`) | `profissional@laco.test` | `123456` |
| Responsável | `responsavel@laco.test` | `123456` |
| Recepção (código da clínica `AURORA`) | código de usuário `recepcao` (sem e-mail) | `123456` |

> Somente para demonstração. Em qualquer uso real, estes usuários são removidos.
> A senha `123456` tem só 6 caracteres: o seed grava o hash direto no banco, sem passar pela validação de senha mínima de 8 caracteres (RN-13). Qualquer senha criada ou alterada pelo sistema continua exigindo 8 caracteres. Senha fraca aceitável apenas na demo; nunca em ambiente online com dados reais.

**Estado inicial do seed:** clínica "Clínica Aurora" (código `AURORA`) e clínica "Clínica Horizonte"; criança fictícia "Theo" com meses de registros, consultas e atividades de exemplo (para o relatório); **datas sempre relativas ao dia em que o seed roda** (nada fixo no calendário), com consultas passadas (uma de cada estado: Realizada, Faltou, Cancelada e Remarcada) e futuras (uma azul a 4+ dias, uma amarela a 2 ou 3 dias, uma vermelha a 1 dia e uma confirmada), com 3 profissionais na Clínica Aurora (Carlos, Ana, Paulo); a profissional Ana com uma **solicitação de vínculo pendente** para o Theo, para aprovar ao vivo; o profissional Carlos (Aurora) com vínculo **aprovado** com o Theo e uma consulta do Theo na Clínica Horizonte (quinta, 14h) para o **aviso de conflito**; um pré-cadastro "Davi" com **código de ativação** impresso no terminal ao rodar o seed; um pré-cadastro "Sofia" já **inativo** (31 dias) para mostrar a limpeza. Carlos e os usuários da Horizonte existem só para a demonstração (sem login listado). O segundo responsável é criado ao vivo pelo convite.

## 3. Roteiro de demonstração

### 3.1 Demo curta (5 min), usada na apresentação de 10 minutos
Preparação: reset do seed, 3 janelas já logadas (recepção, profissional, responsável) e zoom em 125%.
1. **Recepção (0:30):** `recepcao` (código de usuário) pré-cadastra o Davi e gera o código; só dados cadastrais.
2. **Família (0:40):** ativar a conta com código + data de nascimento (campos já abertos).
3. **Aprovação (0:40):** `responsavel@` vê o pedido da Dra. Ana para o Theo, escolhe o escopo e aprova.
4. **Profissional (1:00):** `profissional@` vê o Theo, registra uma sessão (com uma observação visível e outra só para ele) e cria uma atividade.
5. **Aviso de conflito (0:30):** encerrar a sessão do Theo, abrir **Nova consulta**, escolher quinta 14h e mostrar o aviso genérico de que ele já tem horário em outra clínica, sem outro dado.
6. **Família (0:40):** marcar a atividade e abrir o relatório de evolução.
7. **Transparência e controle (0:50):** painel "quem acessou" e revogar o profissional.
Se faltar tempo, cortar: cena 6, depois 5, depois 2. Duas pessoas: uma narra, a outra opera. Sem prints e sem vídeo de reserva: a demo roda ao vivo.

### 3.2 Demo completa (≈15 min)

1. **Problema (1 min):** histórico espalhado e dados sensíveis; a clínica traz a família.
2. **Recepção (computador):** entrar como Bia (código AURORA) → pré-cadastrar o Davi e gerar o código; mostrar que só aparecem dados cadastrais e o pré-cadastro "Sofia" inativo.
3. **Família (celular):** ativar a conta com o código + data de nascimento e aceitar o Termo.
4. **Responsável:** entrar como `responsavel@` → tela Hoje → solicitação pendente da Dra. Ana para o Theo.
5. **Aprovação:** mostrar clínica e especialidade, "histórico anterior = não", deixar "avisar conflitos com outras clínicas" ligado, aprovar.
6. **Pai e mãe:** gerar convite de responsável e entrar com o segundo aparelho; mostrar o aviso ao outro e o autor no log.
7. **Profissional (computador):** entrar como `profissional@` → criança aparece → perfil e linha do tempo.
8. **Aviso de conflito:** pela tela **Nova consulta**, agendar o Theo na quinta 14h e mostrar o aviso genérico de conflito com outra clínica, sem nenhum outro dado (a agenda da clínica continua mostrando só as próprias consultas).
9. **Rotina clínica:** novo registro de sessão + atividade de casa + **parecer** do período.
10. **Volta à família:** ver registro, marcar atividade como feita; abrir o **relatório de evolução** e imprimir/salvar PDF.
11. **Transparência:** painel "Quem acessou os dados do Theo".
12. **Saída de profissional:** `admin@` desativa o Carlos → vínculo **encerrado** na tela dos pais.
13. **LGPD e fechamento:** exportar dados, política de privacidade, roadmap (seção 6).

Dica: ter o comando de **reset do seed** pronto para repetir a demonstração.

## 4. Checklist de entrega
- [ ] Todos os critérios de saída do doc 08 atendidos
- [ ] Seed funcionando do zero
- [ ] README com instalação em menos de 5 passos
- [ ] Código comentado (amostragem de arquivos revisada)
- [ ] Nenhum segredo real no repositório; `.env.example` incluído
- [ ] Textos legais marcados como "rascunho para revisão jurídica"
- [ ] Roteiro de demonstração ensaiado uma vez
- [ ] Cópia de backup do projeto (pasta zipada, não vídeo nem prints)

## 5. Hospedagem (decidido)
Local, no computador de quem apresenta: sem risco de internet, instalação feita antes, sem vídeo e sem prints de reserva. Dados apenas fictícios. Opção online fica para a v2.

## 6. Roadmap pós-demonstração (v2)
1. Mais de dois responsáveis e fluxo para divergência entre responsáveis (com orientação jurídica).
2. E-mail/WhatsApp reais para convites e avisos.
3. Banco gerenciado (PostgreSQL) com criptografia e backups automáticos.
4. Autenticação em dois fatores para profissionais.
5. Relatórios de evolução e PDF.
6. Planos e cobrança de licenciamento das clínicas.
7. Revisão jurídica completa, RIPD formal e auditoria de segurança.
8. Aplicativo instalável (PWA) e depois nativo.

## 7. Limitações conhecidas da v1
- SQLite sem criptografia em repouso.
- E-mails simulados na tela.
- Sem faturamento ou convênios.
- Retenção de dados e textos legais pendentes de parecer jurídico.
- Planos e cobrança das clínicas não existem no sistema.
- Prazos de inativação/exclusão (30/90 dias) e regra para divergência entre responsáveis são sugestões, sem validação jurídica.
