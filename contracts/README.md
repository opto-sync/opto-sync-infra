# Infrastructure contract boundary

`opto-sync-infra` declares deployable infrastructure projections for Opto Sync. It is not the authored application/wire contract authority, and it is not the global Kubernetes source of truth.

- Opto Sync payload/config contracts: `opto-sync/opto-sync-interfaces` (independent authored TypeSpec + Draft 2020-12 JSON Schema peers).
- Cluster-level source of truth: `ORESoftware/k8s-cluster`.
- This repository: Cloudflare/Kubernetes/Terraform deployment projections and environment composition.

Generated manifests and rendered plans are evidence/projections. They do not override either upstream authority. Database schema changes must flow through Declarative Migrations; application or infrastructure startup must not silently mutate application schema.
