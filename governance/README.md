# Infrastructure governance

Promotion separates desired-state validity from runtime behavior.

A valid Terraform/Kubernetes/Cloudflare projection is necessary but does not by itself prove failover, availability, fencing, checkpoint durability, or production capacity. Runtime claims require exact-artifact execution in a disposable/test environment and evidence from the candidate head.

## Authority and migration rules

- application contracts remain in `opto-sync-interfaces`;
- cluster policy remains in `ORESoftware/k8s-cluster`;
- generated plans/manifests are evidence, not authored authorities;
- application schema migrations are coordinated through Declarative Migrations rather than startup side effects.

## Recovery evidence

Failure and recovery are separate events. Duplicate failures should update a stable incident identity rather than create new incidents. Missed or zero-step schedules are distinct from product failure. Recovery requires a later scheduled/executed exact-head green result; stale callbacks or heartbeats may not regress newer state.

Do not promote queued, skipped, zero-step, stale-head, billing/admission-blocked, missing-run, or historical-only checks as green.
