# Owner setup checklist

The repository is currently empty on GitHub. This checklist is required before a CI result, test APK, or deploy can be claimed.

## GitHub

1. Push the reviewed `main` branch to `https://github.com/pauldjeuda/locapharm`.
2. In **Settings → Pages**, choose **GitHub Actions** as the deployment source.
3. In **Settings → Actions → General**, allow the repository workflows. The OSM refresh workflow needs `actions: write`, `contents: write`, and `pull-requests: write` to dispatch CI and propose a data PR. The Pages workflow needs `pages: write` and `id-token: write`; the release workflow needs `contents: write`.
4. Protect `main`: require pull requests, require the `ci` workflow checks, use linear history, and use squash merges. Set the squash title to the PR's Conventional Commit title. Require CODEOWNERS review from `@pauldjeuda`.
5. Enable Dependabot updates, secret scanning, and push protection.
6. Run `ci.yml` on the first push and paste the run URL into `docs/SPRINT_0_REPORT.md`.

## Android signing

Create one release keystore in a private Codespace or another controlled environment; never create or commit it in this repository. Keep a separately backed-up copy. Add repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Use the release workflow's debug fallback only for a clearly labelled test release. A debug-signed APK cannot update an APK signed with the production keystore.

## Cloudflare

Create a Cloudflare account and a D1 database (`locapharm-data`). Add its returned ID to `worker/wrangler.jsonc` using a `d1_databases` binding named `DB`, with `database_name: "locapharm-data"` and `migrations_dir: "migrations"`. Apply the checked-in schema with `npx wrangler d1 migrations apply locapharm-data --remote` before enabling reports.

The binding has this shape; replace the database ID with the value Cloudflare returned and merge the array into the root Wrangler config:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "locapharm-data",
    "database_id": "<Cloudflare database ID>",
    "migrations_dir": "migrations"
  }
]
```

Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as Actions secrets. After those are ready, set the Actions variable `CLOUDFLARE_ENABLED=true` to enable deploys. Add the deployed Worker URL as `WORKER_BASE_URL`; deployment checks `/health`, and app build workflows embed this public origin in `runtime-config.json`. Configure Worker secrets `RATE_LIMIT_SECRET` (at least 32 random characters) and `REPORT_ENCRYPTION_KEY` (base64 encoding of 32 random bytes) before accepting submissions. Keep the encryption key unchanged until all ciphertext created with it has expired or been purged. Set the `APP_ORIGINS` Worker variable to the exact Pages and Capacitor origins. `NEGATIVE_VOTE_THRESHOLD` optionally sets the warning threshold from 1 to 20; the default is 3. `DUTY_WARNING_DAYS` defaults to 7 and accepts 1–30; `MAX_SEARCH_RADIUS_KM` defaults to 20 and accepts 1–20. `MINIMUM_APP_VERSION` and `PUBLIC_NOTICE` are optional `/config` values. Leave `REPORTS_ENABLED`, `FEEDBACK_ENABLED`, and `VOTES_ENABLED` unset (off by default) until their privacy/data prerequisites are reviewed.

The report digest is opt-in. Before enabling it, set the same high-entropy `ADMIN_DIGEST_TOKEN` as a Cloudflare Worker secret and GitHub Actions secret. Set the repository Actions variable `REPORTS_DIGEST_ENABLED=true`; the workflow then updates one issue each day and can also be run manually. The issue body contains report/feedback references and safe metadata only; free-text messages and contact numbers are excluded. To review masked text, make authenticated `GET /admin/pending` or `GET /admin/feedback` requests; use `include_details=0` only for digest generation. After handling an entry, an authorized maintainer can mark it with `PATCH /admin/pending/<reference>` or `PATCH /admin/feedback/<reference>` and `{"status":"resolved"}` or `{"status":"ignored"}`; use the same Bearer token. The workflow only updates issues and requires the built-in `issues: write` permission. Route-provider credentials belong in Worker secrets, never in GitHub Pages or the APK.

After the report database, secrets, retention, moderation path, and public privacy notice have been reviewed, set Worker variable `REPORTS_ENABLED=true` to accept reports; it stays off by default. Set `FEEDBACK_ENABLED=true` only after reviewing the public privacy notice and digest/moderation path; the app sends a message only after the user submits the form and includes diagnostics only with opt-in. The vote endpoints are not connected to the app. Only set `VOTES_ENABLED=true` after an authorized duty schedule provides stable per-pharmacy window UUIDs. A vote is retained for at most 30 days and one installation can vote once per pharmacy/window; the summary response exposes only a threshold warning, not individual votes. Do not let votes change the authoritative pharmacy status. `GET /config` reports these flags and serves the emergency directory from `data/emergency.json`; GitHub Actions injects the Worker origin into app builds, while the app keeps its embedded emergency file as an offline fallback.

## Sources and safety

1. Contact ONPC or the relevant regional schedule publisher and obtain written reuse permission for guard schedules.
2. Review and reconfirm the MINAT emergency contacts in `data/emergency.json` before each public release; its source and checked date are recorded in the app and data registry.
3. Provide a public contact email for map attribution and data corrections.
4. Validate the proposed design deviations after Sprint 1 captures.
5. Install each Sprint APK on a real Android phone and return the checklist results before sending `GO SPRINT N+1`.
