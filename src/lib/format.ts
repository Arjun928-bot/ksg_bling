export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export const num = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n);

/** Start and end of "today" in India (IST, UTC+5:30), as ISO strings for Postgres. */
export function istDayRange(now = new Date()) {
  const IST = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST);
  const startIstMidnightUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST;
  return {
    start: new Date(startIstMidnightUtc).toISOString(),
    end: new Date(startIstMidnightUtc + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Today's date in India as YYYY-MM-DD. */
export const istToday = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const dt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

const IST_MS = 5.5 * 3600_000;
const DAY_MS = 86_400_000;
const istDateToUtc = (d: string) => new Date(new Date(`${d}T00:00:00Z`).getTime() - IST_MS).getTime();

export type RangeKey = "today" | "yesterday" | "week" | "month" | "custom";
export const RANGES: [RangeKey, string][] = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["week", "Last 7 days"], ["month", "This month"], ["custom", "Custom"],
];

/** Report period in India time. `to` is exclusive. */
export function reportRange(range: string | undefined, from?: string, to?: string) {
  const { start, end } = istDayRange();
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  const D = /^\d{4}-\d{2}-\d{2}$/;
  switch (range) {
    case "yesterday": return { key: "yesterday" as RangeKey, from: new Date(s - DAY_MS).toISOString(), to: start, label: "Yesterday" };
    case "week": return { key: "week" as RangeKey, from: new Date(s - 6 * DAY_MS).toISOString(), to: end, label: "Last 7 days" };
    case "month": {
      const ist = new Date(Date.now() + IST_MS);
      const first = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_MS;
      return { key: "month" as RangeKey, from: new Date(first).toISOString(), to: end, label: "This month" };
    }
    case "custom":
      if (from && to && D.test(from) && D.test(to)) {
        return { key: "custom" as RangeKey, from: new Date(istDateToUtc(from)).toISOString(), to: new Date(istDateToUtc(to) + DAY_MS).toISOString(), label: `${from} to ${to}` };
      }
    // falls through to today when custom dates are missing
    default: return { key: "today" as RangeKey, from: start, to: new Date(e).toISOString(), label: "Today" };
  }
}
