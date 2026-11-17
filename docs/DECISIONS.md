# Architecture decisions

This is a short ADR log. Decisions follow the product specification in `PROMPT_CODEX_LOCAPHARM.md`; unresolved items remain explicit rather than being presented as verified facts.

## ADR-001 — Product scope and platform

- **Status:** Accepted
- **Decision:** Android-first, free, no-account, French-first application for all ten regions of Cameroon. English is the second language. No ads, medicine sales, diagnosis, or behavioral analytics.
- **Reason:** Fixed by the product brief.
- **Consequences:** Privacy, low-bandwidth operation, offline pharmacy data, accessibility, and graceful regional coverage are baseline requirements.

## ADR-002 — Application stack

- **Status:** Accepted for Sprint 0
- **Decision:** Ionic Angular 8, Angular standalone APIs/signals, strict TypeScript, Tailwind CSS 3 (the supplied screen code uses Tailwind 3 configuration), Capacitor 8, and SQLite for durable local data.
- **Versions checked:** Ionic Angular 8.8.19; Angular 20.3.35 and CLI 20.3.43 (the latest Angular line compatible with Ionic 8 per Ionic's support table); Capacitor 8.6.2; Tailwind 3.4.19. Versions are pinned in manifests and lockfiles.
- **Reason:** The product brief fixes Ionic 8 and Tailwind configuration must match the provided HTML. Ionic 9 and Angular 22 are newer, but would change the requested major framework stack. Reassess Ionic 9/Angular 22 before Sprint 1 because Angular 20 support is near its scheduled end.
- **Sources:** https://ionicframework.com/docs/reference/support · https://angular.dev/reference/releases · https://capacitorjs.com/docs

## ADR-003 — OSM pharmacy data

- **Status:** Accepted, coverage pending
- **Decision:** Use OSM/Overpass as the initial open pharmacy-directory source. Only use tags present in OSM; retain element IDs, source URLs, fetch timestamps, and ODbL attribution. Measure coverage before publishing any pack.
- **Reason:** The OSM data licence permits reuse with attribution/share-alike obligations, and the public Overpass service supports small, cached queries.
- **Open item:** A Cameroon-wide Overpass query did not complete from this environment. No counts or completeness claims are accepted yet. See `docs/API_NOTES.md` for a reproducible GitHub Actions check.

## ADR-004 — Map tiles

- **Status:** Provisional
- **Decision:** Use OpenFreeMap vector tiles with MapLibre for the first map spike. Begin with its `liberty` style and apply the Locapharm style locally. Keep the style URL configurable. Do not use `tile.openstreetmap.org` for offline packs.
- **Reason:** The live style endpoint returned HTTP 200 on 2026-11-17; published terms explicitly permit offline downloads up to 3,000 tiles or 50 MB, at no more than four parallel requests, with an identifying User-Agent.
- **Risk:** OpenFreeMap is provided as-is and may be discontinued without notice. A self-hosted OSM vector stack is the fallback. Recheck performance, Cameroon coverage, and terms before release.

## ADR-005 — Routing provider

- **Status:** Open
- **Decision:** No production routing provider is selected. The public OSRM demo endpoint could not be reached from this environment and is not a production commitment. The app must offer an external-maps fallback when in-app routing is unavailable.
- **Next step:** Compare and test a hosted provider with suitable Cameroon coverage/terms against a self-hosted OSRM/GraphHopper/Valhalla deployment during the CI spike. Keep all provider credentials in Worker secrets.

## ADR-006 — Duty schedules

- **Status:** Accepted, source discovery pending
- **Decision:** Do not ingest or display a duty schedule until its publisher, date range, reuse permission, and update cadence are verified. Candidate websites are recorded as candidates only; no candidate is called official without evidence.
- **Fallback:** Accept a source document from an authorized publisher and maintain a validated CSV by pull request, with source and confirmation metadata.

## ADR-007 — Application source licence

- **Status:** Accepted
- **Decision:** MIT for Locapharm application and Worker source code. OSM-derived data remains separately subject to ODbL attribution/share-alike obligations; third-party screen references, fonts, map data, and provider terms keep their own licences.
- **Reason:** Keep the application code reusable without suggesting that OSM data or third-party assets share the same licence.

## ADR-008 — Capacitor plugin candidates

- **Status:** Prepared for Android CI compatibility checks; runtime validation remains open.
- **Decision:** Pin the required Capacitor 8 plugins in `app/package.json`. Use `@capacitor-community/text-to-speech` 8.0.2, `@capacitor-community/keep-awake` 8.0.1, and `@capacitor-community/sqlite` 8.1.1 for their respective features. Use `@capacitor-community/speech-recognition` 7.0.1 as a candidate only: its published peer range starts at Capacitor 7, but it has no Capacitor 8 major release. Do not treat it as compatible until the Actions Android build and device checks pass.
- **SQLite constraint:** The plugin bundles SQLCipher even when database encryption is disabled. Its maintainers flag possible U.S. encryption export reporting. Review distribution requirements before publishing; do not enable encryption until the app's key-management design is reviewed.
- **Permissions:** Keep location, microphone/speech, and notification requests tied to user actions. The diagnostic spike must not prompt for them automatically or speak/vibrate on app launch.
- **Evidence required:** GitHub Actions must compile, install, and launch the Android app with these native dependencies. Paul must then check permission flows, location availability, French voice availability, speech recognition availability, notification registration, keep-awake start/stop, and a SQLite create/write/read/delete cycle on a phone. None of these runtime checks has been run yet.
- **Sources checked:** [Capacitor 8 official plugin repository](https://github.com/ionic-team/capacitor-plugins), [community SQLite release history](https://github.com/capacitor-community/sqlite/releases), [text-to-speech changelog](https://github.com/capacitor-community/text-to-speech/blob/master/CHANGELOG.md), [keep-awake changelog](https://github.com/capacitor-community/keep-awake/blob/master/CHANGELOG.md), and [speech-recognition package metadata](https://github.com/capacitor-community/speech-recognition/blob/master/package.json).
