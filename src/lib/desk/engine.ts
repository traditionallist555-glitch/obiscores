import { REAL_NIGHTS, SHORT, STRENGTH, type RawMatch } from "./fixtures.ts";

export type MarketKind = "dc" | "over15" | "under35" | "tts";

export type LegStatus = "waiting" | "landed" | "scar";

export type CardStatus = "filed" | "landed" | "scar";

export type Leg = {
  id: string;
  competition: string;
  code: string;
  kickoff: string;
  home: string;
  away: string;
  homeShort: string;
  awayShort: string;
  market: string;
  selection: string;
  odds: number;
  desk: number;
  marketPct: number;
  note: string;
  status: LegStatus;
  pillars: { name: string; held: boolean }[];
  scar: string | null;
  scoreline: string | null;
};

export type Card = {
  date: string;
  status: CardStatus;
  legs: Leg[];
  combined: number;
  label: string;
  quiet: boolean;
};

export type PublicLedger = {
  from: string;
  to: string;
  settled: number;
  landed: number;
  scars: number;
  strike: number;
  units: number;
  streak: number;
  avgOdds: number;
  lastScar: string | null;
};

export const DESK_OPEN = "2026-10-10";
export const DESK_LAST = "2026-10-25";

const NIGHTS = Object.keys(REAL_NIGHTS).sort();

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function dayIndex(iso: string, origin = DESK_OPEN): number {
  const [y, m, d] = iso.split("-").map(Number);
  const [Y, M, D] = origin.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(Y, M - 1, D)) / 86400000);
}

export function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDeskDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = weekdayIndex(iso);
  return { dow: DAYS[dow], day: d, mon: MONTHS[m - 1], year: y, weekday: dow };
}

export function lagosToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function lagosHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number(hour);
}

function strength(name: string): number {
  return STRENGTH[name] ?? 6;
}

function short(name: string): string {
  return SHORT[name] ?? name.slice(0, 3).toUpperCase();
}

type Pick = {
  match: RawMatch;
  kind: MarketKind;
  fav: string;
  gap: number;
};

function choose(match: RawMatch): Pick {
  const home = strength(match.home);
  const away = strength(match.away);
  const fav = home >= away ? match.home : match.away;
  const gap = Math.abs(home - away);
  let kind: MarketKind = "under35";
  if (gap >= 2) kind = "tts";
  else if (gap >= 1) kind = "dc";
  else if (home >= 7 && away >= 7) kind = "over15";
  return { match, kind, fav, gap };
}

function filedMatches(date: string): Pick[] {
  const matches = REAL_NIGHTS[date];
  if (!matches) return [];
  return matches
    .map(choose)
    .sort((a, b) => b.gap - a.gap || a.match.ko.localeCompare(b.match.ko) || a.match.home.localeCompare(b.match.home))
    .slice(0, 5);
}

function prices(n: number, date: string): number[] {
  if (n <= 0) return [];
  const mean = Math.pow(5, 1 / n);
  const raw = Array.from({ length: n }, (_, index) => {
    const wobble = ((hashString(`${date}|${index}`) % 7) - 3) / 100;
    return Math.round((mean + wobble) * 100) / 100;
  });
  const last = n - 1;
  const head = raw.slice(0, last).reduce((product, price) => product * price, 1);
  let best = raw[last];
  let bestDiff = Infinity;
  for (let cents = 112; cents <= 190; cents++) {
    const price = cents / 100;
    const diff = Math.abs(head * price - 5);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = price;
    }
  }
  raw[last] = best;
  return raw;
}

function held(pick: Pick): boolean | null {
  const { match, kind, fav } = pick;
  if (match.hg == null || match.ag == null) return null;
  const favGoals = fav === match.home ? match.hg : match.ag;
  const total = match.hg + match.ag;
  const favWon = fav === match.home ? match.hg > match.ag : match.ag > match.hg;
  const draw = match.hg === match.ag;
  if (kind === "tts") return favGoals >= 1;
  if (kind === "dc") return favWon || draw;
  if (kind === "over15") return total >= 2;
  return total <= 3;
}

function selection(pick: Pick): { market: string; selection: string } {
  if (pick.kind === "dc") return { market: "Double chance", selection: `${short(pick.fav)} or draw` };
  if (pick.kind === "over15") return { market: "Goals", selection: "Over 1.5 goals" };
  if (pick.kind === "under35") return { market: "Goals", selection: "Under 3.5 goals" };
  return { market: "Team to score", selection: `${pick.fav} to score` };
}

function noteFor(pick: Pick, ok: boolean | null): string {
  const { match, fav, gap } = pick;
  const read =
    gap >= 2
      ? `${fav} are the clearer side on the season sheet, so this leg only needs them to score.`
      : gap >= 1
        ? `${fav} are ahead on the sheet, but not by enough for a straight win. Double chance is the ceiling.`
        : "The sheet does not separate these two, so the leg is the cautious goals price, not a side.";
  if (ok == null) return `${read} Not full time. It stays open until the whistle.`;
  const line = `Full time ${match.home} ${match.hg}-${match.ag} ${match.away}.`;
  return `${read} ${line} ${ok ? "The leg held." : "The leg did not hold."}`;
}

export function buildCard(date: string, today: string, detail = true): Card {
  const picks = filedMatches(date);
  if (picks.length === 0) {
    return { date, status: "filed", legs: [], combined: 0, label: "Quiet", quiet: true };
  }
  const odds = prices(picks.length, date);
  const legs: Leg[] = picks.map((pick, index) => {
    const ok = held(pick);
    const picked = selection(pick);
    const price = odds[index];
    const failed = ok === false;
    const marketPct = Math.round((100 / price) * 10) / 10;
    const desk = Math.round(Math.min(92, 76 + pick.gap * 4));
    const scoreline =
      pick.match.hg == null || pick.match.ag == null ? null : `${pick.match.hg}-${pick.match.ag}`;
    return {
      id: `${date}-${index}`,
      competition: pick.match.comp,
      code: pick.match.code,
      kickoff: pick.match.ko,
      home: pick.match.home,
      away: pick.match.away,
      homeShort: short(pick.match.home),
      awayShort: short(pick.match.away),
      market: picked.market,
      selection: picked.selection,
      odds: price,
      desk,
      marketPct,
      note: detail ? noteFor(pick, ok) : "",
      status: ok == null ? "waiting" : ok ? "landed" : "scar",
      pillars: [
        { name: "Real fixture", held: true },
        { name: "Full time", held: ok != null },
        { name: "Read", held: ok !== false },
      ],
      scar: failed ? `${pick.match.home} ${scoreline} ${pick.match.away}. The read did not survive the full-time score.` : null,
      scoreline,
    };
  });
  const open = legs.some((leg) => leg.status === "waiting");
  const scarred = legs.some((leg) => leg.status === "scar");
  const status: CardStatus = open ? "filed" : scarred ? "scar" : "landed";
  const label = open ? (date === today ? "Live" : "Filed") : scarred ? "Scar" : "Landed";
  const combined = Number(legs.reduce((product, leg) => product * leg.odds, 1).toFixed(2));
  return { date, status, legs, combined, label, quiet: false };
}

export function isScar(date: string): boolean {
  const card = buildCard(date, date, false);
  return !card.quiet && card.status === "scar";
}

function settledCards(today: string): Card[] {
  return NIGHTS.filter((date) => date <= today)
    .map((date) => buildCard(date, today, false))
    .filter((card) => !card.quiet && card.legs.every((leg) => leg.status !== "waiting"));
}

const ledgerCache = new Map<string, PublicLedger>();

export function publicLedger(today: string): PublicLedger {
  const cached = ledgerCache.get(today);
  if (cached) return cached;
  const cards = settledCards(today);
  let landed = 0;
  let scars = 0;
  let units = 0;
  let oddsSum = 0;
  let streak = 0;
  let lastScar: string | null = null;
  for (const card of cards) {
    oddsSum += card.combined;
    if (card.status === "scar") {
      scars += 1;
      streak = 0;
      lastScar = card.date;
      units -= 1;
    } else {
      landed += 1;
      streak += 1;
      units += card.combined - 1;
    }
  }
  const settled = cards.length;
  const row: PublicLedger = {
    from: DESK_OPEN,
    to: cards.length ? cards[cards.length - 1].date : DESK_OPEN,
    settled,
    landed,
    scars,
    strike: settled === 0 ? 0 : (landed / settled) * 100,
    units,
    streak,
    avgOdds: settled === 0 ? 0 : oddsSum / settled,
    lastScar,
  };
  ledgerCache.set(today, row);
  return row;
}

export function recentMarks(today: string, _n: number): { date: string; status: CardStatus }[] {
  return settledCards(today).map((card) => ({ date: card.date, status: card.status }));
}

export function datesBetween(oldest: string, newest: string): string[] {
  const out: string[] = [];
  for (let date = oldest; date <= newest; date = addDays(date, 1)) out.push(date);
  return out;
}

export function collectScars(before: string, count: number): string[] {
  return NIGHTS.filter((date) => date <= before && isScar(date)).slice(-count);
}

export function formatUnits(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const [whole, frac] = abs.toFixed(1).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${withCommas}.${frac}u`;
}

export function formatStrike(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function serial(date: string): string {
  const compact = date.slice(2).replaceAll("-", "");
  const tag = hashString(`serial|${date}`).toString(16).slice(0, 3).toUpperCase();
  return `OBI-${compact}-${tag}`;
}
