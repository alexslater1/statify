# Statify

Stats from your Spotify listening history.

Statify reads the streaming history in your Spotify data export and writes text tables of your top artists and songs, how much you listened each month, your weekly and monthly top 5s, your longest listening streaks, and which days and hours you listen most.

## Get your data

1. On Spotify's [Privacy settings](https://www.spotify.com/account/privacy/) page, request your **Account data**.
2. Spotify emails you a download link when it's ready, usually within a few days.
3. Unzip it into its own folder inside the project's `data/` folder. Any name works, but the month you downloaded it keeps things tidy:

```
data/
├── 2025-11/    ← an older export
└── 2026-09/    ← the latest one
```

Each export only covers about the last year, so keep the old ones: every folder under `data/` with `StreamingHistory_music_*.json` files in it counts as one export, and they're merged into one history.

## Run it

```
python3 python/main.py                                        # everything
python3 python/main.py --year 2025                            # one calendar year
python3 python/main.py --since 2025-06-01 --until 2025-08-31  # any date range
python3 python/main.py --year 2025 --since 2025-06-01         # options combine: June to December 2025
python3 python/main.py --data data/2026-09                    # just one export
```

It needs Python 3 and nothing else. The script reads every `StreamingHistory_music_*.json` file in `data/` and its subfolders, and skips tracks with an unknown artist.

### Several exports

Exports usually overlap: one requested in November 2025 and one in September 2026 both cover September to November 2025. Where they overlap, the newer export is used. Dropping duplicates isn't enough, because Spotify renames some tracks between exports. The script prints each overlap with both exports' stream counts, and warns you if:

- two exports disagree about the same stretch of time
- there's a gap no export covers (it's reported as missing data, not as days you didn't listen)
- a file is missing from the middle of an export

### Times and names

Spotify records times in UTC, so they're converted to your computer's timezone before anything is counted, including summer time. Use `--tz Europe/London` (or any other timezone) to pick a different one. Weeks run Monday to Sunday, using ISO week numbers.

Spotify sometimes lists the same song under different names, so songs and artists are matched ignoring case, accents, punctuation and quote styles. Tags that only relabel the same recording are dropped: "Let Down - Remastered", "Get Lucky (Radio Edit)" and "Icarus (with Tony Walsh)" count as "Let Down", "Get Lucky" and "Icarus". Live versions, remixes, demos and acoustic versions are different recordings, so they stay separate. Songs by different artists never merge, even with the same title. Each song is shown under its most recent spelling.

## What you get

Each period gets its own folder, so runs don't overwrite each other: `output/all-time/` with no options, `output/2025/` for `--year 2025`, and the actual dates, like `output/2025-06-01_to_2025-12-31/`, once `--since` or `--until` is involved. Use `--out` to pick a different folder.

| File | Contents |
|---|---|
| `summary.txt` | Which exports were merged and any gaps between them, then hours listened, plays, how many artists and songs, and how many days you listened |
| `top_artists.txt` | Top 100 artists by minutes played, with their plays |
| `top_songs.txt` | Top 100 songs by plays (a play is 30 seconds or more) |
| `total_minutes_per_month.txt` | Minutes and plays each month, and that month's top artist |
| `top5_artists_per_week.txt`, `top5_artists_per_month.txt` | Top 5 artists for every week and month |
| `top5_songs_per_week.txt`, `top5_songs_per_month.txt` | Top 5 songs for every week and month |
| `top20_song_day_streaks.txt`, `top20_artist_day_streaks.txt` | Longest runs of consecutive days you played a song or artist |
| `day_of_week_most.txt`, `hour_of_day_most.txt` | Minutes played by day of the week and hour of the day |
| `biggest_days.txt` | The days you listened most, with that day's top artist and song |
| `most_plays_in_one_day.txt` | The most times you played one song in a single day |
| `new_artists_per_month.txt` | How many artists you played for the first time each month, and the biggest finds. "First time" means first in your data, so the first few months run high |

`data/` and `output/` are git-ignored, so your listening history stays on your machine.

## The web app

Statify is being rebuilt as a web app that runs entirely in your browser. So far it charts your hours each month, how long you listened every day, which days and hours you listen most, your top 10 artists and songs, and your top artists month by month. Below the charts it shows what your exports cover: each export's dates and files, where they overlap, and any gaps or missing files. The Python script above still has more, like streaks, biggest days, weekly top 5s and new artists.

To load your data, drop the `.zip` Spotify sends you, the folder it unzips to, or its `StreamingHistory_music_*.json` files anywhere on the page, or choose the zip or files with the button. Add as many exports as you have; they're merged as described in [Several exports](#several-exports). Nothing is uploaded. Only the streaming history files are read, not the rest of the export, and they're kept in your browser's storage (IndexedDB) so they're still there next time. Remove an export, or one of its files, from the page to delete it.

It needs [Node.js](https://nodejs.org/) 24. The easiest way to get it is with [nvm](https://github.com/nvm-sh/nvm):

1. Install nvm using the script in [its install instructions](https://github.com/nvm-sh/nvm#install--update-script).
2. Open a new terminal, so it loads nvm. A terminal that was already open says `npm` isn't found.
3. Run `nvm install` in this folder. It installs the Node version in `.nvmrc`.

Then:

```
npm install    # once
npm run dev    # then open http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm test` | Runs the tests with Vitest |
| `npm run lint` | Runs ESLint and checks formatting with Prettier |
| `npm run format` | Formats the code with Prettier |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run build` | Checks types and builds the site into `dist/` |
