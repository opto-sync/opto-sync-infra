# Shared Auth topology

The repository contract already names `github.com/shared-auth` as the authentication
authority. DEN-2843 makes the Supabase/Neon and customer/admin database boundaries
executable. Customer web/API services use both auth databases; admin services use
both independent admin databases without customer fallback. The shared Supabase
runtime organization is a schema-isolated transition; `opto-sync` remains the
target Supabase and dedicated Neon organization. Admin and sensitive work uses
strict paired proof. Run `node shared-auth/validate.mjs`.
