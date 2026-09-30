# 08 — Aceitação

Projeto: aula-web
Produção: https://aula-web-d1y.pages.dev
Branch: main

## Checklist
- [x] site servido por endereço pages.dev;
- [x] arquivos estáticos e Functions compartilham a mesma origem;
- [x] projeto publicado por integração com GitHub;
- [x] não foram necessários Node.js, npm, npx ou Wrangler;
- [x] cada provedor usa URL de retorno própria e exata;
- [x] pedidos de autorização usam Authorization Code + PKCE S256;
- [x] Client Secret é usado somente na troca de tokens no servidor;
- [x] retorno exige transação válida, cookie temporário e state correspondente;
- [x] id_token do Google é validado criptograficamente e semanticamente;
- [x] GitHub consulta /user e revoga a autorização antes da sessão local;
- [x] cookie de sessão é opaco, Secure, HttpOnly, SameSite=Strict e sem Domain;
- [x] D1 guarda o resumo do cookie de sessão, não seu valor bruto;
- [x] /api/me devolve somente o perfil mínimo;
- [x] logout confere Origin, remove a sessão e expira o cookie;
- [x] conteúdo estático permanece público;
- [ ] seis casos de falha foram executados manualmente e documentados com resultado observado;
  - [x] Caso 1 — retorno sem cookie temporário;
  - [x] Caso 2 — state alterado;
  - [ ] Caso 3 — reutilização da transação (verificação de implementação registrada; execução completa não concluída);
  - [ ] Caso 4 — sessão expirada (verificação de implementação registrada; execução completa não concluída);
  - [x] Caso 5 — origem inválida na saída, HTTP 403 e sessão preservada;
  - [x] Caso 6 — reutilização do cookie revogado, HTTP 401 após logout;
- [x] evidências de cabeçalhos HTTP do início do login foram capturadas pelo DevTools Network;
- [ ] encerramento das sessões administrativas no computador compartilhado foi conferido.

## Evidências de funcionamento
- Google: caminho feliz concluído no endereço de produção.
- GitHub: caminho feliz concluído no endereço de produção.
- O site exibiu o estado de sessão após os dois logins.

## Assinaturas
Estudante 1: Bruno Augusto

Estudante 2: Vinicius

Data: 29/09/2026
