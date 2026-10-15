-- Migration number: 0001
-- Mesmo esquema do schema.sql, que ja existe no D1 remoto (aula-web-db).
-- IF NOT EXISTS deixa a migracao segura para rodar sobre o banco atual.

CREATE TABLE IF NOT EXISTS oauth_transactions (
  id_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
  state_hash TEXT NOT NULL,
  nonce TEXT,
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_transactions_expiry ON oauth_transactions (expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);

-- Tabela das Tarefas 3 e 4.
CREATE TABLE IF NOT EXISTS notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno TEXT NOT NULL,
  nota REAL NOT NULL CHECK (nota BETWEEN 0 AND 10)
);
