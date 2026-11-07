# Como começar no VS Code

## Uma vez só
1. Instale Node.js 20+ e o VS Code. Instale a extensão **Claude Code** (ou rode `claude` no terminal do VS Code).
2. Descompacte esta pasta (`laco`) e abra-a no VS Code (Arquivo > Abrir Pasta).
3. No terminal: `git init` e `git add . && git commit -m "Planejamento"`.
4. Abra o Claude Code na pasta. Ele lê o `CLAUDE.md` sozinho.
5. Confirme que `.claude/settings.json` foi carregado (rode `/permissions`).

## Rotina de cada tarefa
1. `/clear` (começa limpo, gasta menos).
2. `/tarefa T-10` (depois T-11, T-12... na ordem do doc 07).
3. Em tarefas de acesso/vínculo (T-13, T-14, T-17), comece no modo plano (Shift+Tab) e aprove o plano antes.
4. Ao terminar: veja o commit, rode `/testar` se quiser conferir, e vá para a próxima.
5. Depois de T-17, T-30 e T-40, rode `/revisar-seguranca`.

## Modelo
- Padrão: Sonnet. Para T-17 (regra central de acesso) e `/revisar-seguranca`, troque para Opus com `/model` e volte depois.

## Dicas de economia
- Uma tarefa por conversa. Conversa longa: `/compact`.
- Peça pelo ID (T-xx), nunca "continue".
- Para a tela, diga "faça a tela D20-Consulta" e eu abro só esse arquivo em `docs/telas`.
- Para ver o desenho: abra o link do Design (ou abra um `.dc.html` no navegador).

## Antes da apresentação
`npm run seed` no mesmo dia (datas relativas a hoje), 3 janelas já logadas (recepção, profissional, responsável), zoom 125%.
