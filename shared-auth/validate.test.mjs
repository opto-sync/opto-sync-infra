import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const lanes = ['supabase/auth','supabase/admin','neon/auth','neon/admin'];
const migration = (lane) => `${lane}/migrations/202609070001_shared_auth_runtime_policy.sql`;
const files = ['shared-auth/topology.json', ...lanes.map(migration)];
const original = new Map(files.map((path) => [path, readFileSync(join(root, path), 'utf8')]));

function validate(mutate = () => {}) {
  const sources = new Map(original);
  mutate(sources);
  mkdirSync(join(root, 'tmp'), { recursive: true });
  const fixture = mkdtempSync(join(root, 'tmp/shared-auth-validation-'));
  for (const [path, source] of sources) {
    const destination = join(fixture, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  }
  return spawnSync(process.execPath, [join(root, 'shared-auth/validate.mjs')], {
    env: { ...process.env, SHARED_AUTH_REPOSITORY_ROOT: fixture },
    encoding: 'utf8', timeout: 10_000
  });
}
function rejects(mutate, reason) {
  const result = validate(mutate);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, reason);
}

test('checked-in strict topology and four migrations agree', () => {
  const result = validate();
  assert.equal(result.status, 0, result.stderr);
});
for (const lane of lanes) {
  test(`${lane}: stale shared provider org is rejected`, () => rejects((sources) => {
    const path = migration(lane);
    if (lane.startsWith('supabase/')) sources.set(path, sources.get(path).replace("'opto-sync','opto-sync','opto-sync'", "'opto-sync','oresoftware','opto-sync'"));
    else sources.set(path, sources.get(path).replace("'opto-sync','opto-sync','opto-sync'", "'opto-sync','oresoftware','opto-sync'"));
  }, /policy metadata drift/));
}
for (const [name, mutate, reason] of [
  ['shared Supabase placement', (t) => { t.supabase.runtimeOrg = 'oresoftware'; t.supabase.placement = 'shared-org-schema'; }, /organizations must equal githubOrg|dedicated-org/],
  ['missing Neon schema', (t) => { delete t.neon.schema; }, /schema drift/],
  ['generic database env', (t) => { t.neon.authDatabaseUrlEnv = 'DATABASE_URL'; }, /environment mapping drift|generic DATABASE_URL/],
  ['customer credential crossover', (t) => { t.roles.webServer.supabaseDatabaseUrlEnv = 'SUPABASE_ADMIN_DATABASE_URL'; }, /role drift/],
  ['weakened admin mode', (t) => { t.requestPolicy.adminMode = 'availability-first'; }, /admin\/sensitive must be strict-paired/],
  ['provider disagreement accepted', (t) => { t.requestPolicy.rejectProviderDisagreement = false; }, /provider disagreement must fail closed/],
  ['cross-org evidence', (t) => { t.auditRepositories[0] = 'oresoftware/other'; }, /same-org evidence/]
]) test(`${name} is rejected`, () => rejects((sources) => {
  const topology = JSON.parse(sources.get('shared-auth/topology.json'));
  mutate(topology);
  sources.set('shared-auth/topology.json', JSON.stringify(topology));
}, reason));
