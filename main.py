import glob
import json
import os
import collections
from datetime import datetime, timedelta

REPORT_SIZE = 100
MAX_TITLE_LENGTH = 35
MAX_ARTIST_LENGTH = 25

# Ensure output directory exists
os.makedirs('output', exist_ok=True)

# Read and filter all data once
filtered_songs = []
# An export has as many files as it needs (10,000 streams each), so read them all
for filename in sorted(glob.glob('data/StreamingHistory_music_*.json')):
    with open(filename) as f:
        data = json.load(f)
        for song in data:
            artist = song['artistName']
            track = song['trackName']
            timePlayed = song['msPlayed']
            datePlayed = song['endTime']
            # Filter out "Unknown Artist"
            if artist == "Unknown Artist":
                continue
            # Only consider songs played after Jan 1 2025
            if datePlayed <= "2025-01-01":
                continue
            filtered_songs.append({
                "artist": artist,
                "track": track,
                "timePlayed": timePlayed,
                "datePlayed": datePlayed
            })

# Aggregations
artistCumulativeTimePlayed = collections.defaultdict(float)
songPlayCounter = collections.defaultdict(int)
minutes_per_month = collections.defaultdict(float)
artist_minutes_week = collections.defaultdict(lambda: collections.defaultdict(float))
artist_minutes_month = collections.defaultdict(lambda: collections.defaultdict(float))
song_plays_week = collections.defaultdict(lambda: collections.defaultdict(int))
song_plays_month = collections.defaultdict(lambda: collections.defaultdict(int))

for song in filtered_songs:
    artist = song["artist"]
    track = song["track"]
    timePlayed = song["timePlayed"]
    datePlayed = song["datePlayed"]

    # Artist cumulative time played
    artistCumulativeTimePlayed[artist] += timePlayed

    # Song play count (>30s)
    if timePlayed >= 30000:
        key = (track, artist)
        songPlayCounter[key] += 1

    # Minutes per month
    dt = datetime.strptime(datePlayed, "%Y-%m-%d %H:%M")
    month_key = dt.strftime("%Y-%m")
    minutes_per_month[month_key] += timePlayed / 60000

    # Artist minutes per week/month
    week_key = dt.strftime("%Y-W%U")
    artist_minutes_week[week_key][artist] += timePlayed / 60000
    artist_minutes_month[month_key][artist] += timePlayed / 60000

    # Song plays per week/month (>30s)
    if timePlayed >= 30000:
        song_plays_week[week_key][key] += 1
        song_plays_month[month_key][key] += 1

# Write top 100 artists
sortedArtists = sorted(artistCumulativeTimePlayed.items(), key=lambda x: x[1], reverse=True)
with open('output/top_artists.txt', 'w') as f:
    f.write(f"| {'Rank':<4} | {'Artist':<35} | {'Minutes Played':>14} |\n")
    f.write("|" + "-"*6 + "|" + "-"*37 + "|" + "-"*16 + "|\n")
    for i in range(min(REPORT_SIZE, len(sortedArtists))):
        artist = sortedArtists[i][0]
        time = round(sortedArtists[i][1] / 60000, 2)
        f.write(f"| {i+1:<4} | {artist:<35} | {time:>14.2f} |\n")

# Write top 100 songs
sortedSongs = sorted(songPlayCounter.items(), key=lambda x: x[1], reverse=True)
with open('output/top_songs.txt', 'w') as f:
    f.write(f"| {'Rank':<4} | {'Song':<35} | {'Artist':<25} | {'Play Count':>10} |\n")
    f.write("|" + "-"*6 + "|" + "-"*37 + "|" + "-"*27 + "|" + "-"*12 + "|\n")
    for i in range(min(REPORT_SIZE, len(sortedSongs))):
        (song, artist) = sortedSongs[i][0]
        count = sortedSongs[i][1]
        display_song = (song[:MAX_TITLE_LENGTH-3] + '...') if len(song) > MAX_TITLE_LENGTH else song
        display_artist = (artist[:MAX_ARTIST_LENGTH-3] + '...') if len(artist) > MAX_ARTIST_LENGTH else artist
        f.write(f"| {i+1:<4} | {display_song:<35} | {display_artist:<25} | {count:>10} |\n")

# Write total minutes played
total_minutes = round(sum(artistCumulativeTimePlayed.values()) / 60000, 2)
with open('output/total_minutes.txt', 'w') as f:
    f.write(f"Total minutes played: {total_minutes}\n")

# Write total minutes per month
with open('output/total_minutes_per_month.txt', 'w') as f:
    f.write(f"| {'Month':<7} | {'Minutes Played':>13} |\n")
    f.write("|" + "-"*9 + "|" + "-"*15 + "|\n")
    for month in sorted(minutes_per_month.keys()):
        f.write(f"| {month:<7} | {minutes_per_month[month]:>13.2f} |\n")

# Write top 5 artists per week
with open('output/top5_artists_per_week.txt', 'w') as f:
    f.write(f"| {'Week':<8} | {'Rank':<4} | {'Artist':<35} | {'Minutes Played':>14} |\n")
    f.write("|" + "-"*10 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*16 + "|\n")
    for week in sorted(artist_minutes_week.keys()):
        top5 = sorted(artist_minutes_week[week].items(), key=lambda x: x[1], reverse=True)[:5]
        for rank, (artist, minutes) in enumerate(top5, 1):
            f.write(f"| {week:<8} | {rank:<4} | {artist:<35} | {minutes:>14.2f} |\n")
        f.write("|" + "-"*10 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*16 + "|\n")

# Write top 5 artists per month
with open('output/top5_artists_per_month.txt', 'w') as f:
    f.write(f"| {'Month':<7} | {'Rank':<4} | {'Artist':<35} | {'Minutes Played':>14} |\n")
    f.write("|" + "-"*9 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*16 + "|\n")
    for month in sorted(artist_minutes_month.keys()):
        top5 = sorted(artist_minutes_month[month].items(), key=lambda x: x[1], reverse=True)[:5]
        for rank, (artist, minutes) in enumerate(top5, 1):
            f.write(f"| {month:<7} | {rank:<4} | {artist:<35} | {minutes:>14.2f} |\n")
        f.write("|" + "-"*9 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*16 + "|\n")

# Write top 5 songs per week
with open('output/top5_songs_per_week.txt', 'w') as f:
    f.write(f"| {'Week':<8} | {'Rank':<4} | {'Song':<35} | {'Artist':<25} | {'Play Count':>10} |\n")
    f.write("|" + "-"*10 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*27 + "|" + "-"*12 + "|\n")
    for week in sorted(song_plays_week.keys()):
        top5 = sorted(song_plays_week[week].items(), key=lambda x: x[1], reverse=True)[:5]
        for rank, ((track, artist), count) in enumerate(top5, 1):
            display_song = (track[:MAX_TITLE_LENGTH-3] + '...') if len(track) > MAX_TITLE_LENGTH else track
            display_artist = (artist[:MAX_ARTIST_LENGTH-3] + '...') if len(artist) > MAX_ARTIST_LENGTH else artist
            f.write(f"| {week:<8} | {rank:<4} | {display_song:<35} | {display_artist:<25} | {count:>10} |\n")
        f.write("|" + "-"*10 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*27 + "|" + "-"*12 + "|\n")

# Write top 5 songs per month
with open('output/top5_songs_per_month.txt', 'w') as f:
    f.write(f"| {'Month':<7} | {'Rank':<4} | {'Song':<35} | {'Artist':<25} | {'Play Count':>10} |\n")
    f.write("|" + "-"*9 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*27 + "|" + "-"*12 + "|\n")
    for month in sorted(song_plays_month.keys()):
        top5 = sorted(song_plays_month[month].items(), key=lambda x: x[1], reverse=True)[:5]
        for rank, ((track, artist), count) in enumerate(top5, 1):
            display_song = (track[:MAX_TITLE_LENGTH-3] + '...') if len(track) > MAX_TITLE_LENGTH else track
            display_artist = (artist[:MAX_ARTIST_LENGTH-3] + '...') if len(artist) > MAX_ARTIST_LENGTH else artist
            f.write(f"| {month:<7} | {rank:<4} | {display_song:<35} | {display_artist:<25} | {count:>10} |\n")
        f.write("|" + "-"*9 + "|" + "-"*6 + "|" + "-"*37 + "|" + "-"*27 + "|" + "-"*12 + "|\n")

# --- Top 20 listening streaks for songs and artists (by days) ---

def get_longest_day_streak(dates):
    if not dates:
        return 0
    dates_sorted = sorted(set(dates))
    max_streak = 1
    current_streak = 1
    for i in range(1, len(dates_sorted)):
        if dates_sorted[i] == dates_sorted[i-1] + timedelta(days=1):
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1
    return max_streak

def get_longest_day_streak_with_dates(dates):
    if not dates:
        return 0, None, None
    dates_sorted = sorted(set(dates))
    max_streak = 1
    current_streak = 1
    streak_start = dates_sorted[0]
    streak_end = dates_sorted[0]
    max_start = dates_sorted[0]
    max_end = dates_sorted[0]
    for i in range(1, len(dates_sorted)):
        if dates_sorted[i] == dates_sorted[i-1] + timedelta(days=1):
            current_streak += 1
            streak_end = dates_sorted[i]
            if current_streak > max_streak:
                max_streak = current_streak
                max_start = streak_start
                max_end = streak_end
        else:
            current_streak = 1
            streak_start = dates_sorted[i]
            streak_end = dates_sorted[i]
    return max_streak, max_start, max_end

# Build date sets for songs and artists
song_days = collections.defaultdict(set)
artist_days = collections.defaultdict(set)

for song in filtered_songs:
    if song["timePlayed"] >= 30000:
        date_obj = datetime.strptime(song["datePlayed"], "%Y-%m-%d %H:%M").date()
        song_key = (song["track"], song["artist"])
        song_days[song_key].add(date_obj)
        artist_days[song["artist"]].add(date_obj)

# Find longest streaks for songs
song_streaks = []
for key, days in song_days.items():
    streak, start, end = get_longest_day_streak_with_dates(days)
    song_streaks.append((key, streak, start, end))
top_song_day_streaks = sorted(song_streaks, key=lambda x: x[1], reverse=True)[:20]

with open('output/top20_song_day_streaks.txt', 'w') as f:
    f.write(f"| {'Rank':<4} | {'Song':<35} | {'Artist':<25} | {'Day Streak':>10} | {'Start':<10} | {'End':<10} |\n")
    f.write("|" + "-"*6 + "|" + "-"*37 + "|" + "-"*27 + "|" + "-"*12 + "|" + "-"*12 + "|" + "-"*12 + "|\n")
    for i, ((track, artist), streak, start, end) in enumerate(top_song_day_streaks, 1):
        display_song = (track[:MAX_TITLE_LENGTH-3] + '...') if len(track) > MAX_TITLE_LENGTH else track
        display_artist = (artist[:MAX_ARTIST_LENGTH-3] + '...') if len(artist) > MAX_ARTIST_LENGTH else artist
        start_str = start.strftime("%Y-%m-%d") if start else ""
        end_str = end.strftime("%Y-%m-%d") if end else ""
        f.write(f"| {i:<4} | {display_song:<35} | {display_artist:<25} | {streak:>10} | {start_str:<10} | {end_str:<10} |\n")

# Find longest streaks for artists
artist_streaks = []
for artist, days in artist_days.items():
    streak, start, end = get_longest_day_streak_with_dates(days)
    artist_streaks.append((artist, streak, start, end))
top_artist_day_streaks = sorted(artist_streaks, key=lambda x: x[1], reverse=True)[:20]

with open('output/top20_artist_day_streaks.txt', 'w') as f:
    f.write(f"| {'Rank':<4} | {'Artist':<35} | {'Day Streak':>10} | {'Start':<10} | {'End':<10} |\n")
    f.write("|" + "-"*6 + "|" + "-"*37 + "|" + "-"*12 + "|" + "-"*12 + "|" + "-"*12 + "|\n")
    for i, (artist, streak, start, end) in enumerate(top_artist_day_streaks, 1):
        display_artist = (artist[:MAX_ARTIST_LENGTH-3] + '...') if len(artist) > MAX_ARTIST_LENGTH else artist
        start_str = start.strftime("%Y-%m-%d") if start else ""
        end_str = end.strftime("%Y-%m-%d") if end else ""
        f.write(f"| {i:<4} | {display_artist:<35} | {streak:>10} | {start_str:<10} | {end_str:<10} |\n")

day_of_week_counter = collections.Counter()
hour_of_day_counter = collections.Counter()
for song in filtered_songs:
    dt = datetime.strptime(song["datePlayed"], "%Y-%m-%d %H:%M")
    day_of_week_counter[dt.strftime("%A")] += song["timePlayed"]
    hour_of_day_counter[dt.hour] += song["timePlayed"]
    
# --- Day of week you listen most (table) ---
with open('output/day_of_week_most.txt', 'w') as f:
    f.write(f"| {'Day':<10} | {'Minutes Played':>14} |\n")
    f.write("|" + "-"*12 + "|" + "-"*16 + "|\n")
    for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
        minutes = round(day_of_week_counter[day]/60000, 2)
        f.write(f"| {day:<10} | {minutes:>14.2f} |\n")

# --- Hour of day you listen most (table) ---
with open('output/hour_of_day_most.txt', 'w') as f:
    f.write(f"| {'Hour':<5} | {'Minutes Played':>14} |\n")
    f.write("|" + "-"*7 + "|" + "-"*16 + "|\n")
    for hour in range(24):
        minutes = round(hour_of_day_counter[hour]/60000, 2)
        f.write(f"| {hour:02d}:00 | {minutes:>14.2f} |\n")