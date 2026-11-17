# External services and API notes

Checked on 2026-11-17. Provider terms can change; recheck them before each public release. A provider page being reachable does not establish a service-level agreement.

## OpenStreetMap data and Overpass

| Item            | Result                                                                                                                                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pharmacy source | OpenStreetMap elements tagged `amenity=pharmacy` or `healthcare=pharmacy`.                                                                                                                                                                                                                                                       |
| Licence         | ODbL 1.0. Display “© OpenStreetMap contributors” and provide the ODbL attribution in About/licences; preserve source element IDs and extraction dates.                                                                                                                                                                          |
| Overpass test   | One Cameroon-wide POST to `https://overpass-api.de/api/interpreter` failed TLS in this environment. A small bounding-box query failed TLS as well. A one-request GET against `overpass.kumi.systems` timed out after 20 seconds. Therefore there are **no verified pharmacy counts or completeness percentages** in this report. |
| Use policy      | Public Overpass instances are shared infrastructure. Keep requests small, infrequent, cached, and identified; do not use them as a per-user production API. Use a current regional extract or a managed/self-hosted instance if the daily pipeline exceeds fair-use limits.                                                      |
| Decision        | Keep Overpass as the initial one-off coverage spike; run it on GitHub Actions and save the result as an auditable report. Do not publish a regional pack until the query and normalization are validated.                                                                                                                        |

Sources: [OSM copyright and licence](https://www.openstreetmap.org/copyright), [Overpass public-instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [Overpass API documentation](https://wiki.openstreetmap.org/wiki/Overpass_API).

### Reproducible coverage check

Run `node data/scripts/measure-osm.mjs` manually in a GitHub Actions workflow. The script sends one identified query for pharmacy objects, reports counts and non-empty `name`, `phone`, `opening_hours`, and city tags, and writes no production pack. The result must be attached to `docs/SPRINT_0_REPORT.md` with the run URL. Compare city-level counts to a verified directory or field sample before making any completeness claim. If the request is denied or times out, use a current Cameroon extract from [Geofabrik](https://download.geofabrik.de/africa/cameroon.html) and record its timestamp and checksum.

## Vector map tiles

| Item         | Result                                                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate    | OpenFreeMap `liberty` style, consumed by MapLibre.                                                                                                                                                                |
| Live check   | `GET https://tiles.openfreemap.org/styles/liberty` returned HTTP 200 with `application/json` on 2026-11-17. This was a style-document check, not a Cameroon coverage, throughput, or Android performance test.    |
| Cost / key   | The service states that its public instance is free, with no registration, API key, or published request quota.                                                                                                   |
| Offline use  | Terms updated 2026-10-14 permit up to 3,000 tiles or 50 MB per user download, at no more than four parallel requests, with a unique app-identifying User-Agent. Larger downloads require contacting the operator. |
| Availability | The service is provided as-is; its terms disclaim availability/accuracy warranties and allow discontinuation. It is not an SLA-backed production dependency.                                                      |
| Attribution  | Keep “© OpenStreetMap contributors” and provider attribution visible on the map and in About. Confirm any OpenMapTiles attribution required by the served style before release.                                  |
| Decision     | Provisional provider for the map spike. Build a provider adapter and retain a self-hosted OSM vector-tile fallback. No map is allowed to silently fail: fall back to the pharmacy list.                           |

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
