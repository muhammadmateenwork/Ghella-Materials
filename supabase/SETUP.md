# Setting up a new Supabase project

Everything needed to bring up a fresh Supabase project for Ghella Materials.
Nothing here depends on any specific project: the URL and keys go into Vault
and environment variables, never into code.

## 1. Create the project

In the Supabase dashboard (new account), create a project. Save the
**database password** in your password manager. Nothing in this repo needs
it, and it should never be shared.

From **Project Settings → API Keys**, note:
- **Project URL**: `https://<project-ref>.supabase.co`
- **Publishable key**: `sb_publishable_...` (safe to put in apps)
- **Secret / service_role key**: never put this in an app, a `.env` file
  or chat. Edge functions get it automatically.

## 2. Run the migrations

In **SQL Editor**, open each file in `supabase/migrations/` **in order**
(`0001` onwards, lowest number first), paste the whole file and click **Run**. Wait for
"Success" before moving on to the next file.

If `0008` fails with an error about `pg_cron` or `pg_net`, enable both in
**Database → Extensions**, then run `0008` again.

## 3. Store the project URL and key in Vault

The two background notification jobs (from `0008` and `0012`) read these on
every run. In **SQL Editor**, replace the placeholders and run:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('sb_publishable_<your key>', 'publishable_key');
```

The URL has no trailing slash.

## 4. Deploy the edge functions

For each folder in `supabase/functions/`, go to **Edge Functions → Deploy a
new function → Via editor**. Name it exactly as the folder and paste the
folder's `index.ts`:

| Function | Called by |
| --- | --- |
| `admin-create-user` | Admin creating an account (signed in) |
| `admin-delete-user` | Admin deleting an account (signed in) |
| `check-email-exists` | Forgot-password screen (before sign-in) |
| `send-item-notifications` | Background job, every 2 minutes |
| `send-notification-outbox` | Background job, every minute |

**Verify JWT**: match each function's "Enforce JWT verification" setting to
the old project (open the function in the old project → Details). The
background jobs and `check-email-exists` call with the publishable key,
which is not a user JWT, so they need verification **off**.

## 5. Edge function secrets

**Project Settings → Edge Functions → Secrets**:

| Name | Value |
| --- | --- |
| `SMTP_USER` | Gmail address that sends the emails |
| `SMTP_PASSWORD` | That Gmail account's **App Password** (not its normal password) |
| `SMTP_HOST` | Optional, defaults to `smtp.gmail.com` |
| `SMTP_PORT` | Optional, defaults to `465` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided automatically.

## 6. Auth settings

Copy these from the old project:
- **Authentication → URL Configuration**: Site URL = the web app URL (e.g.
  `https://ghella-materials-web.vercel.app`). Add
  `https://<web app>/reset-password` to Redirect URLs.
- **Authentication → Sign In / Providers**: turn **off** "Allow new users to
  sign up". Accounts are created by admins only.
- **Authentication → Emails → SMTP Settings**: same Gmail address and App
  Password as step 5.
- **Authentication → Emails → Templates**: copy any customised templates.

## 7. Create the first admin

Accounts are admin-provisioned, so the first one is made by hand:

1. **Authentication → Users → Add user → Create new user**: enter email and
   password, and tick **Auto Confirm User**.
2. In **SQL Editor**, make that user an admin:

```sql
update public.profiles set role = 'maximum' where email = '<admin email>';
```

Everyone else can then be created from the app's **Manage → Users** screen.

## 8. Point the apps at the new project

Use the **Project URL** and **publishable key** from step 1:

| Where | Variables |
| --- | --- |
| `apps/web/.env.local` (local dev) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Vercel → Project → Settings → Environment Variables, then redeploy | same two |
| `apps/mobile/.env` (local dev) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| EAS builds | same two, as EAS environment variables (see below) |

The mobile app bakes these in **at build time**. Already-installed builds
keep using whatever project they were built with, so only builds made after
this step use the new project.

### EAS build variables

`apps/mobile/.env` is git-ignored, so EAS cloud builds never see it. The
values have to be stored in EAS. First check what's there now:

```bash
eas env:list
```

Then, from `apps/mobile`, set each variable for the `preview` and
`production` environments. `development` doesn't need them: a development
build loads its code from Metro, which reads `apps/mobile/.env`.

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --environment preview --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_<your key> --environment preview --visibility plaintext
eas env:set --name EXPO_PUBLIC_WEB_URL --value https://<web app> --environment preview --visibility plaintext
```

`eas env:set` creates the variable, or updates it if it already exists.

### Firebase (Android push)

`apps/mobile/google-services.json` is git-ignored, so EAS gets it as a
secret **file** variable (read by `apps/mobile/app.config.js`). From
`apps/mobile`, for each environment you build:

```bash
eas env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment development --visibility secret
```

Repeat with `--environment preview` and `--environment production`. The FCM
service account key (for sending) is uploaded separately with
`eas credentials` → Android → Google Service Account → FCM V1.

## 9. Check it's working

- Sign in on the web app with the admin from step 7.
- Add a material, then after ~2 minutes check the background jobs ran:

```sql
select jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 10;
```

`status` should be `succeeded`. To check the HTTP call itself reached the
function, look at **Edge Functions → send-item-notifications → Logs**.
