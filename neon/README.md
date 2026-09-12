# Neon GitOps boundary

This directory is non-secret desired state for the dedicated Neon organization paired with GitHub org `opto-sync`. Runtime and target ownership must remain `opto-sync`.

- `auth/migrations/` is the customer/user Shared Auth lane and uses only `NEON_AUTH_DATABASE_URL`.
- `admin/migrations/` is the administrator Shared Auth lane and uses only `NEON_ADMIN_DATABASE_URL`.
- Migration promotion is an explicit reviewed GitOps/release action; application startup never owns DDL.
- Database URLs, passwords, provider tokens, private keys, and decrypted environment values stay in secret management or encrypted `env/enc`, never source.
- TypeSpec and independently authored JSON Schema remain peer authorities; TJSV is the cross-authority admission gate.

This repository records desired state and policy; it does not claim that live provider resources or credentials have already been provisioned.
