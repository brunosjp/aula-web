# aula-web

Cloudflare Pages + Pages Functions + D1 — OAuth Google/GitHub.

Deployment trigger: environment variables configured in Cloudflare Pages.

OAuth configuration updated.

## Workflows (GitHub Actions)

| Arquivo | Quando roda | O que faz |
|---|---|---|
| `ci.yml` | push e pull_request para `main` | procura segredos, aplica as migrações num SQLite local e valida o HTML |
| `revisao-ia.yml` | pull_request aberto ou atualizado | envia o diff ao Copilot e comenta a revisão no PR |
| `migrar.yml` | push na `main` que altere `migrations/**` | aplica as migrações no D1 remoto e gera um resumo |

A `main` é protegida: só recebe mudanças por PR e exige o check `verificar` verde.
