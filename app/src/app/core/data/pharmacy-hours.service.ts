import { Injectable, OnDestroy, computed, signal } from "@angular/core";
import { PharmacyRecord } from "./pharmacy.models";

const CAMEROON_TIME_ZONE = "Africa/Douala";
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const CAMEROON_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMEROON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
type OpeningHoursParser = import("opening_hours").default;
type OpeningHoursConstructor = typeof import("opening_hours").default;

export interface PharmacyHoursStatus {
  state: "open" | "closed" | "unknown";
  reason?: "missing" | "invalid" | "conditional" | "loading" | "timezone";
  nextChange?: {
    direction: "opens" | "closes";
    dayOffset: number;
    time: string;
  };
}

@Injectable({ providedIn: "root" })
export class PharmacyHoursService implements OnDestroy {
  readonly now = signal(new Date());
  readonly cameroonNow = computed(() => toCameroonWallTime(this.now()));
  readonly nextChangeTimeIsSafe = computed(() => {
    const localNow = this.cameroonNow();
    return localNow !== undefined && hasStableLocalOffset(localNow, 8);
  });
  readonly parserReady = signal(false);
  readonly parserRevision = signal(0);

  private parserModule?: Promise<typeof import("opening_hours")>;
  private readonly parsers = new Map<string, OpeningHoursParser | null>();
  private timer?: number;

  constructor() {
    if (typeof window !== "undefined") {
      this.timer = window.setInterval(() => this.now.set(new Date()), 60_000);
    }
  }

  async prepare(records: PharmacyRecord[]): Promise<void> {
    const scheduledRecords = records.filter((record) =>
      Boolean(record.opening_hours?.trim()),
    );
    if (!scheduledRecords.length) return;

    this.parserModule ??= import("opening_hours");
    let OpeningHours: OpeningHoursConstructor;
    try {
      ({ default: OpeningHours } = await this.parserModule);
    } catch {
      for (const record of scheduledRecords) {
        this.parsers.set(parserKey(record), null);
      }
      this.parserReady.set(true);
      this.parserRevision.update((revision) => revision + 1);
      return;
    }
    for (const record of scheduledRecords) {
      const key = parserKey(record);
      if (this.parsers.has(key)) continue;
      try {
        this.parsers.set(
          key,
          new OpeningHours(
            record.opening_hours!.trim(),
            {
              lat: record.lat,
              lon: record.lon,
              address: {
                country_code: "cm",
                state: record.region ?? "",
              },
            },
            {
              mode: undefined,
              tag_key: "opening_hours",
              map_value: false,
              warnings_severity: undefined,
              locale: "fr",
            },
          ),
        );
      } catch {
        this.parsers.set(key, null);
      }
    }
    this.parserReady.set(true);
    this.parserRevision.update((revision) => revision + 1);
  }

  status(record: PharmacyRecord): PharmacyHoursStatus {
    this.parserRevision();
    const value = record.opening_hours?.trim();
    if (!value) return { state: "unknown", reason: "missing" };
    if (!this.parserReady()) return { state: "unknown", reason: "loading" };

    const parser = this.parsers.get(parserKey(record));
    if (!parser) return { state: "unknown", reason: "invalid" };

    try {
      const localNow = this.cameroonNow();
      if (!localNow) return { state: "unknown", reason: "timezone" };
      if (parser.getUnknown(localNow)) {
        return { state: "unknown", reason: "conditional" };
      }

      const isOpen = parser.getState(localNow);
      const limit = new Date(localNow.getTime() + 8 * DAY_MS);
      // opening_hours.js reads Date fields in the device's local zone. The
      // current Cameroon wall time is still safe in a stable local zone, but
      // next-change arithmetic can cross a device DST transition. In that
      // case keep the current state and omit the derived next-change claim.
      const nextChange = this.nextChangeTimeIsSafe()
        ? parser.getNextChange(localNow, limit)
        : undefined;
      const nextChangeInfo = nextChange
        ? {
            direction: isOpen ? ("closes" as const) : ("opens" as const),
            dayOffset: calendarDayOffset(localNow, nextChange),
            time: `${String(nextChange.getHours()).padStart(2, "0")}:${String(nextChange.getMinutes()).padStart(2, "0")}`,
          }
        : undefined;

      return {
        state: isOpen ? "open" : "closed",
        ...(nextChangeInfo ? { nextChange: nextChangeInfo } : {}),
      };
    } catch {
      return { state: "unknown", reason: "invalid" };
    }
  }

  isOpenTwentyFourSeven(record: PharmacyRecord): boolean {
    const schedule = record.opening_hours?.trim().toLowerCase();
    return schedule === "24/7" || schedule === "mo-su 00:00-24:00";
  }

  ngOnDestroy(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
  }
}

function parserKey(record: PharmacyRecord): string {
  const openingHours = record.opening_hours?.trim() ?? "";
  const isSunBased = /\b(?:sunrise|sunset|dawn|dusk)\b/i.test(openingHours);
  const location = isSunBased ? `:${record.lat}:${record.lon}` : "";
  return `${record.region ?? ""}:${openingHours}${location}`;
}

function toCameroonWallTime(instant: Date): Date {
  const parts = CAMEROON_TIME_FORMATTER.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((item) => item.type === type)?.value ?? "0");

  // opening_hours.js evaluates Date fields in the runtime's local timezone.
  // Preserve Douala's wall-clock fields so the pharmacy schedule does not
  // follow a device timezone changed while travelling outside Cameroon.
  const wallTime = new Date(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
    instant.getUTCMilliseconds(),
  );
  if (
    wallTime.getFullYear() !== part("year") ||
    wallTime.getMonth() !== part("month") - 1 ||
    wallTime.getDate() !== part("day") ||
    wallTime.getHours() !== part("hour") ||
    wallTime.getMinutes() !== part("minute") ||
    wallTime.getSeconds() !== part("second")
  ) {
    // Some device time zones have nonexistent local wall times during a DST
    // jump. Returning unknown is safer than evaluating a normalized hour.
    return undefined;
  }
  return wallTime;
}

function hasStableLocalOffset(from: Date, days: number): boolean {
  const expectedOffset = from.getTimezoneOffset();
  for (let hours = 6; hours <= days * 24; hours += 6) {
    if (
      new Date(from.getTime() + hours * HOUR_MS).getTimezoneOffset() !==
      expectedOffset
    ) {
      return false;
    }
  }
  return true;
}

function calendarDayOffset(from: Date, to: Date): number {
  const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay - fromDay) / DAY_MS);
}
