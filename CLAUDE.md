# Statify

Stats from a Spotify data export. Currently a Python script (`python3 main.py` reads `data/`, writes `output/`), being rebuilt as a React + TypeScript app one planned commit at a time.

## Rules

- Never commit or push. Make the change, stage it with `git add`, suggest a commit message, then stop. I review, commit and push myself.
- Work on one planned commit at a time, and don't start the next until I ask.
- Update `README.md` in the same change whenever it affects how to run the project or what it produces.
- Never stage personal data. `data/` holds my Spotify exports, including account files like `Payments.json`, and is git-ignored along with `output/`. Tests and examples use made-up data only.
