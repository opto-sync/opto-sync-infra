import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_ORG = 'opto-sync';
const EXPECTED_SCHEMA = 'opto_sync';
const root = process.env.SHARED_AUTH_REPOSITORY_ROOT
  ? resolve(process.env.SHARED_AUTH_REPOSITORY_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const topology = JSON.parse(readFileSync(resolve(root, 'shared-auth/topology.json'), 'utf8'));
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const provider = {
  supabase: ['SUPABASE_AUTH_DATABASE_URL', 'SUPABASE_ADMIN_DATABASE_URL'],
  neon: ['NEON_AUTH_DATABASE_URL', 'NEON_ADMIN_DATABASE_URL']
};
const roles = {
  webServer: ['customer-auth', provider.supabase[0], provider.neon[0]],
  apiServer: ['customer-auth', provider.supabase[0], provider.neon[0]],
  adminWebServer: ['admin-auth', provider.supabase[1], provider.neon[1]],
  adminApiServer: ['admin-auth', provider.supabase[1], provider.neon[1]]
};

check(topology.contract === 'SharedAuthTopology' && topology.version === 1, 'invalid contract/version');
check(topology.githubOrg === EXPECTED_ORG, `githubOrg must remain ${EXPECTED_ORG}`);
check(['direct', 'ores-middleware'].includes(topology.integration), 'invalid integration');
for (const [name, keys] of Object.entries(provider)) {
  const value = topology[name] ?? {};
  check(value.runtimeOrg === EXPECTED_ORG && value.targetOrg === EXPECTED_ORG, `${name} organizations must equal githubOrg`);
  check(value.placement === 'dedicated-org', `${name} must use dedicated-org placement`);
  check(value.schema === EXPECTED_SCHEMA, `${name} schema drift`);
  check(value.authDatabaseUrlEnv === keys[0] && value.adminDatabaseUrlEnv === keys[1], `${name} environment mapping drift`);
  check(value.authDatabaseUrlEnv !== value.adminDatabaseUrlEnv, `${name} credential crossover`);
}
check(topology.requestPolicy?.requireBothProvidersConfigured === true, 'both providers are required');
check(['availability-first', 'strict-paired'].includes(topology.requestPolicy?.customerMode), 'invalid customer mode');
check(topology.requestPolicy?.adminMode === 'strict-paired' && topology.requestPolicy?.sensitiveMode === 'strict-paired', 'admin/sensitive must be strict-paired');
check(topology.requestPolicy?.rejectProviderDisagreement === true, 'provider disagreement must fail closed');
for (const [name, [plane, supabase, neon]] of Object.entries(roles)) {
  check(same(topology.roles?.[name], { dataPlane: plane, supabaseDatabaseUrlEnv: supabase, neonDatabaseUrlEnv: neon }), `${name} role drift`);
}
check(Array.isArray(topology.auditRepositories) && topology.auditRepositories.length >= 5 && topology.auditRepositories.every((repo) => repo.startsWith(`${EXPECTED_ORG}/`)), 'auditRepositories must be same-org evidence');

for (const [name, keys] of Object.entries(provider)) {
  for (const [lane, plane, key, mode, serverRoles] of [
    ['auth', 'customer-auth', keys[0], topology.requestPolicy?.customerMode, ['web-server', 'api-server']],
    ['admin', 'admin-auth', keys[1], topology.requestPolicy?.adminMode, ['admin-web-server', 'admin-api-server']]
  ]) {
    const relative = `${name}/${lane}/migrations/202609070001_shared_auth_runtime_policy.sql`;
    const full = resolve(root, relative);
    check(existsSync(full), `missing migration ${relative}`);
    if (!existsSync(full)) continue;
    const source = readFileSync(full, 'utf8');
    check(!/postgres(?:ql)?:\/\//i.test(source), `${relative} embeds database URL`);
    check(!/(^|[^A-Z0-9_])DATABASE_URL([^A-Z0-9_]|$)/.test(source), `${relative} uses generic DATABASE_URL`);
    check(!/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i.test(source), `${relative} embeds private key`);
    const columns = 'provider,data_plane,contract_version,github_org,runtime_org,target_org,database_url_env,decision_mode,server_roles';
    const values = `'${name}','${plane}',1,'${EXPECTED_ORG}','${EXPECTED_ORG}','${EXPECTED_ORG}','${key}','${mode}',ARRAY['${serverRoles.join("','")}']`;
    const expected = `INSERT INTO ${EXPECTED_SCHEMA}.shared_auth_runtime_policy(${columns})VALUES(${values})ON CONFLICT DO NOTHING;`;
    const inserts = source.split(/\r?\n/).filter((line) => /^\s*INSERT\b/i.test(line));
    check(inserts.length === 1 && inserts[0] === expected, `${relative} policy metadata drift`);
  }
}

const serialized = JSON.stringify(topology);
check(!/shared-org-schema|shared-organization-namespace/i.test(serialized), 'shared provider placement is forbidden');
check(!/postgres(?:ql)?:\/\//i.test(serialized), 'topology embeds database URL');
check(!serialized.includes('"DATABASE_URL"'), 'generic DATABASE_URL forbidden');
if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`validated strict Shared Auth topology for ${EXPECTED_ORG}`);
