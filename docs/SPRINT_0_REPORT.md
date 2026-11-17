# Sprint 0 — foundations and risk spikes — 2026-11-17

## Objective and result

**Partially achieved.** The source tree, app/Worker skeleton, data contracts, CI/release workflows, design token merge, and external-source register are prepared. Sprint 0 is **not complete**: no GitHub Actions run, test APK, Overpass coverage result, production routing decision, Android plugin spike, or Cloudflare deploy has been proven. The GitHub repository reports as empty, so there is no remote CI evidence to attach yet.

The specification forbids local builds/tests/APKs and requires every sprint gate to be proven in GitHub Actions. No local build or test was run. The dependency lockfile was resolved without lifecycle scripts; formatting was applied. The initial source branch is local and unpushed.

## Stories delivered

| ID    | Result                         | Evidence / acceptance status                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L-001 | **Prepared**                   | Repo structure, Ionic/Angular shell, strict TypeScript, Tailwind, ESLint, Prettier, commitlint, README, env example, CODEOWNERS, and MIT code license. Build/lint are **unverified pending Actions**.                                                                                                                                                                                                                    |
| L-002 | **Partial**                    | All 17 Stitch screen folders (each with `code.html` and `screen.png`) are preserved under `design/` as unmodified references; all 17 PNGs were reviewed and sampled. Merged tokens are at `app/src/theme/design-tokens.json`; conflicts are documented. Fonts are local npm assets. A build-time generator extracts the 103 referenced Material Symbols and only the fill variants used; the generated sprite awaits CI. |
| L-003 | **Authored, not proven**       | `ci.yml` contains quality, web-build, visual/a11y, Android debug, emulator smoke, and dependency-check jobs. No run URL exists.                                                                                                                                                                                                                                                                                          |
| L-004 | **Authored, not proven**       | Manual `release.yml` builds a debug test APK without secrets or signs with the four Android secrets, creates a release/tag and Pages `version.json`. No test release has run.                                                                                                                                                                                                                                            |
| L-005 | **Prepared**                   | `docs/SETUP_PAUL.md` gives GitHub Pages, branch protection, Android signing, Cloudflare, and source-validation steps.                                                                                                                                                                                                                                                                                                    |
| L-006 | **Blocked on endpoint access** | One Cameroon-wide and one small-area Overpass POST failed TLS; an alternate public endpoint timed out after 20 seconds. `data-coverage.yml` and a one-request coverage script are ready for a GitHub Actions rerun. No coverage number is asserted.                                                                                                                                                                      |
| L-007 | **Partial**                    | Candidate publishers and authorization status are recorded; CSV template, entry guide, and permission-request text are ready. No schedule source is yet permitted for ingestion.                                                                                                                                                                                                                                         |
| L-008 | **Partial**                    | OpenFreeMap Liberty style returned HTTP 200 and current terms were reviewed. Cameroon coverage, Android performance, and offline pack behavior have not been exercised on-device.                                                                                                                                                                                                                                        |
| L-009 | **Open**                       | OSRM route request failed TLS. No production routing provider is selected; external maps remains the fallback.                                                                                                                                                                                                                                                                                                           |
| L-010 | **Prepared, not proven**       | Current Capacitor plugin versions are pinned and locked; the Android build/smoke jobs will compile, install, and launch them once Actions runs. Speech recognition remains a Capacitor 7 candidate. No Android plugin API or permission check has run.                                                                                                                                                                   |
| L-011 | **Prepared, not deployed**     | Worker exposes `GET /health`, includes a test, and has a deploy workflow. Deployment and HTTP health verification need Cloudflare credentials and `WORKER_BASE_URL`.                                                                                                                                                                                                                                                     |

## Stories deferred

- OSM city-by-city coverage and field-quality measurements until `data-coverage.yml` completes in Actions.
- Written duty-schedule permission and publisher/source-of-truth confirmation.
- Route-provider selection and all emulator-native plugin checks.
- Test release and Worker deployment until Actions/Pages/Cloudflare are configured.

## Quality gates

| Gate                                                   | Workflow / job                          | Run link      | Result                                                              |
| ------------------------------------------------------ | --------------------------------------- | ------------- | ------------------------------------------------------------------- |
| CI lint, types, fake-data scan, data/unit/Worker tests | `ci.yml` / quality                      | Not available | **À valider par Paul** after the baseline is pushed.                |
| Web production build                                   | `ci.yml` / web-build                    | Not available | **À valider par Paul**.                                             |
| Playwright, screenshot artifact, axe                   | `ci.yml` / e2e-visual-a11y              | Not available | **À valider par Paul**; Sprint 0 shell only, no approved baselines. |
| Android debug APK and emulator smoke                   | `ci.yml` / android-debug, android-smoke | Not available | **À valider par Paul** on Actions and a phone.                      |
| Security/dependency checks                             | `ci.yml` / security, `codeql.yml`       | Not available | **À valider par Paul**.                                             |
| Test release + Pages `version.json`                    | `release.yml`                           | Not available | **À valider par Paul**; no signing secrets are configured here.     |
| OSM coverage                                           | `data-coverage.yml` / osm-coverage      | Not available | **À valider par Paul**; local endpoints were inaccessible.          |
| Duty schedule source permission                        | Manual publisher confirmation           | Not available | **Open**.                                                           |

## Release published

None. No tag, APK, SHA-256, or GitHub Release exists.

## Visual parity

- Reviewed the 17 supplied `screen.png` references and `code.html` tokens/glyph inventories.
- Recorded source-level palette conflicts and 17 proposed content deviations in `DESIGN_CONFLICTS.md` and `DESIGN_DEVIATIONS.md`.
- No app screen has been compared against the reference, and no baseline is approved. This is Sprint 1 work.

## Demo script

After Actions is configured, install the debug APK from the `android-debug` artifact, launch Locapharm, and verify that the app opens to its truthful setup splash. No pharmacy list or guard status is included in this Sprint 0 shell.

## Manual recipe for Paul

- [ ] Push the local `main` baseline to the empty `pauldjeuda/locapharm` repository; confirm Actions starts.
- [ ] Follow `docs/SETUP_PAUL.md`; set GitHub Pages to Actions and protect `main` with the CI checks.
- [ ] Run `data-coverage.yml`; save the artifact/run URL and decide whether Geofabrik is needed.
- [ ] Complete Actions CI; install the debug APK on an Android phone and confirm launch, back behavior, and no unexpected permission prompt.
- [ ] Configure release signing secrets and Cloudflare only in GitHub settings; run a clearly labelled test release and verify the APK SHA-256/install.
- [ ] Contact the competent schedule publishers; record written permissions, emergency-number sources, and contact details before supplying any data.
- [ ] After the Sprint 0 exit gates pass, send `GO SPRINT 1` to begin the 17-screen design implementation.

## Design deviations

F-01 through F-17 are recorded as **proposed** in `docs/DESIGN_DEVIATIONS.md`; none has been approved by Paul.

## Data

- **Pharmacy data:** no OSM pharmacy records are packaged. Coverage and completeness remain unmeasured.
- **Duty schedules:** no schedules are packaged. OSM does not supply duty rosters. MboaPHARMA and Annuaire Médical remain unverified candidates; Pharma Dream is rejected for current use because its terms prohibit reproduction/distribution without written permission and its displayed validity range was in 2027 during this 2026 check.
- **Emergency numbers:** no numbers are included; official Cameroon verification is still required.

## Open bugs / technical debt

- Blocking: live Overpass and routing calls from this environment failed; CI reruns required.
- Major: no authorized duty schedule source confirmed.
- Major: no Actions evidence, test APK, or Worker deployment.
- Major: Ionic 8 constrains the selected Angular line to 20.x, whose scheduled support end is near; reassess the fixed stack before Sprint 1.
- Design debt: only the app shell exists; no screen-level parity implementation has started.

## Decisions and risks

See `docs/DECISIONS.md` and `docs/API_NOTES.md`. OpenFreeMap is a provisional map provider, not an SLA-backed guarantee. Routing and duty schedules remain open risks.

## Retrospective

- **Keep:** source/data provenance and the no-fake-data guardrails are explicit before screens are wired.
- **Improve:** execute the API and plugin spikes from GitHub Actions as soon as the owner setup is complete.
- **Action:** Paul configures Pages/secrets and provides Actions run links; no Sprint 1 UI should be declared visually approved before on-device capture review.

## Next sprint

Sprint 1 begins only after the Sprint 0 exit gates pass and Paul sends `GO SPRINT 1`: exact design tokens/theme, logo and native splash, design components, app shell, then screens 1–17 on truthful fixtures and visual-review artifacts.
