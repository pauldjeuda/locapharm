# Locapharm

Locapharm is an Android-first, French-first pharmacy finder for Cameroon. It is designed to show nearby pharmacies, clearly sourced duty schedules, contact details, and routes while keeping pharmacy data available offline.

The application is free and works without an account. It does not sell medicines, show ads, diagnose users, or send a user's location to a server except when the user requests a route.

## Project status

The repository is being built in gated sprints. Sprint 0 establishes the application shell, CI/CD, data contracts, and external-service decisions. Pharmacy and duty data are not shipped until their sources and quality have been verified. In particular, a pharmacy is never labelled `DE GARDE` without a current, traceable schedule.

## Source layout

- `app/` — Ionic + Angular + Capacitor Android application.
- `data/` — OSM ingestion, schemas, regional packs, and duty-schedule source registry.
- `worker/` — Cloudflare Worker API for routes and community reports.
- `design/stitch_locapharm_cameroon_app_ui/` — original Stitch screens, retained as read-only references.
- `docs/` — architecture, decisions, provider notes, setup, sprint reports, and known issues.

## Build and checks

All app builds, tests, Android artifacts, and releases run in GitHub Actions. Do not build or test on a developer workstation. See [docs/SETUP_PAUL.md](docs/SETUP_PAUL.md) for repository setup and [docs/SPRINT_0_PLAN.md](docs/SPRINT_0_PLAN.md) for the current plan.

## Data and licensing

OpenStreetMap-derived data is attributed to OpenStreetMap contributors and is subject to the ODbL. Every schedule displayed in the app must include its source and last-confirmed date. See [docs/API_NOTES.md](docs/API_NOTES.md) and [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Development principles

- No fake pharmacies, fake schedules, invented coverage counts, or unverified emergency numbers.
- Location calculations stay on device. Route requests are transient and are not logged with coordinates.
- Offline map downloads use a provider whose terms explicitly permit them; the OSM standard raster server is not used for offline packs.
- UI changes are checked against the supplied screen references and recorded in `docs/DESIGN_DEVIATIONS.md`.
