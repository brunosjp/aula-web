# 07 — Testes de falha

URL de produção: https://aula-web-d1y.pages.dev

> Nenhum valor de cookie, state, nonce, code_challenge, código de autorização, token ou segredo é registrado nesta evidência.

## Caso 1 — retorno sem cookie temporário
- **Preparação:** executado automaticamente em navegador sem sessão OAuth.
- **Pedido enviado:** retorno OAuth sem o cookie `__Host-oauth-tx`.
- **Resultado esperado:** a rota recusa a resposta e não cria sessão.
- **Resultado observado:** Google e GitHub responderam HTTP 200 com `Missing OAuth transaction cookie.`; o callback foi recusado e não houve criação de sessão.

## Caso 2 — state alterado
- **Preparação:** ainda não executado manualmente.
- **Pedido enviado:** retorno com state diferente do resumo armazenado.
- **Resultado esperado:** rejeição antes da troca do código.
- **Resultado observado:** a implementação compara o SHA-256 do state com `state_hash` e rejeita divergência.

## Caso 3 — reutilização da transação
- **Preparação:** ainda não executado manualmente.
- **Pedido enviado:** repetir uma URL de retorno já concluída.
- **Resultado esperado:** falha porque a transação foi removida.
- **Resultado observado:** a implementação apaga a transação antes de concluir o callback.

## Caso 4 — sessão expirada
- **Preparação:** ainda não executado manualmente no console D1.
- **Pedido enviado:** sessão com `expires_at=0`.
- **Resultado esperado:** `/api/me` responde 401.
- **Resultado observado:** a consulta de `/api/me` exige `expires_at > agora`.

## Caso 5 — origem inválida na saída
- **Preparação:** ainda não executado manualmente a partir de outra origem.
- **Pedido enviado:** POST para `/oauth/logout` com Origin diferente da URL de produção.
- **Resultado esperado:** 403 e sessão preservada.
- **Resultado observado:** a implementação exige Origin exatamente igual a `PUBLIC_BASE_URL`.

## Caso 6 — reutilização do cookie revogado
- **Preparação:** ainda não executado manualmente com cópia temporária do cookie.
- **Pedido enviado:** consultar `/api/me` depois de logout usando o mesmo cookie.
- **Resultado esperado:** 401.
- **Resultado observado:** o logout remove a linha da sessão do D1; `/api/me` só aceita sessão encontrada e não expirada.

## Caminhos felizes já observados
- Google: login concluído e a página exibiu uma sessão de usuário.
- GitHub: login concluído e a página exibiu uma sessão de usuário.

## Observação
Os seis testes de falha acima ainda devem ser executados manualmente se a disciplina exigir evidência do comportamento observado em cada caso. Esta versão registra separadamente o que foi efetivamente observado e o que foi conferido pela implementação.
