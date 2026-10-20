import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import {
  addDays,
  buildCard,
  collectScars,
  datesBetween,
  dayIndex,
  DESK_LAST,
  DESK_OPEN,
  formatDeskDate,
  formatStrike,
  formatUnits,
  lagosHour,
  lagosToday,
  publicLedger,
  recentMarks,
  serial,
  type Card,
  type CardStatus,
} from "@/lib/desk/engine";

type Filter = "all" | "landed" | "scars" | "open";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All nights" },
  { id: "landed", label: "Landed" },
  { id: "scars", label: "Scars" },
  { id: "open", label: "Still open" },
];

export function DeskApp() {
  const today = useMemo(() => lagosToday(), []);
  const hour = useMemo(() => lagosHour(), []);
  const tonight = hour >= 16;
  const ledger = useMemo(() => publicLedger(today), [today]);
  const marks = useMemo(() => recentMarks(today, 18), [today]);

  const [selected, setSelected] = useState(today);
  const [stake, setStake] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState(() => ({
    oldest: DESK_OPEN,
    newest: DESK_LAST,
  }));
  const [scarCount, setScarCount] = useState(12);

  useEffect(() => {
    const raw = localStorage.getItem("obiscores-stake");
    const n = raw ? Number(raw) : 1;
    if (Number.isFinite(n) && n >= 0.5 && n <= 20) setStake(n);
  }, []);

  useEffect(() => {
    localStorage.setItem("obiscores-stake", String(stake));
  }, [stake]);

  const card = useMemo(() => buildCard(selected, today, true), [selected, today]);

  const rows = useMemo(() => {
    if (filter === "scars") {
      return collectScars(addDays(today, -1), scarCount).map((date) => buildCard(date, today, false));
    }
    const oldest = filter === "open" ? today : range.oldest;
    const newest = range.newest < today && filter === "open" ? today : range.newest;
    return datesBetween(oldest, newest)
      .map((date) => buildCard(date, today, false))
      .filter((item) => !item.quiet)
      .filter((item) => {
        if (filter === "landed") return item.status === "landed";
        if (filter === "open") return item.status === "filed";
        return true;
      });
  }, [filter, range, scarCount, today]);

  function reveal(date: string) {
    setSelected(date);
    setRange((current) => {
      let oldest = date < current.oldest ? date : current.oldest;
      let newest = date > current.newest ? date : current.newest;
      if (dayIndex(newest) - dayIndex(oldest) > 90) {
        oldest = addDays(date, -24);
        newest = addDays(date, 10);
      }
      return { oldest, newest };
    });
  }

  function shift(by: number) {
    reveal(addDays(selected, by));
  }

  const when = formatDeskDate(today);
  const nightWord = tonight ? "Tonight" : "Today";

  return (
    <div className="min-h-screen bg-ink text-bone">
      <header className="sticky top-0 z-20 border-b border-line bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center bg-signal text-ink" aria-hidden="true">
              <span className="font-display text-3xl leading-none">O</span>
            </span>
            <div className="min-w-0">
              <p className="font-display text-3xl leading-none tracking-wide text-bone">
                OBi'SCORES
              </p>
              <p className="text-xs uppercase tracking-widest text-ash">Tips · Lagos desk</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl leading-none text-signal tabular-nums">
              {formatStrike(ledger.strike)}
            </p>
            <p className="text-xs uppercase tracking-widest text-ash">Card strike</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat k="Public sample" v={ledger.settled.toLocaleString("en-GB")} d={`Since ${pretty(DESK_OPEN)}`} />
          <Stat k="Landed" v={String(ledger.landed)} d={`${ledger.scars} scars`} />
          <Stat k="Open streak" v={String(ledger.streak)} d={ledger.lastScar ? `Last scar ${pretty(ledger.lastScar)}` : "No scar yet"} />
          <Stat k="Paper, 1 unit" v={formatUnits(ledger.units)} d={`Avg price ${ledger.avgOdds.toFixed(2)}`} />
        </section>

        <section className="mb-6" aria-label="Settled nights">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm uppercase tracking-widest text-ash">Settled nights</h2>
            <p className="text-xs text-ash">{when.dow} {when.day} {when.mon} · Lagos</p>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {marks.map((mark) => (
              <button
                key={mark.date}
                type="button"
                aria-label={`${pretty(mark.date)} ${mark.status}`}
                onClick={() => reveal(mark.date)}
                className={`h-11 w-11 shrink-0 ${mark.status === "scar" ? "bg-signal" : "bg-bone"} ${
                  selected === mark.date ? "ring-2 ring-signal ring-offset-2 ring-offset-ink" : ""
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ash">Bone is a landed card. Red is a scar. Tap a night.</p>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Previous night"
                onClick={() => shift(-1)}
                className="grid h-11 w-11 place-items-center border border-line bg-panel text-bone"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="min-w-0 text-center">
                <p className="font-display text-4xl leading-none tracking-wide text-bone">
                  {selected === today ? nightWord : formatDeskDate(selected).dow}
                </p>
                <p className="text-sm text-ash">{pretty(selected)}</p>
              </div>
              <button
                type="button"
                aria-label="Next night"
                onClick={() => shift(1)}
                className="grid h-11 w-11 place-items-center border border-line bg-panel text-bone"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => reveal(today)}
                className="h-11 border border-line px-4 text-sm text-bone"
              >
                Jump to {nightWord.toLowerCase()}
              </button>
              <label className="flex h-11 items-center gap-2 border border-line px-3 text-sm text-ash">
                Any date
                <input
                  type="date"
                  value={selected}
                  onChange={(event) => {
                    if (event.target.value) reveal(event.target.value);
                  }}
                  className="bg-transparent text-bone tabular-nums"
                />
              </label>
            </div>

            <Ticket card={card} stake={stake} setStake={setStake} today={today} tonight={tonight} />

            <section className="mt-8 border border-line bg-panel p-5">
              <h2 className="font-display text-3xl leading-none tracking-wide text-bone">Real nights only</h2>
              <div className="mt-4 grid gap-4 text-sm leading-relaxed text-ash sm:grid-cols-3">
                <p>
                  <span className="block text-bone">The fixture</span>
                  Every leg is a match that was actually played, or is actually scheduled, in the Premier League, La Liga, Serie A, Bundesliga or Ligue 1.
                </p>
                <p>
                  <span className="block text-bone">The read</span>
                  The side is taken from the season sheet before the score. A clear gap is team-to-score. A smaller gap is double chance. Level sides get the cautious goals price.
                </p>
                <p>
                  <span className="block text-bone">The whistle</span>
                  A past night is graded from the full-time score. Tonight and next weekend stay filed until every leg is finished. Nothing is marked landed in advance.
                </p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ash">
                The strike is the share of fully settled cards that landed in full, from {pretty(DESK_OPEN)} through the last finished night.
                One miss scars the card. It is not a target, and it is not a promise that Saturday lands.
              </p>
            </section>
          </div>

          <aside className="border border-line bg-panel lg:sticky lg:top-24">
            <div className="flex gap-1 overflow-x-auto border-b border-line p-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`h-11 shrink-0 px-3 text-sm ${
                    filter === item.id ? "bg-bone text-ink" : "text-ash"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <ul className="max-h-[36rem] overflow-y-auto">
              {rows.map((item) => (
                <li key={item.date}>
                  <button
                    type="button"
                    onClick={() => reveal(item.date)}
                    aria-current={item.date === selected}
                    className={`flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left ${
                      item.date === selected ? "bg-ink" : ""
                    }`}
                  >
                    <span>
                      <span className="block text-sm text-bone">{pretty(item.date)}</span>
                      <span className="block text-xs uppercase tracking-widest text-ash">
                        {item.date === today ? nightWord : item.date > today ? "Ahead" : "Settled"}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-display text-2xl leading-none tabular-nums text-bone">
                        {item.combined.toFixed(2)}
                      </span>
                      <StatusText status={item.status} label={item.label} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 p-3">
              {filter === "scars" ? (
                <button
                  type="button"
                  onClick={() => setScarCount((n) => n + 12)}
                  className="col-span-2 h-11 border border-line text-sm text-bone"
                >
                  Older scars
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setRange((current) => {
                        const span = dayIndex(current.newest) - dayIndex(current.oldest);
                        if (span < 70) return { ...current, oldest: addDays(current.oldest, -14) };
                        return {
                          oldest: addDays(current.oldest, -14),
                          newest: addDays(current.newest, -14),
                        };
                      })
                    }
                    className="h-11 border border-line text-sm text-bone"
                  >
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRange((current) => {
                        const span = dayIndex(current.newest) - dayIndex(current.oldest);
                        if (span < 70) return { ...current, newest: addDays(current.newest, 14) };
                        return {
                          oldest: addDays(current.oldest, 14),
                          newest: addDays(current.newest, 14),
                        };
                      })
                    }
                    className="h-11 border border-line text-sm text-bone"
                  >
                    Later
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>

        <footer className="mt-10 border-t border-line py-6 text-sm leading-relaxed text-ash">
          <p>
            OBi'SCORES Tips is a published model card from a Lagos desk. Paper stakes only. It is not a
            bookmaker, not a tip to borrow money for, and not financial advice. Prices move. Cards lose.
            18+. If gambling stops being a game, stop.
          </p>
        </footer>
      </main>
    </div>
  );
}

function Stat({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="border border-line bg-panel px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-ash">{k}</p>
      <p className="mt-1 font-display text-4xl leading-none tabular-nums text-bone">{v}</p>
      <p className="mt-1 text-xs text-ash">{d}</p>
    </div>
  );
}

function StatusText({ status, label }: { status: CardStatus; label: string }) {
  const cls = status === "scar" ? "text-signal" : status === "landed" ? "text-bone" : "text-ash";
  return <span className={`text-xs uppercase tracking-widest ${cls}`}>{label}</span>;
}

function Ticket({
  card,
  stake,
  setStake,
  today,
  tonight,
}: {
  card: Card;
  stake: number;
  setStake: (n: number) => void;
  today: string;
  tonight: boolean;
}) {
  const returns = stake * card.combined;
  const profit = returns - stake;
  const when = formatDeskDate(card.date);
  const stamp = card.status === "filed" ? (card.date === today && tonight ? "Tonight" : "Filed") : card.label;

  if (card.quiet) {
    return (
      <article className="border border-line bg-panel p-6 text-bone">
        <p className="text-xs uppercase tracking-widest text-ash">No card</p>
        <h2 className="mt-2 font-display text-5xl leading-none tracking-wide">
          {when.dow} {when.day} {when.mon}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
          None of the five leagues played this night, so nothing was filed. The real cards run{" "}
          {pretty(DESK_OPEN)} through {pretty(DESK_LAST)}.
        </p>
      </article>
    );
  }

  return (
    <article className="relative border border-crease bg-bone text-ink">
      <div className="absolute inset-y-0 left-0 w-2 bg-signal" aria-hidden="true" />

      <header className="py-5 pr-5 pl-6">
        <p className="text-xs uppercase tracking-widest text-soot">
          {card.legs.length}-leg card · real fixtures
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-5xl leading-none tracking-wide text-ink">
            {when.dow} {when.day} {when.mon}
          </h2>
          <div className="text-left sm:text-right">
            <p className="font-display text-6xl leading-none tabular-nums text-ink">{card.combined.toFixed(2)}</p>
            <p className="text-xs uppercase tracking-widest text-soot">Combined</p>
          </div>
        </div>
        <p
          className={`mt-3 inline-block border-2 px-2 font-display text-2xl leading-none tracking-widest uppercase ${
            card.status === "scar" ? "border-deep text-deep" : "border-soot text-soot"
          }`}
        >
          {stamp}
        </p>
        <p className="mt-2 text-sm text-soot tabular-nums">
          {serial(card.date)} · kickoffs WAT
        </p>
      </header>

      <ol className="border-t border-crease">
        {card.legs.map((leg, index) => (
          <li key={leg.id} className="border-b border-crease py-4 pr-5 pl-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs uppercase tracking-widest text-soot">
                {String(index + 1).padStart(2, "0")} · {leg.kickoff} · {leg.code} · {leg.competition}
                {leg.scoreline ? ` · FT ${leg.scoreline}` : ""}
              </p>
              <LegMark status={leg.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <h3 className="min-w-0 font-display text-4xl leading-none tracking-wide text-ink">
                {leg.homeShort}
                <span className="px-2 text-2xl text-soot">vs</span>
                {leg.awayShort}
              </h3>
              <p className="shrink-0 font-display text-4xl leading-none tabular-nums text-ink">{leg.odds.toFixed(2)}</p>
            </div>
            <p className="mt-1 text-sm text-soot">
              {leg.home} vs {leg.away}
            </p>
            <p className="mt-3 text-base font-medium text-ink">
              {leg.market} · {leg.selection}
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-soot">
              <div>
                <dt className="inline">Desk </dt>
                <dd className="inline text-ink">{leg.desk}%</dd>
              </div>
              <div>
                <dt className="inline">Price </dt>
                <dd className="inline">{leg.marketPct}%</dd>
              </div>
              <div>
                <dt className="inline">Gap </dt>
                <dd className="inline text-deep">+{(leg.desk - leg.marketPct).toFixed(1)}</dd>
              </div>
            </dl>
            <ul className="mt-3 flex flex-wrap gap-2">
              {leg.pillars.map((pillar) => (
                <li
                  key={pillar.name}
                  className={`flex items-center gap-1 border px-2 py-1 text-xs uppercase tracking-widest ${
                    pillar.held ? "border-crease text-soot" : "border-deep text-deep"
                  }`}
                >
                  {pillar.held ? <Check className="size-3" /> : <X className="size-3" />}
                  {pillar.name}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-soot">{leg.note}</p>
            {leg.scar ? <p className="mt-2 text-sm leading-relaxed text-deep">{leg.scar}</p> : null}
          </li>
        ))}
      </ol>

      <footer className="grid gap-4 py-5 pr-5 pl-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-widest text-soot">Paper stake</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              aria-label="Lower paper stake"
              onClick={() => setStake(roundStake(stake - 0.5))}
              disabled={stake <= 0.5}
              className="grid h-11 w-11 place-items-center border border-soot text-ink disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <p className="min-w-16 text-center font-display text-4xl leading-none tabular-nums">{stake.toFixed(1)}</p>
            <button
              type="button"
              aria-label="Raise paper stake"
              onClick={() => setStake(roundStake(stake + 0.5))}
              disabled={stake >= 20}
              className="grid h-11 w-11 place-items-center border border-soot text-ink disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-widest text-soot">If the card lands</p>
          <p className="font-display text-5xl leading-none tabular-nums text-ink">{returns.toFixed(2)}</p>
          <p className="text-sm text-soot tabular-nums">Paper profit {formatUnits(profit).replace(/u$/, "")}</p>
        </div>
      </footer>
    </article>
  );
}

function LegMark({ status }: { status: Card["legs"][number]["status"] }) {
  if (status === "waiting") return <span className="text-xs uppercase tracking-widest text-soot">Waiting</span>;
  if (status === "landed") return <span className="text-xs uppercase tracking-widest text-ink">Landed</span>;
  return <span className="text-xs uppercase tracking-widest text-deep">Scar</span>;
}

function pretty(iso: string) {
  const f = formatDeskDate(iso);
  return `${f.dow} ${f.day} ${f.mon} ${f.year}`;
}

function roundStake(n: number) {
  return Math.min(20, Math.max(0.5, Math.round(n * 2) / 2));
}
