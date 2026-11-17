# Sprint 0 Planning — foundations and risk spikes

## Objective

Establish the repository and CI pipeline, preserve the design references, and reduce external-data, maps, routing, and native-plugin risks before building the 17 screens.

## Backlog and order

| Order | Story | Work                                                                                                                       | Risk / acceptance evidence                                                                               |
| ----: | ----- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
|     1 | L-001 | Initialize repository, app shell, lint/format/commit rules, README, env example, CODEOWNERS                                | CI must compile the web shell; no secrets committed.                                                     |
|     2 | L-002 | Preserve Stitch source; merge design tokens; document pixel/source conflicts; local fonts and SVG icon-generation pipeline | All 17 references remain read-only; sampled pixels and conflicts are recorded.                           |
|     3 | L-005 | Document Pages, Android signing, Cloudflare, and branch protection setup                                                   | Paul can follow each setup step; secrets stay outside Git.                                               |
|     4 | L-006 | Query Overpass for Cameroon pharmacy coverage and field quality; keep a fixed OSM query and report                         | Real query output required. The current environment's TLS/timeout failure is recorded; rerun in Actions. |
|     5 | L-007 | Discover duty-schedule publishers, permissions, CSV template, and contributor guide                                        | Candidate sources are separated from permitted sources; no schedule ingested without permission.         |
|     6 | L-008 | Test vector style provider, attribution, offline limits, and fallback                                                      | OpenFreeMap style endpoint checked; reliability and device performance still need CI/device evidence.    |
|     7 | L-009 | Compare/test routes in Cameroon, route modes, instructions, terms, quotas, and fallback                                    | No production provider selected until a real API response and provider terms are checked.                |
|     8 | L-010 | Verify Capacitor geolocation, TTS, speech, keep-awake, notifications, SQLite on Android CI                                 | Deferred to Android runner; no local Android generation or emulator available.                           |
|     9 | L-003 | Complete GitHub Actions CI and debug APK artifact                                                                          | Must be proven by a GitHub Actions run; no run is available before the repository is pushed.             |
|    10 | L-011 | Worker `/health` skeleton and CI deployment workflow                                                                       | Worker health test is authored; deploy requires Cloudflare secrets and Pages/Worker setup.               |
|    11 | L-004 | Release workflow from version input through APK/tag/release/version.json                                                   | Must be proven by a published test release; cannot be claimed complete before CI and signing setup.      |

## Sprint 0 risks

1. Pharmacy and schedule coverage may be too weak for a safe nationwide claim.
2. Public map/routing services may lack an SLA or production-compatible quota.
3. GitHub repository is empty and is not yet connected to a CI run; release proof is unavailable.
4. Android signing and Cloudflare credentials must be created by the repository owner.
5. Visual design references contain fake data and external assets; none should be copied as production data or runtime dependencies.

## Exit gates

Sprint 0 is not reported as complete until Actions is green, a test APK is released, OSM coverage results are recorded, duty-source permissions are understood, the Android plugin spike passes, and Paul completes `SETUP_PAUL.md`. Anything requiring unavailable accounts or an Android device remains `à valider par Paul`.
