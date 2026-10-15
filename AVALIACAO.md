# Avaliação: GitHub Actions com IA

Dupla: Bruno Augusto (RA 2026107709) e Vinicius Kichel Derganho (RA 2026107869)

Repositório: https://github.com/brunosjp/aula-web
Site: Cloudflare Pages + Functions + D1 (`aula-web-db`), login OAuth Google/GitHub.

## Tarefa 1: CI a cada commit

Workflow: `.github/workflows/ci.yml`, disparado em todo `push` e em todo `pull_request` para a `main`, com três verificações (segredos versionados, migrações D1 em SQLite local, HTML com `htmlhint`).

- Execução verde: https://github.com/brunosjp/aula-web/actions/runs/38771870084
- Execução vermelha (migração `0002` com `ALTER TABEL`): https://github.com/brunosjp/aula-web/actions/runs/38775871832
- Linha do log com o erro: `Parse error near line 3: near "TABEL": syntax error`
- Por que testar a migração em SQLite antes do D1: o D1 usa o mesmo motor SQLite, então um erro de sintaxe aparece no CI em segundos e sem custo, em vez de quebrar a migração no banco de produção depois do merge.

Limite observado: a primeira tentativa de erro foi `ALTER TABLE notas ADD COLUMN turma TEXT DEFALT '3ESAN';` (com `DEFALT` em vez de `DEFAULT`) e o CI passou (https://github.com/brunosjp/aula-web/actions/runs/38775456850). O SQLite aceita várias palavras como nome de tipo, então gravou a coluna com o tipo `TEXT DEFALT '3ESAN'` e sem valor padrão. O teste em SQLite pega erro de sintaxe, mas não pega um comando válido que faz algo diferente do pretendido.

Ajuste feito no esqueleto: o `git grep` procurava `GOCSPX-` em todo o repositório, inclusive no próprio `ci.yml`, que contém esse texto. O CI falharia sempre. O próprio workflow foi excluído da busca (`':!.github/workflows/ci.yml'`).

## Tarefa 2: proteger a `main` com o CI

Regra em Settings > Branches para `main`: exige pull request, exige o status check `verificar` e não permite bypass para administradores.

- PR bloqueado e depois liberado: https://github.com/brunosjp/aula-web/pull/1
  - Bloqueado com `ci / verificar` falhando (commit `02722f9`, migração com erro): https://github.com/brunosjp/aula-web/actions/runs/38775871832
  - Liberado após a correção na mesma ramificação (commit `ae4f412`): https://github.com/brunosjp/aula-web/actions/runs/38776996363
- `git push` direto na `main` recusado:

```
PS C:\Users\vinicius.derganho\teste-push-bruno> git push origin main
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 12 threads
Compressing objects: 100% (12/12), done.
Writing objects: 100% (12/12), 1.07 KiB | 549.00 KiB/s, done.
Total 12 (delta 8), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (8/8), completed with 2 local objects.
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote:
remote: - Changes must be made through a pull request.
remote:
remote: - Required status check "verificar" is expected.
To https://github.com/brunosjp/aula-web.git
 ! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'https://github.com/brunosjp/aula-web.git'
```

## Tarefa 3: revisão de PR por IA

Workflow: `.github/workflows/revisao-ia.yml`.

- PR com os comentários da IA: https://github.com/brunosjp/aula-web/pull/1
  - Comentário que aponta o SQL por concatenação (`WHERE aluno = '${nome}'`) como crítico e sugere `prepare(...).bind(nome)`: https://github.com/brunosjp/aula-web/pull/1#issuecomment-6198077605
  - Nova revisão no `synchronize` após a correção, confirmando o uso de `prepare().bind()` e apontando que o endpoint não verifica autenticação: https://github.com/brunosjp/aula-web/pull/1#issuecomment-6198105421
- Erro de permissão sem `pull-requests: write` (PR #2): https://github.com/brunosjp/aula-web/actions/runs/38777420989
  - Log: `GraphQL: Resource not accessible by integration (addComment)`
  - Permissão restaurada na mesma ramificação e revisão voltou a comentar: https://github.com/brunosjp/aula-web/pull/2#issuecomment-6198201370

Ajustes necessários no esqueleto:
1. `actions/ai-inference@v1` aponta para a versão que ainda chamava o GitHub Models e ignora o `COPILOT_GITHUB_TOKEN`. A versão baseada no Copilot CLI é a `@v3`.
2. Com a `@v3`, o modelo padrão da ação (`gpt-4.1`) não está disponível no plano. Com `model: ''` o Copilot CLI usa o modelo padrão dele.

Problema de configuração encontrado: a primeira execução falhou com `Copilot CLI exited with code 1`. Reexecutando com debug logging, o log mostrou `Error: Authentication token found but could not be validated.` (https://github.com/brunosjp/aula-web/actions/runs/38775457090). A conta não tinha o Copilot ativo. Depois de ativar o Copilot Free foi preciso regenerar o PAT, porque o token criado antes da ativação continuou sendo recusado.

Crítica à IA (item 4): na revisão https://github.com/brunosjp/aula-web/pull/1#issuecomment-6198103327 a IA trocou o formato pedido (lista em português com até 10 itens) por um relatório com tabela de severidade e terminou com um menu de opções ("Fix highest severity issues", "Fix all issues", "Commit a summary of findings ... SECURITY-REVIEW.md"). Esse menu sobra do modo interativo do Copilot CLI e não faz sentido num comentário de PR, porque ninguém pode escolher uma opção ali. No PR #2 (https://github.com/brunosjp/aula-web/pull/2#issuecomment-6198192401) ela disse que "não há alterações staged ou unstaged no repositório" e que o `prompt.txt` "está não rastreado": falou do diretório de trabalho do runner, quando o que importava era o diff do PR contra a `main` (que de fato ficou vazio, porque a permissão tinha acabado de ser restaurada). Na revisão seguinte (https://github.com/brunosjp/aula-web/pull/2#issuecomment-6198201370) repetiu a mesma frase duas vezes e deixou um cabeçalho de tabela sem linhas.

## Tarefa 4: migrações D1 depois do merge

Workflow: `.github/workflows/migrar.yml`, em `push` na `main` com `paths: ['migrations/**']`.

- Execução do merge do PR #1 (aplicou `0001` e `0002` no D1 remoto): https://github.com/brunosjp/aula-web/actions/runs/38777170911
- Saída do `PRAGMA table_info(notas)`:

```
Executado no D1 remoto (console do D1, equivalente a `npx wrangler d1 execute aula-web-db --remote --command "PRAGMA table_info(notas)"`):

cid  name   type     notnull  dflt_value  pk
0    id     INTEGER  0        null        1
1    aluno  TEXT     1        null        0
2    nota   REAL     1        null        0
3    turma  TEXT     0        null        0
```

- Segundo merge sem tocar `migrations/` (PR #2, commit `0ef354a`): rodou apenas o `ci` (https://github.com/brunosjp/aula-web/actions/runs/38777837918). A lista de execuções do `migrar` tem uma única execução, a do PR #1: https://github.com/brunosjp/aula-web/actions/workflows/migrar.yml

Bônus: o mesmo workflow chama `actions/ai-inference` e grava o resumo em `$GITHUB_STEP_SUMMARY`, visível na execução acima ("Resumo das migrações (IA)").

## Perguntas

1. **Por que o `ci.yml` roda duas vezes com PR aberto?** O workflow escuta `push` em qualquer ramificação e `pull_request` para a `main`. Um push numa ramificação com PR aberto gera os dois eventos: `push` e `pull_request` (tipo `synchronize`). As duas execuções publicam um check com o mesmo nome, `verificar`, e no PR as duas aparecem como "Required". A que representa o resultado do merge é a do evento `pull_request`, porque ela testa o commit de merge `refs/pull/N/merge` contra a `main` atual.

2. **Por que um PR vindo de fork não usa `secrets.COPILOT_PAT`?** Num PR de fork, o código do workflow e dos scripts vem de quem abriu o PR, uma pessoa de fora do repositório. Se os segredos fossem entregues a essa execução, bastaria alterar um passo para imprimir o token ou enviá-lo para um servidor externo. A regra impede o vazamento de segredos (exfiltração de credenciais) por meio de um PR malicioso.

3. **Por que declarar `permissions` em vez de usar o padrão do `GITHUB_TOKEN`?** Pelo princípio do menor privilégio. Ao declarar `permissions`, tudo o que não foi listado fica sem acesso, e o token recebe apenas `contents: read` e `pull-requests: write`. Se um passo, uma ação de terceiros ou a própria saída da IA for manipulada, o estrago fica limitado. O teste do item 3 mostrou isso: sem `pull-requests: write`, o comentário foi negado com `Resource not accessible by integration`.

4. **A revisão da IA pode substituir o status check?** Não. O status check é determinístico: a migração com `ALTER TABEL` falha sempre e bloqueia o merge. A IA não é determinística: no mesmo PR mudou de formato entre execuções, incluiu um menu sem sentido no comentário e no PR #2 comentou o estado do runner em vez do diff. Ela foi útil como segundo olhar, porque apontou a injeção de SQL e a falta de autenticação no `/api/notas`, mas serve para complementar a revisão, não para decidir o merge. E o próprio CI também tem limite, como mostrou o `DEFALT` aceito pelo SQLite, então nenhum dos dois dispensa a leitura humana do PR.
