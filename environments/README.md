# Terraform environment roots

`preview`, `staging`, and `production` are isolated Terraform roots for **opto-sync**. Provider-native Cloudflare, Neon, and Supabase configuration remains canonical under `modules/`; these roots compose environment/account resources and never duplicate provider-native source.

Worker-shell creation defaults off until a concrete Cloudflare deployable is wired. Initialize R2 state with `terraform init -backend-config=../backend.r2.hcl.example -backend-config="key=opto-sync/<environment>/terraform.tfstate"`. Keep backend credentials and `CLOUDFLARE_API_TOKEN` outside git.
