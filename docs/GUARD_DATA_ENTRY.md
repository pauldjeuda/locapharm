# Saisie d'une liste de pharmacies de garde

Do not submit a schedule unless the publisher has authorized reuse or Paul records written permission. A schedule copied from an unlicensed website or a social post is not a valid source.

## CSV file

Use `data/gardes/<region>/<AAAA-Www>.csv` and the exact header/order from `data/gardes/template.csv`. One row is one pharmacy for one uninterrupted validity interval.

- `pharmacy_id`: stable pharmacy identifier already present in a reviewed regional pack.
- `region`, `city`: canonical values from `data/zones.yml`.
- `starts_at`, `ends_at`: ISO 8601 timestamps with the Cameroon UTC+01:00 offset.
- `kind`: `night`, `day`, `24h`, or `weekend`.
- `source_id`: an entry in `data/sources.yml` whose reuse status is `permitted`.
- `confirmed_at`: when an authorized person confirmed this exact entry, with offset.
- `official`: `true` only when a competent authority/publisher issued it and that status is documented.

## Pull request checklist

1. Attach or link the authorized source document and its publication date.
2. Check every pharmacy ID, city, timezone, start/end, and source ID.
3. Check for duplicate pharmacies, overlaps, gaps, and a period longer than 15 days.
4. Do not guess a missing phone, pharmacy location, or schedule.
5. Record corrections as a follow-up row or override; preserve the prior source and reason.
6. A maintainer reviews the data before a pack is published. The app still says “Appelez avant de vous déplacer.”
