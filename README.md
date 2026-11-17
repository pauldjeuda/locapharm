# Locapharm

Locapharm is an Android-first, French-first pharmacy finder for Cameroon. It is designed to show nearby pharmacies, clearly sourced duty schedules, contact details, and routes while keeping pharmacy data available offline.

The application is free and works without an account. It does not sell medicines, show ads, or diagnose users. Nearby search uses device-local location and pharmacy data. Open/closed labels interpret the pharmacy's OpenStreetMap opening-hours tag; they are not live confirmations or duty rosters. Showing the online map reveals the visible map area to its tile provider; opening an external route sends the pharmacy destination to the maps app the user selects.

## Project status

The local branch now contains the application shell, an OSM extract-to-review-PR workflow, an SQLite-backed regional pack installer, a MapLibre map page, and a unified Pages publisher. None of those workflows has run yet: the GitHub repository is still uninitialized, so no pharmacy pack, APK, or visual-parity result is published. Pharmacy entries are OSM map objects, not verified business listings. A pharmacy is never labelled `DE GARDE` without an authorized, current, traceable schedule.

See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for the current implementation snapshot and release gates.

## Source layout

- `app/` — Ionic + Angular + Capacitor Android application.
- `data/` — OSM ingestion, schemas, regional packs, and duty-schedule source registry.
- `worker/` — Cloudflare Worker report/feedback/vote intake, public configuration, protected moderation endpoints, and an opt-in GitHub digest; D1 configuration, secrets, migrations, and deployment remain required. App feedback and remote-config clients are feature-gated until the Worker and privacy notice are ready; in-app routing remains unimplemented.
- `design/stitch_locapharm_cameroon_app_ui/` — original Stitch screens, retained as read-only references.
- `docs/` — architecture, decisions, provider notes, setup, sprint reports, and known issues.

## Build and checks

All app builds, tests, Android artifacts, and releases run in GitHub Actions. Do not build or test on a developer workstation. See [docs/SETUP_PAUL.md](docs/SETUP_PAUL.md) for repository setup and [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for the open release and validation gates.

## Data and licensing

OpenStreetMap-derived data is attributed to OpenStreetMap contributors and is subject to the ODbL. Every schedule displayed in the app must include its source and last-confirmed date. See [docs/API_NOTES.md](docs/API_NOTES.md) and [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Development principles

- No fake pharmacies, fake schedules, invented coverage counts, or unverified emergency numbers.
- Proximity calculations stay on device. Loading map tiles sends the viewed map area to OpenFreeMap. The map recenters on GPS only after the user explicitly requests location. External directions open only after the user taps the route action.
- Pharmacy records can be downloaded for offline search. Offline map tiles are not implemented yet; the map needs an internet connection.
- UI changes are checked against the supplied screen references and recorded in `docs/DESIGN_DEVIATIONS.md`.
