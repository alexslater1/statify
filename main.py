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
import re
import sys
import unicodedata
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

# A tag at the end of a title: "Song - 2011 Remaster", "Song (Radio Edit)", "Song [Mono]"
TAG_RE = re.compile(r"\s*(?:\s-\s([^()\[\]\-]*)|\(([^()]*)\)|\[([^\[\]]*)\])\s*$")
# Tags that only relabel the same recording, so they're dropped...
SAME_RECORDING_RE = re.compile(
    r"^(?:feat\.?|ft\.|featuring|with)\s"
    r"|\b(?:remaster(?:ed)?|radio edit|single version|album version|full length version|single edit|edit|mono|stereo|bonus track)\b",
    re.IGNORECASE)
# ...unless they also name a different recording: "Live - 2011 Remaster", "Radio Edit Remix"
OTHER_RECORDING_RE = re.compile(r"\b(?:live|re-?mix|mix|demo|acoustic|unplugged|instrumental|session)\b", re.IGNORECASE)
# Featured artists can sit anywhere: "Song (feat. X) [Interlude]"
FEAT_RE = re.compile(r"\s*[(\[](?:feat\.?|ft\.|featuring)\s[^()\[\]]*[)\]]", re.IGNORECASE)


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


def load_records(folder):
    """Raw stream records from every history file in the export."""
    records = []
    # An export has as many files as it needs (10,000 streams each), so read them all
    for path in sorted(folder.glob("StreamingHistory_music_*.json")):
        records.extend(json.loads(path.read_text(encoding="utf-8")))
    return records


def song_title(track):
    """The title without tags that only relabel the same recording.

    "Get Lucky (Radio Edit) [feat. Pharrell Williams]" -> "Get Lucky", but live versions, remixes,
    demos and acoustic versions are different recordings and keep their tags.
    """
    title = FEAT_RE.sub("", track)
    while match := TAG_RE.search(title):
        tag = next(g for g in match.groups() if g is not None)
        if not SAME_RECORDING_RE.search(tag) or OTHER_RECORDING_RE.search(tag):
            break
        title = title[:match.start()]
    return title.strip() or track


def match_key(name):
    """A loose form of a name for matching: ignores case, accents, punctuation and spaces, so
    "I've" and "I’ve", "Born Slippy (Nuxx)" and "Born Slippy - Nuxx", or "Gold Rush" and "Goldrush" match."""
    plain = "".join(c for c in unicodedata.normalize("NFKD", name.casefold()) if not unicodedata.combining(c))
    return "".join(re.sub(r"[^\w\s]", "", plain).split()) or name.casefold()


def build_streams(records, tz):
    """Drop unknown artists, localise timestamps and unify names.

    Spotify lists some songs and artists under more than one name ("Boys In the Better Land" /
    "Boys in the Better Land", "Let Down" / "Let Down - Remastered", "I've" / "I’ve"), so they're
    matched loosely (see song_title and match_key) and shown under their most recent spelling.
    Songs by different artists never match, even with the same title.
    """
    records = sorted((r for r in records if r["artistName"] != "Unknown Artist"), key=lambda r: r["endTime"])
    artist_names, track_names, rows = {}, {}, []
    for r in records:  # oldest first, so the newest spelling wins
        track = song_title(r["trackName"])
        key = (match_key(track), match_key(r["artistName"]))
        artist_names[key[1]] = r["artistName"]
        track_names[key] = track
        rows.append((r["endTime"], key, r["msPlayed"]))
    return [Stream(to_local(end, tz), artist_names[key[1]], track_names[key], ms) for end, key, ms in rows]


# --- Analysis --------------------------------------------------------------------------------

def minutes(ms):
    return round(ms / 60_000, 1)


def month_range(first, last):
    months, y, m = [], first.year, first.month
    while (y, m) <= (last.year, last.month):
        months.append(f"{y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return months


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


def top_key(counter):
    return counter.most_common(1)[0][0] if counter else None


def analyse(streams, history, start, end):
    """Aggregate one period's streams into the numbers behind every table.

    `history` is every stream regardless of period; it decides whether an artist was new.
    """
    artist_ms, artist_plays = collections.Counter(), collections.Counter()
    song_plays = collections.Counter()
    month_ms, month_plays, day_ms = collections.Counter(), collections.Counter(), collections.Counter()
    weekday_hour_ms = [[0] * 24 for _ in WEEKDAYS]
    week_artist, month_artist, day_artist = (collections.defaultdict(collections.Counter) for _ in range(3))
    week_song, month_song, day_song = (collections.defaultdict(collections.Counter) for _ in range(3))
    song_days, artist_days = collections.defaultdict(set), collections.defaultdict(set)

    for s in streams:
        day = s.end.date()
        week, month = iso_week(day), f"{day:%Y-%m}"
        artist_ms[s.artist] += s.ms
        month_ms[month] += s.ms
        day_ms[day] += s.ms
        weekday_hour_ms[day.weekday()][s.end.hour] += s.ms
        week_artist[week][s.artist] += s.ms
        month_artist[month][s.artist] += s.ms
        day_artist[day][s.artist] += s.ms
        if not s.is_play:
            continue
        artist_plays[s.artist] += 1
        song_plays[s.song] += 1
        month_plays[month] += 1
        week_song[week][s.song] += 1
        month_song[month][s.song] += 1
        day_song[day][s.song] += 1
        song_days[s.song].add(day)
        artist_days[s.artist].add(day)

    # An artist is "new" in the month of their first play anywhere in the history. The month the
    # history starts is left out, since everything is new then.
    first_heard = {}
    for s in history:
        if s.is_play:
            first_heard.setdefault(s.artist, s.end.date())
    history_start = f"{history[0].end:%Y-%m}"
    discovered = collections.defaultdict(list)
    for artist, day in first_heard.items():
        if start <= day <= end:
            discovered[f"{day:%Y-%m}"].append(artist)

    song_streaks = sorted(((song, longest_streak(days)) for song, days in song_days.items()),
                          key=lambda x: (-x[1][0], -song_plays[x[0]]))
    artist_streaks = sorted(((artist, longest_streak(days)) for artist, days in artist_days.items()),
                            key=lambda x: (-x[1][0], -artist_ms[x[0]]))
    repeats = sorted(((n, day, song) for day, c in day_song.items() for song, n in c.items()),
                     key=lambda x: (-x[0], x[1]))
    months = month_range(start, end)

    def songs(counter, n):
        return [[t, a, plays] for (t, a), plays in counter.most_common(n)]

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "totals": {
            "minutes": minutes(sum(artist_ms.values())),
            "plays": sum(song_plays.values()),
            "artists": len(artist_plays),
            "songs": len(song_plays),
            "active_days": len(day_ms),
            "days": (end - start).days + 1,
        },
        "top_artists": [[a, minutes(ms), artist_plays[a]] for a, ms in artist_ms.most_common(REPORT_SIZE)],
        "top_songs": songs(song_plays, REPORT_SIZE),
        "months": [[m, minutes(month_ms[m]), month_plays[m], top_key(month_artist[m])] for m in months],
        "weekday_hour": [[ms / 60_000 for ms in row] for row in weekday_hour_ms],  # unrounded, as it gets summed
        "discovery": [[m, len(discovered[m]), sorted(discovered[m], key=lambda a: -artist_ms[a])[:3]]
                      for m in months if m != history_start],
        "weekly_top_artists": {w: [[a, minutes(ms)] for a, ms in c.most_common(5)] for w, c in sorted(week_artist.items())},
        "monthly_top_artists": {m: [[a, minutes(ms)] for a, ms in c.most_common(5)] for m, c in sorted(month_artist.items())},
        "weekly_top_songs": {w: songs(c, 5) for w, c in sorted(week_song.items())},
        "monthly_top_songs": {m: songs(c, 5) for m, c in sorted(month_song.items())},
        "song_streaks": [[t, a, n, first.isoformat(), last.isoformat()]
                         for (t, a), (n, first, last) in song_streaks[:20]],
        "artist_streaks": [[a, n, first.isoformat(), last.isoformat()]
                           for a, (n, first, last) in artist_streaks[:20]],
        "biggest_days": [[d.isoformat(), minutes(ms), top_key(day_artist[d]), list(top_key(day_song[d]) or ("", ""))]
                         for d, ms in day_ms.most_common(20)],
        "repeats": [[d.isoformat(), t, a, n] for n, d, (t, a) in repeats[:20]],
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
    t = stats["totals"]
    song = lambda track, artist: [short(track, MAX_TITLE_LENGTH), short(artist, MAX_ARTIST_LENGTH)]

    summary = [
        ("Period", f"{stats['period']['start']} to {stats['period']['end']}"),
        ("Minutes played", f"{t['minutes']:,.0f}  ({t['minutes'] / 60:,.0f} hours)"),
        ("Plays (30s+)", f"{t['plays']:,}"),
        ("Artists", f"{t['artists']:,}"),
        ("Songs", f"{t['songs']:,}"),
        ("Days listened", f"{t['active_days']:,} of {t['days']:,}"),
        ("Average per listening day", f"{t['minutes'] / t['active_days']:,.0f} minutes"),
    ]
    width = max(len(k) for k, _ in summary)
    (out / "summary.txt").write_text("".join(f"{k + ':':<{width + 1}} {v}\n" for k, v in summary), encoding="utf-8")

    write_table(out / "top_artists.txt", ["Rank", "Artist", "Minutes", "Plays"],
                [[i, short(a, MAX_TITLE_LENGTH), m, p] for i, (a, m, p) in enumerate(stats["top_artists"], 1)])
    write_table(out / "top_songs.txt", ["Rank", "Song", "Artist", "Plays"],
                [[i, *song(tr, a), n] for i, (tr, a, n) in enumerate(stats["top_songs"], 1)])
    write_table(out / "total_minutes_per_month.txt", ["Month", "Minutes", "Plays", "Top artist"],
                [[m, mins, plays, top or ""] for m, mins, plays, top in stats["months"]])

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

    write_table(out / "biggest_days.txt", ["Rank", "Date", "Minutes", "Top artist", "Top song"],
                [[i, d, m, short(a, MAX_ARTIST_LENGTH), short(tr, MAX_TITLE_LENGTH)]
                 for i, (d, m, a, (tr, _)) in enumerate(stats["biggest_days"], 1)])
    write_table(out / "most_plays_in_one_day.txt", ["Rank", "Date", "Song", "Artist", "Plays"],
                [[i, d, *song(tr, a), n] for i, (d, tr, a, n) in enumerate(stats["repeats"], 1)])
    write_table(out / "new_artists_per_month.txt", ["Month", "New artists", "Biggest finds"],
                [[m, n, ", ".join(finds)] for m, n, finds in stats["discovery"]])


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
    history = build_streams(load_records(args.data), args.tz)
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

    stats = analyse(streams, history, start, end)
    write_text_reports(stats, out)

    t = stats["totals"]
    print(f"{label}: {start} to {end}")
    print(f"  {t['minutes'] / 60:,.0f} hours, {t['plays']:,} plays, {t['artists']:,} artists, {t['songs']:,} songs")
    print(f"  Wrote {len(list(out.glob('*.txt')))} text tables to {out}")


if __name__ == "__main__":
    main()
