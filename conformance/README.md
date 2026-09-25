# Infrastructure conformance

Conformance here means that the exact infrastructure artifacts on a candidate head satisfy their declared topology/layout policies and can be qualified in disposable/test environments.

Existing repository gates cover OCI tooling, Shared Auth topology, and Terraform layout. Runtime failover, writer fencing, durable checkpoints, and regional recovery require deployment/runtime evidence tied to the exact rendered artifacts; a standalone abstract model is not proof that those mechanisms exist in the manifests.

## Failover claim boundary

A future single-writer qualification lane should link each modeled transition to the actual implementation used for ownership/fencing/checkpoint durability, then replay failure/recovery against a disposable deployment or exact `*-test` sibling. It should prove at least:

- at most one admitted writer for a partition;
- stale writer epochs fail closed;
- durable checkpoints do not regress;
- promotion resumes from durable state rather than unpersisted progress;
- delayed/reordered callbacks cannot regress newer ownership or recovery state.

Until that implementation link exists, these are governance requirements, not deployed conformance claims.

Queued, skipped, zero-step, stale-head, billing/admission-blocked, missing-run, and historical-only checks are not green evidence.
