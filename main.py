#!/usr/bin/env python3
"""Listening stats from Spotify's "Account data" export.

Reads the StreamingHistory_music_*.json files in data/ and writes text tables to output/<period>/.

    python3 main.py                                        # everything
    python3 main.py --year 2025                            # one calendar year
    python3 main.py --since 2025-06-01 --until 2025-08-31  # any date range
    python3 main.py --year 2025 --since 2025-06-01         # options combine: June to December 2025
    python3 main.py --data data/2026-09                    # another export folder

Times are converted from UTC to this computer's timezone (or --tz) before anything is counted.
"""
import argparse
import collections
import json
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

BASE = Path(__file__).resolve().parent

PLAY_MS = 30_000  # Spotify counts a stream as a play once it passes 30 seconds
REPORT_SIZE = 100  # rows in the top-N tables
MAX_TITLE_LENGTH = 35
MAX_ARTIST_LENGTH = 25
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@dataclass(frozen=True)
class Stream:
    end: datetime  # local time the stream ended
    artist: str
    track: str
    ms: int

    @property
    def song(self):
        return (self.track, self.artist)

    @property
    def is_play(self):
        return self.ms >= PLAY_MS


# --- Loading ---------------------------------------------------------------------------------

def to_local(end_time, tz):
    """Spotify's endTime is UTC to the minute; convert it to local wall-clock time."""
    utc = datetime.strptime(end_time, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
    return utc.astimezone(tz).replace(tzinfo=None)


def load_streams(folder, tz):
    """Every stream in the export's files, minus unknown artists, in local time."""
    streams = []
    # An export has as many files as it needs (10,000 streams each), so read them all
    for path in sorted(folder.glob("StreamingHistory_music_*.json")):
        for r in json.loads(path.read_text(encoding="utf-8")):
            if r["artistName"] == "Unknown Artist":
                continue
            streams.append(Stream(to_local(r["endTime"], tz), r["artistName"], r["trackName"], r["msPlayed"]))
    return streams


# --- Analysis --------------------------------------------------------------------------------

def minutes(ms):
    return round(ms / 60_000, 1)


def iso_week(day):
    """Monday-to-Sunday weeks, numbered so a week never splits at New Year."""
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def longest_streak(days):
    """Longest run of consecutive days, as (length, first_day, last_day)."""
    best, run_start, prev = (0, None, None), None, None
    for day in sorted(days):
        if prev is None or day != prev + timedelta(days=1):
            run_start = day
        prev = day
        length = (day - run_start).days + 1
        if length > best[0]:
            best = (length, run_start, day)
    return best


def analyse(streams):
    """Aggregate the streams into the numbers behind every table."""
    artist_ms, song_plays, month_ms = collections.Counter(), collections.Counter(), collections.Counter()
    weekday_hour_ms = [[0] * 24 for _ in WEEKDAYS]
    week_artist, month_artist = (collections.defaultdict(collections.Counter) for _ in range(2))
    week_song, month_song = (collections.defaultdict(collections.Counter) for _ in range(2))
    song_days, artist_days = collections.defaultdict(set), collections.defaultdict(set)

    for s in streams:
        day = s.end.date()
        week, month = iso_week(day), f"{day:%Y-%m}"
        artist_ms[s.artist] += s.ms
        month_ms[month] += s.ms
        weekday_hour_ms[day.weekday()][s.end.hour] += s.ms
        week_artist[week][s.artist] += s.ms
        month_artist[month][s.artist] += s.ms
        if not s.is_play:
            continue
        song_plays[s.song] += 1
        week_song[week][s.song] += 1
        month_song[month][s.song] += 1
        song_days[s.song].add(day)
        artist_days[s.artist].add(day)

    song_streaks = sorted(((song, longest_streak(days)) for song, days in song_days.items()),
                          key=lambda x: -x[1][0])
    artist_streaks = sorted(((artist, longest_streak(days)) for artist, days in artist_days.items()),
                            key=lambda x: -x[1][0])

    def songs(counter, n):
        return [[t, a, plays] for (t, a), plays in counter.most_common(n)]

    return {
        "minutes": minutes(sum(artist_ms.values())),
        "top_artists": [[a, minutes(ms)] for a, ms in artist_ms.most_common(REPORT_SIZE)],
        "top_songs": songs(song_plays, REPORT_SIZE),
        "months": [[m, minutes(ms)] for m, ms in sorted(month_ms.items())],
        "weekday_hour": [[ms / 60_000 for ms in row] for row in weekday_hour_ms],  # unrounded, as it gets summed
        "weekly_top_artists": {w: [[a, minutes(ms)] for a, ms in c.most_common(5)] for w, c in sorted(week_artist.items())},
        "monthly_top_artists": {m: [[a, minutes(ms)] for a, ms in c.most_common(5)] for m, c in sorted(month_artist.items())},
        "weekly_top_songs": {w: songs(c, 5) for w, c in sorted(week_song.items())},
        "monthly_top_songs": {m: songs(c, 5) for m, c in sorted(month_song.items())},
        "song_streaks": [[t, a, n, first.isoformat(), last.isoformat()]
                         for (t, a), (n, first, last) in song_streaks[:20]],
        "artist_streaks": [[a, n, first.isoformat(), last.isoformat()]
                           for a, (n, first, last) in artist_streaks[:20]],
    }


# --- Output ----------------------------------------------------------------------------------

def short(text, limit):
    return text if len(text) <= limit else text[:limit - 1] + "…"


def write_table(path, headers, rows, group_col=None):
    """Write a Markdown-style table. Numeric columns are right-aligned; a rule is drawn between
    groups whenever the value in `group_col` changes."""
    def cell(v):
        return f"{v:,.1f}" if isinstance(v, float) else f"{v:,}" if isinstance(v, int) else str(v)

    cells = [[cell(v) for v in row] for row in rows]
    numeric = [bool(rows) and all(isinstance(row[i], (int, float)) for row in rows) for i in range(len(headers))]
    widths = [max([len(h)] + [len(r[i]) for r in cells]) for i, h in enumerate(headers)]

    def line(values):
        return "| " + " | ".join(v.rjust(w) if num else v.ljust(w)
                                 for v, w, num in zip(values, widths, numeric)) + " |\n"

    rule = "|" + "|".join("-" * (w + 2) for w in widths) + "|\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(line(headers) + rule)
        for i, (row, values) in enumerate(zip(rows, cells)):
            if group_col is not None and i and row[group_col] != rows[i - 1][group_col]:
                f.write(rule)
            f.write(line(values))


def write_text_reports(stats, out):
    song = lambda track, artist: [short(track, MAX_TITLE_LENGTH), short(artist, MAX_ARTIST_LENGTH)]

    (out / "total_minutes.txt").write_text(f"Total minutes played: {stats['minutes']:,.1f}\n", encoding="utf-8")
    write_table(out / "top_artists.txt", ["Rank", "Artist", "Minutes"],
                [[i, short(a, MAX_TITLE_LENGTH), m] for i, (a, m) in enumerate(stats["top_artists"], 1)])
    write_table(out / "top_songs.txt", ["Rank", "Song", "Artist", "Plays"],
                [[i, *song(tr, a), n] for i, (tr, a, n) in enumerate(stats["top_songs"], 1)])
    write_table(out / "total_minutes_per_month.txt", ["Month", "Minutes"], stats["months"])

    for period in ("week", "month"):
        write_table(out / f"top5_artists_per_{period}.txt", [period.title(), "Rank", "Artist", "Minutes"],
                    [[p, i, short(a, MAX_TITLE_LENGTH), m]
                     for p, top in stats[f"{period}ly_top_artists"].items() for i, (a, m) in enumerate(top, 1)],
                    group_col=0)
        write_table(out / f"top5_songs_per_{period}.txt", [period.title(), "Rank", "Song", "Artist", "Plays"],
                    [[p, i, *song(tr, a), n]
                     for p, top in stats[f"{period}ly_top_songs"].items() for i, (tr, a, n) in enumerate(top, 1)],
                    group_col=0)

    write_table(out / "top20_song_day_streaks.txt", ["Rank", "Song", "Artist", "Day streak", "Start", "End"],
                [[i, *song(tr, a), n, s, e] for i, (tr, a, n, s, e) in enumerate(stats["song_streaks"], 1)])
    write_table(out / "top20_artist_day_streaks.txt", ["Rank", "Artist", "Day streak", "Start", "End"],
                [[i, short(a, MAX_TITLE_LENGTH), n, s, e] for i, (a, n, s, e) in enumerate(stats["artist_streaks"], 1)])

    heat = stats["weekday_hour"]
    write_table(out / "day_of_week_most.txt", ["Day", "Minutes"],
                [[day, round(sum(row), 1)] for day, row in zip(WEEKDAYS, heat)])
    write_table(out / "hour_of_day_most.txt", ["Hour", "Minutes"],
                [[f"{h:02d}:00", round(sum(row[h] for row in heat), 1)] for h in range(24)])


# --- CLI -------------------------------------------------------------------------------------

def timezone_arg(name):
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        raise argparse.ArgumentTypeError(f"unknown timezone {name!r} (try something like Europe/London)")


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--data", type=Path, default=BASE / "data",
                   help="folder holding the StreamingHistory_music_*.json files (default: data/)")
    p.add_argument("--year", type=int, help="only include this calendar year")
    p.add_argument("--since", type=date.fromisoformat, help="first day to include (YYYY-MM-DD)")
    p.add_argument("--until", type=date.fromisoformat, help="last day to include (YYYY-MM-DD)")
    p.add_argument("--tz", type=timezone_arg, help="timezone for dates and hours, e.g. Europe/London (default: this computer's)")
    p.add_argument("--out", type=Path, help="output folder (default: output/<period>)")
    return p.parse_args()


def main():
    args = parse_args()
    if not any(args.data.glob("StreamingHistory_music_*.json")):
        sys.exit(f"No StreamingHistory_music_*.json files in {args.data}")
    history = load_streams(args.data, args.tz)
    if not history:
        sys.exit(f"No listening in {args.data}")
    first, last = min(s.end.date() for s in history), max(s.end.date() for s in history)

    # Each option narrows the period, so they can be combined freely
    start, end = first, last
    if args.year:
        start, end = max(start, date(args.year, 1, 1)), min(end, date(args.year, 12, 31))
    if args.since:
        start = max(start, args.since)
    if args.until:
        end = min(end, args.until)
    streams = [s for s in history if start <= s.end.date() <= end]
    if not streams:
        sys.exit(f"No listening in that period. Your data covers {first} to {last}.")

    if args.since or args.until:
        label, folder = f"{start.day} {start:%b %Y} – {end.day} {end:%b %Y}", f"{start}_to_{end}"
    elif args.year:
        label, folder = str(args.year), str(args.year)
    else:
        label, folder = "All time", "all-time"
    out = args.out or BASE / "output" / folder
    out.mkdir(parents=True, exist_ok=True)

    write_text_reports(analyse(streams), out)
    print(f"{label}: {start} to {end}, {len(streams):,} streams")
    print(f"  Wrote {len(list(out.glob('*.txt')))} tables to {out}")


if __name__ == "__main__":
    main()
