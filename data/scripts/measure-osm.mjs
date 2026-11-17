const endpoint =
  process.env["OVERPASS_ENDPOINT"] ?? "https://overpass-api.de/api/interpreter";
const query = `[out:json][timeout:60];
area["ISO3166-1"="CM"]["admin_level"="2"]->.cameroon;
(
  nwr["amenity"="pharmacy"](area.cameroon);
  nwr["healthcare"="pharmacy"](area.cameroon);
);
out center tags;`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent":
      "Locapharm-data-refresh/0.1 (+https://github.com/pauldjeuda/locapharm)",
    accept: "application/json",
  },
  body: new URLSearchParams({ data: query }),
  signal: AbortSignal.timeout(75_000),
});

if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`);
const payload = await response.json();
if (!Array.isArray(payload.elements))
  throw new Error("Overpass response did not contain elements");

const uniqueElements = new Map();
for (const element of payload.elements) {
  uniqueElements.set(`${element.type}/${element.id}`, element);
}

const byCity = new Map();
for (const element of uniqueElements.values()) {
  const tags = element.tags ?? {};
  const city = tags["addr:city"] ?? "(city tag absent)";
  const metrics = byCity.get(city) ?? {
    pharmacies: 0,
    named: 0,
    withPhone: 0,
    withHours: 0,
  };
  metrics.pharmacies += 1;
  if (tags.name) metrics.named += 1;
  if (tags.phone || tags["contact:phone"]) metrics.withPhone += 1;
  if (tags.opening_hours) metrics.withHours += 1;
  byCity.set(city, metrics);
}

const rows = [...byCity.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], "fr"),
);
process.stdout.write(
  `Fetched ${uniqueElements.size} unique pharmacy objects. This is mapped coverage, not a completeness claim.\n`,
);
process.stdout.write("city\tpharmacies\tname\tphone\topening_hours\n");
for (const [city, data] of rows) {
  process.stdout.write(
    `${city}\t${data.pharmacies}\t${data.named}\t${data.withPhone}\t${data.withHours}\n`,
  );
}
