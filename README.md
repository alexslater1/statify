# Statify

Stats from your Spotify listening history.

Statify reads the streaming history in your Spotify data export and writes text tables of your top artists and songs, how much you listened each month, your weekly and monthly top 5s, your longest listening streaks, and which days and hours you listen most.

## Get your data

1. On Spotify's [Privacy settings](https://www.spotify.com/account/privacy/) page, request your **Account data**.
2. Spotify emails you a download link when it's ready, usually within a few days.
3. Unzip it and copy the `StreamingHistory_music_*.json` files into a `data/` folder next to `main.py`.

## Run it

```
python3 main.py                                        # everything
python3 main.py --year 2025                            # one calendar year
python3 main.py --since 2025-06-01 --until 2025-08-31  # any date range
python3 main.py --year 2025 --since 2025-06-01         # options combine: June to December 2025
python3 main.py --data data/2026-09                    # an export in another folder
```

It needs Python 3 and nothing else. The script reads every `StreamingHistory_music_*.json` file in the data folder and skips tracks with an unknown artist.

## What you get

Each period gets its own folder, so runs don't overwrite each other: `output/all-time/` with no options, `output/2025/` for `--year 2025`, and the actual dates, like `output/2025-06-01_to_2025-12-31/`, once `--since` or `--until` is involved. Use `--out` to pick a different folder.

| File | Contents |
|---|---|
| `top_artists.txt` | Top 100 artists by minutes played |
| `top_songs.txt` | Top 100 songs by plays (a play is 30 seconds or more) |
| `total_minutes.txt` | Total minutes played |
| `total_minutes_per_month.txt` | Minutes played each month |
| `top5_artists_per_week.txt`, `top5_artists_per_month.txt` | Top 5 artists for every week and month |
| `top5_songs_per_week.txt`, `top5_songs_per_month.txt` | Top 5 songs for every week and month |
| `top20_song_day_streaks.txt`, `top20_artist_day_streaks.txt` | Longest runs of consecutive days you played a song or artist |
| `day_of_week_most.txt`, `hour_of_day_most.txt` | Minutes played by day of the week and hour of the day |

`data/` and `output/` are git-ignored, so your listening history stays on your machine.
