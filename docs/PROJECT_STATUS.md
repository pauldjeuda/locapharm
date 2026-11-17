# Locapharm project status — 2026-11-17

## Current result

The working tree contains the full front-end implementation covering all 17 Stitch screens, the complete native/offline foundation, and the server-side Worker contracts.

Implemented in source:

- **17 Stitch screens implemented**:
  1. Splash (`/splash`): pulsating rings, brand mark, live network pill.
  2. Onboarding (`/onboarding`): 3-step carousel, isometric illustration, progress indicator.
  3. Location permission (`/permission`): prompt, refused state, quick manual area selection.
  4. Pharmacy map (`/tabs/map`): MapLibre vector map, 3-step sheet, SAMU SOS card, floating navigation.
  5. Collapsed list & skeletons (`carte_liste_d_pli_e_85_skeleton`): animated pulse skeletons and pagination.
  6. Dark map (`carte_mode_sombre_dark_theme`): dark tokens `#161b19`, neon lime trajectory, GPS accuracy.
  7. Filters bottom sheet (`/filters`): 1–20 km radius slider, on-duty/open/24h chips, distance/name sort, phone-only toggle.
  8. Search & suggestions (`/search`): covered cities, recent searches, proximity results, 0-result handling.
  9. Pharmacy details (`/pharmacy/:id`): hero map, opening hours, duty window, direct call, deep-link share.
  10. Duty-pharmacy selector (`/tabs/guards`): fresh and stale warning banners, city picker, emergency contacts.
  11. Favorites / Emergency carnet (`/tabs/favorites`): 100% offline access, swipe to remove with toast undo, empty state.
  12. Settings (`/tabs/settings`): French/English switcher, light/dark theme, km/mi units, offline pack management, version info.
  13. Report an issue (`/report/:id`): multi-choice categories, precision details, optional contact, consent notice.
  14. 3D Route preview (`/route/:id`): isometric SVG 3D canvas, mode selection (walking, moto, driving), route alternatives, medical caution card, and navigation start.
  15. Live GPS guidance (`/navigate/:id`): top maneuver banner, 3D heading perspective, speed / remaining time / ETA metrics, recalculation / weak GPS states, sound toggle.
  16. Arrival & confirmation (`/arrival/:id`): arrival check celebration, security verification, direct call, and community duty vote (👍 / 👎) with live submission to Worker.
  17. System states (`/system`): offline cache active, 503 incident, initial data pack installation.
- **Interactive Dev Lab**: `/dev/states` route providing direct access to all 17 screen scenarios with frozen conditions.
- **Data & Native foundation**:
  - Regional pharmacy-pack download with SHA-256 integrity check and transactional SQLite install.
  - On-device OpenStreetMap `opening_hours` interpreter in Africa/Douala timezone.
  - Offline emergency directory based on official MINAT data.
  - Cloudflare Worker backend (`worker/`) with `/health`, `/config`, `/reports`, `/votes`, `/feedback`, `/admin/*`, rate limiting, and D1 database migrations.

## Quality gates & Next steps

| Gate                | Current status     | Evidence needed                                                                                                                             |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Push and CI         | À valider par Paul | Push this working tree to the GitHub repository; review every `ci.yml` job and verify all checks pass.                                      |
| OSM pack            | Open               | Run `data-refresh.yml`, inspect the artifact and coverage report, review/merge its PR, and verify Pages deployment.                         |
| Duty data           | Open               | Obtain publisher permission and provenance before adding a schedule.                                                                        |
| Android             | À valider par Paul | Obtain CI APK, install on a real Android phone, check permissions, persistence, map behavior, timezone handling, and update installation.   |
| Design              | À valider par Paul | Review all 17 screens on device or via `/dev/states` against `screen.png` references; approve deviations and add baselines in CI.           |
| Backend and routing | Open               | Configure Cloudflare/D1 and deploy Worker; choose a route provider after verifying live terms.                                              |
| Public release      | Not ready          | Require successful CI for the exact main commit, signing secrets, Pages/Worker validation, phone acceptance, and current data/legal review. |

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md), [SETUP_PAUL.md](SETUP_PAUL.md), and [VISUAL_PARITY.md](VISUAL_PARITY.md) for active checklists.
