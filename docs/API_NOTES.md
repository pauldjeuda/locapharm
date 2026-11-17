# External services and API notes

Checked on 2026-11-17. Provider terms can change; recheck them before each public release. A provider page being reachable does not establish a service-level agreement.

## OpenStreetMap data, Geofabrik, and Overpass

| Item                  | Result                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pharmacy source       | OpenStreetMap elements tagged `amenity=pharmacy` or `healthcare=pharmacy`.                                                                                                                                                                                                                                                                                  |
| Licence               | ODbL 1.0. Display “© OpenStreetMap contributors” and provide the ODbL attribution in About/licences; preserve source element IDs and extraction dates.                                                                                                                                                                                                     |
| Overpass test         | One Cameroon-wide POST to `https://overpass-api.de/api/interpreter` failed TLS in this environment. A small bounding-box query failed TLS as well. A one-request GET against `overpass.kumi.systems` timed out after 20 seconds. Therefore there are **no verified pharmacy counts or completeness percentages** in this report.                            |
| Use policy            | Public Overpass instances are shared infrastructure. Keep requests small, infrequent, cached, and identified; do not use them as a per-user production API. Use a current regional extract or a managed/self-hosted instance if the daily pipeline exceeds fair-use limits.                                                                                 |
| Geofabrik extract     | The Cameroon PBF page was reachable on 2026-11-17. It reported a 213 MB file, modified about 10 hours earlier, containing OSM data through `2026-11-15T21:22:28Z`. This page check does not mean the extract was downloaded or processed in this workspace.                                                                                                 |
| Terms and attribution | The public extract omits contributor names, user IDs, and changeset IDs; its data remain ODbL. Attribute OpenStreetMap and retain the source URL, object IDs, extract timestamp, and checksum. See the Geofabrik download and legal pages.                                                                                                                  |
| Decision              | `.github/workflows/data-refresh.yml` downloads the PBF in Actions, filters `amenity=pharmacy` and `healthcare=pharmacy`, creates a provenance-bearing pack, and opens a review PR. It adds no duty schedule or emergency number. A pack is not available to the app until Actions runs, the generated PR is reviewed and merged, and Pages deploy succeeds. |

Sources: [OSM copyright and licence](https://www.openstreetmap.org/copyright), [Overpass public-instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [Overpass API documentation](https://wiki.openstreetmap.org/wiki/Overpass_API).

### Reproducible coverage check

The Overpass script remains a read-only coverage spike and has not yielded a count because the tested public endpoints failed TLS or timed out. The new monthly Actions workflow uses the public Cameroon PBF at [Geofabrik](https://download.geofabrik.de/africa/cameroon.html), records its timestamp and checksum, and proposes the normalized result for review. Its coverage TSV counts mapped objects and present tags only; it is not a real-world completeness measure. Geofabrik's public extract omits contributor names and changeset IDs, which avoids putting those personal metadata fields in the application pack.

## Vector map tiles

| Item         | Result                                                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate    | OpenFreeMap `liberty` style, consumed by MapLibre GL JS 6.16.0. This is implemented in the map page but has not been exercised in Actions or on Android.                                                          |
| Live check   | `GET https://tiles.openfreemap.org/styles/liberty` returned HTTP 200 with `application/json` on 2026-11-17. This was a style-document check, not a Cameroon coverage, throughput, or Android performance test.    |
| Cost / key   | The service states that its public instance is free, with no registration, API key, or published request quota.                                                                                                   |
| Offline use  | Terms updated 2026-10-14 permit up to 3,000 tiles or 50 MB per user download, at no more than four parallel requests, with a unique app-identifying User-Agent. Larger downloads require contacting the operator. |
| Availability | The service is provided as-is; its terms disclaim availability/accuracy warranties and allow discontinuation. It is not an SLA-backed production dependency.                                                      |
| Attribution  | Keep “© OpenStreetMap contributors” and provider attribution visible on the map and in About. Confirm any OpenMapTiles attribution required by the served style before release.                                  |
| Decision     | Provisional provider for the map spike. Build a provider adapter and retain a self-hosted OSM vector-tile fallback. No map is allowed to silently fail: fall back to the pharmacy list.                           |

The map page currently uses OpenFreeMap's hosted Liberty style. Each map view requests tiles for its visible coordinates, so the tile provider can infer the viewed area from requests. The app deliberately does not center the online map on the GPS fix; nearby search and distance sorting use the GPS fix only on-device. Make this distinction clear in the privacy screen before release. Offline map packs or a reviewed self-hosted tile service are still needed if the product requirement is that the viewed area itself never reaches a provider.

Sources: [OpenFreeMap](https://openfreemap.org/), [quick start](https://openfreemap.org/quick_start/), [terms](https://openfreemap.org/tos/), [OSM standard raster tile policy](https://operations.osmfoundation.org/policies/tiles/).

The OSM standard raster endpoint is **not** used for offline packs: OSMF prohibits bulk prefetching and offline downloads from `tile.openstreetmap.org`. This service also has no availability guarantee and requires attribution, cache compliance, and an identifying User-Agent.

## Routing

| Item                | Result                                                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OSRM demo test      | A simple Yaoundé route request to `https://router.project-osrm.org/route/v1/driving/...` failed TLS from this environment. No route response or Cameroon turn-instruction coverage was verified.                            |
| Public demo terms   | OSRM's demo server is restricted to reasonable non-commercial use and has no uptime, latency, or data freshness guarantees. It is suitable for development spikes only, not a public health-adjacent production dependency. |
| Production decision | Open. Compare a contractually suitable hosted route API with self-hosted OSRM/GraphHopper/Valhalla on Cameroon extracts. Never embed a vendor key in the APK; put it in Worker secrets.                                     |
| Fallback            | If route service is absent, report that fact and offer the Android external maps intent. Do not show invented traffic, route alternatives, or road names.                                                                   |

Sources: [OSRM demo server policy](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server), [GraphHopper API documentation](https://docs.graphhopper.com/openapi), [GraphHopper pricing and plan limits](https://www.graphhopper.com/pricing/).

## Guard-schedule sources

Candidate publishers and permission status are tracked in [DATA_SOURCES.md](DATA_SOURCES.md) and `data/sources.yml`. Pharma Dream's current terms prohibit reproduction or distribution of the platform's components without written permission; its schedule page also showed a 2027 validity period during a 2026 check. MboaPHARMA and Annuaire Médical have not provided verified reuse permission or schedule provenance. No schedule was scraped, normalized, or copied into the repository.

## Emergency contacts

The offline contacts are maintained in `data/emergency.json` from the current MINAT [contacts page](https://minat.gov.cm/contacts-generaux/). The page lists SAMU, firefighters, police secours, and gendarmerie numbers and limits police and gendarmerie coverage to named cities/regions. The UI preserves those limits and shows `last_checked`; recheck before each release.

## Opening-hours interpretation

The app uses `opening_hours` 3.16.0 to interpret the OpenStreetMap `opening_hours` tag on-device. The dependency is licensed LGPL-3.0-only, with original portions credited by upstream under BSD-2-Clause; license texts and notices for its `i18next` and `suncalc` dependencies are bundled under `app/public/licenses/` and linked from Settings. Upstream documentation: [opening_hours.js](https://github.com/opening-hours/opening_hours.js).

The app evaluates schedules against `Africa/Douala` wall-clock fields. Conditional, missing, malformed, or time-zone-ambiguous cases remain unknown. The library's documented public-holiday country list does not include Cameroon, so `PH`-dependent rules must not be treated as a reliable holiday calendar. An `OUVERTE · OSM` badge is an interpretation of mapped hours; it is not a live confirmation or a duty schedule. The user is told to call before travelling. Unit cases were authored but have not been run; CI verification remains open.

## Worker reports API

`POST /reports`, protected `GET /admin/pending`, protected report-status updates/contact retrieval, and the opt-in daily issue workflow are authored in `worker/src/index.ts` and `.github/workflows/reports-digest.yml`; the D1 tables and daily retention job are in `worker/migrations/0001_reports.sql` and `worker/wrangler.jsonc`. Reports are limited to pharmacy IDs, selected reasons, optional short text, and optional pharmacy-location corrections within the Cameroon bounding box. Reporter GPS is not an input field. Installation/IP rate-limit keys are HMACs; free text and optional contact numbers are encrypted with AES-GCM, and a contact number requires consent. Reports expire after 30 days and rate-limit rows after 24 hours. Pending API responses decrypt details in memory, redact phone/email-like text, and never return the contact field. The GitHub issue digest omits free text and contacts entirely. Preserve `REPORT_ENCRYPTION_KEY` until all reports encrypted with it have expired or been purged.

The report API and digest workflow have not been deployed or run. The D1 binding and encryption/rate-limit/admin secrets are not configured, migrations and Worker tests have not run, and report submission remains disabled by default. The app correction form calls `POST /reports` only when `/config` enables it and the selected pharmacy exists in an installed pack. The missing-pharmacy flow still needs a safe user-selected map pin. Do not enable reports until the public privacy notice, retention behavior, Cloudflare configuration, and moderation workflow are reviewed. `/route` remains unimplemented. The emergency screen reads the Worker origin from the app-bundled `runtime-config.json` and falls back to its bundled directory; neither the app asset nor the Worker has been deployed.

### Public configuration

`GET /config` returns the emergency directory directly from the versioned `data/emergency.json` source, a 7-day duty-list warning default, a 20 km maximum radius, the current vote threshold, feature flags, an optional minimum app version, and an optional text notice. Its response is cacheable for five minutes. Limits may be overridden only within bounded ranges. Report intake stays unavailable unless `REPORTS_ENABLED=true` and D1, rate-limit, admin, and valid encryption-key settings are present; feedback follows the same prerequisites plus `FEEDBACK_ENABLED=true`; community votes stay unavailable unless `VOTES_ENABLED=true` and D1/rate limiting are configured. All three flags default off. Render `notice` as plain text. GitHub Actions injects the public Worker origin into the app-bundled `runtime-config.json`; the app keeps an embedded emergency-data fallback. Neither the app asset nor the Worker has been deployed.

### Community votes

`POST /votes` accepts one `on_duty`/`closed` vote per installation, pharmacy, and duty-window UUID; `GET /votes/summary` returns only whether at least the configured negative-vote threshold (default 3) was reached in the last 24 hours. Votes use the same D1 rate-limit table, store only HMAC installation IDs, and expire after 30 days. They never change a pharmacy's duty/open status. The Worker source and D1 table are authored, but the app has no vote flow and this path has not been tested or deployed; the vote feature flag must stay off until a sourced duty window is available.

### Bug feedback

`POST /feedback` accepts a 1,000-character message, an installation UUID for rate limiting, and optional allowlisted diagnostics after explicit opt-in. Messages are AES-GCM encrypted; diagnostics are restricted to app version, platform, language, coarse connection state, and a fixed error-code enum. No location, device ID, OS build, arbitrary diagnostic values, or contact field is accepted. Records expire after 30 days; protected admin listing/status endpoints feed the daily digest without sending message text to GitHub. The app form is implemented but stays unavailable unless `FEEDBACK_ENABLED=true`; it has not been tested or deployed.
