import { useMemo } from "react";
import { Calendar } from "../charts/Calendar.tsx";
import { ColumnChart } from "../charts/ColumnChart.tsx";
import { RankedBars } from "../charts/RankedBars.tsx";
import { quantileBins } from "../charts/scale.ts";
import { ScaleLegend } from "../charts/ScaleLegend.tsx";
import { SmallMultiples } from "../charts/SmallMultiples.tsx";
import { WeekHourChart } from "../charts/WeekHourChart.tsx";
import { Card } from "../components/Card.tsx";
import type { Exports } from "../components/exports.ts";
import { ExportsCard } from "../components/ExportsCard.tsx";
import { Flag } from "../components/Flag.tsx";
import { dataProblems } from "../lib/coverage.ts";
import { addDays, weekday } from "../lib/dates.ts";
import {
  countOf,
  formatDayLong,
  formatDays,
  formatDuration,
  formatHours,
  formatMonth,
  formatNumber,
  formatPercent,
  MONTHS,
  WEEKDAYS,
} from "../lib/format.ts";
import { buildHistory, type History } from "../lib/history.ts";
import type { Export } from "../lib/spotify/exports.ts";
import { findGaps, mergeExports } from "../lib/spotify/merge.ts";
import { months, wholeHistory, type Period } from "../lib/stats/period.ts";
import { artistMonths, series, weekdayHour } from "../lib/stats/series.ts";
import { topArtists, topSongs } from "../lib/stats/top.ts";
import "../styles/overview.css";

type OverviewProps = Pick<Exports, "reading" | "notice"> & {
  exports: Export[];
  onAdd: Exports["add"];
  onRemove: Exports["remove"];
  onRemoveFile: Exports["removeFile"];
};

const HOUR = 3_600_000;

/** What the app shows once there's data: the listening, then the exports. */
export function Overview({ exports, ...data }: OverviewProps) {
  const { overlaps, gaps, history, period } = useMemo(() => {
    const { records, overlaps } = mergeExports(exports);
    const gaps = findGaps(exports);
    const history = buildHistory(records, gaps);
    const period = history.streams.length > 0 ? wholeHistory(history) : null;
    return { overlaps, gaps, history, period };
  }, [exports]);
  // Oldest first, like the files in each
  const inOrder = [...exports].sort(
    (a, b) => compare(a.from, b.from) || compare(a.to, b.to),
  );
  const problems = dataProblems(inOrder, overlaps, gaps);

  return (
    <>
      <h1>Your listening</h1>
      <p className="lede">
        {period
          ? `${countOf(history.streams.length, "stream")} from ${formatDays(period.first, period.last)}`
          : "There's no listening in these exports"}
        {exports.length > 1 && `, merged from ${exports.length} exports`}. Times
        are in your timezone, and a play is 30 seconds or more.
      </p>
      {problems.length > 0 && (
        <Flag
          title={gaps.length > 0 ? "Gaps in your data" : "Check your data"}
          items={problems}
        />
      )}
      {period && <Listening history={history} period={period} />}
      <h2 className="section-title">Your data</h2>
      <ExportsCard exports={inOrder} overlaps={overlaps} {...data} />
    </>
  );
}

/** Everything the charts show, worked out once. */
function listeningStats({ streams, missingDays }: History, period: Period) {
  const top = topArtists(streams, 10);
  const trends = top.slice(0, 6);
  return {
    total: streams.reduce((sum, s) => sum + s.ms, 0),
    months: series(streams, period, "month", missingDays),
    days: series(streams, period, "day", missingDays),
    weekHours: weekdayHour(streams),
    topArtists: top,
    topSongs: topSongs(streams, 10),
    trends,
    trendMonths: artistMonths(
      streams,
      period,
      trends.map((t) => t.artist),
    ),
  };
}

type Stats = ReturnType<typeof listeningStats>;

function Listening({ history, period }: { history: History; period: Period }) {
  const { missingDays, artists, songs } = history;
  const stats = useMemo(
    () => listeningStats(history, period),
    [history, period],
  );
  const artistName = (id: number | null) =>
    id === null ? null : artists[id].name;

  return (
    <>
      <h2 className="section-title">Over time</h2>
      <HoursPerMonth
        stats={stats}
        period={period}
        missingDays={missingDays}
        artistName={artistName}
      />
      <EveryDay
        stats={stats}
        period={period}
        missingDays={missingDays}
        artistName={artistName}
      />

      <h2 className="section-title">When you listen</h2>
      <WeekHours
        weekHours={stats.weekHours}
        total={stats.total}
        period={period}
        missingDays={missingDays}
      />

      <h2 className="section-title">Most played</h2>
      <div className="card-pair">
        <Card title="Top artists" sub="By time listened.">
          <RankedBars
            rows={stats.topArtists.map((a) => ({
              key: a.artist,
              name: artists[a.artist].name,
              value: a.ms,
              valueText: formatHours(a.ms),
              tip: {
                value: formatHours(a.ms),
                lines: [
                  artists[a.artist].name,
                  countOf(a.plays, "play"),
                  `${formatPercent(a.ms / stats.total)} of your listening`,
                ],
              },
            }))}
          />
        </Card>
        <Card title="Top songs" sub="By plays of 30 seconds or more.">
          <RankedBars
            rows={stats.topSongs.map((s) => ({
              key: s.song,
              name: songs[s.song].title,
              by: artists[songs[s.song].artist].name,
              value: s.plays,
              valueText: formatNumber(s.plays),
              tip: {
                value: countOf(s.plays, "play"),
                lines: [
                  songs[s.song].title,
                  artists[songs[s.song].artist].name,
                  `${formatHours(s.ms)} in all`,
                ],
              },
            }))}
          />
        </Card>
      </div>
      <Card
        title="Your top artists, month by month"
        sub="Hours each month for your six most-played artists. The panels share one scale, so heights compare directly."
      >
        <TopArtistMonths
          stats={stats}
          period={period}
          artistName={artistName}
        />
      </Card>
    </>
  );
}

function HoursPerMonth({
  stats,
  period,
  missingDays,
  artistName,
}: {
  stats: Stats;
  period: Period;
  missingDays: string[];
  artistName(id: number | null): string | null;
}) {
  const partial = stats.months.some((m) => m.partial);
  const missing = new Set(missingDays);
  // Whether no export covers any of the month's days in the period
  const noData = (first: string, last: string) => {
    for (
      let day = first < period.first ? period.first : first;
      day <= last && day <= period.last;
      day = addDays(day, 1)
    ) {
      if (!missing.has(day)) return false;
    }
    return true;
  };
  return (
    <Card
      title="Hours per month"
      sub={
        partial
          ? "Faded columns are months your data only partly covers."
          : undefined
      }
    >
      <ColumnChart
        label="Hours listened each month"
        format={(hours) => formatHours(hours * HOUR)}
        columns={stats.months.map((m, i) => {
          const top = artistName(m.topArtist);
          return {
            value: m.ms / HOUR,
            label: MONTHS[Number(m.key.slice(5)) - 1],
            sublabel:
              i === 0 || m.key.endsWith("-01") ? m.key.slice(0, 4) : undefined,
            partial: m.partial,
            tip: noData(m.first, m.last)
              ? {
                  value: "No data",
                  lines: [formatMonth(m.key), "None of your exports cover it"],
                }
              : {
                  value: formatHours(m.ms),
                  lines: [
                    formatMonth(m.key),
                    countOf(m.plays, "play"),
                    ...(top ? [`Top artist: ${top}`] : []),
                    ...(m.partial ? ["Your data only partly covers it"] : []),
                  ],
                },
          };
        })}
      />
    </Card>
  );
}

function EveryDay({
  stats,
  period,
  missingDays,
  artistName,
}: {
  stats: Stats;
  period: Period;
  missingDays: string[];
  artistName(id: number | null): string | null;
}) {
  const byDay = new Map(stats.days.map((d) => [d.key, d]));
  const minutes = new Map(stats.days.map((d) => [d.key, d.ms / 60_000]));
  const bins = quantileBins([...minutes.values()]);
  const missing = new Set(missingDays);
  return (
    <Card title="Every day" sub="How long you listened each day.">
      <Calendar
        label="Minutes listened each day"
        first={period.first}
        last={period.last}
        values={minutes}
        missing={missing}
        bins={bins}
        tip={(day) => {
          if (missing.has(day)) {
            return {
              value: "No data",
              lines: [formatDayLong(day), "None of your exports cover it"],
            };
          }
          const d = byDay.get(day);
          const top = artistName(d?.topArtist ?? null);
          return {
            value: d && d.ms > 0 ? formatDuration(d.ms) : "No listening",
            lines: [formatDayLong(day), ...(top ? [`Top artist: ${top}`] : [])],
          };
        }}
      />
      <ScaleLegend
        bins={bins}
        unit="min"
        none="No listening"
        noData={missing.size > 0}
      />
    </Card>
  );
}

function WeekHours({
  weekHours,
  total,
  period,
  missingDays,
}: {
  weekHours: number[][];
  total: number;
  period: Period;
  missingDays: string[];
}) {
  // How many of each weekday there's data for, for "on a typical Friday"
  const weekdays = new Array<number>(7).fill(0);
  const missing = new Set(missingDays);
  for (let day = period.first; day <= period.last; day = addDays(day, 1)) {
    if (!missing.has(day)) weekdays[weekday(day)]++;
  }
  const flat = weekHours.flat();
  const peak = flat.indexOf(Math.max(...flat));
  const byDay = weekHours.map((row) => row.reduce((a, b) => a + b, 0));
  const busiest = byDay.indexOf(Math.max(...byDay));
  const hours = weekHours.map((row) => row.map((ms) => ms / HOUR));
  const bins = quantileBins(hours.flat());
  const hour = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  return (
    <Card
      title="Day of the week and hour"
      sub={`You listen most on ${WEEKDAYS[Math.floor(peak / 24)]}s around ${hour(peak % 24)}, and most overall on ${WEEKDAYS[busiest]}s.`}
    >
      <WeekHourChart
        label="Hours listened by day of the week and hour"
        values={hours}
        bins={bins}
        tip={(day, h) => {
          const ms = weekHours[day][h];
          return {
            value: `${formatHours(ms)} in all`,
            lines: [
              `${WEEKDAYS[day]}s, ${hour(h)}–${hour(h + 1)}`,
              `About ${formatDuration(ms / Math.max(1, weekdays[day]))} on a typical ${WEEKDAYS[day]}`,
              `${formatPercent(ms / total)} of your listening`,
            ],
          };
        }}
      />
      <ScaleLegend bins={bins} unit="h" none="No listening" />
    </Card>
  );
}

function TopArtistMonths({
  stats,
  period,
  artistName,
}: {
  stats: Stats;
  period: Period;
  artistName(id: number | null): string | null;
}) {
  const monthKeys = months(period);
  const short = (month: string) =>
    `${MONTHS[Number(month.slice(5)) - 1]} ’${month.slice(2, 4)}`;
  return (
    <SmallMultiples
      multiples={stats.trends.map((t, i) => ({
        key: t.artist,
        name: artistName(t.artist)!,
        total: formatHours(t.ms),
        values: stats.trendMonths[i].map((ms) => ms / HOUR),
      }))}
      firstLabel={short(monthKeys[0])}
      lastLabel={short(monthKeys[monthKeys.length - 1])}
      label={(name) => `Hours each month listening to ${name}`}
      tip={(m, i) => ({
        value: formatHours(stats.trendMonths[m][i]),
        lines: [artistName(stats.trends[m].artist)!, formatMonth(monthKeys[i])],
      })}
    />
  );
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
