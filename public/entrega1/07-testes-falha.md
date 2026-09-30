# 07 — Testes de falha

URL de produção: https://aula-web-d1y.pages.dev

> Nenhum valor de cookie, state, nonce, code_challenge, código de autorização, token ou segredo é registrado nesta evidência.

## Caso 1 — retorno sem cookie temporário
- **Preparação:** executado em navegador sem sessão OAuth.
- **Pedido enviado:** retorno OAuth sem o cookie temporário.
- **Resultado esperado:** rejeição e nenhuma criação de sessão.
- **Resultado observado:** Google e GitHub exibiram `Missing OAuth transaction cookie.`; o callback foi recusado e não houve criação de sessão.

## Caso 2 — state alterado
- **Preparação:** não foi possível concluir a alteração do parâmetro durante um callback real sem expor/manipular segredo de autenticação.
- **Resultado esperado:** rejeição antes da troca do código.
- **Verificação da implementação:** o callback compara o SHA-256 do state recebido com `state_hash` armazenado e rejeita divergência.

## Caso 3 — reutilização da transação
- **Preparação:** tentativa de fluxo real iniciada com perfil Google autenticado.
- **Resultado esperado:** uma transação já consumida não pode ser reutilizada.
- **Verificação da implementação:** a transação é removida antes da troca do código, tornando-a de uso único.
- **Resultado observado adicional:** o fluxo real pôde ser iniciado, mas a ferramenta não conseguiu preservar/revisitar com segurança a URL de callback sem expor o código de autorização; portanto, não é declarado como teste manual concluído.

## Caso 4 — sessão expirada
- **Preparação:** não foi feita mutação direta da linha D1 para criar uma sessão artificial expirada.
- **Resultado esperado:** `/api/me` responde 401.
- **Verificação da implementação:** a consulta exige `expires_at > agora`.
- **Teste real relacionado:** `/api/me` sem sessão retornou HTTP 401 com `{"error":"unauthenticated"}`.

## Caso 5 — origem inválida na saída
- **Preparação:** não foi possível emitir, no navegador, um POST com cabeçalho Origin arbitrariamente alterado.
- **Resultado esperado:** HTTP 403 e sessão preservada.
- **Verificação da implementação:** `/oauth/logout` exige Origin exatamente igual a `PUBLIC_BASE_URL`.

## Caso 6 — reutilização do cookie revogado
- **Preparação:** fluxo real de logout executado com sessão Google autenticada.
- **Pedido:** clicar em **Sair**, recarregar a página e consultar `/api/me`.
- **Resultado observado:** HTTP 401, corpo `{"error":"unauthenticated"}`.
- **Conclusão observada:** a sessão foi invalidada no servidor após logout.

## Verificação adicional — logout real
- Sessão Google real estabelecida no perfil autenticado de testes.
- Botão **Sair** acionado.
- Página recarregada.
- `/api/me`: **HTTP 401**.
- Corpo: `{"error":"unauthenticated"}`.
- Evidência do teste: execução automatizada registrada no navegador de testes.

## Caminhos felizes já observados
- Google: caminho feliz observado em produção com sessão autenticada.
- GitHub: caminho feliz observado em produção em execução anterior.
- `/api/health`: HTTP 200 e `{"status":"ok"}`.

## Observação
Os casos 2, 3, 4 e 5 não são marcados como execução manual completa quando a ferramenta não conseguiu produzir uma observação segura do pedido/resposta. O documento diferencia explicitamente comportamento observado de verificação da implementação, evitando declarar testes não executados como concluídos.
