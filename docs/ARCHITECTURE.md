# Architecture overview

```text
Ionic pages/components
        ↓
Angular domain services (pure calculations where possible)
        ↓
Repositories / providers
  ├─ SQLite: downloaded pharmacy and schedule packs, favorites, settings
  ├─ Capacitor: location, network, haptics, share, speech, notifications
  ├─ OpenFreeMap + MapLibre: vector base map (provider adapter)
  └─ Cloudflare Worker: route proxy, reports, votes, remote config
```

All pharmacy proximity, distance, filtering, and schedule status calculations run locally. OSM packs are produced in GitHub Actions and published as static regional data. SQLite is the offline source after first installation. A location fix stays on device; only a user-requested route sends coarse start/end coordinates to the route provider through the Worker, without storing or logging those coordinates.

Pages do not call SQLite or `HttpClient` directly. Typed repositories/services own data access. Duty schedules have stricter source and expiry rules than directory entries: the app removes the `DE GARDE` badge for expired schedules and shows the source and last update.
