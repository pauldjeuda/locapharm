# Owner setup checklist

The repository is currently empty on GitHub. This checklist is required before a CI result, test APK, or deploy can be claimed.

## GitHub

1. Push the reviewed `main` branch to `https://github.com/pauldjeuda/locapharm`.
2. In **Settings → Pages**, choose **GitHub Actions** as the deployment source.
3. In **Settings → Actions → General**, allow the repository workflows and grant `contents: write`, `pages: write`, and `id-token: write` only to workflows that require them.
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

Create a Cloudflare account and Worker/D1 resources. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as Actions secrets. After those are ready, set the Actions variable `CLOUDFLARE_ENABLED=true` to enable deploys. Add the deployed Worker URL as `WORKER_BASE_URL` so the workflow can verify `/health`. Add `ADMIN_DIGEST_TOKEN` only when the reports-digest endpoint is implemented. Route-provider credentials belong in Worker secrets, never in GitHub Pages or the APK.

## Sources and safety

1. Contact ONPC or the relevant regional schedule publisher and obtain written reuse permission for guard schedules.
2. Verify Cameroon emergency numbers with an official public source before populating `data/emergency.json`.
3. Provide a public contact email for map attribution and data corrections.
4. Validate the proposed design deviations after Sprint 1 captures.
5. Install each Sprint APK on a real Android phone and return the checklist results before sending `GO SPRINT N+1`.
