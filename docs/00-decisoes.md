# 00 — Decisões do Projeto

> Nome do produto: **LAÇO**. Software **vendido para clínicas** (modelo B2B).

## 1. Decisões tomadas

| Tema | Decisão | Motivo |
|---|---|---|
| Quem executa | Claude executa todas as áreas; o dono do projeto orquestra e aprova | Definido pelo dono |
| Escopo | Software **completo** (sem "MVP"), priorizado em P0/P1/P2 | Definido pelo dono |
| Prazo | 2 dias de execução, entregando tudo; apresentação na semana seguinte | Definido pelo dono |
| Front-end | React + Vite, **JavaScript** (sem TypeScript), **CSS comum** (sem Tailwind) | Simplicidade |
| Back-end | Node.js + **Express** (JavaScript) | Rotas legíveis e fáceis de comentar |
| Banco | **SQLite** (um arquivo `.db`) | Zero instalação, ideal para o prazo |
| Login | E-mail + senha, senha criptografada (bcrypt), sessão por **JWT** | Simples e suficiente |
| Modelo comercial | Venda do software para **clínicas** (licenciamento); cobrança fica fora do sistema na v1 | Definido pelo dono |
| Entrada da família | O responsável **não se cadastra sozinho**: a clínica pré-cadastra a criança e entrega um **código de ativação** do app | Definido pelo dono |
| Quem cadastra a criança | A **clínica** (pré-cadastro com dados mínimos) | Decidido com o dono |
| Antes da aprovação | Clínica vê **somente dados cadastrais**; nada clínico e sem agendar | Decidido com o dono |
| Aprovação do responsável | Sempre **por profissional** (nunca pela clínica inteira) | Decidido com o dono |
| Segunda clínica | Acessa a mesma criança por **código de convite gerado pelo responsável** | Decidido com o dono |
| Perfis | `RESPONSAVEL`, `PROFISSIONAL`, `ADMIN_CLINICA` e `RECEPCAO` (os dois últimos **sem acesso clínico**) | Decidido com o dono |
| Conta da equipe | Uma conta **por clínica**; mesmo e-mail permitido em clínicas diferentes; login com **código da clínica** + e-mail + senha | Decidido com o dono |
| Saída de profissional | Admin desativa a conta → vínculos **encerrados na hora**; em outra clínica, nova conta e **nova aprovação** dos pais | Decidido com o dono |
| Conflito de agenda entre clínicas | A agenda de cada clínica mostra **só as crianças e consultas da própria clínica**. Uma clínica nunca vê a agenda de outra. Só **na hora de agendar** uma consulta para a criança X o sistema avisa, **sem detalhes**, que X já tem horário em outra clínica nesse intervalo (escopo ligado por padrão; pais podem desligar). O aviso pede confirmação, não bloqueia | Decidido com o dono (corrigido em 07/11) |
| Módulo financeiro | **Não será criado no projeto.** Aparece só nos slides, para a banca conhecer a visão de produto (atrativo comercial para a clínica) | Decidido com o dono em 07/11 |
| Confirmação de consulta | Consulta nova nasce "aguardando confirmação" (cores na agenda conforme os dias que faltam: azul (4+ dias), amarelo (2 a 3), vermelho (1 dia, a clínica liga para os responsáveis), verde se confirmada; pais confirmam no app até **1 dia antes**; depois disso, só entrando em contato com a clínica, que pode registrar a confirmação por telefone; a consulta nunca é cancelada sozinha) | Decidido com o dono (registro por telefone sugerido) |
| Especialidades | Lista fixa no cadastro do profissional: Psicólogo(a), Psicólogo(a) ABA, Psiquiatra infantil, Neuropediatra, Pediatra do desenvolvimento, Psicopedagogo(a), Fisioterapeuta, Terapeuta ocupacional, Fonoaudiólogo(a), Nutricionista, Dentista (atendimento especial), Musicoterapeuta, Psicomotricista, Acompanhante terapêutico, Mediador(a) escolar, Assistente social, Outro. Usada nos pedidos de acesso e telas de equipe | Decidido com o dono |
| Detalhes da consulta | Só o profissional da consulta, o admin e a recepção da clínica (sem dados clínicos) e o responsável | Decidido com o dono |
| Responsáveis | Até **2 por criança** (pai e mãe), contas separadas e **mesmo poder**; o segundo entra por **código de convite**; o mesmo login pode ser usado em vários aparelhos | Decidido com o dono |
| Perfil Recepção | Pré-cadastra crianças, gera códigos e agenda/remarca/cancela consultas de crianças já aprovadas; nunca vê dados clínicos | Decidido com o dono |
| Pré-cadastro não ativado | **Inativo aos 30 dias**, **excluído aos 90 dias** (valores sugeridos e configuráveis; validar com jurídico) | Decidido com o dono |
| Relatório de evolução | Automático (consultas, faltas, adesão, humor, objetivos) + **parecer opcional** do profissional; impressão/PDF pelo navegador | Decidido com o dono |
| App dos pais | **Web responsivo** (mesmo projeto React, telas pensadas para celular) | Evita 2 projetos |
| Documentação | Arquivos `.md` na pasta `docs/` | Versionados com o código |
| Código | Comentado em português, estilo simples e explícito | Para o dono entender tudo |

## 2. Regras de código (valem para todo o projeto)

1. JavaScript puro. Sem TypeScript, sem Tailwind, sem bibliotecas de UI.
2. Funções pequenas, nomes em português ou muito descritivos, um comentário explicando **o porquê** de cada bloco importante.
3. Sem "mágica": nada de decorators, ORMs, geradores de código ou abstrações complexas.
4. Uma responsabilidade por arquivo (rota, controlador, consulta SQL, tela).
5. SQL escrito à mão, com parâmetros (`?`) — nunca concatenar texto do usuário.
6. Estado do React com `useState`/`useEffect`/`useContext` apenas (sem Redux).
7. Chamadas à API com `fetch` nativo, centralizadas em um único arquivo.

## 3. Dependências permitidas (lista fechada)

**Back-end:** `express`, `cors`, `better-sqlite3`, `bcryptjs`, `jsonwebtoken`, `helmet`, `express-rate-limit`, `dotenv`.
**Front-end:** `react`, `react-dom`, `react-router-dom`, `vite`, `@vitejs/plugin-react`.
**Testes:** runner nativo do Node (`node --test`), sem Jest.
**PDF do relatório:** impressão do navegador (CSS de impressão), sem biblioteca.

Qualquer dependência fora desta lista precisa de aprovação.

## 4. Estrutura de pastas (prevista)

```
laco/
├── docs/                 documentação (estes arquivos)
├── backend/
│   ├── src/
│   │   ├── config/       variáveis de ambiente, conexão com o banco
│   │   ├── database/     schema.sql, seed.js
│   │   ├── middlewares/  autenticação, permissões, auditoria, erros
│   │   ├── routes/       definição das rotas por módulo
│   │   ├── controllers/  lógica de cada rota
│   │   └── app.js / server.js
│   └── tests/
└── frontend/
    └── src/
        ├── api/          arquivo único de chamadas HTTP
        ├── context/      contexto de autenticação
        ├── components/   peças reutilizáveis
        ├── pages/        telas (profissional/ e responsavel/)
        ├── styles/       CSS comum
        └── App.jsx / main.jsx
```

## 5. Pontos ainda em aberto (decidir antes de codar)

- [ ] Identidade visual do LAÇO (logotipo e cores; as cores do doc 06 são provisórias).
- [ ] Texto final do Termo de Consentimento e da Política de Privacidade (revisão jurídica).
- [ ] Prazo de retenção dos dados (depende de orientação jurídica/conselhos profissionais).
- [ ] Prazos de inativação e exclusão do pré-cadastro (30/90 dias são **sugestão**; sem jurídico por enquanto, ficam configuráveis).
- [ ] Regra para divergência entre os dois responsáveis (ex.: pais separados); fora do sistema até haver orientação jurídica.
- [ ] Hospedagem para a apresentação (local no notebook ou online).
