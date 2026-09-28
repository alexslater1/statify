# Statify

Stats from your Spotify listening history.

Statify reads the streaming history in your Spotify data export and writes text tables of your top artists and songs, how much you listened each month, your weekly and monthly top 5s, your longest listening streaks, and which days and hours you listen most.

## Get your data

1. On Spotify's [Privacy settings](https://www.spotify.com/account/privacy/) page, request your **Account data**.
2. Spotify emails you a download link when it's ready, usually within a few days.
3. Unzip it and copy the `StreamingHistory_music_*.json` files into a `data/` folder next to `main.py`.

## Run it

```
python3 main.py
```

It needs Python 3 and nothing else. The script reads `StreamingHistory_music_0.json` to `StreamingHistory_music_4.json`, counts listening from 1 January 2025 onwards, and skips tracks with an unknown artist.

## What you get

Everything is written to `output/`:

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
