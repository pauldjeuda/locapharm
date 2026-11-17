# Data source discovery

Checked 2026-11-17. The terms “official” and “permitted” refer to source evidence, not to how a directory describes itself. A candidate remains unused until its reuse terms or written permission are recorded in `data/sources.yml`.

## Pharmacy directory

| Source                     | Coverage / format observed                                                                                                       | Status                                                                                                                             | Next action                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenStreetMap / Overpass   | Country-wide open map database; pharmacy and healthcare tags.                                                                    | Permitted under ODbL with attribution/share-alike obligations; query attempts failed TLS/timeouts, so no object count is verified. | Keep Overpass as a read-only spike; compare future city-tag coverage to field evidence before making any completeness claim.               |
| Geofabrik Cameroon extract | Public regional OSM PBF. The download page reported 213 MB and data through `2026-11-15T21:22:28Z` when checked on `2026-11-17`. | ODbL-derived; public extracts omit contributor names/user IDs/changeset IDs. The page check did not download or import the file.   | Monthly Actions job records timestamp/checksum and raises a review PR. Review the first generated pack and coverage report before merging. |

## Duty schedules

| Candidate                                         | Publisher / format seen                                         | Evidence and limitations                                                                                                                                                                                                                                                      | Status / next action                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| MboaPHARMA                                        | Commercial health directory; web pages list schedules by city.  | The root page returned 403 to the browser check. Its `robots.txt` has `Content-Signal: search=yes,ai-train=yes,use=reference`; this does not grant permission to copy and redistribute schedules in an app. Legal-page reuse terms and schedule provenance remain unverified. | `candidate`, non-official. Do not ingest; request a written feed/republication permission and source-of-truth details.                  |
| Annuaire Médical du Cameroun                      | Medical directory; page offers region/city schedule browsing.   | The page timed out and `robots.txt` could not be retrieved in the check. Reuse terms, update process, and schedule provenance remain unverified.                                                                                                                              | `candidate`, non-official. Do not ingest; request written permission and provenance.                                                    |
| Pharma Dream                                      | Health services platform; schedule listings for several cities. | Its current schedule page displayed a validity range in 2027 although the check date is 2026-11-17. Its terms updated 2026-11-03 state that reproduction/diffusion of the platform or any component is prohibited without written consent.                                    | `rejected` for current use. Do not copy; only reconsider after explicit written permission and a current, publisher-confirmed schedule. |
| Ordre National des Pharmaciens du Cameroun (ONPC) | Professional authority website and public register.             | Official ONPC site located, but no public current duty schedule/feed was found during this check. Finding the site is not evidence that a schedule is official.                                                                                                               | `candidate`, authority/contact only; ask the Ordre for schedule publication or authorized regional contacts.                            |
| DPML / MINSANTE                                   | Ministry/department websites and regulatory publications.       | Official government pages were located; a current city-level duty feed was not found. Regulatory directory data is not a duty roster.                                                                                                                                         | `candidate`, official publisher but no schedule source identified; contact for direction to the competent regional body.                |

## Questions for each publisher

1. Who creates and confirms each city/department roster?
2. Does the publisher authorize copying, transformation, and offline distribution in Locapharm? Under what licence, attribution, and update conditions?
3. What is the roster's time zone, handover hour, holiday rule, and correction channel?
4. Can the publisher provide a stable CSV, JSON, or signed PDF feed and a contact for urgent corrections?
5. When was the current schedule confirmed, and how will expired/withdrawn schedules be communicated?

## Safe fallback

Use a validated CSV pull request only after the submitting contributor supplies an authorized source document. Record `source_id`, exact source URL/document, `confirmed_at`, city, time zone, and validity interval for every row. The app displays the source and last update, preserves “Appelez avant de vous déplacer,” and removes the `DE GARDE` badge as soon as the schedule expires.

Message template:

> Bonjour, nous développons Locapharm, un annuaire gratuit des pharmacies du Cameroun. Nous souhaitons afficher, sans publicité et avec mention de votre organisme, les pharmacies de garde que vous publiez, avec la date de mise à jour et un numéro de confirmation. Autorisez-vous la réutilisation et la redistribution hors ligne de ces données ? Si oui, pourriez-vous préciser la licence, l'attribution, le format, la fréquence de mise à jour et le contact à prévenir en cas de correction urgente ? Nous n'afficherons aucune liste sans votre accord et nous indiquerons clairement sa source.

## Emergency contacts

The offline directory in `data/emergency.json` was checked against the [MINAT contacts page](https://minat.gov.cm/contacts-generaux/) on 2026-11-17. It lists SAMU 119/19, firefighters 118/18, police secours 117/17 for Yaoundé, Douala, and Garoua, and gendarmerie 113/13 for Centre, Littoral, Ouest, and Nord-Ouest. The app preserves the geographic limits stated by the publisher and displays the checked date and source. Recheck this page before each public release.
